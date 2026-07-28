# Deploying frontend-v2 (Docker + nginx)

Unlike the old `frontend/` (raw static files), `frontend-v2/` is a Vite app that
must be **built** first — `npm run build` emits a static bundle into
`frontend-v2/dist/`. That `dist/` is what nginx serves. The app talks to the
backend at **same-origin `/api`**, so nginx just needs to:

1. serve the built files, and
2. **fall back to `index.html`** for unknown paths — because directories are
   real URLs (`/artist_1/album_2`), and without this a refresh/shared deep link
   404s.

Your current `docker/nginx.conf` serves `/app/frontend` and proxies `/api`, but
has **no SPA fallback** — that's the one required change.

---

## 1. nginx config

Replace `docker/nginx.conf` with:

```nginx
server {
    listen 80;

    access_log off;
    error_log /dev/null;

    root /app/frontend;
    index index.html;

    # SPA fallback: serve real files, otherwise hand off to index.html so
    # client-side routes like /artist_1/album_2 resolve.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Vite's hashed assets are immutable — cache them hard (optional).
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:18080;
        client_max_body_size 0;
    }
}
```

The `/api/` block is unchanged and, being more specific, always wins over the
SPA fallback, so API calls are never rewritten to `index.html`.

`start.sh` and `docker-compose.yml` need **no changes**.

---

## 2. Dockerfile — build the frontend in the image (recommended)

Add a Node build stage and copy its `dist/` into `/app/frontend` in the final
stage. Nothing about the C++ build changes.

### 2a. Add this stage near the top of `docker/Dockerfile`

```dockerfile
# --- Frontend build ---
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend-v2
# Install deps first (cached until package*.json changes)
COPY frontend-v2/package.json frontend-v2/package-lock.json ./
RUN npm ci
# Build
COPY frontend-v2/ ./
RUN npm run build      # -> /app/frontend-v2/dist
```

Put it before the final `FROM alpine:3.20` stage. (Docker builds only the
stages it needs, in dependency order — placement among the other build stages
doesn't matter.)

### 2b. In the FINAL stage, swap the old frontend copy

Find this line in the final stage:

```dockerfile
COPY frontend/ /app/frontend/
```

and replace it with:

```dockerfile
COPY --from=frontend-build /app/frontend-v2/dist/ /app/frontend/
```

That's it. The built files (including `logo.svg` and hashed `assets/`) land in
`/app/frontend`, exactly where nginx's `root` points.

---

## 3. Alternative: build locally, copy the bundle

If you'd rather not run Node in the image, build on your machine and copy the
output in:

```bash
cd frontend-v2
npm ci
npm run build          # produces frontend-v2/dist/
```

Then in the final stage use:

```dockerfile
COPY frontend-v2/dist/ /app/frontend/
```

(No Node stage needed.) The downside is you must remember to rebuild `dist/`
before every image build, so option 2 is more reproducible.

---

## 4. Build & run

Your `docker-compose.yml` already uses `context: .` and
`dockerfile: docker/Dockerfile`, so nothing there changes:

```bash
docker compose build
docker compose up -d
```

Open http://localhost:8080 (compose maps host `8080` → container `80`).

To confirm the SPA fallback works, open a deep link directly, e.g.
`http://localhost:8080/SomeArtist/SomeAlbum` and hard-refresh — it should load
the app, not 404.

---

## 5. Developing against the running container

For hot-reload while the dockerized backend runs, point the Vite dev proxy at
the container (compose exposes the whole stack, incl. `/api`, on `:8080`):

```bash
cd frontend-v2
VITE_API_TARGET=http://localhost:8080 npm run dev
```

Then use http://localhost:5173 (Vite), which proxies `/api/*` to the container.
See `README.md` for more.

---

## 6. Notes / gotchas

- **`/api/getalbumcover`** is still a placeholder on the backend; the UI shows a
  "No cover art" fallback until you implement it. The cover right-click / drag &
  drop actions are UI-only stubs for now.
- **RTEID mode**: `docker-compose.yml` sets `RTE_USERTEID=TRUE`, so history is
  keyed by RTEID — the frontend reads this from `GET /api/settings` and adapts
  automatically.
- **Reverse proxy / subpath**: this guide assumes the app is served at the
  domain root (`tag.example.com/`). Serving under a subpath
  (`example.com/tageditor/`) would need a Vite `base` setting and a matching
  nginx `location` — ask if you want that.
- **`.dockerignore`**: make sure `frontend-v2/node_modules` and `frontend-v2/dist`
  aren't copied into the build context unnecessarily. Add them to a
  `.dockerignore` at the repo root:
  ```
  frontend-v2/node_modules
  frontend-v2/dist
  ```
  (Option 3 needs `dist`, so only ignore `dist` if you use option 2.)
```

