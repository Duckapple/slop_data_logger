# design.md — Name Misspelling Tracker

Build a polished single-user web app for tracking misspellings of my name. It should feel like a small, finished SaaS product rather than a spreadsheet: clean cards, charts, filters, responsive UI, and tasteful humor.

## Core Requirements

The app must let me create, edit, delete, search, filter, chart, and export name-misspelling incidents. Each incident may also carry image and/or link attachments as evidence.

Each incident must store:

```ts
type Misspelling = {
  id: string;
  correctName: string; // default: "Nicolai"
  misspelledName: string;
  offenderName: string;
  offenderHandle?: string | null;
  context: string;
  source?: string | null;
  occurredAt: string; // ISO timestamp
  editDistance: number; // case-insensitive Levenshtein, computed server-side
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[]; // present on detail responses
};

type Attachment = {
  id: string;
  misspellingId: string;
  kind: "image" | "link";
  url: string;            // image: served via /uploads/<key>; link: external URL
  storageKey?: string;    // R2 key for kind="image"
  mimeType?: string;
  sizeBytes?: number;
  caption?: string | null;
  createdAt: string;
};
```

`editDistance` is not a user-supplied field. It is the case-insensitive Levenshtein distance between `misspelledName` and `correctName`, computed by the backend on every create and on every update where either name changes. A bigger number means a more egregious misspelling.

Example incidents:

```json
[
  {
    "correctName": "Nicolai",
    "misspelledName": "Nikolai",
    "offenderName": "HR Portal",
    "context": "Automated onboarding email",
    "source": "Email"
  },
  {
    "correctName": "Nicolai",
    "misspelledName": "Nicolaj",
    "offenderName": "Calendar Invite",
    "context": "Sprint planning invite title",
    "source": "Calendar"
  }
]
```

## Tech Stack

