#!/usr/bin/env bash
#
# [宿主机执行] 全量打包入口:
#   为目标平台构建最小化 Python 运行环境, 产物输出到 dist/
#
# 示例:
#   ./build.sh                                          # 默认 ubuntu18_amd64 + 配置文件默认包
#   ./build.sh -p ubuntu18_amd64 --python 3.10.14 --packages "numpy matplotlib pandas"
#   PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple ./build.sh    # 国内源加速
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

PLATFORM="ubuntu18_amd64"
PKG_OVERRIDE=""
PYVER_OVERRIDE=""
OPTIMIZE=0
NO_CACHE=""

usage() {
    cat <<'EOF'
用法: ./build.sh [选项]
  -p, --platform <name>    目标平台, 对应 config/<name>.conf (默认: ubuntu18_amd64)
      --python <version>   Python 完整版本号, 覆盖配置文件 (如 3.10.14)
      --packages "<pkgs>"  预装包列表, 空格分隔, 覆盖配置文件
      --optimize           启用 PGO+LTO 优化编译 (解释器更快, 但编译时间增加 20~40 分钟)
      --no-cache           docker build 不使用缓存
  -h, --help               显示帮助

环境变量:
  APT_MIRROR      系统包管理器镜像域名 (默认官方源), 对 apt/yum 均生效:
                  debian 系替换 archive.ubuntu.com; rhel 系替换为 <镜像>/centos-vault
                  国内可用: mirrors.aliyun.com 或 mirrors.tuna.tsinghua.edu.cn
  PYTHON_MIRROR   Python 源码下载镜像 (默认 https://www.python.org/ftp/python)
                  国内可用: https://mirrors.huaweicloud.com/python
  PIP_INDEX_URL   pip 源 (默认 https://pypi.org/simple)
                  国内可用: https://pypi.tuna.tsinghua.edu.cn/simple
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
PACKAGES="${PKG_OVERRIDE:-$DEFAULT_PACKAGES}"
PYTHON_MIRROR="${PYTHON_MIRROR:-https://www.python.org/ftp/python}"
PIP_INDEX_URL="${PIP_INDEX_URL:-https://pypi.org/simple}"
IMAGE="mini-py-pack/${PLATFORM}:py${PYVER}"

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
echo "  Python     : $PYVER"
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
    --build-arg PYTHON_VERSION="$PYVER" \
    --build-arg PY_PACKAGES="$PACKAGES" \
    --build-arg ENABLE_OPTIMIZATIONS="$OPTIMIZE" \
    --build-arg PYTHON_MIRROR="$PYTHON_MIRROR" \
    --build-arg PIP_INDEX_URL="$PIP_INDEX_URL" \
    --build-arg PLATFORM_NAME="$PLATFORM" \
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
