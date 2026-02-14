# Building

```bash
git pull https://github.com/myooker/remote-tag-editor.git
cd remote-tag-editor
git switch docker-test
```

Specify the path to the music directory in `docker-compose.yml` before building:
```yaml
    volumes:
      - /path/to/music:/music  # change this line
```

```bash
docker compose build
docker compose up -d
```