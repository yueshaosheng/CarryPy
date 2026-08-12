#!/bin/sh
# 目标机环境自检: ./selfcheck.sh [额外要检查的import名, 如 sklearn]
set -e
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

echo "== 环境信息 =="
cat "$HERE/env_info.txt" 2>/dev/null || true
echo ""
echo "== 解释器 =="
"$HERE/python3" -V
"$HERE/python3" -c "import platform; print('  arch:', platform.machine()); print('  glibc:', platform.libc_ver()[1])"
echo ""
echo "== 标准库关键模块 =="
"$HERE/python3" -c "import ssl, sqlite3, lzma, bz2, zlib, ctypes; print('  ok')"
echo ""
echo "== 已安装包 =="
"$HERE/python3" -m pip list --no-index 2>/dev/null || "$HERE/python3" -m pip list

# 每个已安装的已知包跑一遍最小功能测试 (画图存文件/模型训练等, 不只 import)
echo ""
echo "== 功能冒烟测试 =="
"$HERE/python3" "$HERE/selfcheck_pkgs.py"

# 额外指定的模块导入检查
for mod in "$@"; do
    echo ""
    echo "== import $mod =="
    "$HERE/python3" -c "import $mod; print('  version:', getattr($mod, '__version__', 'ok'))"
done
