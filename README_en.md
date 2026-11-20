[中文](README.md) | English

<img src="docs/assets/logo.png" alt="CarryPy logo" width="96">

# CarryPy — Minimal Python Environment Packager

![Release](https://img.shields.io/github/v/release/yueshaosheng/CarryPy)
![Downloads](https://img.shields.io/github/downloads/yueshaosheng/CarryPy/total)
![Platforms](https://img.shields.io/badge/platforms-10%20Linux%20distros-blue?logo=linux&logoColor=white)
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
- **Scientific addon pack** `addon-<platform>-numpy+...+h5py.tar.gz` —
  numpy / matplotlib / pandas / seaborn / openpyxl / scipy / scikit-learn / h5py, optional
- **GUI addon pack** `addon-<platform>-pyqt6.tar.gz` — PyQt6 (ubuntu18 ships a self-built
  Qt 6.2 runtime); centos7 gets the pyqt5 variant; centos6 (glibc 2.12) has no viable GUI pack, optional

Copy them to the target machine (fully offline is fine):

```bash
# 1. Extract the base pack — ready to use (no root, no installation)
tar xzf mini_python-ubuntu22_amd64-py3.11.16.tar.gz
./mini_python/selfcheck.sh                # self-check
./mini_python/python3 your_script.py      # run your script
./mini_python/pip3 list                   # list installed packages

# 2. (Optional) Install an addon pack (scientific set shown)
tar xzf addon-ubuntu22_amd64-numpy+matplotlib+pandas+seaborn+openpyxl+scipy+scikit-learn+h5py.tar.gz
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

Supported platforms: Ubuntu 18/20/22/24, Debian 11/12, CentOS 6/7, Rocky 8/9
(one config file each under `config/`; adding new platforms is covered in the advanced guide).

## Desktop GUI (Electron)

`desktop/` ships a desktop app built with **Electron + React + TypeScript + UnoCSS + Arco Design**
(architecture aligned with [AionUi](https://github.com/iOfficeAI/AionUi)): platform/preset picker,
one-click builds, live log streaming, task cancellation & history recovery, artifact management
(with undo after delete), Docker status, light/dark themes, and an AionUi-style **download page**
(auto-detects host OS/arch, Rosetta-corrected).

```bash
cd desktop
npm install
npm run dev          # dev mode (ROOT=repo root, artifacts go to repo dist/)
npm run dist:mac     # package macOS arm64 dmg → desktop/release/
npm run test:e2e     # Playwright end-to-end tests driving a real Electron window
```

Installers are built by a GitHub Actions matrix (macOS arm64/x64 dmg, Windows x64 exe,
Linux x64 deb/AppImage); pushing a `gui-v*` tag publishes them to Releases. The in-app download
page fetches the latest `gui-v*` release assets, with a bundled manifest as offline fallback.
On first launch the packaged app extracts build scripts to
`~/Library/Application Support/CarryPy/app-<version>/`; artifacts default to `~/CarryPy-dist`
(changeable in Settings). If macOS Gatekeeper blocks the first launch: right-click → Open, or
`xattr -dr com.apple.quarantine /Applications/CarryPy.app`. Building on Windows requires
Git for Windows (Git Bash).

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
