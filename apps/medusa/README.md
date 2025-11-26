# Medusa Backend

MedusaJS backend og admin for Huddle commerce funktionalitet.

## Architecture

- **Database:** Supabase Postgres (samme instans som Huddle app)
- **Schema:** `medusa` (isolated fra `public` schema)
- **Port:** 9000 (standard Medusa port)
- **Authentication:** Medusa's eget login system (ikke Clerk)

## Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Rediger .env med Supabase connection string
   # Format: postgres://user:pass@host:port/dbname?search_path=medusa
   # KRITISK: DATABASE_SCHEMA=medusa skal også være i .env
   ```

3. **Run Migrations:**
   ```bash
   npx medusa db:migrate
   ```

4. **Create Admin User:**
   ```bash
   npx medusa user -e admin@huddle.dk -p supersecret
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   # Eller fra root: npm run dev:medusa
   ```

6. **Access Admin:**
   - Open http://localhost:9000/app
   - Login med: admin@huddle.dk / supersecret

## Troubleshooting

### Schema Isolation Issues

Hvis Medusa tabeller placeres i `public` schema i stedet for `medusa`:

1. Verificer `medusa-config.ts`:
   ```typescript
   databaseSchema: process.env.DATABASE_SCHEMA || "medusa"
   ```

2. Verificer `.env`:
   ```bash
   DATABASE_SCHEMA=medusa
   ```

3. Ryd op i `public` schema (hvis nødvendigt):
   ```sql
   DROP TABLE IF EXISTS public.mikro_orm_migrations CASCADE;
   DROP TABLE IF EXISTS public.script_migrations CASCADE;
   ```

4. Kør migrations igen:
   ```bash
   npx medusa db:migrate
   ```

### Admin Dashboard Issues

Hvis serveren hænger på "Creating server":

1. Installer manglende dependencies:
   ```bash
   npm install use-sidecar react-remove-scroll-bar use-callback-ref react-style-singleton --save
   ```

2. Clear cache:
   ```bash
   rm -rf node_modules/.vite .medusa/admin .cache
   ```

3. Restart server

### Port Conflicts

Hvis port 9000 er i brug:

```bash
lsof -ti:9000 | xargs kill -9
```

## Integration with Huddle

- Huddle Next.js app (`apps/web`) kalder Medusa API for commerce operations
- Cross-schema references via UUID felter (se `.project/04-Database_Schema.md`)
- Medusa håndterer: products, orders, regions, shipping profiles
- Huddle håndterer: jerseys, social graph, messaging, notifications

## API Endpoints

Medusa eksponerer standard REST API på `http://localhost:9000`:

- **Store API:** `/store/*` - Public endpoints for products, carts, etc.
- **Admin API:** `/admin/*` - Protected endpoints for admin operations
- **Admin Dashboard:** `/app` - React admin UI

## Documentation

- **Medusa Docs:** https://docs.medusajs.com
- **Huddle Integration Patterns:** `.project/04-Database_Schema.md`
- **Backend Guide:** `.project/06-Backend_Guide.md`
- **Implementation Plan:** `.project/plans/HUD-15/implementation-plan-2025-11-26-HUD-15.md`

## Key Configuration

**medusa-config.ts:**
```typescript
module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseSchema: process.env.DATABASE_SCHEMA || "medusa", // KRITISK
    // ...
  }
})
```

**.env:**
```bash
DATABASE_URL=postgres://...?search_path=medusa
DATABASE_SCHEMA=medusa  # KRITISK
PORT=9000
```

## Development

- **Dev Server:** `npm run dev`
- **Build:** `npm run build`
- **Start Production:** `npm start`
- **Run Migrations:** `npx medusa db:migrate`
- **Seed Data:** `npm run seed`
