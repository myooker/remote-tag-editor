FROM debian:bookworm AS build

LABEL authors="myooker"
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    cmake \
    pkg-config \
    ca-certificates \
    wget \
    nlohmann-json3-dev \
    libcli11-dev \
    libasio-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Crow from the official .deb release
RUN wget -q https://github.com/CrowCpp/Crow/releases/download/v1.3.0/Crow-1.3.0-Linux.deb \
    && dpkg -i Crow-1.3.0-Linux.deb \
    && rm Crow-1.3.0-Linux.deb

# Get latest TagLib
WORKDIR /build
RUN git clone --branch v2.2 --recurse-submodules https://github.com/taglib/taglib.git

# Building TagLib
WORKDIR /build/taglib
RUN mkdir build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local .. && \
    make -j$(nproc) && \
    make install

WORKDIR /app
COPY CMakeLists.txt .
COPY src/ src/
COPY include/ include/

RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --parallel $(nproc)

FROM debian:bookworm

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    libtag1v5 \
    nginx \
    inotify-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/local /usr/local
COPY --from=build /app/build/web_tag_editor /usr/local/bin/web_tag_editor
COPY frontend/ /app/frontend/
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 80

ENTRYPOINT ["/app/start.sh"]
CMD ["--mount-point", "/music", "--database-path", "/data/database.db3"]