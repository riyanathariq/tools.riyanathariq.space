# tools.riyanathariq.space

Developer utility hub — DevToys-style sidebar + in-browser tools (encoding, JWT, JSON prettier, cURL explainer, image converter, key generator, and more).

All processing stays in the browser. No server-side conversion workers.

## Local

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (VPS)

Same pattern as the main site:

1. Push to GitHub → Actions publishes `ghcr.io/riyanathariq/tools.riyanathariq.space:latest`
2. On VPS:

```bash
mkdir -p /opt/tools
# copy docker-compose.yml
cd /opt/tools && docker compose pull && docker compose up -d
```

3. Enable nginx site from `deploy/nginx-tools.conf` (proxies to `127.0.0.1:3002`)
4. Cloudflare DNS: `tools` A → VPS IP, Proxied

## Stack

Next.js · TypeScript · Tailwind · client-side Web Crypto / jose / canvas
