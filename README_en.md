[中文](README.md) | English

<img src="docs/assets/logo.png" alt="CarryPy logo" width="96">

# CarryPy — Minimal Python Environment Packager

![Release](https://img.shields.io/github/v/release/yueshaosheng/CarryPy)
![Downloads](https://img.shields.io/github/downloads/yueshaosheng/CarryPy/total)
![Platforms](https://img.shields.io/badge/platforms-9%20Linux%20distros-blue?logo=linux&logoColor=white)
![Docker](https://img.shields.io/badge/build%20with-Docker-2496ED?logo=docker&logoColor=white)
![Offline](https://img.shields.io/badge/offline--ready-brightgreen)
![No root](https://img.shields.io/badge/root-not%20required-success)
![License](https://img.shields.io/github/license/yueshaosheng/CarryPy)

Uses Docker to build **any Python version for any Linux distro** — a **minimal-size,
offline-deployable, install-free** Python runtime, with support for **incrementally adding
Python packages** afterwards.

## Option 1: Use the Ready-made Artifacts (Recommended)

Download from [Releases](https://github.com/yueshaosheng/CarryPy/releases):

- **Base pack** `mini_python-<platform>-py<version>.tar.gz` — Python interpreter + full standard library
- **Addon pack** `addon-<platform>-<packages>-<date>.tar.gz` — third-party packages
  (numpy / matplotlib / pandas / seaborn / openpyxl), optional, stack as needed

Copy them to the target machine (fully offline is fine):

```bash
# 1. Extract the base pack — ready to use (no root, no installation)
tar xzf mini_python-ubuntu22_amd64-py3.11.16.tar.gz
./mini_python/selfcheck.sh                # self-check
./mini_python/python3 your_script.py      # run your script
./mini_python/pip3 list                   # list installed packages

# 2. (Optional) Install an addon pack
tar xzf addon-ubuntu22_amd64-numpy+matplotlib+pandas+seaborn+openpyxl-20260825.tar.gz
./addon-*/install_addon.sh ./mini_python  # offline install + auto smoke test
```

The directory can be moved as a whole to any path at any time.

## Option 2: Build It Yourself (Docker required on the build machine)

**First, check the platform config file** `config/<platform>.conf` (edit it if needed) —
it defines the target platform, Python version and preset packages; the build command
picks it up via `-p <platform>`:

```bash
cat config/ubuntu22_amd64.conf
# BASE_IMAGE="ubuntu:22.04"       # Docker base image (must match the target machine)
# DOCKER_PLATFORM="linux/amd64"   # Target architecture
# PYTHON_VERSION="3.11"           # Python major.minor (latest patch auto-resolved)
# DEFAULT_PACKAGES="numpy matplotlib pandas seaborn openpyxl"  # Preset packages for a full build
```

**Then build:**

```bash
# Build an empty base pack (~5-10 min first time)
./build.sh -p ubuntu22_amd64 --packages ""

# Build an addon pack (reuses the build image; rebuilds it automatically if missing)
./build_addon.sh -p ubuntu22_amd64 scipy scikit-learn

# — or a full pack with preset packages in one shot (~20-40 min first time)
./build.sh -p ubuntu22_amd64
```

Artifacts land in `dist/`; deploy them exactly as in Option 1.

Supported platforms: Ubuntu 18/20/22/24, Debian 12, CentOS 6/7, Rocky 8/9
(one config file each under `config/`; adding new platforms is covered in the advanced guide).

## Common Errors

| Error | Fix |
|---|---|
| `错误: docker 守护进程未运行` | Start Docker Desktop first (macOS: `open -a Docker`), verify with `docker info` |
| `错误: 未安装 docker` | Install Docker Desktop (or Colima / OrbStack / Rancher Desktop) |

More errors and detailed troubleshooting: [Advanced Guide - Troubleshooting](docs/ADVANCED.md#troubleshooting)

## Advanced Guide

How it works, directory layout, artifact size & build time reference, full build options,
GUI (Qt) addon packages, adding new platforms, BASE_IMAGE rules, Docker image cleanup,
and all the caveats:

**→ [docs/ADVANCED.md](docs/ADVANCED.md)**
