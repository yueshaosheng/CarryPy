#!/bin/sh
# [目标机执行] 增量包离线安装脚本
#   用法: ./install_addon.sh <mini_python 解压目录>
#   示例: ./install_addon.sh /opt/mini_python
set -e

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENV_DIR="${1:-}"

if [ -z "$ENV_DIR" ]; then
    echo "用法: $0 <mini_python 解压目录>"
    echo "示例: $0 /opt/mini_python"
    exit 1
fi

PY="$ENV_DIR/python3"
if [ ! -x "$PY" ]; then
    echo "错误: 找不到 $PY, 请确认目录是 mini_python 环境的解压路径"
    exit 1
fi

# 一致性校验: 增量包构建时的 Python 版本必须与目标环境一致
WANT_VER=$(sed -n 's/^python_version=//p' "$HERE/addon_info.txt" 2>/dev/null)
HAVE_VER=$("$PY" -c 'import platform; print(platform.python_version())')
if [ -n "$WANT_VER" ] && [ "$WANT_VER" != "$HAVE_VER" ]; then
    echo "错误: 增量包针对 Python $WANT_VER 构建, 目标环境是 Python $HAVE_VER, 不能安装"
    exit 1
fi

WANT_PLAT=$(sed -n 's/^platform=//p' "$HERE/addon_info.txt" 2>/dev/null)
HAVE_PLAT=$(sed -n 's/^platform=//p' "$ENV_DIR/env_info.txt" 2>/dev/null)
if [ -n "$WANT_PLAT" ] && [ -n "$HAVE_PLAT" ] && [ "$WANT_PLAT" != "$HAVE_PLAT" ]; then
    echo "错误: 增量包平台($WANT_PLAT)与目标环境平台($HAVE_PLAT)不一致, 不能安装"
    exit 1
fi

# 随包携带的系统共享库 (GUI 类包如 pyside2 需要): 先落到环境 lib/,
# 运行时由 python3 包装脚本的 LD_LIBRARY_PATH 指向; 不覆盖已有同名库
if [ -d "$HERE/syslibs" ]; then
    echo "==> 安装随包携带的共享库:"
    for lib in "$HERE/syslibs"/*; do
        base=$(basename "$lib")
        if [ -e "$ENV_DIR/lib/$base" ]; then
            echo "  跳过(已存在): $base"
        else
            cp "$lib" "$ENV_DIR/lib/$base"
            echo "  安装: $base"
        fi
    done
fi

echo "==> 离线安装: $(cat "$HERE/packages.txt" | tr '\n' ' ')"
"$PY" -m pip install --no-index --find-links "$HERE/wheels" -r "$HERE/packages.txt"

echo ""
echo "==> 安装完成, 功能冒烟测试:"
# 用增量包自带的自检脚本 (与本包一同构建, 知道待测包清单), 点名模式:
# 只测 packages.txt 里本次安装的包; 无内置用例的包回退 import 验证; FAIL 则非 0 退出
if [ -f "$HERE/selfcheck_pkgs.py" ]; then
    # shellcheck disable=SC2046
    "$PY" "$HERE/selfcheck_pkgs.py" $(cat "$HERE/packages.txt")
else
    # 兼容旧版增量包 (没带自检脚本): 逐个包做导入验证
    while read -r pkg; do
        [ -z "$pkg" ] && continue
        name=$(echo "$pkg" | sed -e 's/[=<>!~].*//' | tr 'A-Z' 'a-z')
        case "$name" in
            scikit-learn)  mod=sklearn ;;
            pillow)        mod=PIL ;;
            opencv-python) mod=cv2 ;;
            pyyaml)        mod=yaml ;;
            pyside2)       mod=PySide2 ;;
            pyside6)       mod=PySide6 ;;
            pyqt5)         mod=PyQt5 ;;
            pyqt6)         mod=PyQt6 ;;
            *)             mod=$(echo "$name" | tr '-' '_') ;;
        esac
        "$PY" -c "import $mod; print('  $name:', getattr($mod, '__version__', 'ok'))" \
            || echo "  警告: import $mod 失败, 请手动确认 (包名与模块名可能不同)"
    done < "$HERE/packages.txt"
fi
