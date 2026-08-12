#!/usr/bin/env bash
#
# [容器内执行] 增量包构建脚本:
#   使用镜像内保留的完整 Python 环境, 将指定包及其全部依赖构建成 wheel,
#   连同离线安装脚本打成 tar.gz 输出到 /out (由宿主机挂载)
#
# 输入 (环境变量):
#   ADDON_PACKAGES     必填, 空格分隔的包列表, 如 "scikit-learn xgboost==2.0.3"
#   ADDON_NAME         可选, 增量包名 (不含扩展名)
#   ADDON_SYSTEM_PKGS  可选, 先在容器里安装的系统包 (apt/yum), 供 GUI 类 wheel
#                      (如 pyside2 需要 glib/GL/X11) 的共享库收集使用
set -euo pipefail

: "${ADDON_PACKAGES:?需要通过环境变量 ADDON_PACKAGES 传入包列表}"

PREFIX="${PREFIX:-/opt/mini_python}"
PLATFORM_NAME="${PLATFORM_NAME:-unknown}"
PYTHON_VERSION="${PYTHON_VERSION:-unknown}"
PY_MM="$(echo "$PYTHON_VERSION" | cut -d. -f1,2)"
PY="$PREFIX/bin/python${PY_MM}"
OUT_DIR=/out

NAME="${ADDON_NAME:-addon-${PLATFORM_NAME}-$(date +%Y%m%d_%H%M%S)}"
WORK="/tmp/${NAME}"
mkdir -p "$WORK/wheels"

# 可选: 安装 wheel 运行所需的系统包 (仅为下面第 2 步的 ldd 收集提供库文件,
# 容器即用即弃, 不会影响构建镜像本身)
if [ -n "${ADDON_SYSTEM_PKGS:-}" ]; then
    echo "==> 安装系统包 (供共享库收集): ${ADDON_SYSTEM_PKGS}"
    # shellcheck disable=SC2086
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update -qq && apt-get install -y -qq --no-install-recommends $ADDON_SYSTEM_PKGS
    elif command -v yum >/dev/null 2>&1; then
        yum install -y -q $ADDON_SYSTEM_PKGS
    else
        echo "错误: 容器内没有 apt-get/yum, 无法安装系统包"; exit 1
    fi
fi

echo "==> 为 Python ${PYTHON_VERSION} / ${PLATFORM_NAME} 构建 wheel: ${ADDON_PACKAGES}"
# pip wheel 会连同全部依赖一起下载/编译成 wheel, 保证目标机可完全离线安装;
# 若某个包只有 sdist, 会在本容器内用与目标平台一致的工具链编译;
# --prefer-binary: 老平台上自动降级到最后一个有兼容 wheel 的版本 (避免无谓的源码编译)
# shellcheck disable=SC2086
"$PY" -m pip wheel --no-cache-dir --prefer-binary --wheel-dir "$WORK/wheels" $ADDON_PACKAGES

# 顶层包列表 (作为目标机上 pip install -r 的输入)
printf '%s\n' $ADDON_PACKAGES > "$WORK/packages.txt"

# ---------------- 共享库收集 (与全量包第 3 步同思路) ----------------
# 把 wheel 临时装进本容器的完整环境, ldd 找出环境外的共享库依赖
# (glibc 家族除外), 随增量包携带, 由 install_addon.sh 落到目标机 lib/
echo "==> 收集 wheel 的环境外共享库依赖"
"$PY" -m pip install --no-index --find-links "$WORK/wheels" -q -r "$WORK/packages.txt"

EXCLUDE_RE='^(linux-vdso|ld-linux|libc\.so|libm\.so|libpthread\.so|libdl\.so|librt\.so|libutil\.so|libnsl\.so|libresolv\.so|libcrypt\.so)'
mkdir -p "$WORK/syslibs"
SITE="$PREFIX/lib/python${PY_MM}/site-packages"
find "$SITE" -type f -name '*.so*' | while read -r f; do
    ldd "$f" 2>/dev/null | awk '/=>/ {print $3}' || true
done | sort -u | while read -r lib; do
    [ -f "$lib" ] || continue
    base="$(basename "$lib")"
    echo "$base" | grep -qE "$EXCLUDE_RE" && continue
    case "$lib" in "$PREFIX"/*) continue ;; esac      # 环境自带 (全量包已携带)
    [ -e "$PREFIX/lib/$base" ] && continue            # 全量包已携带同名库, 不重复打包
    if [ ! -e "$WORK/syslibs/$base" ]; then
        cp -L "$lib" "$WORK/syslibs/$base"
        echo "    携带: $base"
    fi
done
rmdir "$WORK/syslibs" 2>/dev/null || true             # 没收集到则不打入包

# 仍解析不到的库 (需要补 ADDON_SYSTEM_PKGS): 只警告, 由构建者决定是否重跑
MISSING=$(find "$SITE" -type f -name '*.so*' -exec ldd {} \; 2>/dev/null \
          | awk '/not found/ {print $1}' | sort -u)
if [ -n "$MISSING" ]; then
    echo "    警告: 以下依赖库在容器内不存在, 未能随包携带 (目标机需自行提供,"
    echo "          或通过 build_addon.sh --system-pkgs 安装后重新打包):"
    echo "$MISSING" | sed 's/^/          /'
fi

install -m 0755 /build/target_assets/install_addon.sh "$WORK/install_addon.sh"
# 自检脚本随增量包携带: 安装后用它对本次装的包做功能冒烟测试
# (不依赖目标机全量包里的版本, 新旧全量包都能配合)
install -m 0644 /build/target_assets/selfcheck_pkgs.py "$WORK/selfcheck_pkgs.py"

cat > "$WORK/addon_info.txt" <<EOF
platform=${PLATFORM_NAME}
python_version=${PYTHON_VERSION}
packages=${ADDON_PACKAGES}
built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

mkdir -p "$OUT_DIR"
tar czf "$OUT_DIR/${NAME}.tar.gz" -C /tmp "$NAME"

echo ""
echo "==> 增量包已生成: ${NAME}.tar.gz ($(du -sh "$OUT_DIR/${NAME}.tar.gz" | cut -f1))"
echo "    包含 wheel:"
ls "$WORK/wheels" | sed 's/^/      /'
