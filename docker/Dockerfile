FROM ubuntu:latest AS build

LABEL authors="myooker"
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    pkg-config \
    ca-certificates \
    wget \
    libtag1-dev \
    nlohmann-json3-dev \
    libcli11-dev \
    libasio-dev \
    libboost-all-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Crow from the official .deb release
RUN wget -q https://github.com/CrowCpp/Crow/releases/download/v1.3.0/Crow-1.3.0-Linux.deb \
    && dpkg -i Crow-1.3.0-Linux.deb \
    && rm Crow-1.3.0-Linux.deb

WORKDIR /app
COPY CMakeLists.txt .
COPY src/ src/
COPY include/ include/

RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --parallel $(nproc)

FROM ubuntu:latest

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    libtag1v5 \
    nginx \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/build/web_tag_editor /usr/local/bin/web_tag_editor
COPY frontend/ /app/frontend/
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 80

ENTRYPOINT ["/app/start.sh"]
CMD ["--mount-point", "/music"]