#!/usr/bin/env bash
#
# [宿主机执行] 增量包打包入口:
#   复用 build.sh 生成的构建镜像, 为已部署的 mini_python 环境制作离线增量包
#
# 示例:
#   ./build_addon.sh scikit-learn                        # 默认平台 ubuntu18_amd64
#   ./build_addon.sh -p ubuntu18_amd64 scikit-learn "xgboost==2.0.3"
#   PIP_INDEX_URL=https://pypi.org/simple ./build_addon.sh scikit-learn
#
# 注: 主逻辑封装在 main() 中, bash 会一次性读入整个函数体再执行,
#     构建期间即使脚本文件被修改也不影响正在运行的实例。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

usage() {
    cat <<'EOF'
用法: ./build_addon.sh [选项] <包1> [包2 ...]
  -p, --platform <name>      目标平台, 对应 config/<name>.conf (默认: ubuntu18_amd64)
      --python <version>     指定构建镜像对应的 Python 版本 (默认取配置文件)
      --system-pkgs "<...>"  GUI 类包所需的系统包 (apt/yum 包名, 空格分隔加引号);
                             会装进临时容器供 ldd 收集共享库随增量包携带, 如:
                             pyside2 + ubuntu: "libglib2.0-0 libgl1 libegl1 ..."
  -h, --help                 显示帮助

说明:
  必须先执行过 ./build.sh 生成对应平台的构建镜像。
  包名支持版本约束, 如 "scikit-learn==1.3.2" (带约束时请加引号)。

环境变量:
  PIP_INDEX_URL   pip 源 (默认 https://pypi.tuna.tsinghua.edu.cn/simple)
EOF
}

# ---------------- 主逻辑 (封装在函数中, 一次性读入内存) ----------------
main() {

PLATFORM="ubuntu18_amd64"
PYVER_OVERRIDE=""
SYSTEM_PKGS=""
PKG_ARGS=()

while [ $# -gt 0 ]; do
    case "$1" in
        -p|--platform)  PLATFORM="$2"; shift 2 ;;
        --python)       PYVER_OVERRIDE="$2"; shift 2 ;;
        --system-pkgs)  SYSTEM_PKGS="$2"; shift 2 ;;
        -h|--help)      usage; exit 0 ;;
        -*) echo "未知参数: $1"; usage; exit 1 ;;
        *)  PKG_ARGS+=("$1"); shift ;;
    esac
done

if [ "${#PKG_ARGS[@]}" -eq 0 ]; then
    echo "错误: 请至少指定一个要打包的 Python 包"
    usage
    exit 1
fi
PACKAGES="${PKG_ARGS[*]}"

# ---------------- 加载平台配置, 定位构建镜像 ----------------
CONF="$ROOT/config/${PLATFORM}.conf"
if [ ! -f "$CONF" ]; then
    echo "错误: 找不到平台配置 $CONF"
    exit 1
fi
# shellcheck source=/dev/null
source "$CONF"

PYVER="${PYVER_OVERRIDE:-$PYTHON_VERSION}"
IMAGE="mini-py-pack/${PLATFORM}:py${PYVER}"

command -v docker >/dev/null 2>&1 || { echo "错误: 未安装 docker"; exit 1; }
docker info >/dev/null 2>&1 || { echo "错误: docker 守护进程未运行"; exit 1; }

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
    echo "错误: 找不到构建镜像 $IMAGE"
    echo "请先执行: ./build.sh -p $PLATFORM --python $PYVER"
    exit 1
fi

# 增量包命名: addon-<平台>-<包1+包2+...>-<日期>
PKG_TAG=""
for p in "${PKG_ARGS[@]}"; do
    clean="$(printf '%s' "$p" | sed -e 's/[=<>!~].*//' -e 's/[^A-Za-z0-9._-]/-/g')"
    PKG_TAG="${PKG_TAG:+${PKG_TAG}+}${clean}"
done
ADDON_NAME="addon-${PLATFORM}-${PKG_TAG}-$(date +%Y%m%d)"

echo "================ 增量包参数 ================"
echo "  目标平台   : $PLATFORM ($DOCKER_PLATFORM)"
echo "  Python     : $PYVER"
echo "  新增包     : $PACKAGES"
echo "  产物名     : ${ADDON_NAME}.tar.gz"
echo "==========================================="

mkdir -p "$ROOT/dist"
# 挂载宿主机 scripts/ 覆盖镜像内的 /build: 增量包逻辑更新后无需重建镜像
docker run --rm \
    --platform "$DOCKER_PLATFORM" \
    -v "$ROOT/dist":/out \
    -v "$ROOT/scripts/make_addon.sh":/build/make_addon.sh:ro \
    -v "$ROOT/scripts/target_assets":/build/target_assets:ro \
    -e ADDON_PACKAGES="$PACKAGES" \
    -e ADDON_NAME="$ADDON_NAME" \
    ${SYSTEM_PKGS:+-e ADDON_SYSTEM_PKGS="$SYSTEM_PKGS"} \
    ${PIP_INDEX_URL:+-e PIP_INDEX_URL="$PIP_INDEX_URL"} \
    "$IMAGE" \
    bash /build/make_addon.sh

echo ""
echo "================ 完成 ================"
ls -lh "$ROOT/dist/${ADDON_NAME}.tar.gz"
echo ""
echo "部署到目标机:"
echo "  tar xzf ${ADDON_NAME}.tar.gz"
echo "  ./${ADDON_NAME}/install_addon.sh /path/to/mini_python"

} # end main

main "$@"
