#!/bin/sh
# 目标机环境自检: ./selfcheck.sh [额外要检查的import名, 如 sklearn]
set -e
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

# 所有检查结果输出到 selfcheck_result/ 文件夹 (日志 + 测试产物)
RESULT_DIR="$HERE/selfcheck_result"
mkdir -p "$RESULT_DIR"
LOG="$RESULT_DIR/selfcheck.log"

# stdout → 日志文件, stderr → 终端 (echo >&2 可让用户看到关键信息)
exec > "$LOG"

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
# 测试产物 (图片/CSV 等) 保存到 RESULT_DIR
echo ""
echo "== 功能冒烟测试 =="
"$HERE/python3" "$HERE/selfcheck_pkgs.py" --output-dir "$RESULT_DIR"

# 额外指定的模块导入检查
for mod in "$@"; do
    echo ""
    echo "== import $mod =="
    "$HERE/python3" -c "import $mod; print('  version:', getattr($mod, '__version__', 'ok'))"
done

echo ""
echo "=============================="
echo "自检完成, 结果已保存到: $RESULT_DIR"
echo "  日志    : $LOG"
echo "  测试产物: $RESULT_DIR/*.png, *.csv 等"
echo "=============================="

# 关键信息输出到终端 (exec 只重定向了 stdout)
echo >&2 ""
echo >&2 "自检完成, 结果已保存到: $RESULT_DIR"
echo >&2 "  日志    : $LOG"
echo >&2 "  测试产物: $RESULT_DIR/*.png, *.csv 等"
