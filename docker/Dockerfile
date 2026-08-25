# 通用构建镜像: 基础镜像/平台/Python 版本/包列表 全部通过 build-arg 注入
ARG BASE_IMAGE=ubuntu:18.04
FROM ${BASE_IMAGE}

ARG APT_MIRROR
# 若 build-arg 传入空值则回退到默认镜像
ENV _APT_MIRROR=${APT_MIRROR:-mirrors.aliyun.com}
ARG OPENSSL_VERSION=1.1.1w
ARG PYTHON_VERSION=3.11.9
ARG PYVER_FULL=3.11.9
ARG PY_PACKAGES="numpy matplotlib pandas"
ARG ENABLE_OPTIMIZATIONS=0
ARG PYTHON_MIRROR=https://mirrors.huaweicloud.com/python
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PLATFORM_NAME=unknown
# 预编译 Python (python-build-standalone) 的发布标签, 非空时直接下载解压跳过源码编译
ARG PYTHON_BUILD_TAG=

# PIP_INDEX_URL 会被 pip 自动读取; 其余 ENV 供构建脚本与增量打包(make_addon.sh)使用
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHON_VERSION=${PYVER_FULL} \
    PIP_INDEX_URL=${PIP_INDEX_URL} \
    PLATFORM_NAME=${PLATFORM_NAME} \
    PREFIX=/opt/mini_python

