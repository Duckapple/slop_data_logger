# Name Crimes Dashboard

Single-user web app for tracking misspellings of my name. See [design.md](./design.md) for the full spec.

Stack: React + Vite + Tailwind 4 frontend, Cloudflare Worker (Hono) backend, D1 database, R2 for image attachments. Hosted on the free `<name>.workers.dev` subdomain.

## Local development

```bash
pnpm install

# one-time: create the D1 database, then paste the returned database_id into wrangler.toml
pnpm wrangler d1 create name-misspell

# one-time: create the R2 bucket
pnpm wrangler r2 bucket create name-misspell-uploads

# apply migrations to the local D1 (used by `wrangler dev`)
pnpm db:migrate:local

# starts Vite (5173) and wrangler dev (8787) together; visit http://localhost:5173
pnpm dev
```

## Deploy

```bash
pnpm db:migrate     # remote D1
pnpm deploy         # builds the SPA and ships the Worker
```

## Project layout

```txt
src/
  client/   React SPA
  worker/   Cloudflare Worker (Hono)
migrations/ D1 SQL migrations
dist/       Built SPA, served by the Worker's ASSETS binding
```
