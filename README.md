# AI Radar Dashboard

AI Radar is a pull-based, materialized AI engineering radar dashboard.

The final system will collect items from fixed sources, normalize them, enrich them with an LLM, store results in SQLite, and display them in a React dashboard.

---

## Folder Structure

```text
ai-radar/
  package.json         - Node.js scripts and dependency manifest
  tsconfig.json        - Base TypeScript compiler configuration
  tsconfig.app.json    - Frontend-specific TypeScript configuration
  vite.config.ts       - Vite bundler configuration & API proxy
  index.html           - React entry HTML page
  .env.example         - Sample environment variables
  README.md            - This documentation
  .dockerignore        - Patterns to ignore in Docker builds

  Dockerfile.api       - Docker build configuration for Express backend (native compiler setup)
  Dockerfile.web       - Docker build configuration for React frontend (multi-stage Nginx)
  nginx.conf           - Nginx server configuration (proxying /api to api container)
  docker-compose.yml   - Multi-container configuration

  src/
    web/               - React frontend code
      main.tsx
      App.tsx
      pages/           - Page components (Daily Brief, Timeline, Sources)
      components/      - UI components (AppShell, Sidebar, Header, EmptyState)
      lib/             - Client helpers (utils.ts)
    server/            - Backend API code
      index.ts
      routes/
        health.ts
    jobs/              - Ingestion, enrichment, and daily brief jobs (.gitkeep)
    db/                - SQLite client, schema, migration, and seeding code
      client.ts        - better-sqlite3 database initializer
      paths.ts         - database path resolver
      schema.sql       - DDL schema layout
      migrate.ts       - schema migration script
      seed-sources.ts  - default source configuration seeder
      inspect.ts       - CLI diagnostics check
    sources/           - [Future] Feed/API adapter implementations (.gitkeep)
    llm/               - [Future] LLM provider contracts and orchestration (.gitkeep)
    shared/            - TypeScript types shared between web and server
      types.ts

  data/                - Persistent storage directory for SQLite (radar.sqlite goes here)
  deploy/
    k8s/               - K3s cluster deployment manifests
      README.md
```

---

## Database Configuration

AI Radar uses SQLite as the materialized storage layer.

- **Local Default Path**: `data/radar.sqlite` (resolved relative to the project root directory).
- **Container/K3s Path**: `/data/radar.sqlite` (mapped via Docker volumes).
- **Environment Variable**: Configure the path via `DATABASE_PATH=/data/radar.sqlite`.

### Database Scripts

All commands below run using `tsx` to run TypeScript files directly:

1. **Run Migrations**: Creates all tables and indexes. Safe and idempotent.
   ```bash
   npm run db:migrate
   ```
2. **Seed Default Sources**: populates the 5 initial sources (arXiv, GitHub Trending, OpenAI/Anthropic updates). Safe and idempotent.
   ```bash
   npm run db:seed
   ```
3. **Inspect Database**: Prints the active database file location and rows counts.
   ```bash
   npm run db:inspect
   ```

*Note: Phase 1 only seeds the metadata configuration of the sources. It does not fetch external URLs or parse RSS feeds.*

---

## Source Adapter Layer

Phase 2 defines the source adapter contract. A source adapter is responsible for fetching and normalizing raw source items.

Adapters must not:
- write to SQLite directly
- call LLMs
- generate summaries
- update dashboard cards

### Inspection Command

You can verify that configured sources are mapped, loaded, and validated correctly by running:
```bash
npm run sources:inspect
```

*Note: This command loads configuration from SQLite and validates it. It is entirely offline and does not fetch external URLs.*

---

## Running the Application

### 1. Local Development (npm)

Install dependencies:
```bash
npm install
```

Run migrations and seed the database:
```bash
npm run db:migrate
npm run db:seed
```

Start both the backend API and frontend Vite server concurrently:
```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Vite-Proxied API Health Route**: http://localhost:5173/api/health (proxied to port 4000)
- **Direct API Health Route**: http://localhost:4000/api/health

---

### 2. Containerized Mode (Docker Compose)

Launch the multi-container app:
```bash
docker compose up --build
```

Exec into the API container to run database setup tasks:
```bash
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed
docker compose exec api npm run db:inspect
```

In Docker mode, the API can be reached in two ways:
1. **Direct API Access**: `http://localhost:4000/api/health` (accesses the backend container directly on port 4000).
2. **Web-Proxied API Access**: `http://localhost:8080/api/health` (the Nginx container on port 8080 proxies paths prefixed with `/api` to the backend service container).

- **Frontend**: http://localhost:8080
