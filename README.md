<img src="frontend/logo.svg" align="right" height="75px"></a>
# Remote Tag Editor

WIP

# Features

TODO:
- [x] Tag normalization (unified tag names)
- [ ] Change history

- Edit multi-valued tags
- Easy to setup
- Upload files to remote server

# Building

```bash
git pull https://github.com/myooker/remote-tag-editor.git
cd remote-tag-editor
```

Example `docker-compose.yml`:
```yaml
services:
  remote-tag-editor:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "8080:80"
    volumes:
      - /path/to/music:/music
    restart: unless-stopped
```

```bash
docker compose build
docker compose up -d
```

The application should be accessible on `localhost:8080`.

# About AI

Frontend is fully written by an AI. Please read [this page](frontend/README.md).

# Screenshots

**Modern Dark theme**
![modern-dark-theme-01.png](screenshots/modern-dark-theme-01.png)
![modern-dark-theme-02.png](screenshots/modern-dark-theme-02.png)

**Windows 95 theme**
![win-95-theme-01.png](screenshots/win-95-theme-01.png)
![win-95-theme-02.png](screenshots/win-95-theme-02.png)