# 安装编译工具链与 Python 各模块的依赖库, 包管理器由容器内 /etc/os-release
# 的 ID 自动判断 (无需在平台配置里声明 OS_FAMILY):
#
# [apt] ubuntu / debian:
#   1. APT_MIRROR 非空时先替换为镜像源 (如 mirrors.aliyun.com)
#   2. apt-get update 失败时, 自动切换到 old-releases.ubuntu.com 重试
#      (发行版 EOL 后仓库会被官方迁移到那里); 仍失败则回滚源配置并给出明确提示
#
# [yum] 其余发行版 (centos / rocky / almalinux 等), 按 VERSION_ID 分流:
#   CentOS 6 (EOL): 无 /etc/os-release, 从 /etc/redhat-release 检测;
#     仓库迁移到 vault.centos.org, 切归档源;
#     系统 GCC 4.4 过旧, 安装 SCL devtoolset-9 (GCC 9.1);
#     系统 OpenSSL 1.0.1 / sqlite3 3.6 均过旧, 额外源码编译 OpenSSL 1.1.1 + sqlite3 3.46;
#     numpy 2.x 要求 GCC >= 9.3, 固定 numpy==1.26.4
#   CentOS 7 (EOL): 仓库已迁移到 vault.centos.org, 切 7.9.2009 归档源;
#     系统 GCC 4.8 不支持 Python 3.10+, 额外安装 SCL devtoolset-9 (GCC 9);
#     系统 OpenSSL 1.0.2 不满足 Python >=3.10 的 >=1.1.1 要求, 额外源码编译到 /opt/openssl11
#   Rocky 8 等: 官方源活跃, 无需切源; 系统 OpenSSL 1.1.1 + openssl-devel 直接可用
RUN set -e; \
    if [ -f /etc/os-release ]; then \
        PKG_ID=$(awk -F= '/^ID=/{gsub(/"/,"",$2); print $2}' /etc/os-release); \
        OS_MAJOR=$(awk -F= '/^VERSION_ID=/{gsub(/"/,"",$2); print $2}' /etc/os-release | cut -d. -f1); \
    else \
        PKG_ID=$(awk '{print tolower($1)}' /etc/redhat-release | tr -d '"'); \
        OS_MAJOR=$(grep -oE '[0-9]+' /etc/redhat-release | head -1); \
    fi; \
    if [ "$PKG_ID" != "ubuntu" ] && [ "$PKG_ID" != "debian" ]; then \
        if [ "$OS_MAJOR" = "6" ]; then \
            sed -i -e 's|^mirrorlist=|#mirrorlist=|' \
                   -e 's|^#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|' \
                   -e 's|\$releasever|6.10|g' \
                   /etc/yum.repos.d/CentOS-*.repo; \
            if [ -n "$_APT_MIRROR" ]; then \
                sed -i "s|http://vault.centos.org|http://${_APT_MIRROR}/centos-vault|g" \
                    /etc/yum.repos.d/CentOS-*.repo; \
            fi; \
        elif [ "$OS_MAJOR" = "7" ]; then \
            sed -i -e 's|^mirrorlist=|#mirrorlist=|' \
                   -e 's|^#baseurl=http://mirror.centos.org/centos/$releasever|baseurl=http://vault.centos.org/7.9.2009|' \
                   /etc/yum.repos.d/CentOS-*.repo; \
            if [ -n "$_APT_MIRROR" ]; then \
                sed -i "s|http://vault.centos.org|http://${_APT_MIRROR}/centos-vault|g" \
                    /etc/yum.repos.d/CentOS-*.repo; \
            fi; \
        fi; \
        if [ "$OS_MAJOR" = "6" ]; then \
                yum install -y \
                    gcc gcc-c++ make patch pkgconfig wget ca-certificates tar gzip xz bzip2 perl \
                    openssl-devel zlib-devel bzip2-devel xz-devel libffi-devel sqlite-devel \
                    readline-devel ncurses-devel gdbm-devel e2fsprogs-devel; \
            else \
                yum install -y \
                    gcc gcc-c++ make patch pkgconfig wget ca-certificates tar gzip xz bzip2 perl \
                    openssl-devel zlib-devel bzip2-devel xz-devel libffi-devel sqlite-devel \
                    readline-devel ncurses-devel gdbm-devel libuuid-devel; \
            fi; \
            yum clean all; \
            if [ "$OS_MAJOR" = "6" ] || [ "$OS_MAJOR" = "7" ]; then \
                if [ "$OS_MAJOR" = "6" ]; then \
                    echo "==> CentOS 6: 系统 GCC 4.4 过旧, 安装 SCL devtoolset-9 (GCC 9) ..."; \
                    yum install -y \
                        http://vault.centos.org/6.10/extras/x86_64/Packages/centos-release-scl-rh-2-4.el6.centos.noarch.rpm \
                        http://vault.centos.org/6.10/extras/x86_64/Packages/centos-release-scl-7-4.el6.centos.noarch.rpm; \
                    sed -i -e 's|^mirrorlist=|#mirrorlist=|' \
                           -e 's|^# *baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|' \
                           -e 's|\$releasever|6.10|g' \
                           /etc/yum.repos.d/CentOS-SCL*.repo; \
                    if [ -n "$_APT_MIRROR" ]; then \
                        sed -i "s|http://vault.centos.org|http://${_APT_MIRROR}/centos-vault|g" \
                            /etc/yum.repos.d/CentOS-SCL*.repo; \
                    fi; \
                    yum install -y devtoolset-9-gcc devtoolset-9-gcc-c++; \
                    yum clean all; \
                    source /opt/rh/devtoolset-9/enable; \
                    gcc --version; \
                fi; \
                cd /tmp; \
                { wget -q "https://www.openssl.org/source/openssl-${OPENSSL_VERSION}.tar.gz" \
                  || wget -q "https://github.com/openssl/openssl/releases/download/OpenSSL_$(echo "$OPENSSL_VERSION" | tr . _)/openssl-${OPENSSL_VERSION}.tar.gz"; }; \
                tar xzf "openssl-${OPENSSL_VERSION}.tar.gz"; \
                cd "openssl-${OPENSSL_VERSION}"; \
                ./config --prefix=/opt/openssl11 --openssldir=/opt/openssl11/ssl shared zlib > /tmp/openssl.log 2>&1; \
                make -j"$(nproc)" >> /tmp/openssl.log 2>&1; \
                make install_sw >> /tmp/openssl.log 2>&1; \
                echo /opt/openssl11/lib > /etc/ld.so.conf.d/openssl11.conf && ldconfig; \
                cd / && rm -rf /tmp/openssl-*; \
                /opt/openssl11/bin/openssl version; \
            fi; \
            if [ "$OS_MAJOR" = "6" ]; then \
                echo "==> CentOS 6: 系统 sqlite3 3.6.20 < Python 3.9 要求的 3.7.15, 源码编译 sqlite3 ..."; \
                source /opt/rh/devtoolset-9/enable 2>/dev/null || true; \
                cd /tmp; \
                wget -q "https://www.sqlite.org/2024/sqlite-autoconf-3460100.tar.gz"; \
                tar xzf sqlite-autoconf-3460100.tar.gz; \
                cd sqlite-autoconf-3460100; \
                ./configure --prefix=/opt/sqlite3 --enable-shared > /tmp/sqlite.log 2>&1; \
                make -j"$(nproc)" >> /tmp/sqlite.log 2>&1; \
                make install >> /tmp/sqlite.log 2>&1; \
                echo /opt/sqlite3/lib > /etc/ld.so.conf.d/sqlite3.conf && ldconfig; \
                cd / && rm -rf /tmp/sqlite-*; \
                /opt/sqlite3/bin/sqlite3 --version; \
            fi; \
    else \
        if [ -n "$_APT_MIRROR" ]; then \
            sed -i -e "s|http://archive.ubuntu.com|http://${_APT_MIRROR}|g" \
                   -e "s|http://security.ubuntu.com|http://${_APT_MIRROR}|g" \
                   /etc/apt/sources.list; \
        fi; \
        if ! apt-get update; then \
            echo "==> apt-get update 失败, 尝试切换到 old-releases.ubuntu.com (发行版可能已 EOL 迁移) ..."; \
            cp /etc/apt/sources.list /etc/apt/sources.list.bak; \
            sed -i -e 's|http://[a-z.]*archive.ubuntu.com|http://old-releases.ubuntu.com|g' \
                   -e 's|http://security.ubuntu.com|http://old-releases.ubuntu.com|g' \
                   /etc/apt/sources.list; \
            if [ -n "$_APT_MIRROR" ]; then \
                sed -i "s|http://${_APT_MIRROR}|http://old-releases.ubuntu.com|g" /etc/apt/sources.list; \
            fi; \
            if ! apt-get update; then \
                mv /etc/apt/sources.list.bak /etc/apt/sources.list; \
                echo "==> old-releases 也不可用: 大概率是网络/代理问题而非 EOL,"; \
                echo "    请检查网络, 或通过 APT_MIRROR 环境变量指定可用的镜像源后重试"; \
                exit 1; \
            fi; \
            rm -f /etc/apt/sources.list.bak; \
        fi; \
        apt-get install -y --no-install-recommends \
            build-essential pkg-config wget ca-certificates xz-utils \
            libssl-dev zlib1g-dev libbz2-dev liblzma-dev libffi-dev \
            libsqlite3-dev libreadline-dev libncursesw5-dev libgdbm-dev uuid-dev; \
        rm -rf /var/lib/apt/lists/*; \
    fi

# 编译层: 编译 Python -> 安装预置包 -> 收集共享库, 产出 /opt/mini_python 完整环境
# (只 COPY build_python.sh, 改其他脚本不会触发这个 5~8 分钟的层重跑)
COPY scripts/build_python.sh /build/build_python.sh
RUN source /opt/rh/devtoolset-9/enable 2>/dev/null || true; \
    bash /build/build_python.sh \
        "${PYVER_FULL}" "${PY_PACKAGES}" "${ENABLE_OPTIMIZATIONS}" "${PYTHON_MIRROR}"

# 打包层: 裁剪副本 -> 放入目标机入口脚本 -> 自检 -> tar 到 /out (1~2 分钟)
# 注意: /opt/mini_python 保留完整环境(含头文件), 供后续增量包编译 sdist 使用;
#       真正发布的是裁剪后的 /opt/dist/mini_python
COPY scripts/make_addon.sh /build/make_addon.sh
COPY scripts/target_assets/ /build/target_assets/
COPY scripts/package_python.sh /build/package_python.sh
RUN bash /build/package_python.sh "${PYVER_FULL}" "${PY_PACKAGES}"
