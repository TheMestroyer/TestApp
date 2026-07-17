# Deploying to your server

Images are built **locally** and pushed to GitHub Container Registry (GHCR). The server never
needs the source code — just `docker-compose.yml` and a `.env` file, both of which pull the
pre-built images down and run them. To update, you rebuild/push locally and the server pulls.

This app is two images wired together with `docker-compose.yml`:

- **`backend`** — the Node API + SQLite database. Not reachable from outside the Docker network; only `frontend` can talk to it.
- **`frontend`** — an nginx container serving the built React app, and proxying `/api/*` internally to `backend`. This is the only container that publishes a port to the host.

Your existing host nginx just needs to reverse-proxy your domain to that one published port — nothing else on your server needs to change.

## One-time setup

### On your local machine

Log in to GHCR so `docker push` works. Create a GitHub personal access token first (Settings →
Developer settings → Personal access tokens → generate one with the `write:packages` scope), then:

```
echo <your-token> | docker login ghcr.io -u themestroyer --password-stdin
```

### On the server

Docker + Compose only — no git clone needed. Make a directory for the app and grab just the two
files it needs:

```
mkdir -p ~/studytest && cd ~/studytest
curl -o docker-compose.yml https://raw.githubusercontent.com/TheMestroyer/TestApp/master/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/TheMestroyer/TestApp/master/.env.example
```

Edit `.env`:
```
nano .env
```
- `JWT_SECRET` — generate one with `openssl rand -hex 48` (or the node one-liner from `.env.example`) and paste it in. This must be a real secret; do not deploy with the placeholder value.
- `COOKIE_SECURE` — leave as `true` (the app is served over HTTPS via your host nginx).
- `APP_PORT` — the local port the frontend container publishes on `127.0.0.1` (default `8081`). Change it only if that port is already taken on your server.

Since the images are public, no `docker login` is needed on the server to pull them.

## Every release: build, push, deploy

**Locally**, from the repo:
```
./scripts/release.sh
```
This builds both images, tags them `:latest`, and pushes them to `ghcr.io/themestroyer/...`.
(Pass a version instead, e.g. `./scripts/release.sh v1.2`, if you want a tagged rollback point —
just remember to also update the tag in `docker-compose.yml` on the server if you do.)

**On the server**:
```
cd ~/studytest
docker compose pull
docker compose up -d
```

That's the whole update flow going forward — no source code, no build tools, nothing else to sync.

Check it's up:
```
docker compose ps
curl -I http://127.0.0.1:8081/
```

The SQLite database lives at `~/studytest/data/app.sqlite` on the host (bind-mounted into the backend container), so it survives image updates and container restarts. Back it up by copying that file.

## Point your host nginx at it

Add a new server block for the app's domain/subdomain (adjust `server_name`, the port if you changed `APP_PORT`, and your TLS setup — this assumes you already terminate HTTPS on the host, e.g. via certbot):

```nginx
server {
    listen 443 ssl http2;
    server_name study.example.com;

    # ... your existing ssl_certificate / ssl_certificate_key directives ...

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name study.example.com;
    return 301 https://$host$request_uri;
}
```

Reload nginx:
```
sudo nginx -t && sudo systemctl reload nginx
```

## Notes

- `COOKIE_SECURE=true` means the login cookie is only sent over HTTPS — make sure your host nginx is actually terminating TLS before you rely on this in production, otherwise login won't work over plain HTTP.
- The backend container has no published port and isn't reachable except through the frontend container's internal nginx proxy — there's nothing else to firewall.
- The backend container runs as root *inside its own container* (not on the host) — this is deliberate, see the comment in `backend/Dockerfile`, and the container has no published port either way.
- To inspect logs: `docker compose logs -f backend` / `docker compose logs -f frontend`.
- `scripts/release.sh` always builds fresh from your current local source, so make sure you've committed/tested what you mean to ship before running it — pushing to `:latest` is immediate, there's no review step.