- React + TypeScript + Vite frontend
- Cloudflare Workers backend (single Worker, Static Assets binding serves the SPA)
- [Hono](https://hono.dev) router inside the Worker
- Cloudflare D1 for the database (SQLite-compatible)
- Cloudflare R2 for image attachments
- Tailwind CSS
- Recharts
- Lucide React icons
- Zod for validation

Do not add authentication, multi-user support, third-party integrations, or any database other than D1.

## Deployment

Everything ships as one Cloudflare Worker via `wrangler`. The app is hosted at the free `<name>.workers.dev` subdomain.

Required commands:

```bash
# one-time setup
wrangler d1 create name-misspell                    # paste the database_id into wrangler.toml
wrangler r2 bucket create name-misspell-uploads
wrangler d1 migrations apply DB --remote

# build + deploy
pnpm build
wrangler deploy
```

The app must listen on the default Workers fetch handler (no port — Cloudflare manages it).

Bindings (configured in `wrangler.toml`):

```toml
[[d1_databases]]
binding = "DB"
database_name = "name-misspell"
database_id = "<from wrangler d1 create>"
migrations_dir = "migrations"

[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "name-misspell-uploads"

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"

[vars]
SEED_DEMO_DATA = "false"
```

The Worker reads bindings as `env.DB`, `env.UPLOADS`, `env.ASSETS`, and `env.SEED_DEMO_DATA`. There is no Docker, no persistent volume, no `process.env`, and no Node `fs` access — all state lives in D1 or R2.

## Project Structure

```txt
.
├── wrangler.toml
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── migrations/
│   └── 0001_initial.sql
└── src/
    ├── shared/
    │   └── types.ts
    ├── client/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── styles.css
    │   ├── components/
    │   ├── pages/
    │   ├── hooks/
    │   └── lib/api.ts
    └── worker/
        ├── index.ts          # Hono app + ASSETS fallback
        ├── env.ts            # Env type with bindings
        ├── db.ts             # D1 query helpers
        ├── levenshtein.ts    # editDistance helper
        ├── errors.ts         # JSON error helper
        ├── validation.ts     # Zod schemas
        └── routes/
            ├── misspellings.ts
            ├── attachments.ts
            ├── stats.ts
            └── export.ts
```

## Database

Use D1. SQL is identical to SQLite. Migrations live in `migrations/` and are applied with `wrangler d1 migrations apply`.

```sql
-- migrations/0001_initial.sql
CREATE TABLE IF NOT EXISTS misspellings (
  id TEXT PRIMARY KEY,
  correct_name TEXT NOT NULL,
  misspelled_name TEXT NOT NULL,
  offender_name TEXT NOT NULL,
  offender_handle TEXT,
  context TEXT NOT NULL,
  source TEXT,
  occurred_at TEXT NOT NULL,
  edit_distance INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_misspellings_occurred_at ON misspellings (occurred_at);
CREATE INDEX IF NOT EXISTS idx_misspellings_offender_name ON misspellings (offender_name);
CREATE INDEX IF NOT EXISTS idx_misspellings_misspelled_name ON misspellings (misspelled_name);
CREATE INDEX IF NOT EXISTS idx_misspellings_source ON misspellings (source);
CREATE INDEX IF NOT EXISTS idx_misspellings_edit_distance ON misspellings (edit_distance);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  misspelling_id TEXT NOT NULL REFERENCES misspellings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'link')),
  url TEXT,                 -- external URL for kind='link'; null for image
  storage_key TEXT,         -- R2 key for kind='image'; null for link
  mime_type TEXT,
  size_bytes INTEGER,
  caption TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_misspelling_id ON attachments (misspelling_id);
```

Deleting an incident must also delete its attachments and their R2 objects. The route handler must `env.UPLOADS.delete(key)` each image first; then the DB `ON DELETE CASCADE` removes the attachment rows.

## API

All API routes live under `/api`. Image bytes are served under `/uploads/:key` (also handled by the Worker).

### Health

```http
GET /api/health
```

```json
{ "ok": true }
```

### CRUD

```http
GET    /api/misspellings
POST   /api/misspellings
GET    /api/misspellings/:id
PUT    /api/misspellings/:id
DELETE /api/misspellings/:id
```

`GET /api/misspellings` must support:

```ts
{
  q?: string;
  offender?: string;
  misspelledName?: string;
  source?: string;
  editDistanceMin?: number;
  editDistanceMax?: number;
  from?: string;
  to?: string;
  sort?: "occurredAt_desc" | "occurredAt_asc" | "editDistance_desc" | "offender_asc";
  limit?: number;
  offset?: number;
}
```

Response:

```ts
{
  items: Misspelling[];   // attachments not included on list responses
  total: number;
}
```

`GET /api/misspellings/:id` returns the single incident with its `attachments` array populated.

`POST` and `PUT` request bodies must NOT contain `editDistance` — the server computes it from `correctName` and `misspelledName`. If the client sends one, ignore it.

### Attachments

```http
GET    /api/misspellings/:id/attachments
POST   /api/misspellings/:id/attachments
DELETE /api/attachments/:id
```

`POST` accepts either:

- `multipart/form-data` with a `file` field for an image upload (max 5 MB; allowed MIME types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`) and an optional `caption` field. The Worker writes to R2 at key `att/<uuid>.<ext>` and inserts an `attachments` row with `kind='image'`.
- `application/json` body `{ kind: "link", url: string, caption?: string }` for a link attachment.

Response:

```ts
Attachment;
```

### Image serving

```http
GET /uploads/:key
```

The Worker reads the object from R2 and streams it back with the stored `Content-Type` and a long `Cache-Control: public, max-age=31536000, immutable` header. The bucket itself stays private — clients only see images via this proxy.

### Stats

```http
GET /api/stats
```

Optional filters:

```ts
{
  from?: string;
  to?: string;
}
```

Return:

```ts
{
  totalIncidents: number;
  uniqueOffenders: number;
  uniqueMisspellings: number;
  averageEditDistance: number;
  mostCommonMisspelling: { value: string; count: number } | null;
  worstOffender: { value: string; count: number } | null;
  byMisspelling: { misspelledName: string; count: number }[];
  byOffender: { offenderName: string; count: number }[];
  bySource: { source: string; count: number }[];
  byEditDistance: { editDistance: number; count: number }[];
  overTime: { date: string; count: number }[];
}
```

### Export

```http
GET /api/export.csv
GET /api/export.json
```

CSV columns:

```txt
id,correctName,misspelledName,offenderName,offenderHandle,context,source,occurredAt,editDistance,notes,createdAt,updatedAt
```

Attachments are not included in exports.

## Validation

Validate on both frontend and backend using Zod schemas shared across `src/client` and `src/worker`.

Rules:

- `correctName`, `misspelledName`, `offenderName`, `context`, and `occurredAt` are required.
- `occurredAt` must be a valid ISO date.
- Trim strings before saving.
- `misspelledName` must not equal `correctName` case-insensitively.
- `editDistance` is server-computed; the client must not send it.
- Attachment images: max 5 MB, allowed MIME types listed above.
- Attachment links: must be a valid `http(s)://` URL.
- Worker returns JSON errors:

```json
{
  "error": {
    "message": "Misspelled name is required",
    "code": "VALIDATION_ERROR"
  }
}
```

Use:

- `400` for validation
- `404` for not found
- `413` for oversized uploads
- `415` for disallowed MIME types
- `500` for unexpected errors

## Frontend

Build a single-page React app with routes:

```txt
/                       Dashboard
/incidents              Incident list, search, filters
/incidents/:id          Incident detail page
/incidents/:id/edit     Edit incident
/new                    Add incident
/settings               Settings and exports
```

The Worker's Static Assets binding serves the built SPA, with `not_found_handling = "single-page-application"` so nested routes refresh correctly. The Hono app handles `/api/*` and `/uploads/*` and falls through to `env.ASSETS` for everything else.

## Dashboard

Show:

- App title, e.g. `Name Crimes Dashboard`
- Subtitle: `Track, analyze, and emotionally process every spelling offense.`
- Primary CTA: `Log new incident`
- KPI cards:
  - Total incidents
  - Unique offenders
  - Unique misspellings
  - Average edit distance
  - Most common misspelling
  - Worst offender
- Charts:
  - Incidents over time
  - Top misspellings
  - Worst offenders
  - Source distribution
  - Edit-distance distribution

Charts use Recharts, have tooltips, readable labels, and proper empty states.

## Incidents Page

Must include:

- Full-text search across misspelled name, correct name, offender, handle, context, and notes
- Source filter
- Edit-distance min/max filter
- Date range filter
- Sort dropdown
- Responsive incident list
- Edit/delete actions
- Delete confirmation dialog
- Pagination or infinite scroll for large result sets

Display each incident in a card/row like:

```txt
"Nikolai" instead of "Nicolai"
By: HR Portal
Context: onboarding email
Edit distance: 1
Occurred: 2026-05-09 14:30
```

A small attachment count indicator (e.g. `📎 2`) appears when an incident has attachments.

## Incident Detail Page

`/incidents/:id` shows:

- All fields of the incident
- Edit-distance badge
- Attachments section: image gallery (lightbox on click) + list of link attachments with captions
- Edit and Delete buttons (Delete with confirmation)
- "Back to incidents" link

## Add/Edit Form

Fields:

- Correct name
- Misspelled name
- Offender name
- Offender handle
- Source
- Occurred at
- Context
- Notes
- Attachments uploader: drag-and-drop image upload + add-link-by-URL row

UX:

- Default `correctName` to `Nicolai`
- Default `occurredAt` to now
- Use labels and inline validation messages
- Use a date/time input
- Show the live edit distance under the name fields as the user types (purely informational; server is source of truth)
- Show loading state on save and on each upload
- Allow removing attachments before saving the incident
- Redirect to the new incident's detail page after create, back to the incident detail or list after edit

## Settings

Settings page should include:

- Default correct name, stored in `localStorage`
- Export CSV button/link
- Export JSON button/link
- Short about text
- Storage info: total incidents and approximate R2 usage

Do not overengineer settings.

## Keyboard Navigation

The app must be comfortable to drive without a mouse.

| Key | Where | Action |
|---|---|---|
| `/` | global | focus the search box (incidents page) |
| `n` | global | go to `/new` |
| `g d` | global | go to dashboard |
| `g i` | global | go to incidents |
| `j` / `k` | incidents list | move row selection down/up |
| `Enter` | incidents list | open selected row's detail page |
| `e` | detail page | go to edit page |
| `Backspace` or `Esc` | detail page | back to list |
| `Esc` | any modal | close modal |
| `?` | global | open keyboard cheatsheet modal |

Shortcuts must not fire while a text input or textarea is focused (except `Esc`). The cheatsheet modal lists every shortcut.

## Visual Style

Use a polished modern product aesthetic:

- Tailwind CSS
- Rounded cards
- Soft borders/shadows
- Subtle gradient background
- Responsive layout (mobile-first, comfortable on desktop)
- Lucide icons
- Small transitions
- Edit-distance badges (number + icon, never color alone)
- Friendly empty states

Tone should be tasteful and lightly funny. Avoid joke overload.

Suggested copy:

```txt
Log a name crime
Repeat offender
Spelling evidence
The typo has been entered into evidence.
No name crimes logged yet.
Either everyone is behaving, or you have not started collecting evidence.
```

## Accessibility

Minimum requirements:

- Semantic HTML
- Labels for all inputs
- Keyboard-accessible controls
- Visible focus states
- Sufficient color contrast
- Dialogs must be dismissible with `Esc` and trap focus while open
- Edit distance must be communicated by number, not by color alone

## wrangler.toml

```toml
name = "name-misspell"
main = "src/worker/index.ts"
compatibility_date = "2025-12-01"

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"

[[d1_databases]]
binding = "DB"
database_name = "name-misspell"
database_id = "<filled by wrangler d1 create>"
migrations_dir = "migrations"

[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "name-misspell-uploads"

[vars]
SEED_DEMO_DATA = "false"
```

## Required Scripts

`package.json` should include equivalent scripts:

```json
{
  "scripts": {
    "dev": "concurrently -k -n vite,worker \"vite\" \"wrangler dev\"",
    "build": "vite build",
    "deploy": "pnpm build && wrangler deploy",
    "db:migrate:local": "wrangler d1 migrations apply DB --local",
    "db:migrate": "wrangler d1 migrations apply DB --remote",
    "typecheck": "tsc --noEmit"
  }
}
```

Vite's dev server proxies `/api` and `/uploads` to `wrangler dev` so the SPA and Worker behave like a single origin during development.

## README

Include local dev:

```bash
pnpm install
wrangler d1 create name-misspell                    # paste id into wrangler.toml
wrangler r2 bucket create name-misspell-uploads
pnpm db:migrate:local
pnpm dev
```

And deploy:

```bash
pnpm db:migrate           # remote D1
pnpm deploy
```

## Non-Goals

Do not build:

- Authentication
- Multi-user roles
- Cloud sync to other services
- External integrations
- Docker / containers
- A separate database service (use D1)
- AI features
- Complex permissions
- A manual severity rating (use the auto-computed `editDistance` instead)

## Acceptance Criteria

The app is done when:

1. It runs locally with `pnpm dev` (Vite + `wrangler dev`).
2. It deploys to `<name>.workers.dev` with `pnpm deploy`.
3. Data persists in D1 across deploys; image attachments persist in R2.
4. I can create, edit, delete, search, and filter incidents.
5. I can attach images and links to incidents and view them on the detail page.
6. I can view dashboard stats and charts.
7. I can export CSV and JSON.
8. The app is fully keyboard-navigable, with a `?` cheatsheet.
9. The UI is responsive and polished.
10. Empty, loading, validation, and error states are handled.
11. The app is a functioning website, not a glorified spreadsheet.
