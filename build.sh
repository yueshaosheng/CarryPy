#!/usr/bin/env bash
#
# [宿主机执行] 全量打包入口:
#   为目标平台构建最小化 Python 运行环境, 产物输出到 dist/
#
# 示例:
#   ./build.sh                                          # 默认 ubuntu18_amd64 + 配置文件默认包
#   ./build.sh -p ubuntu18_amd64 --python 3.11 --packages "numpy matplotlib pandas"
#   PIP_INDEX_URL=https://pypi.org/simple ./build.sh    # 覆盖默认 pip 源
#
# 注: 主逻辑封装在 main() 中, bash 会一次性读入整个函数体再执行,
#     构建期间即使脚本文件被修改也不影响正在运行的实例。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ---------------- 版本解析工具 ----------------
# 将主.次版本号 (如 3.11) 解析为 Python 镜像上可用的最新完整版本号 (如 3.11.9)
# 注意: 进度信息输出到 stderr, 仅最终版本号输出到 stdout, 以便 $() 正确捕获

# 跨平台 HTTP GET: 优先 curl (macOS 自带), 备选 wget
_http_get() {
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL --connect-timeout 15 "$1" 2>/dev/null
    elif command -v wget >/dev/null 2>&1; then
        wget -q --timeout=15 -O- "$1" 2>/dev/null
    else
        echo "错误: 需要 curl 或 wget, 但都未安装" >&2; exit 1
    fi
}

resolve_python_version() {
    local short_ver="$1" mirror="${2:-https://mirrors.huaweicloud.com/python}"
    echo "==> 解析 Python ${short_ver} 的最新 patch 版本 (${mirror}) ..." >&2
    local full_ver
    full_ver=$(_http_get "${mirror}/" \
        | grep -oE "${short_ver}\.[0-9]+" \
        | sort -t. -k3 -n | tail -1) || true
    if [ -z "$full_ver" ]; then
        echo "错误: 无法在 ${mirror} 上找到 Python ${short_ver} 的版本信息" >&2
        echo "      请检查网络, 或通过 PYTHON_MIRROR 环境变量指定可用的镜像源" >&2
        echo "      例如: PYTHON_MIRROR=https://mirrors.huaweicloud.com/python ./build.sh ..." >&2
        exit 1
    fi
    echo "==> Python ${short_ver} -> ${full_ver}" >&2
    echo "$full_ver"
}

# ---------------- 主逻辑 (封装在函数中, 一次性读入内存, 防止构建期间文件被修改导致语法错误) ----------------
main() {

PLATFORM="ubuntu18_amd64"
PKG_OVERRIDE=""
PYVER_OVERRIDE=""
OPTIMIZE=0
NO_CACHE=""

usage() {
    cat <<'EOF'
用法: ./build.sh [选项]
  -p, --platform <name>    目标平台, 对应 config/<name>.conf (默认: ubuntu18_amd64)
      --python <version>   Python 版本: 主.次 (如 3.11) 或完整版本 (如 3.11.9)
      --packages "<pkgs>"  预装包列表, 空格分隔, 覆盖配置文件
      --optimize           启用 PGO+LTO 优化编译 (解释器更快, 但编译时间增加 20~40 分钟)
      --no-cache           docker build 不使用缓存
  -h, --help               显示帮助

环境变量:
  APT_MIRROR      系统包管理器镜像域名 (默认 mirrors.aliyun.com), 对 apt/yum 均生效
  PYTHON_MIRROR   Python 源码下载镜像 (默认 https://mirrors.huaweicloud.com/python)
  PIP_INDEX_URL   pip 源 (默认 https://pypi.tuna.tsinghua.edu.cn/simple)
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        -p|--platform) PLATFORM="$2"; shift 2 ;;
        --python)      PYVER_OVERRIDE="$2"; shift 2 ;;
        --packages)    PKG_OVERRIDE="$2"; shift 2 ;;
        --optimize)    OPTIMIZE=1; shift ;;
        --no-cache)    NO_CACHE="--no-cache"; shift ;;
        -h|--help)     usage; exit 0 ;;
        *) echo "未知参数: $1"; usage; exit 1 ;;
    esac
done

# ---------------- 加载平台配置 ----------------
CONF="$ROOT/config/${PLATFORM}.conf"
if [ ! -f "$CONF" ]; then
    echo "错误: 找不到平台配置 $CONF"
    echo "可用平台:"
    ls "$ROOT/config" | sed -e 's/\.conf$//' -e 's/^/  - /'
    exit 1
