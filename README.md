# Ember & Salt

A restaurant web app (fictional modern grill & bistro) whose headline feature is **viewing each dish in augmented reality at real-world size on the customer's table**, with three roles:

| Role | What they do |
| --- | --- |
| **Customer** (no login) | Browse the menu, open a dish in 3D / AR at true size, order (table number or pickup), track the order live. |
| **Employee** (login) | Kitchen Display System (KDS) with realtime tickets, a POS screen to create orders for customers, order history. |
| **Admin** (login) | Metrics dashboard, dish CRUD with 3D model upload + calibration + printable QR codes, team and roles. |

One deployable Next.js app, one database (PostgreSQL), uploads on disk. No third-party backend services.

The user interface is in Spanish (`<html lang="es">`); code identifiers, comments and this documentation stay in English.

## Stack

- Next.js 16 (App Router, TypeScript, `src/`), Tailwind CSS v4, `@google/model-viewer` for 3D/AR, Recharts, `qrcode`
- PostgreSQL via **Drizzle ORM**. Without `DATABASE_URL` it uses embedded **PGlite** (`./.data/pglite`), so local development needs no installation
- **Better Auth** (email + password, httpOnly cookie sessions, `role` = customer | employee | admin). Public sign-up is disabled
- Realtime kitchen board over **Server-Sent Events** (in-process bus, or Postgres `LISTEN/NOTIFY` when `DATABASE_URL` is set)
- Vitest + Testing Library (domain, use cases, Drizzle repositories on in-memory PGlite, HTTP/zod/auth helpers)

## Architecture

Screaming + hexagonal, with container/presentational UI:

```
src/
  app/                  routes only (pages, API route handlers, /media)
  modules/
    menu/      domain/ (Dish, calibration, GLB scale baking, size guide, validation)  application/  infrastructure/{drizzle,http,disk}  ui/
    orders/    domain/ (cart math, status state machine, ticket urgency, codes)       application/  infrastructure/{drizzle,http,events}  ui/
    analytics/ domain/ (pure KPI / trend / conversion aggregations)                   infrastructure/{drizzle,http}  ui/
    auth/      domain/ (roles)                                                       infrastructure/http  ui/
  server/               db (schema, client, migrations), auth (Better Auth, team service), http (zod, errors, rate limit), seed
  shared/               ui atoms, lib helpers
  config/               browser composition root (ports -> HTTP adapters)
drizzle/                generated SQL migrations
```

There is a single data path in every environment: UI containers -> ports -> **HTTP adapters** -> Next.js route handlers (role checks server-side, zod validation) -> **Drizzle repositories** -> PostgreSQL/PGlite. Swapping the database or storage means writing a new adapter, not touching domain or UI code.

## Local development

```bash
npm install
npm run db:seed     # creates ./.data/pglite, applies migrations, seeds dishes + ~30 days of demo data + staff users
npm run dev         # http://localhost:3000
```

- `.env.local` (git-ignored) holds `BETTER_AUTH_SECRET` and the dev staff credentials (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, `SEED_EMPLOYEE_EMAIL`/`SEED_EMPLOYEE_PASSWORD`). Sign in at `/login`.
- PGlite is a single-process database: run `db:seed` **before** `npm run dev` (or stop the dev server first).
- Other scripts: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:generate` (new migration after editing `src/server/db/schema.ts`), `npm run db:migrate`.
- Migrations are also applied automatically when the server boots (`src/instrumentation.ts`).
- Use `localhost` for development. AR on a phone needs **HTTPS** (see below), so test AR on a deployed site or through an HTTPS tunnel.

## Deploy on your own VPS (Docker Compose + automatic HTTPS)

You need a server with Docker and a domain name.

1. Point a DNS **A record** (e.g. `menu.example.com`) to the server's IP. Ports 80 and 443 must be open.
2. Copy and edit the environment file:
   ```bash
   cp .env.example .env
   ```
   Set at least `DOMAIN`, `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), and `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Leave `DATABASE_URL` empty: compose wires the bundled PostgreSQL for you.
3. Start everything (Caddy obtains the TLS certificate automatically):
   ```bash
   docker compose up -d --build
   ```
4. Create the first admin (idempotent, safe to repeat; no fake orders in production unless `SEED_DEMO_DATA=true`):
   ```bash
   docker compose exec app node scripts/seed.cjs
   ```
5. Open `https://your-domain`, sign in at `/login`, add employees from **Admin -> Team**.

