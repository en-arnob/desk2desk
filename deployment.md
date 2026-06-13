# Desk2Desk — Production Deployment (Ubuntu + PM2 + Nginx + Certbot)

This guide deploys the Desk2Desk monorepo to a single Ubuntu VPS.

| Component | Port | Served by |
| --- | --- | --- |
| API + Web SPA (NestJS) | **1500** | PM2 → `node dist/main.js` |
| Nginx | 80 / 443 | reverse proxy + TLS, public entrypoint |
| PostgreSQL | 5432 | local only |

- **Domain:** `support.premiercement.com`
- **The API serves the built web SPA itself** on the same port (**1500**). NestJS hosts the static `apps/web/dist` bundle and falls back to `index.html` for client‑side routes; the `api` route prefix is excluded so it never shadows the API.
- Nginx terminates TLS and reverse‑proxies **everything** to a single upstream (1500) — no separate static server.
- The web app calls the API with **same‑origin relative paths** (`/api/...`), so no `VITE_*` base URL is needed.
- Realtime notifications use **Server‑Sent Events** at `/api/events`; the Nginx config below disables buffering for it (required).

---

## 0. Prerequisites

- Ubuntu 22.04 / 24.04 server with a public IP.
- A DNS **A record**: `support.premiercement.com` → your server IP. Confirm before requesting a certificate:
  ```bash
  dig +short support.premiercement.com
  ```
- A non‑root user with `sudo` (examples below assume user `deploy`).

---

