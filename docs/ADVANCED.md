English | [中文](ADVANCED_zh.md) | [← Back to README](../README.md)

# Advanced Guide

Detailed reference for CarryPy: how it works, build options, size/time data,
platform extension and troubleshooting. For day-to-day usage see the [README](../README.md).

## Table of Contents

- [How It Works](#how-it-works)
- [Directory Layout](#directory-layout)
- [Full Build (Options)](#full-build-options)
- [Artifact Size Reference](#artifact-size-reference)
- [Build Time Reference](#build-time-reference)
- [Addon Packages (Details)](#addon-packages-details)
- [Adding a New Platform](#adding-a-new-platform)
- [Cleaning Up Docker Images](#cleaning-up-docker-images)
- [Notes](#notes)
- [Troubleshooting](#troubleshooting)

## How It Works

```
Build host (any platform, Docker required)
 └─ build.sh
     └─ docker build --platform linux/amd64 (ubuntu:18.04)
         ├─ Compile Python 3.10 from source  →  /opt/mini_python
         ├─ pip install preset packages (numpy/pandas/scipy/seaborn etc., see config/*.conf)
         ├─ Collect non-glibc shared libs (libssl/libffi/libsqlite3...) shipped with the pack
         ├─ Trim size (test suites/headers/static libs/IDLE/tkinter, strip symbols)
         └─ Package → dist/mini_python-ubuntu18_amd64-py3.11.9.tar.gz
```

- The entire build runs **inside a container matching the target machine**, guaranteeing glibc / ABI compatibility
- CPython locates its standard library via paths relative to the executable, so it works when extracted to any directory
- The build image is kept (`mini-py-pack/<platform>:py<version>`) and reused directly for addon packages

### Addon Packages (build_addon.sh)

```
Build host (any platform, Docker required)
 └─ build_addon.sh <pkg1> [pkg2 ...]
     └─ docker run (reuses the build image kept by build.sh; auto-rebuilds it with an empty package list if missing)
         ├─ pip wheel downloads/compiles the new packages and all their dependencies (only sdist-only packages are compiled)
         ├─ After a temporary install, ldd collects shared libraries outside the environment (glibc family excluded)
         └─ Package wheels + shared libs + offline install script → dist/addon-*.tar.gz
```

- The "compile toolchain" (gcc/make/dev libraries) lives only in the build image and **never enters the artifact**; the artifact contains only the trimmed Python environment
- An empty base pack (`./build.sh --packages ""`) = interpreter + **full standard library** (only test suites/IDLE/headers etc. are removed),
  with no third-party packages; stack addons on top as needed — combined size ≈ full pack

## Directory Layout

```
├── build.sh                      # Full-build entry (host side)
├── build_addon.sh                # Addon-build entry (host side)
├── config/
│   ├── ubuntu18_amd64.conf       # Ubuntu 18.04 (EOL, auto-switches to old-releases sources)
│   ├── ubuntu20_amd64.conf       # Ubuntu 20.04 LTS
│   ├── ubuntu22_amd64.conf       # Ubuntu 22.04 LTS
│   ├── ubuntu24_amd64.conf       # Ubuntu 24.04 LTS
│   ├── debian12_amd64.conf       # Debian 12 (DEB822-format sources)
│   ├── centos6_amd64.conf        # CentOS 6.10 (EOL, SCL + self-built OpenSSL + sqlite3)
│   ├── centos7_amd64.conf        # CentOS 7.9 (EOL, vault sources + self-built OpenSSL)
│   ├── rocky8_amd64.conf         # Rocky Linux 8
│   └── rocky9_amd64.conf         # Rocky Linux 9
├── docker/Dockerfile             # Generic build image (all parameters injected via build-args)
└── scripts/
    ├── build_python.sh           # [in container] compile Python + install preset packages + collect shared libs
    ├── package_python.sh         # [in container] trim + selfcheck + package (separate Docker layer)
    ├── make_addon.sh             # [in container] build addon wheels + collect system libraries
    └── target_assets/            # scripts shipped inside the artifact, run on the target machine
        ├── python3               # entry wrapper script (sets LD_LIBRARY_PATH etc.)
        ├── pip3                  # pip entry
        ├── selfcheck.sh          # environment self-check
        ├── selfcheck_pkgs.py     # per-package functional smoke tests (shared by full packs and addons)
        └── install_addon.sh      # offline addon installer (auto self-check after install)
```

## Full Build (Options)

```bash
# Default: ubuntu18_amd64 + Python 3.11 (latest patch auto-resolved) + DEFAULT_PACKAGES from the config
./build.sh

# Customized
./build.sh -p ubuntu18_amd64 --python 3.11 --packages "numpy matplotlib pandas"

# Empty base pack (no third-party packages)
./build.sh -p ubuntu18_amd64 --packages ""

# Outside China, override to official sources
APT_MIRROR="" \
PYTHON_MIRROR=https://www.python.org/ftp/python \
PIP_INDEX_URL=https://pypi.org/simple \
./build.sh
```

Artifact: `dist/mini_python-<platform>-py<version>.tar.gz`

## Artifact Size Reference

Measured on 2026-08-26.

**Empty base packs** (`--packages ""`, interpreter + full standard library, no third-party packages):

| Platform | Python | Size |
|---|---|---|
| CentOS 6 AMD64 | 3.11.16 | 12 MB |
| CentOS 7 AMD64 | 3.11.16 | 11 MB |
| Rocky 8 AMD64 | 3.11.16 | 12 MB |
| Rocky 9 AMD64 | 3.11.16 | 13 MB |
| Ubuntu 18 / 20 AMD64 | 3.11.16 | 12 MB |
| Ubuntu 22 / 24 AMD64 | 3.11.16 | 13 MB |
| Debian 12 AMD64 | 3.11.16 | 13 MB |

**Addon packages** (`numpy matplotlib pandas seaborn openpyxl`, 15-17 wheels):

| Platform | Size | Notes |
|---|---|---|
| CentOS 6 AMD64 | 40 MB | source-compiled pinned set + bundled libfreetype 2.10.4 |
| CentOS 7 AMD64 | 53 MB | 17 wheels (extra pytz/tzdata) |
| The other 7 platforms | 51 MB | all prebuilt wheels |

> Base pack + addon ≈ full-pack size (e.g. ubuntu22: 13+51=64 MB vs 69 MB full pack)

**Full packs** (preset packages `numpy matplotlib pandas seaborn openpyxl`, for comparison):

| Platform | Python | Archive Size |
|---|---|---|
| Ubuntu 18 / 20 / 22 AMD64 | 3.11.16 | 68-69 MB |
| CentOS 7 AMD64 | 3.11.16 | 69 MB |
| Rocky 8 / 9 AMD64 | 3.11.16 | 67-69 MB |
| Debian 12 AMD64 | 3.11.16 | 69 MB |

Addon example: `addon-ubuntu18_amd64-scipy+scikit-learn` ≈ 59 MB (7 wheels)

> Sizes vary with the number of preset packages; numpy/matplotlib/pandas only is about 50-55 MB

## Build Time Reference

Measured on Apple Silicon (macOS building linux/amd64 via QEMU/Rosetta emulation), 2026-08-26:

| Scenario | Apple Silicon (emulated) | Native amd64 Linux |
|---|---|---|
| Full pack (with default packages) | 20-40 min | 5-10 min |
| Empty base pack | 5-10 min | 2-4 min |
| Addon (packages have binary wheels) | 3-5 min | 1-2 min |
| Addon (source compilation needed, e.g. CentOS 6) | 10-35 min | 3-10 min |

- Rebuilding the same platform mostly hits the Docker layer cache and finishes in seconds to minutes
- The bottleneck is compiling Python from source (make)
- Speed-ups: enable Rosetta emulation in Docker Desktop (2-4x vs QEMU); build on native amd64
  Linux; run multiple platforms in parallel; don't add `--no-cache` casually;
  `PYTHON_BUILD_TAG` enables prebuilt Python (python-build-standalone, unusable on glibc < 2.17
  platforms like CentOS 6)

## Addon Packages (Details)

On the build machine (if the build image is missing, it is automatically rebuilt with an empty package list):

```bash
./build_addon.sh scikit-learn
# Or with version constraints / multiple packages:
./build_addon.sh -p ubuntu18_amd64 "scikit-learn==1.3.2" xgboost
```

Artifact: `dist/addon-ubuntu18_amd64-scikit-learn-<date>.tar.gz`
(contains the wheels of the new packages **and all their dependencies**, fully offline installable on the target)

On the target machine:

```bash
tar xzf addon-ubuntu18_amd64-scikit-learn-20260728.tar.gz
./addon-ubuntu18_amd64-scikit-learn-20260728/install_addon.sh /path/to/mini_python

# Verify
/path/to/mini_python/python3 -c "import sklearn; print(sklearn.__version__)"
```

The installer first verifies **Python version / platform consistency** between the addon and the
target environment, and refuses to install on a mismatch.

### Addons for GUI Packages (Qt etc.)

GUI package wheels depend on many system graphics libraries (glib/GL/X11/fontconfig etc.) that
minimal target machines usually lack. Use `--system-pkgs` to ship them with the addon
(collected automatically via ldd, installed into the environment's lib/ on the target):

```bash
# Qt5 (PySide2 5.15) — works on ubuntu18 / centos7
./build_addon.sh -p ubuntu18_amd64 --system-pkgs \
  "libglib2.0-0 libgl1 libegl1 libfontconfig1 libfreetype6 libxkbcommon0 \
   libxkbcommon-x11-0 libdbus-1-3 libx11-6 libx11-xcb1 libxcb1 libxext6 \
   libxrender1 libxi6 libsm6 libice6 libxcb-icccm4 libxcb-image0 \
   libxcb-keysyms1 libxcb-randr0 libxcb-render-util0 libxcb-render0 \
   libxcb-shape0 libxcb-shm0 libxcb-sync1 libxcb-xfixes0 libxcb-xinerama0 \
   libxcb-xkb1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxtst6 \
   libxcursor1 libasound2 libnss3 libgssapi-krb5-2 \
   libgstreamer1.0-0 libgstreamer-plugins-base1.0-0" pyside2

# On centos7 use yum package names: "glib2 mesa-libGL mesa-libEGL fontconfig freetype
#   libxkbcommon libxkbcommon-x11 dbus-libs libX11 libxcb libXext libXrender
#   libXi libSM libICE xcb-util xcb-util-image xcb-util-keysyms
#   xcb-util-renderutil xcb-util-wm libXcomposite libXdamage libXfixes
#   libXrandr libXtst alsa-lib nss gstreamer1 gstreamer1-plugins-base"

# Qt6 (PySide6) — ubuntu20 and newer only (Qt6 binaries require glibc >= 2.28;
# ubuntu18=2.27 / centos7=2.17 cannot run them — use Qt5 above on older platforms)
./build_addon.sh -p ubuntu20_amd64 --system-pkgs "... (same as above, plus libopengl0 libxcb-cursor0)" pyside6
```

In display-less environments (servers/ssh), run Qt programs with `QT_QPA_PLATFORM=offscreen`;
if the target has no fontconfig configuration you will see `Fontconfig error` warnings — they do
not affect execution; install system fonts or set `FONTCONFIG_PATH` if text rendering is needed.

## Adding a New Platform

Copy a `config/xxx.conf` and edit it, e.g. Debian 11 ARM64:

```bash
BASE_IMAGE="debian:11"
DOCKER_PLATFORM="linux/arm64"
PYTHON_VERSION="3.11"
DEFAULT_PACKAGES="numpy matplotlib pandas"
```

Then run `./build.sh -p <your-config-name>`.

### How to Write BASE_IMAGE

`BASE_IMAGE` is a Docker Hub `repository:tag` (e.g. `ubuntu:18.04`); docker build **pulls it
exactly by tag** — there is no searching:

- The tag must actually exist: `centos:7.9` is invalid (CentOS's finest granularity is `7.9.2009`); a wrong tag fails immediately with `manifest unknown`
- Prefer major versions: `centos:7` / `ubuntu:18.04` / `debian:12` / `rockylinux:9`; for EOL distros the official tags are pinned to the final point release and won't drift. Write the full tag (e.g. `centos:7.9.2009`) only when you need to pin an exact version
- Browse available tags on the official image's Tags page on Docker Hub (e.g. `hub.docker.com/_/ubuntu/tags`), or from the command line:
  ```bash
  curl -s "https://registry.hub.docker.com/v2/repositories/library/ubuntu/tags?page_size=100" \
      | grep -oE '"name": *"[^"]+"'
  ```
- Version rule: the base image's glibc must be **<= the target machine's** glibc, and ideally the same version (to guarantee wheel/shared-library compatibility)

The package-manager family needs **no declaration**: the build auto-detects it from
`/etc/os-release` inside the base image (ubuntu/debian use apt, everything else uses yum).
For RHEL-family platforms refer to the built-in `config/centos7_amd64.conf` (CentOS 7 builds
automatically switch to the vault archive sources and compile OpenSSL 1.1.1 from source, see "Notes").

## Cleaning Up Docker Images

All containers used by this tool are ephemeral (`--rm` / trap fallback) — **no leftover containers**;
but two kinds of images are kept:

| Image | Size Reference | Purpose |
|---|---|---|
| `mini-py-pack/<platform>:py<version>` | ~1.5GB | Build image, **reused by build_addon.sh for addons** |
| `ubuntu:18.04` / `centos:7` etc. | 100-200MB | Base images, cached for repeat builds |

```bash
docker images                                      # list images
docker rmi mini-py-pack/ubuntu18_amd64:py3.11   # remove a specific build image
docker image prune                                 # remove dangling images from failed builds
docker builder prune                               # clear the build cache
docker system df                                   # show Docker disk usage breakdown
```

Notes:

- **After deleting the build image**, the first addon build automatically rebuilds it with an
  empty package list (costing the same as one empty base build, ~5-10 min); keep it if you plan to add more packages soon
- The tar.gz files already exported to `dist/` do not depend on any image; deleting images never affects delivered packs
- When retiring the project entirely: `docker rmi $(docker images -q 'mini-py-pack/*')`

## Notes

- **Automatic apt source adaptation**: supports all Ubuntu and Debian releases. Source file
  locations are auto-detected (Debian >= 12 uses DEB822-format `debian.sources`); if `apt-get update`
  fails, archive sources are used automatically (Ubuntu → `old-releases.ubuntu.com`;
  Debian → `archive.debian.org`); if that still fails, the change is rolled back with a hint to
  check the network or set `APT_MIRROR`
- **CentOS 7 support**: CentOS 7 is fully EOL; builds automatically switch to the
  `vault.centos.org` archive (`<mirror>/centos-vault` when `APT_MIRROR` is set). Its system
  OpenSSL 1.0.2 is below the 1.1.1 required by Python 3.10+, so the build image compiles one from
  source; `libssl.so.1.1` is shipped in the pack — no extra steps on the target machine
- **CentOS 6 specifics**: GCC 9.1 (devtoolset-9) + self-built OpenSSL 1.1.1w + sqlite3 3.46.
  Latest third-party versions cannot be built there; `config/centos6_amd64.conf` pins a verified
  combination (numpy==1.26.4, matplotlib==3.7.5, pandas==2.2.1, seaborn==0.13.2). Full-pack mode
  fails on pillow (system freetype 2.3 is too old) — use the two-stage mode (empty base + addon)
- **Cross-architecture builds**: building amd64 packs on Apple Silicon / ARM hosts uses
  QEMU/Rosetta emulation and is significantly slower (~20-40 min). If a Linux host reports
  `exec format error`, first run `docker run --privileged --rm tonistiigi/binfmt --install all`
- **matplotlib**: the entry script sets `MPLBACKEND=Agg` by default (headless servers); render
  with `plt.savefig()`; override with `MPLBACKEND=TkAgg` if you have an X environment
  (you must install tkinter yourself)
- **`--optimize`**: enables PGO+LTO compilation, 10%-30% faster interpreter; recommended for production deliveries
- **What trimming removes**: stdlib tests/IDLE/tkinter/headers/static libs, third-party `tests`
  directories (except numpy, whose `numpy.testing` needs its tests directory at runtime), and debug
  symbols; if a package needs its own tests directory at runtime, adjust the trimming rules in
  `scripts/build_python.sh`
- **Addon mechanism**: the environment on the target keeps a full pip, so you can always manually
  `./pip3 install --no-index --find-links <wheel-dir> <package>` to install your own wheels

## Troubleshooting

### "错误: docker 守护进程未运行" (Error: Docker daemon is not running)

Reported by the preflight check (`docker info`) of `build.sh` / `build_addon.sh`.

**Cause**: the `docker` command is only a *client*. The actual engine (the `dockerd` daemon)
runs inside the Linux virtual machine managed by Docker Desktop — containers need a Linux
kernel, which macOS/Windows do not have natively. When Docker Desktop is not running, the VM
and the daemon do not exist, so every docker command fails — even though `which docker` still
finds the binary. Having the remote control does not mean the TV is on.

**Fix**:

- macOS: start Docker Desktop (or run `open -a Docker`), wait 10-30 s, then verify with `docker info`
- Windows: start Docker Desktop (WSL2 backend); if you run a native dockerd inside WSL2 instead:
  `sudo service docker start`
- Prevent it: Docker Desktop → Settings → General → enable
  "Start Docker Desktop when you sign in to your computer"

Similarly, "错误: 未安装 docker" means the docker CLI itself is missing — install Docker Desktop
(or an equivalent runtime such as Colima / OrbStack / Rancher Desktop).

### `manifest unknown` when pulling BASE_IMAGE

The tag in `BASE_IMAGE` does not exist on Docker Hub. Check the exact available tags
(see [How to Write BASE_IMAGE](#how-to-write-base-image)).

### Build fails on Apple Silicon with `exec format error`

QEMU emulation is not registered. Run once:
`docker run --privileged --rm tonistiigi/binfmt --install all`
