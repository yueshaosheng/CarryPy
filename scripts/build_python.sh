#!/usr/bin/env bash
#
# [容器内执行] 全量构建脚本 (编译层):
#   1. 源码编译指定版本 Python 到 $PREFIX
#   2. pip 安装预置包
#   3. 收集非 glibc 的共享库依赖, 随包携带
#   裁剪与打包见 package_python.sh (独立 Docker 层, 改打包逻辑不触发重编译)
#
# 用法: build_python.sh <python版本> "<包列表>" <是否优化编译0/1> <python源码镜像>
set -euo pipefail

PYTHON_VERSION="${1:?缺少 Python 版本参数}"
PY_PACKAGES="${2:-}"
ENABLE_OPTIMIZATIONS="${3:-0}"
PYTHON_MIRROR="${4:-https://mirrors.huaweicloud.com/python}"

PREFIX="${PREFIX:-/opt/mini_python}"
PY_MM="$(echo "$PYTHON_VERSION" | cut -d. -f1,2)"   # 如 3.10
PY_BIN="python${PY_MM}"

log() { echo ""; echo "==> $*"; }

# CentOS 6 等: 若安装了 SCL devtoolset, 激活新版 GCC (Dockerfile 中已安装)
[ -f /opt/rh/devtoolset-9/enable ] && source /opt/rh/devtoolset-9/enable

# ---------------- 检查是否已有预编译 Python (python-build-standalone 等) ----------------
if [ -x "$PREFIX/bin/$PY_BIN" ]; then
    log "检测到预编译 Python, 跳过源码编译"
    "$PREFIX/bin/$PY_BIN" -V
else

# ---------------- 1. 源码编译 Python ----------------
log "下载 Python-${PYTHON_VERSION} 源码 (${PYTHON_MIRROR})"
mkdir -p /tmp/src && cd /tmp/src
wget -q "${PYTHON_MIRROR}/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tgz"
tar xzf "Python-${PYTHON_VERSION}.tgz"
cd "Python-${PYTHON_VERSION}"

CONF_FLAGS=(--prefix="$PREFIX" --with-ensurepip=install)
if [ "$ENABLE_OPTIMIZATIONS" = "1" ]; then
    CONF_FLAGS+=(--enable-optimizations --with-lto)
fi
# CentOS 7 等老平台: 系统 OpenSSL 版本过低, 镜像构建阶段已源码编译 1.1.1 到 /opt/openssl11
# (libssl.so.1.1 会在第 3 步共享库收集时自动随包携带)
if [ -d /opt/openssl11 ]; then
    CONF_FLAGS+=(--with-openssl=/opt/openssl11 --with-openssl-rpath=auto)
fi
# CentOS 6 等: 系统 sqlite3 版本过低, 镜像构建阶段已源码编译到 /opt/sqlite3
if [ -d /opt/sqlite3 ]; then
    export CPPFLAGS="${CPPFLAGS:-} -I/opt/sqlite3/include"
    export LDFLAGS="${LDFLAGS:-} -L/opt/sqlite3/lib"
    export LD_LIBRARY_PATH="${LD_LIBRARY_PATH:-}/opt/sqlite3/lib"
fi

log "configure ${CONF_FLAGS[*]}"
./configure "${CONF_FLAGS[@]}" > /tmp/configure.log 2>&1 \
    || { tail -n 50 /tmp/configure.log; exit 1; }

log "make -j$(nproc) (日志: /tmp/make.log)"
make -j"$(nproc)" > /tmp/make.log 2>&1 \
    || { tail -n 50 /tmp/make.log; exit 1; }
make install > /tmp/install.log 2>&1 \
    || { tail -n 50 /tmp/install.log; exit 1; }

"$PREFIX/bin/$PY_BIN" -V

# 清理源码, 减小镜像层体积 (仅源码编译时需要)
cd /
rm -rf /tmp/src

fi  # end if/else 预编译 Python 检查

# ---------------- 2. 安装预置包 ----------------
log "升级 pip / setuptools / wheel"
"$PREFIX/bin/$PY_BIN" -m pip install --no-cache-dir --upgrade pip setuptools wheel

if [ -n "$PY_PACKAGES" ]; then
    log "安装预置包: $PY_PACKAGES"
    # --prefer-binary: 老平台 (如 CentOS 7 glibc 2.17) 上新版包可能没有兼容 wheel,
    # 让 pip 自动降级到最后一个提供兼容 wheel 的版本, 而不是回退源码编译
    # shellcheck disable=SC2086
    "$PREFIX/bin/$PY_BIN" -m pip install --no-cache-dir --prefer-binary $PY_PACKAGES
fi

# ---------------- 3. 收集共享库依赖 ----------------
# 目标机可能是最小化系统, 除 glibc 家族外的依赖库 (libssl/libffi/libsqlite3 等)
# 全部拷贝到 $PREFIX/lib, 运行时由 python3 包装脚本通过 LD_LIBRARY_PATH 指向
log "收集非 glibc 运行时共享库"
EXCLUDE_RE='^(linux-vdso|ld-linux|libc\.so|libm\.so|libpthread\.so|libdl\.so|librt\.so|libutil\.so|libnsl\.so|libresolv\.so|libcrypt\.so)'
{
    echo "$PREFIX/bin/$PY_BIN"
    find "$PREFIX/lib" -type f -name '*.so*'
} | while read -r f; do
    ldd "$f" 2>/dev/null | awk '/=>/ {print $3}' || true
done | sort -u | while read -r lib; do
    [ -f "$lib" ] || continue
    base="$(basename "$lib")"
    echo "$base" | grep -qE "$EXCLUDE_RE" && continue
    case "$lib" in "$PREFIX"/*) continue ;; esac      # 已在环境内(如 wheel 自带 .libs)
    if [ ! -e "$PREFIX/lib/$base" ]; then
        cp -L "$lib" "$PREFIX/lib/$base"
        echo "    携带: $base"
    fi
done

log "编译层完成: $PREFIX"