## 1. Install system dependencies

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS (project requires Node >= 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Build tooling, git, nginx, postgres, certbot
sudo apt install -y build-essential git nginx postgresql postgresql-contrib
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

# Global tool: PM2 (process manager). The API serves the web SPA itself,
# so no separate static file server is needed.
sudo npm install -g pm2

node -v   # should be v20.x
```

---

## 2. Create the PostgreSQL database

```bash
sudo -u postgres psql
```

Inside `psql` (replace the password with a strong one):

```sql
CREATE DATABASE d2d;
CREATE USER d2d_user WITH ENCRYPTED PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE d2d TO d2d_user;
-- Postgres 15+: also grant schema rights
\c d2d
GRANT ALL ON SCHEMA public TO d2d_user;
ALTER DATABASE d2d OWNER TO d2d_user;
\q
```

---

## 3. Get the code

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone <YOUR_REPO_URL> desk2desk
cd desk2desk
```

> All later commands assume the project root is **`/var/www/desk2desk`**.

---

## 4. Configure environment variables

Create the API env file at `/var/www/desk2desk/apps/api/.env`:

```bash
nano /var/www/desk2desk/apps/api/.env
```

```dotenv
# API
PORT=1500
CORS_ORIGIN=https://support.premiercement.com

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=d2d_user
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DB_NAME=d2d

# Auth — generate with: openssl rand -hex 32
JWT_SECRET=CHANGE_ME_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=7d

# Production flag (disables ORM debug logging)
NODE_ENV=production

# Attachments — absolute path so it survives redeploys
UPLOAD_DIR=/var/www/desk2desk/uploads
```

Create the uploads directory:

```bash
mkdir -p /var/www/desk2desk/uploads
```

> The web app needs **no** env file — it talks to `/api` on the same origin.

---

## 5. Install dependencies & build

From the project root (`/var/www/desk2desk`):

```bash
# Install all workspace deps (root install hoists everything)
npm install

# Build shared package, then API, then web (this is the root "build" script)
npm run build
```

What this produces:
- `packages/shared/dist` — shared types/enums (consumed by API & web).
- `apps/api/dist/main.js` — the compiled NestJS server.
- `apps/web/dist` — the static SPA bundle the **API** serves (NestJS resolves it relative to `apps/api/dist`, i.e. `../../web/dist`). To host the bundle from a different location, set `WEB_DIST_PATH` to its absolute path in the API `.env`.

---

## 6. Run database migrations

The API uses MikroORM migrations. Run them once after each deploy that adds migrations:

```bash
cd /var/www/desk2desk/apps/api
npx mikro-orm migration:up
```

> This reads `apps/api/.env` and the config at `src/mikro-orm.config.ts`.
> If you also have a seed script for first‑time setup: `npm run seed` (from `apps/api`).

---

## 7. Start the app with PM2

A single process runs both the API and the web SPA on port 1500.

Create `/var/www/desk2desk/ecosystem.config.js`:

```bash
nano /var/www/desk2desk/ecosystem.config.js
```

```js
module.exports = {
  apps: [
    {
      name: 'd2d-api',
      cwd: '/var/www/desk2desk/apps/api',
      script: 'dist/main.js',
      env: { NODE_ENV: 'production' },
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};
```

Start, save, and enable on boot:

```bash
cd /var/www/desk2desk
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd    # run the command it prints (sets up boot persistence)

pm2 status             # d2d-api should be "online"
pm2 logs d2d-api       # check the API booted: "Desk2Desk API listening on ... :1500/api"
```

Quick local sanity check before wiring Nginx:

```bash
curl -sI http://localhost:1500/          # SPA: 200 with index.html
curl -s  http://localhost:1500/api       # API responds (may be 404 on bare /api — that's fine)
```

---

## 8. Configure Nginx

Create `/etc/nginx/sites-available/support.premiercement.com`:

```bash
sudo nano /etc/nginx/sites-available/support.premiercement.com
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name support.premiercement.com;

    # Allow file-attachment uploads (default is 1 MB — too small)
    client_max_body_size 25m;

    # ---- Realtime SSE stream (notifications) ----
    # Must disable buffering or events arrive in batches / never flush.
    location = /api/events {
        proxy_pass http://127.0.0.1:1500;
        proxy_http_version 1.1;
        proxy_set_header Host            $host;
        proxy_set_header Connection      '';
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 3600s;
    }

    # ---- Everything else (API + web SPA) → single upstream on 1500 ----
    # The NestJS app serves the static SPA and the /api routes together,
    # so there is just one backend to proxy to.
    location / {
        proxy_pass http://127.0.0.1:1500;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        $connection_upgrade;
    }
}
```

Add the `$connection_upgrade` map once, in the `http {}` block. Create `/etc/nginx/conf.d/upgrade.conf`:

```bash
sudo nano /etc/nginx/conf.d/upgrade.conf
```

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

Enable the site and reload:

```bash
sudo ln -s /etc/nginx/sites-available/support.premiercement.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default   # remove the default placeholder
sudo nginx -t                                 # test config
sudo systemctl reload nginx
```

---

## 9. Firewall (optional but recommended)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # opens 80 + 443
sudo ufw enable
sudo ufw status
```

Port 1500 stays bound to localhost — it is **not** exposed publicly.

---

## 10. Enable HTTPS with Certbot

```bash
sudo certbot --nginx -d support.premiercement.com
```

- Choose to redirect HTTP → HTTPS when prompted.
- Certbot edits the Nginx server block to add the `listen 443 ssl` directives and the certificate paths, then reloads.

Verify auto‑renewal (Certbot installs a systemd timer automatically):

```bash
sudo certbot renew --dry-run
```

Visit **https://support.premiercement.com** — the app should load and log in.

---

## 11. Redeploying (after pushing new code)

```bash
cd /var/www/desk2desk
git pull
npm install
npm run build

# run new migrations if any
cd apps/api && npx mikro-orm migration:up && cd ../..

# restart both processes with zero downtime
pm2 reload ecosystem.config.js
pm2 save
```

A handy `deploy.sh` you can drop in the project root:

```bash
#!/usr/bin/env bash
set -e
cd /var/www/desk2desk
git pull
npm install
npm run build
( cd apps/api && npx mikro-orm migration:up )
pm2 reload ecosystem.config.js
pm2 save
echo "Deployed."
```

```bash
chmod +x deploy.sh && ./deploy.sh
```

---

## 12. Troubleshooting

| Symptom | Check |
| --- | --- |
| 502 Bad Gateway | `pm2 status` — is `d2d-api` online? `pm2 logs` for stack traces. |
| API won't start | Wrong DB creds in `apps/api/.env`, or migrations not run. `pm2 logs d2d-api`. |
| Login works but no live notifications | SSE buffering — confirm the `location = /api/events` block exists and `sudo nginx -t` passes. |
| Uploads fail with 413 | `client_max_body_size` too low in the Nginx server block. |
| Uploaded files vanish after deploy | `UPLOAD_DIR` must be the absolute `/var/www/desk2desk/uploads` path, not `./uploads`. |
| Blank page / 404 on the SPA | `apps/web/dist` missing or unbuilt — run `npm run build`, then `pm2 reload`. Set `WEB_DIST_PATH` if the bundle lives outside `apps/web/dist`. A 404 *on refresh of a sub‑route* means the SPA fallback isn't kicking in — confirm requests reach the API (1500), not a stale static server. |
| Cert renewal | `sudo certbot renew --dry-run`; logs in `/var/log/letsencrypt/`. |

Useful commands:

```bash
pm2 status            # process overview
pm2 logs d2d-api      # tail API + web logs
pm2 monit             # live resource monitor
sudo tail -f /var/log/nginx/error.log
```