**HTTPS is required for AR**: WebXR and camera access only work in secure contexts, and Quick Look / Scene Viewer expect HTTPS URLs. Caddy provides this with no extra work. `Caddyfile` disables response buffering (`flush_interval -1`) so the Server-Sent Events used by the kitchen display are never delayed.

### Backups

```bash
# database
docker compose exec -T db pg_dump -U ember ember | gzip > ember-$(date +%F).sql.gz
# restore: gunzip -c ember-DATE.sql.gz | docker compose exec -T db psql -U ember ember

# uploaded dish media (named volume "uploads")
docker run --rm -v "$(basename "$PWD")_uploads":/data -v "$PWD":/backup alpine tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

Also keep a copy of `.env` (especially `BETTER_AUTH_SECRET`).

### Updating

```bash
git pull && docker compose up -d --build
```

Pending SQL migrations run automatically on boot.

### Scaling notes

- The app is stateless apart from Postgres and the uploads volume. With `DATABASE_URL` set, order changes are broadcast with Postgres `LISTEN/NOTIFY`, so the kitchen board stays in sync even when you run several app instances behind the proxy.
- Run more instances with `docker compose up -d --scale app=2`; all instances must see the same uploads (a shared volume or NFS mount, or implement an S3 adapter).
- The order-rate limiter is in-memory per instance. Put a global limit at the proxy if you need strict limits across instances.
- Media storage is a port (`MediaStorage`) with a disk adapter. An S3-compatible adapter is not included; implement the same interface in `src/modules/menu/infrastructure/` and wire it in `src/server/container.ts`.

## The "scan a dish" flow

1. **Scan** the real dish with an external app: Polycam, Luma, or Apple Reality Composer / Object Capture.
2. **Export** a `.glb` (for web and Android) and, on iPhone, a `.usdz` too (iOS Quick Look uses it).
3. In **Admin -> Dishes -> New dish (or edit)**, drop the files into the 3D model section. The app previews the model, measures it, and compares it to the **real diameter/height** you enter. If it is more than 10% off it offers **Apply calibration**; for uploaded `.glb` files the scale is baked into the file so Android Scene Viewer shows the right size.
4. Save, then print the dish's **QR code** (download PNG or Print). It opens `/menu/<slug>?ar=1`, ready for "View on your table".

Notes on true-size AR:

- `ar-scale="fixed"` is always set, so guests cannot resize the dish in AR.
- **Android Scene Viewer ignores model-viewer's `scale` attribute**, and iOS Quick Look uses the `.usdz` as-is. That is why calibration is baked into uploaded `.glb` files, and why `.usdz` files must be exported at real scale from the scanning app. Models hosted elsewhere (such as the CC0 demo models) cannot be baked.
- Uploads are verified by content (magic bytes: `glTF`, `PK\x03\x04`, PNG/JPEG/WebP), limited to 50 MB (models) / 8 MB (images), and served with the correct types (`model/gltf-binary`, `model/vnd.usdz+zip`).

## Security

- Every staff/admin API route checks the session role on the server (employee: orders; admin: everything). The client `RequireRole` and `proxy.ts` only improve UX.
- Customers never send prices: the server computes totals from the database. Order tracking exposes only public fields, addressed by an unguessable id.
- Inputs are validated with zod; uploads are verified and path-traversal safe; ordering and event endpoints are rate limited per IP.

## Credits

3D models: Poly Haven (CC0), Khronos glTF Sample Assets (CC0). Photography: Unsplash and Poly Haven. The brand "Ember & Salt" is fictional.
