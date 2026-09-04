[English](ADVANCED.md) | 中文 | [← 返回 README](../README.md)

# 进阶指南

CarryPy 的详细参考: 工作原理、构建选项、体积/时间数据、平台扩展与问题排查。
日常使用见 [README](../README.md)。

## 目录

- [工作原理](#工作原理)
- [目录结构](#目录结构)
- [全量打包 (完整选项)](#全量打包-完整选项)
- [产物体积参考](#产物体积参考)
- [构建时间参考](#构建时间参考)
- [增量包 (详细说明)](#增量包-详细说明)
- [扩展新平台](#扩展新平台)
- [清理 Docker 镜像](#清理-docker-镜像)
- [注意事项](#注意事项)
- [常见报错](#常见报错)

## 工作原理

```
宿主机(任意平台, 需 Docker)
 └─ build.sh
     └─ docker build --platform linux/amd64 (ubuntu:18.04)
         ├─ 源码编译 Python 3.10  →  /opt/mini_python
         ├─ pip 安装预装包 (numpy/pandas/scipy/seaborn 等, 见 config/*.conf)
         ├─ 收集非 glibc 共享库 (libssl/libffi/libsqlite3...) 随包携带
         ├─ 体积裁剪 (测试套件/头文件/静态库/IDLE/tkinter, strip 符号)
         └─ 打包 → dist/mini_python-ubuntu18_amd64-py3.11.9.tar.gz
```

- 构建全程在**与目标机一致的容器环境**中进行, 保证 glibc / ABI 兼容
- CPython 通过"可执行文件相对路径"定位标准库, 解压到任意目录都能跑
- 构建镜像会保留(`mini-py-pack/<平台>:py<版本>`), 增量包直接复用它构建

### 增量包 (build_addon.sh)

```
宿主机(任意平台, 需 Docker)
 └─ build_addon.sh <包1> [包2 ...]
     └─ docker run (复用 build.sh 保留的构建镜像, 缺失时自动空包补建)
         ├─ pip wheel 下载/编译新包及其全部依赖 (仅 sdist 的包才现场编译)
         ├─ 临时安装后 ldd 收集环境外共享库 (glibc 家族除外)
         └─ 打包 wheels + 共享库 + 离线安装脚本 → dist/addon-*.tar.gz
```

- "编译工具链"(gcc/make/开发库)只存在于构建镜像中, **不进入产物**; 产物只有裁剪后的 Python 环境
- 空包基础包(`./build.sh --packages ""`) = 解释器 + **完整标准库**(仅裁减了测试套件/IDLE/头文件等),
  不含第三方包; 配合增量包按需叠加, 总体积 ≈ 全量包

## 目录结构

```
├── build.sh                      # 全量打包入口 (宿主机)
├── build_addon.sh                # 增量包打包入口 (宿主机)
├── config/
│   ├── ubuntu18_amd64.conf       # Ubuntu 18.04 (EOL, 自动切 old-releases 源)
│   ├── ubuntu20_amd64.conf       # Ubuntu 20.04 LTS
│   ├── ubuntu22_amd64.conf       # Ubuntu 22.04 LTS
│   ├── ubuntu24_amd64.conf       # Ubuntu 24.04 LTS
│   ├── debian11_amd64.conf       # Debian 11 (LTS 已结束, 自动切 archive 源)
│   ├── debian12_amd64.conf       # Debian 12 (DEB822 格式源)
│   ├── centos6_amd64.conf        # CentOS 6.10 (EOL, SCL + 自编译 OpenSSL + sqlite3)
│   ├── centos7_amd64.conf        # CentOS 7.9 (EOL, vault 源 + 自编译 OpenSSL)
│   ├── rocky8_amd64.conf         # Rocky Linux 8
│   └── rocky9_amd64.conf         # Rocky Linux 9
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

## 全量打包 (完整选项)

```bash
# 默认: ubuntu18_amd64 + Python 3.11 (自动解析最新 patch) + 配置文件中的 DEFAULT_PACKAGES
./build.sh

# 自定义
./build.sh -p ubuntu18_amd64 --python 3.11 --packages "numpy matplotlib pandas"

# 空包基础包 (不含第三方包)
./build.sh -p ubuntu18_amd64 --packages ""

# 海外环境可覆盖为官方源
APT_MIRROR="" \
PYTHON_MIRROR=https://www.python.org/ftp/python \
PIP_INDEX_URL=https://pypi.org/simple \
./build.sh
```

产物: `dist/mini_python-<平台>-py<版本>.tar.gz`

## 产物体积参考

实测于 2026-09-04。

**空包基础包**(`--packages ""`, 解释器 + 完整标准库, 不含第三方包):

| 平台 | Python | 体积 |
|---|---|---|
| CentOS 6 AMD64 | 3.11.16 | 12 MB |
| CentOS 7 AMD64 | 3.11.16 | 11 MB |
| Rocky 8 AMD64 | 3.11.16 | 12 MB |
| Rocky 9 AMD64 | 3.11.16 | 13 MB |
| Ubuntu 18 / 20 AMD64 | 3.11.16 | 12 MB |
| Ubuntu 22 / 24 AMD64 | 3.11.16 | 13 MB |
| Debian 11 AMD64 | 3.11.16 | 12 MB |
| Debian 12 AMD64 | 3.11.16 | 13 MB |

**addon 增量包 — 科学计算套**(`numpy matplotlib pandas seaborn openpyxl scipy scikit-learn`):

| 平台 | 体积 | 备注 |
|---|---|---|
| CentOS 6 | 80 MB | 固定版本组合源码编译 (scipy 1.11.3 / sklearn 1.3.2), 随包携带 OpenBLAS / libgfortran / freetype 2.10.4 |
| CentOS 7 | 96 MB | manylinux2014 兼容版 (scipy 1.16.3 / sklearn 1.7.2 / numpy 2.2.6) |
| 其余 8 个平台 | 93~94 MB | 全部最新预编译 wheel (numpy 2.4.6 / scipy 1.17.1 / sklearn 1.9.0) |

**addon 增量包 — GUI 套**:

| 平台 | 包 | 体积 |
|---|---|---|
| ubuntu20/22/24, debian11/12, rocky8/9 | pyqt6 | 91~98 MB |
| ubuntu18 | pyqt6 (自编 Qt 6.2.4 运行时) | 50 MB |
| centos7 | pyqt5 | 72 MB |
| centos6 | 无 (glibc 2.12 低于 Qt 二进制基线) | — |

> 基础包 + 科学计算套 ≈ 105~107 MB, 即为一个全功能离线科学计算环境;
> 旧版 5 包 addon (约 51 MB) 与全量包 (约 69 MB) 已由双 addon 体系取代

## 构建时间参考

实测于 Apple Silicon (macOS 通过 QEMU/Rosetta 模拟构建 linux/amd64), 2026-08-26:

| 场景 | Apple Silicon (模拟构建) | 原生 amd64 Linux |
|---|---|---|
| 全量包（带默认包） | 20~40 分钟 | 5~10 分钟 |
| 空包基础包 | 5~10 分钟 | 2~4 分钟 |
| addon（包有二进制 wheel） | 3~5 分钟 | 1~2 分钟 |
| addon（需源码编译, 如 CentOS 6） | 10~35 分钟 | 3~10 分钟 |

- 同一平台二次构建大部分命中 Docker 层缓存, 秒级~分钟级完成
- 时间瓶颈在 Python 源码编译 (make)
- 加速手段: Docker Desktop 启用 Rosetta 模拟(比 QEMU 快 2~4 倍); 原生 amd64 Linux 上构建;
  多平台并行构建; 不要随意加 `--no-cache`; `PYTHON_BUILD_TAG` 可走 python-build-standalone
  预编译通道(CentOS 6 等 glibc < 2.17 平台不可用)

## 增量包 (详细说明)

打包机上(构建镜像缺失时会自动以空包模式补建):

```bash
./build_addon.sh scikit-learn
# 或带版本约束 / 多个包:
./build_addon.sh -p ubuntu18_amd64 "scikit-learn==1.3.2" xgboost
```

产物: `dist/addon-ubuntu18_amd64-scikit-learn.tar.gz`
(包含新包及其**全部依赖**的 wheel, 目标机完全离线安装)

目标机上:

```bash
tar xzf addon-ubuntu18_amd64-scikit-learn.tar.gz
./addon-ubuntu18_amd64-scikit-learn/install_addon.sh /path/to/mini_python

# 验证
/path/to/mini_python/python3 -c "import sklearn; print(sklearn.__version__)"
```

安装脚本会先校验增量包与目标环境的 **Python 版本 / 平台一致性**, 不一致直接拒绝安装。

### GUI 包 (Qt 等) 增量包

GUI 套按目标机 glibc 版本分两档:

- **glibc >= 2.28** (ubuntu20/22/24, debian11/12, rocky8/9): `pyqt6` (官方 wheel)
- **ubuntu18 (glibc 2.27)**: `pyqt6` 自编运行时版 — PPA gcc-9 源码编译 qtbase 6.2.4,
  打包为 manylinux1 标签的 PyQt6-Qt6 wheel + 官方 PyQt6 6.2.3 绑定 (本身即 manylinux1),
  产物约 50MB, offscreen 渲染实测通过; 编译环境保留在 `u18_qt6_stage` 镜像中可复现
- **centos7 (glibc 2.17)**: `pyqt5`
  (PyQt6-Qt6 wheel 历史上只发布过 manylinux_2_28, 无任何版本可回退)
- **centos6 (glibc 2.12)**: 无可行 GUI 包 — 实测 PyQt5 5.14 (manylinux1) 能安装,
  但 import 报 `GLIBC_2.14 not found`, 现代 Qt 二进制的 glibc 基线均高于 2.12

GUI 类包的 wheel 依赖大量系统图形库 (glib/GL/X11/fontconfig 等), 最小化目标机上
往往没有。用 `--system-pkgs` 把它们随增量包携带 (ldd 自动收集, 安装时落到环境 lib/):

```bash
# pyqt6 — apt 平台; 注意 Ubuntu 24.04 t64 迁移改包名:
#   libglib2.0-0 -> libglib2.0-0t64, libasound2 -> libasound2t64
./build_addon.sh -p ubuntu22_amd64 --system-pkgs \
  "libglib2.0-0 libgl1 libegl1 libfontconfig1 libfreetype6 libxkbcommon0 \
   libxkbcommon-x11-0 libdbus-1-3 libx11-6 libx11-xcb1 libxcb1 libxext6 \
   libxrender1 libxi6 libsm6 libice6 libxcb-icccm4 libxcb-image0 \
   libxcb-keysyms1 libxcb-randr0 libxcb-render-util0 libxcb-render0 \
   libxcb-shape0 libxcb-shm0 libxcb-sync1 libxcb-xfixes0 libxcb-xinerama0 \
   libxcb-xkb1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxtst6 \
   libxcursor1 libasound2 libnss3 libgssapi-krb5-2 \
   libgstreamer1.0-0 libgstreamer-plugins-base1.0-0 libopengl0 libxcb-cursor0" pyqt6

# pyqt6 — rocky8/9 用 dnf 包名 (注意: rocky8 仓库无 xcb-util-cursor, 必须去掉;
#   rocky9 有): "glib2 mesa-libGL mesa-libEGL fontconfig freetype libxkbcommon
#   libxkbcommon-x11 dbus-libs libX11 libXext libXrender libXi libSM libICE
#   xcb-util xcb-util-image xcb-util-keysyms xcb-util-renderutil xcb-util-wm
#   libXcomposite libXdamage libXfixes libXrandr libXtst libXcursor alsa-lib
#   nss gstreamer1 gstreamer1-plugins-base [rocky9 另加 xcb-util-cursor]"

# pyqt5 — 老平台: ubuntu18 用 apt 清单, centos7 用 yum 包名清单 (均无 xcb-util-cursor):
./build_addon.sh -p centos7_amd64 --system-pkgs \
  "glib2 mesa-libGL mesa-libEGL fontconfig freetype libxkbcommon libxkbcommon-x11 \
   dbus-libs libX11 libXext libXrender libXi libSM libICE xcb-util xcb-util-image \
   xcb-util-keysyms xcb-util-renderutil xcb-util-wm libXcomposite libXdamage \
   libXfixes libXrandr libXtst alsa-lib nss gstreamer1 gstreamer1-plugins-base" pyqt5
```

PySide2/PySide6 同理 (库清单类似, Qt6 同样要求 glibc >= 2.28)。
无显示器环境 (服务器/ssh) 运行 Qt 程序需加 `QT_QPA_PLATFORM=offscreen`;
若目标机没有 fontconfig 配置会有 `Fontconfig error` 告警, 不影响运行,
文字渲染需要时装系统字体或设置 `FONTCONFIG_PATH`。

## 扩展新平台

复制一份 `config/xxx.conf` 并修改即可, 例如 Debian 11 ARM64:

```bash
BASE_IMAGE="debian:11"
DOCKER_PLATFORM="linux/arm64"
PYTHON_VERSION="3.11"
DEFAULT_PACKAGES="numpy matplotlib pandas"
```

然后 `./build.sh -p 你的配置名`。

### BASE_IMAGE 写法说明

`BASE_IMAGE` 是 Docker Hub 的 `仓库名:标签` (如 `ubuntu:18.04`), docker build 时**按标签精确拉取**, 不是搜索:

- 标签必须真实存在: `centos:7.9` 是无效标签(CentOS 的最小粒度是 `7.9.2009`), 写错会直接报 `manifest unknown`
- 推荐写大版本: `centos:7` / `ubuntu:18.04` / `debian:12` / `rockylinux:9`; EOL 发行版的官方标签已固定到最后一个点版本, 不会再漂移; 需要锁定精确版本时写完整标签(如 `centos:7.9.2009`)
- 查可用标签: Docker Hub 官方镜像的 Tags 页(如 `hub.docker.com/_/ubuntu/tags`), 或命令行:
  ```bash
  curl -s "https://registry.hub.docker.com/v2/repositories/library/ubuntu/tags?page_size=100" \
      | grep -oE '"name": *"[^"]+"'
  ```
- 选版本原则: 基础镜像的 glibc 版本要 **≤ 目标机**的 glibc, 且尽量与目标机同版本(保证 wheel/共享库兼容)

包管理器家族**无需声明**: 构建时按基础镜像内的 `/etc/os-release` 自动判断
(ubuntu/debian 走 apt, 其余走 yum)。RHEL 系平台参考已内置的 `config/centos7_amd64.conf`
(CentOS 7 构建时会自动切 vault 归档源并源码编译 OpenSSL 1.1.1, 见"注意事项")。

## 清理 Docker 镜像

本工具的容器都是即用即删(`--rm` / trap 兜底), **不会残留容器**; 但会保留两类镜像:

| 镜像 | 体积参考 | 作用 |
|---|---|---|
| `mini-py-pack/<平台>:py<版本>` | ~1.5GB | 构建镜像, **build_addon.sh 制作增量包时复用** |
| `ubuntu:18.04` / `centos:7` 等 | 100~200MB | 基础镜像, 重复构建时作缓存 |

```bash
docker images                                      # 查看现有镜像
docker rmi mini-py-pack/ubuntu18_amd64:py3.11   # 删指定构建镜像
docker image prune                                 # 清理构建失败产生的悬空镜像
docker builder prune                               # 清理 build 缓存
docker system df                                   # 查看 Docker 磁盘占用明细
```

注意:

- **删除构建镜像后**, 首次构建增量包会自动以空包模式补建镜像(耗时等同一次空包构建,
  约 5~10 分钟); 若近期还要加包, 建议保留
- `dist/` 下已导出的 tar.gz 不依赖任何镜像, 删镜像不影响已交付的包
- 项目彻底结束时可一并清理: `docker rmi $(docker images -q 'mini-py-pack/*')`

## 注意事项

- **apt 源自动适配**: 支持 Ubuntu 和 Debian 全系列。自动识别源配置文件位置
  (Debian ≥12 用 DEB822 格式 `debian.sources`); `apt-get update` 失败时自动切换归档源
  (Ubuntu → `old-releases.ubuntu.com`; Debian → `archive.debian.org`);
  仍失败则回滚并提示检查网络或改用 `APT_MIRROR` 镜像源
- **CentOS 7 支持**: CentOS 7 已彻底 EOL, 构建时自动切换到 `vault.centos.org`
  归档源(`APT_MIRROR` 非空时用 `<镜像>/centos-vault`); 系统 OpenSSL 1.0.2 低于
  Python 3.10 要求的 1.1.1, 构建镜像会自动源码编译一份, `libssl.so.1.1` 随包携带,
  目标机无需任何额外操作
- **CentOS 6 特殊性**: devtoolset-9 (GCC 9.1) + 自编译 OpenSSL 1.1.1w + sqlite3 3.46;
  最新第三方包在该平台无法编译, `config/centos6_amd64.conf` 已固定实测可用版本组合
  (numpy==1.26.4 / matplotlib==3.7.5 / pandas==2.2.1 / seaborn==0.13.2);
  全量包模式编译 pillow 会因系统 freetype 2.3 过旧失败, 请用"空包基础 + 增量包"双阶段模式
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

## 常见报错

### `错误: docker 守护进程未运行`

`build.sh` / `build_addon.sh` 的前置检查(`docker info` 连通性)报此错。

**原因**: `docker` 命令只是*客户端*; 真正干活的引擎(`dockerd` 守护进程)运行在
Docker Desktop 管理的 Linux 虚拟机里——容器需要 Linux 内核, macOS/Windows 原生没有。
Docker Desktop 没启动时, 虚拟机和守护进程都不存在, 所有 docker 命令都会失败——
即使 `which docker` 仍能找到命令。就像手里有遥控器 ≠ 电视开着。

**解决**:

- macOS: 启动 Docker Desktop (或执行 `open -a Docker`), 等待 10~30 秒后用 `docker info` 验证
- Windows: 启动 Docker Desktop (WSL2 后端); 若在 WSL2 内装的原生 dockerd:
  `sudo service docker start`
- 一劳永逸: Docker Desktop → Settings → General → 勾选
  "Start Docker Desktop when you sign in to your computer" (登录时自动启动)

类似地, `错误: 未安装 docker` 表示 docker 客户端本身没装——安装 Docker Desktop
(或 Colima / OrbStack / Rancher Desktop 等等价运行时)。

### 拉取 BASE_IMAGE 时报 `manifest unknown`

`BASE_IMAGE` 的标签在 Docker Hub 上不存在。核对可用标签的精确写法,
见 [BASE_IMAGE 写法说明](#base_image-写法说明)。

### Apple Silicon 上报 `exec format error`

QEMU 跨架构模拟未注册。执行一次:
`docker run --privileged --rm tonistiigi/binfmt --install all`
