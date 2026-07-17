# Deploying to your server

This app ships as two Docker images wired together with `docker-compose.yml`:

- **`backend`** — the Node API + SQLite database. Not reachable from outside the Docker network; only `frontend` can talk to it.
- **`frontend`** — an nginx container serving the built React app, and proxying `/api/*` internally to `backend`. This is the only container that publishes a port to the host.

Your existing host nginx just needs to reverse-proxy your domain to that one published port — nothing else on your server needs to change.

## 1. Prerequisites on the server

- Docker and the Docker Compose plugin installed (`docker compose version`).
- nginx already running on the host (as you have).

## 2. Get the code onto the server and configure it

```
git clone <your-repo-url> studytest
cd studytest
cp .env.example .env
```

Edit `.env`:
- `JWT_SECRET` — generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and paste it in. This must be a real secret; do not deploy with the placeholder value.
- `COOKIE_SECURE` — leave as `true` (the app will be served over HTTPS via your host nginx).
- `APP_PORT` — the local port the frontend container publishes on `127.0.0.1` (default `8081`). Change it only if that port is already taken on your server.

## 3. Build and start the containers

```
docker compose build
docker compose up -d
```

Check it's up:
```
docker compose ps
curl -I http://127.0.0.1:8081/
```

The SQLite database lives at `./backend/data/app.sqlite` on the host (bind-mounted into the backend container), so it survives image rebuilds and container restarts. Back it up by copying that file.

## 4. Point your host nginx at it

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

## 5. Updating after a code change

```
git pull
docker compose build
docker compose up -d
```

The database volume is untouched by rebuilds, so existing accounts and tests are preserved.

## Notes

- `COOKIE_SECURE=true` means the login cookie is only sent over HTTPS — make sure your host nginx is actually terminating TLS before you rely on this in production, otherwise login won't work over plain HTTP.
- The backend container has no published port and isn't reachable except through the frontend container's internal nginx proxy — there's nothing else to firewall.
- To inspect logs: `docker compose logs -f backend` / `docker compose logs -f frontend`.
