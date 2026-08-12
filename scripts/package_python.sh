#!/usr/bin/env bash
#
# [容器内执行] 全量构建脚本 (打包层):
#   对 build_python.sh 产出的 $PREFIX 完整环境:
#   4. 复制一份并做体积裁剪
#   5. 放入目标机入口脚本与元信息, 构建自检 (功能冒烟测试)
#   6. 生成可离线部署的 tar.gz 到 /out
#   独立成 Docker 层: 改 target_assets/打包逻辑不触发 Python 重编译
#
# 用法: package_python.sh <python版本> "<包列表>"
set -euo pipefail

PYTHON_VERSION="${1:?缺少 Python 版本参数}"
PY_PACKAGES="${2:-}"

PREFIX="${PREFIX:-/opt/mini_python}"
PLATFORM_NAME="${PLATFORM_NAME:-unknown}"
PY_MM="$(echo "$PYTHON_VERSION" | cut -d. -f1,2)"   # 如 3.10
PY_BIN="python${PY_MM}"
DIST_ROOT=/opt/dist
PKG_DIR_NAME=mini_python
OUT_DIR=/out

log() { echo ""; echo "==> $*"; }

# ---------------- 4. 体积裁剪 (在副本上进行) ----------------
# $PREFIX 保留完整环境供增量包编译使用, 发布物用裁剪后的副本
log "生成裁剪副本并瘦身"
DIST="$DIST_ROOT/$PKG_DIR_NAME"
rm -rf "$DIST_ROOT" && mkdir -p "$DIST_ROOT"
cp -a "$PREFIX" "$DIST"

STDLIB="$DIST/lib/python${PY_MM}"
SITE="$STDLIB/site-packages"

# 头文件 / 文档 / 静态库 / 编译配置: 运行期与离线 wheel 安装均不需要
rm -rf "$DIST/share" "$DIST/include" "$DIST/lib/pkgconfig"
rm -rf "$STDLIB"/config-*
rm -f  "$DIST/lib"/libpython*.a

# 标准库中用不到的大块头: 测试套件 / IDLE / tkinter / ensurepip(pip 已装好)
rm -rf "$STDLIB/test" "$STDLIB/idlelib" "$STDLIB/tkinter" "$STDLIB/turtledemo" "$STDLIB/ensurepip"
rm -f  "$STDLIB/turtle.py"
rm -f  "$DIST/bin"/idle* "$DIST/bin"/2to3*

# 第三方包自带的测试目录 (pandas/matplotlib 的 tests 合计可省 50MB+)
# 注意: numpy 的 tests 目录必须保留 —— numpy 2.x 的 numpy.testing 运行时会导入
# numpy._core.tests._natype, 而 scipy/sklearn 等都依赖 numpy.testing
find "$SITE" -maxdepth 3 -type d \( -name tests -o -name test \) \
    -not -path "*/numpy/*" -exec rm -rf {} + 2>/dev/null || true

# 字节码缓存 (目标机首次运行会自动重建)
find "$DIST" -type d -name '__pycache__' -prune -exec rm -rf {} +

# strip 调试符号
# 注意: 不能 strip site-packages 里的 .so —— manylinux wheel 中经 patchelf 处理过的
# 库(如 numpy 内嵌的 openblas)被 strip 后会损坏 ELF 对齐, 且上游发布时已 strip 过
find "$STDLIB/lib-dynload" -type f -name '*.so' -exec strip --strip-unneeded {} + 2>/dev/null || true
find "$DIST/lib" -maxdepth 1 -type f -name '*.so*' -exec strip --strip-unneeded {} + 2>/dev/null || true
strip --strip-unneeded "$DIST/bin/$PY_BIN" 2>/dev/null || true

# ---------------- 5. 包装脚本与元信息 ----------------
log "安装入口脚本 (python3 / pip3 / selfcheck.sh / selfcheck_pkgs.py)"
for f in python3 pip3 selfcheck.sh; do
    install -m 0755 "/build/target_assets/$f" "$DIST/$f"
    sed -i "s/@PY_MM@/${PY_MM}/g" "$DIST/$f"
done
install -m 0644 /build/target_assets/selfcheck_pkgs.py "$DIST/selfcheck_pkgs.py"

cat > "$DIST/env_info.txt" <<EOF
platform=${PLATFORM_NAME}
python_version=${PYTHON_VERSION}
packages=${PY_PACKAGES}
built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

# 自检: 裁剪后的环境能正常启动, 预置包逐个跑功能冒烟测试
log "构建自检"
(cd "$DIST" && ./python3 -c "import ssl, sqlite3, lzma, bz2, zlib; print('stdlib ok')")
if [ -n "$PY_PACKAGES" ]; then
    # shellcheck disable=SC2086
    (cd "$DIST" && ./python3 selfcheck_pkgs.py $PY_PACKAGES)
fi

# ---------------- 6. 打包 ----------------
mkdir -p "$OUT_DIR"
TARBALL="$OUT_DIR/mini_python-${PLATFORM_NAME}-py${PYTHON_VERSION}.tar.gz"
log "打包 -> $TARBALL"
tar czf "$TARBALL" -C "$DIST_ROOT" "$PKG_DIR_NAME"

echo ""
echo "  裁剪后目录大小: $(du -sh "$DIST" | cut -f1)"
echo "  压缩包大小    : $(du -sh "$TARBALL" | cut -f1)"
