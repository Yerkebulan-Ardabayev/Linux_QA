# Учебный стенд для реального вывода примеров, Ubuntu 24.04 как на учебной ВМ.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive TZ=Asia/Almaty LANG=C.UTF-8
RUN sed -i 's/^Types: deb$/Types: deb/' /etc/apt/sources.list.d/ubuntu.sources && \
    rm -f /etc/dpkg/dpkg.cfg.d/excludes && \
    apt-get update && apt-get install -y --no-install-recommends \
      coreutils procps iproute2 file tree less acl sudo cron curl ca-certificates dnsutils \
      iputils-ping netcat-openbsd openssh-client rsync zip unzip xz-utils bzip2 lsof psmisc \
      util-linux gawk bc jq strace man-db tzdata passwd findutils grep sed tar gzip diffutils \
      at htop ncdu kmod iptables ufw net-tools traceroute wget && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /lab