fi
# shellcheck source=/dev/null
source "$CONF"

PYVER="${PYVER_OVERRIDE:-$PYTHON_VERSION}"
if [ -n "$PKG_OVERRIDE" ] || [ "${PKG_OVERRIDE+set}" = "set" ]; then
    PACKAGES="$PKG_OVERRIDE"
else
    PACKAGES="$DEFAULT_PACKAGES"
fi
PYTHON_MIRROR="${PYTHON_MIRROR:-https://mirrors.huaweicloud.com/python}"
PIP_INDEX_URL="${PIP_INDEX_URL:-https://pypi.tuna.tsinghua.edu.cn/simple}"

# 短版本号 (主.次) 用于镜像标签; 若用户指定了完整版本则提取短版本
PYVER_SHORT="$(echo "$PYVER" | cut -d. -f1,2)"

# 若为短版本号, 自动解析为最新完整版本号
if [ "$(echo "$PYVER" | awk -F. '{print NF}')" -le 2 ]; then
    PYVER="$(resolve_python_version "$PYVER" "$PYTHON_MIRROR")"
fi

IMAGE="mini-py-pack/${PLATFORM}:py${PYVER_SHORT}"

# ---------------- 环境检查 ----------------
command -v docker >/dev/null 2>&1 || { echo "错误: 未安装 docker"; exit 1; }
docker info >/dev/null 2>&1 || { echo "错误: docker 守护进程未运行"; exit 1; }

HOST_ARCH="$(uname -m)"
case "$DOCKER_PLATFORM" in
    linux/amd64) TARGET_ARCH="x86_64" ;;
    linux/arm64) TARGET_ARCH="aarch64" ;;
    *)           TARGET_ARCH="" ;;
esac
if [ -n "$TARGET_ARCH" ] && [ "$HOST_ARCH" != "$TARGET_ARCH" ] \
   && ! { [ "$HOST_ARCH" = "arm64" ] && [ "$TARGET_ARCH" = "aarch64" ]; }; then
    echo "提示: 宿主机架构($HOST_ARCH)与目标架构($TARGET_ARCH)不同, 将通过 QEMU/Rosetta 模拟构建, 速度较慢"
    echo "      Linux 宿主机如报 'exec format error', 请先执行:"
    echo "      docker run --privileged --rm tonistiigi/binfmt --install all"
fi

echo "================ 构建参数 ================"
echo "  目标平台   : $PLATFORM ($DOCKER_PLATFORM, $BASE_IMAGE)"
echo "  Python     : $PYVER_SHORT (完整版本: $PYVER)"
echo "  预装包     : $PACKAGES"
echo "  优化编译   : $OPTIMIZE"
echo "  构建镜像   : $IMAGE"
echo "=========================================="

# ---------------- 构建 ----------------
# shellcheck disable=SC2086
docker build \
    --platform "$DOCKER_PLATFORM" \
    -f "$ROOT/docker/Dockerfile" \
    --build-arg BASE_IMAGE="$BASE_IMAGE" \
    --build-arg APT_MIRROR="${APT_MIRROR:-}" \
    --build-arg PYVER_FULL="$PYVER" \
    --build-arg PY_PACKAGES="$PACKAGES" \
    --build-arg ENABLE_OPTIMIZATIONS="$OPTIMIZE" \
    --build-arg PYTHON_MIRROR="$PYTHON_MIRROR" \
    --build-arg PIP_INDEX_URL="$PIP_INDEX_URL" \
    --build-arg PLATFORM_NAME="$PLATFORM" \
    --build-arg PYTHON_BUILD_TAG="${PYTHON_BUILD_TAG:-}" \
    $NO_CACHE \
    -t "$IMAGE" \
    "$ROOT"

# ---------------- 导出产物 ----------------
mkdir -p "$ROOT/dist"
CID="$(docker create --platform "$DOCKER_PLATFORM" "$IMAGE" true)"
trap 'docker rm -f "$CID" >/dev/null 2>&1 || true' EXIT
docker cp "$CID:/out/." "$ROOT/dist/"

TARBALL="$ROOT/dist/mini_python-${PLATFORM}-py${PYVER}.tar.gz"
echo ""
echo "================ 构建完成 ================"
ls -lh "$TARBALL"
echo ""
echo "部署到目标机 (${PLATFORM}):"
echo "  tar xzf $(basename "$TARBALL")"
echo "  ./mini_python/python3 your_script.py"
echo ""
echo "构建镜像 $IMAGE 已保留, 后续可用 ./build_addon.sh 制作增量包"

} # end main

main "$@"
