FROM alpine:3.20 as build

LABEL authors="myooker"

RUN apk add --no-cache \
    git \
    build-base \
    cmake \
    pkgconf \
    ca-certificates \
    wget \
    tar \
    nlohmann-json

# CLI11
RUN mkdir -p /usr/local/include/CLI \
    && wget -qO /usr/local/include/CLI/CLI.hpp \
    https://github.com/CLIUtils/CLI11/releases/download/v2.6.2/CLI11.hpp

RUN wget -q https://github.com/CrowCpp/Crow/archive/refs/tags/v1.3.3.tar.gz \
    && tar xfz v1.3.3.tar.gz \
    && cp -r Crow-1.3.3/include/* /usr/local/include/ \
    && rm -rf v1.3.3.tar.gz Crow-1.3.3

WORKDIR /build
RUN git clone --branch v2.2 --recurse-submodules https://github.com/taglib/taglib.git

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

FROM alpine:3.20

RUN apk add --no-cache \
    nginx \
    inotify-tools \
    curl \
    libstdc++

COPY --from=build /usr/local /usr/local
COPY --from=build /app/build/web_tag_editor /usr/local/bin/web_tag_editor
COPY frontend/ /app/frontend/
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 80

ENTRYPOINT ["/app/start.sh"]
CMD ["--mount-point", "/music", "--database-path", "/data/database.db3"]