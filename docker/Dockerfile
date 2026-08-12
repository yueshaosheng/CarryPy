# 通用构建镜像: 基础镜像/平台/Python 版本/包列表 全部通过 build-arg 注入
ARG BASE_IMAGE=ubuntu:18.04
FROM ${BASE_IMAGE}

ARG APT_MIRROR=""
ARG OS_FAMILY=debian
ARG OPENSSL_VERSION=1.1.1w
ARG PYTHON_VERSION=3.10.14
ARG PY_PACKAGES="numpy matplotlib pandas"
ARG ENABLE_OPTIMIZATIONS=0
ARG PYTHON_MIRROR=https://www.python.org/ftp/python
ARG PIP_INDEX_URL=https://pypi.org/simple
ARG PLATFORM_NAME=unknown

# PIP_INDEX_URL 会被 pip 自动读取; 其余 ENV 供构建脚本与增量打包(make_addon.sh)使用
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHON_VERSION=${PYTHON_VERSION} \
    PIP_INDEX_URL=${PIP_INDEX_URL} \
    PLATFORM_NAME=${PLATFORM_NAME} \
    PREFIX=/opt/mini_python

# 安装编译工具链与 Python 各模块的依赖库, 按 OS_FAMILY 走不同包管理器:
#
# [debian] apt 源自动适配:
#   1. APT_MIRROR 非空时先替换为镜像源 (如 mirrors.aliyun.com)
#   2. apt-get update 失败时, 自动切换到 old-releases.ubuntu.com 重试
#      (发行版 EOL 后仓库会被官方迁移到那里); 仍失败则回滚源配置并给出明确提示
#
# [rhel] CentOS 7 已 EOL, 仓库已迁移到 vault.centos.org, 必须切归档源
#   (APT_MIRROR 非空时用 <镜像>/centos-vault, 阿里云/清华均为此路径约定);
#   系统 OpenSSL 1.0.2 不满足 Python 3.10 的 >=1.1.1 要求, 额外源码编译一份到
#   /opt/openssl11 (build_python.sh 检测到该目录会自动 --with-openssl 指向它)
RUN set -e; \
    if [ "$OS_FAMILY" = "rhel" ]; then \
        sed -i -e 's|^mirrorlist=|#mirrorlist=|' \
               -e 's|^#baseurl=http://mirror.centos.org/centos/$releasever|baseurl=http://vault.centos.org/7.9.2009|' \
               /etc/yum.repos.d/CentOS-*.repo; \
        if [ -n "$APT_MIRROR" ]; then \
            sed -i "s|http://vault.centos.org|http://${APT_MIRROR}/centos-vault|g" \
                /etc/yum.repos.d/CentOS-*.repo; \
        fi; \
        yum install -y \
            gcc gcc-c++ make patch pkgconfig wget ca-certificates tar gzip xz bzip2 perl \
            zlib-devel bzip2-devel xz-devel libffi-devel sqlite-devel \
            readline-devel ncurses-devel gdbm-devel libuuid-devel; \
        yum clean all; \
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
    else \
        if [ -n "$APT_MIRROR" ]; then \
            sed -i -e "s|http://archive.ubuntu.com|http://${APT_MIRROR}|g" \
                   -e "s|http://security.ubuntu.com|http://${APT_MIRROR}|g" \
                   /etc/apt/sources.list; \
        fi; \
        if ! apt-get update; then \
            echo "==> apt-get update 失败, 尝试切换到 old-releases.ubuntu.com (发行版可能已 EOL 迁移) ..."; \
            cp /etc/apt/sources.list /etc/apt/sources.list.bak; \
            sed -i -e 's|http://[a-z.]*archive.ubuntu.com|http://old-releases.ubuntu.com|g' \
                   -e 's|http://security.ubuntu.com|http://old-releases.ubuntu.com|g' \
                   /etc/apt/sources.list; \
            if [ -n "$APT_MIRROR" ]; then \
                sed -i "s|http://${APT_MIRROR}|http://old-releases.ubuntu.com|g" /etc/apt/sources.list; \
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
RUN bash /build/build_python.sh \
        "${PYTHON_VERSION}" "${PY_PACKAGES}" "${ENABLE_OPTIMIZATIONS}" "${PYTHON_MIRROR}"

# 打包层: 裁剪副本 -> 放入目标机入口脚本 -> 自检 -> tar 到 /out (1~2 分钟)
# 注意: /opt/mini_python 保留完整环境(含头文件), 供后续增量包编译 sdist 使用;
#       真正发布的是裁剪后的 /opt/dist/mini_python
COPY scripts/make_addon.sh /build/make_addon.sh
COPY scripts/target_assets/ /build/target_assets/
COPY scripts/package_python.sh /build/package_python.sh
RUN bash /build/package_python.sh "${PYTHON_VERSION}" "${PY_PACKAGES}"
