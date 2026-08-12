# mini_py_pack — 跨平台最小化 Python 环境打包工具

基于 Docker 为指定目标平台(如 Ubuntu 18.04 AMD64)构建**最小体积、可离线部署、免安装**的
Python 运行环境, 并支持后续**增量添加新包**。

## 目录

- [快速开始](#快速开始)
- [工作原理](#工作原理)
- [目录结构](#目录结构)
- [一、全量打包](#一全量打包)
- [二、目标机部署 (离线)](#二目标机部署-离线)
- [三、增量包 (后期添加新包)](#三增量包-后期添加新包)
- [四、扩展新平台](#四扩展新平台)
- [五、清理 Docker 镜像](#五清理-docker-镜像)
- [注意事项](#注意事项)

## 快速开始

前提: 打包机已安装并启动 Docker(macOS / Linux 均可, 无需与目标平台同架构)。

```bash
# 1. 打包机: 确认平台配置 (目标平台/Python 版本/预装包)
#    默认已内置 config/ubuntu18_amd64.conf, 与之一致可跳过此步;
#    其他平台则复制一份修改 (见"扩展新平台"章节)
cat config/ubuntu18_amd64.conf

# 2. 打包机: 构建全量包 (首次约 20~40 分钟, 国内网络建议加镜像变量, 见下文)
./build.sh -p ubuntu18_amd64
# → 产物: dist/mini_python-ubuntu18_amd64-py3.10.14.tar.gz

# 3. 目标机: 拷过去解压即用 (无需 root / 无需联网 / 无需安装)
tar xzf mini_python-ubuntu18_amd64-py3.10.14.tar.gz
mini_python/selfcheck.sh              # 自检
mini_python/python3 your_script.py    # 运行脚本

# 4. 后期加新包 (可选): 打包机构建增量包 → 目标机离线安装
./build_addon.sh scikit-learn         # 打包机, 复用第 2 步的构建镜像
tar xzf addon-*.tar.gz && addon-*/install_addon.sh /path/to/mini_python   # 目标机
```

各步骤的完整选项和说明见下面对应章节。

## 工作原理

```
宿主机(任意平台, 需 Docker)
 └─ build.sh
     └─ docker build --platform linux/amd64 (ubuntu:18.04)
         ├─ 源码编译 Python 3.10  →  /opt/mini_python
         ├─ pip 安装预装包 (numpy/pandas/scipy/seaborn 等, 见 config/*.conf)
         ├─ 收集非 glibc 共享库 (libssl/libffi/libsqlite3...) 随包携带
         ├─ 体积裁剪 (测试套件/头文件/静态库/IDLE/tkinter, strip 符号)
         └─ 打包 → dist/mini_python-ubuntu18_amd64-py3.10.14.tar.gz
```

- 构建全程在**与目标机一致的容器环境**中进行, 保证 glibc / ABI 兼容
- CPython 通过"可执行文件相对路径"定位标准库, 解压到任意目录都能跑
- 构建镜像会保留(`mini-py-pack/<平台>:py<版本>`), 增量包直接复用它构建

## 目录结构

```
├── build.sh                      # 全量打包入口 (宿主机)
├── build_addon.sh                # 增量包打包入口 (宿主机)
├── config/
│   ├── ubuntu18_amd64.conf       # 平台配置: 基础镜像/架构/Python版本/默认包
│   ├── ubuntu20_amd64.conf       # 平台扩展示例
│   ├── centos7_amd64.conf        # CentOS 7.9 (yum + vault 源 + 自编译 OpenSSL 1.1.1)
│   └── rocky8_amd64.conf         # Rocky Linux 8 (yum, 官方源活跃, 系统 OpenSSL 1.1.1)
├── docker/Dockerfile             # 通用构建镜像 (参数全部 build-arg 注入)
└── scripts/
    ├── build_python.sh           # [容器内] 编译 Python + 装预装包 + 收集共享库
    ├── package_python.sh         # [容器内] 裁剪 + 自检 + 打包 (独立 Docker 层)
    ├── make_addon.sh             # [容器内] 构建增量包 wheels + 收集系统库
    └── target_assets/            # 打进产物、在目标机上运行的脚本
        ├── python3               # 入口包装脚本 (设置 LD_LIBRARY_PATH 等)
        ├── pip3                  # pip 入口
        ├── selfcheck.sh          # 环境自检
        ├── selfcheck_pkgs.py     # 每个包的功能冒烟测试 (全量包/增量包共用)
        └── install_addon.sh      # 增量包离线安装脚本 (装完自动自检)
```

## 一、全量打包

```bash
# 默认: ubuntu18_amd64 + Python 3.10.14 + 配置文件中的 DEFAULT_PACKAGES
./build.sh

# 自定义
./build.sh -p ubuntu18_amd64 --python 3.10.14 --packages "numpy matplotlib pandas"

# 国内网络加速 (apt 镜像 + Python 源码镜像 + pip 镜像)
APT_MIRROR=mirrors.aliyun.com \
PYTHON_MIRROR=https://mirrors.huaweicloud.com/python \
PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple \
./build.sh
```

产物: `dist/mini_python-ubuntu18_amd64-py3.10.14.tar.gz` (体积随预装包而定,
默认 8 个包约 115 MB; 仅 numpy/matplotlib/pandas 时约 62 MB)

## 二、目标机部署 (离线)

把 tar.gz 拷到目标服务器(U 盘 / scp 均可):

```bash
tar xzf mini_python-ubuntu18_amd64-py3.10.14.tar.gz
cd mini_python

./selfcheck.sh          # 自检: 解释器/标准库/已装包
./python3 your_script.py
./pip3 list
```

无需 root、无需安装任何系统依赖, 目录可整体移动到任意路径。

## 三、增量包 (后期添加新包)

打包机上(需保留过全量构建的镜像):

```bash
./build_addon.sh scikit-learn
# 或带版本约束 / 多个包:
./build_addon.sh -p ubuntu18_amd64 "scikit-learn==1.3.2" xgboost
```

产物: `dist/addon-ubuntu18_amd64-scikit-learn-<日期>.tar.gz`
(包含新包及其**全部依赖**的 wheel, 目标机完全离线安装)

目标机上:

```bash
tar xzf addon-ubuntu18_amd64-scikit-learn-20260728.tar.gz
./addon-ubuntu18_amd64-scikit-learn-20260728/install_addon.sh /path/to/mini_python

# 验证
/path/to/mini_python/python3 -c "import sklearn; print(sklearn.__version__)"
```

安装脚本会先校验增量包与目标环境的 **Python 版本 / 平台一致性**, 不一致直接拒绝安装。

### GUI 包 (Qt 等) 增量包

GUI 类包的 wheel 依赖大量系统图形库 (glib/GL/X11/fontconfig 等), 最小化目标机上
往往没有。用 `--system-pkgs` 把它们随增量包携带 (ldd 自动收集, 安装时落到环境 lib/):

```bash
# Qt5 (PySide2 5.15) —— ubuntu18 / centos7 可用
./build_addon.sh -p ubuntu18_amd64 --system-pkgs \
  "libglib2.0-0 libgl1 libegl1 libfontconfig1 libfreetype6 libxkbcommon0 \
   libxkbcommon-x11-0 libdbus-1-3 libx11-6 libx11-xcb1 libxcb1 libxext6 \
   libxrender1 libxi6 libsm6 libice6 libxcb-icccm4 libxcb-image0 \
   libxcb-keysyms1 libxcb-randr0 libxcb-render-util0 libxcb-render0 \
   libxcb-shape0 libxcb-shm0 libxcb-sync1 libxcb-xfixes0 libxcb-xinerama0 \
   libxcb-xkb1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxtst6 \
   libxcursor1 libasound2 libnss3 libgssapi-krb5-2 \
   libgstreamer1.0-0 libgstreamer-plugins-base1.0-0" pyside2

# centos7 用 yum 包名: "glib2 mesa-libGL mesa-libEGL fontconfig freetype
#   libxkbcommon libxkbcommon-x11 dbus-libs libX11 libxcb libXext libXrender
#   libXi libSM libICE xcb-util xcb-util-image xcb-util-keysyms
#   xcb-util-renderutil xcb-util-wm libXcomposite libXdamage libXfixes
#   libXrandr libXtst alsa-lib nss gstreamer1 gstreamer1-plugins-base"

# Qt6 (PySide6) —— 仅 ubuntu20 及更新平台 (Qt6 二进制要求 glibc >= 2.28,
# ubuntu18=2.27 / centos7=2.17 无法运行, 老平台请用上面的 Qt5)
./build_addon.sh -p ubuntu20_amd64 --system-pkgs "... (同上, 另加 libopengl0 libxcb-cursor0)" pyside6
```

无显示器环境 (服务器/ssh) 运行 Qt 程序需加 `QT_QPA_PLATFORM=offscreen`;
若目标机没有 fontconfig 配置会有 `Fontconfig error` 告警, 不影响运行,
文字渲染需要时装系统字体或设置 `FONTCONFIG_PATH`。

## 四、扩展新平台

复制一份 `config/xxx.conf` 并修改即可, 例如 Debian 11 ARM64:

```bash
BASE_IMAGE="debian:11"
DOCKER_PLATFORM="linux/arm64"
PYTHON_VERSION="3.10.14"
DEFAULT_PACKAGES="numpy matplotlib pandas"
```

然后 `./build.sh -p 你的配置名`。

包管理器家族**无需声明**: 构建时按基础镜像内的 `/etc/os-release` 自动判断
(ubuntu/debian 走 apt, 其余走 yum)。RHEL 系平台参考已内置的 `config/centos7_amd64.conf`
(CentOS 7 构建时会自动切 vault 归档源并源码编译 OpenSSL 1.1.1, 见"注意事项")。

## 五、清理 Docker 镜像

本工具的容器都是即用即删(`--rm` / trap 兜底), **不会残留容器**; 但会保留两类镜像:

| 镜像 | 体积参考 | 作用 |
|---|---|---|
| `mini-py-pack/<平台>:py<版本>` | ~1.5GB | 构建镜像, **build_addon.sh 制作增量包时复用** |
| `ubuntu:18.04` / `centos:7` 等 | 100~200MB | 基础镜像, 重复构建时作缓存 |

```bash
docker images                                      # 查看现有镜像
docker rmi mini-py-pack/ubuntu18_amd64:py3.10.14   # 删指定构建镜像
docker image prune                                 # 清理构建失败产生的悬空镜像
docker builder prune                               # 清理 build 缓存
docker system df                                   # 查看 Docker 磁盘占用明细
```

注意:

- **删除构建镜像后, 增量包功能失效**, 需重新 `./build.sh` 完整构建(20~40 分钟)
  才能恢复; 若近期还要加包, 建议保留
- `dist/` 下已导出的 tar.gz 不依赖任何镜像, 删镜像不影响已交付的包
- 项目彻底结束时可一并清理: `docker rmi $(docker images -q 'mini-py-pack/*')`

## 注意事项

- **apt 源自动适配**: 构建时若 `apt-get update` 失败, 会自动切换到
  `old-releases.ubuntu.com` 重试(发行版 EOL 后仓库会被官方迁移到那里);
  仍失败则回滚并提示检查网络或改用 `APT_MIRROR` 镜像源
- **CentOS 7 支持**: CentOS 7 已彻底 EOL, 构建时自动切换到 `vault.centos.org`
  归档源(`APT_MIRROR` 非空时用 `<镜像>/centos-vault`); 系统 OpenSSL 1.0.2 低于
  Python 3.10 要求的 1.1.1, 构建镜像会自动源码编译一份, `libssl.so.1.1` 随包携带,
  目标机无需任何额外操作
- **跨架构构建**: 在 Apple Silicon / ARM 机器上构建 amd64 包会走 QEMU/Rosetta 模拟,
  编译耗时明显增加(约 20~40 分钟); Linux 宿主机若报 `exec format error`,
  先执行 `docker run --privileged --rm tonistiigi/binfmt --install all`
- **matplotlib**: 入口脚本默认设置 `MPLBACKEND=Agg`(服务器无图形界面), 绘图请用
  `plt.savefig()`; 如有 X 环境可通过 `MPLBACKEND=TkAgg` 覆盖(需自行补装 tkinter)
- **`--optimize`**: 加 PGO+LTO 编译, 解释器性能提升 10%~30%, 正式交付时建议开启
- **体积裁剪范围**: 已删除标准库测试/IDLE/tkinter/头文件/静态库、第三方包 tests 目录
  (numpy 除外, 其 `numpy.testing` 运行时依赖 tests 目录)、调试符号; 如某些包运行时
  依赖自身 tests 目录, 可在 `scripts/build_python.sh` 中调整裁剪规则
- **增量包机制**: 目标机上的环境保留了完整 pip, 所以任何时候也可以手动
  `./pip3 install --no-index --find-links <wheel目录> <包名>` 安装自备的 wheel
