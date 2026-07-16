# AI Radar Dashboard

AI Radar is a pull-based, materialized AI engineering radar dashboard.

The final system will collect items from fixed sources, normalize them, enrich them with an LLM, store results in SQLite, and display them in a React dashboard.

Phase 0 only creates the project skeleton and container foundation.

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

  Dockerfile.api       - Docker build configuration for Express backend
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
    jobs/              - [Future] Ingestion, enrichment, and daily brief jobs (.gitkeep)
    db/                - [Future] SQLite client and migration files (.gitkeep)
    sources/           - [Future] Feed/API adapter implementations (.gitkeep)
    llm/               - [Future] LLM provider contracts and orchestration (.gitkeep)
    shared/            - TypeScript types shared between web and server
      types.ts

  data/                - [Future] Persistent storage directory for SQLite (.gitkeep)
  deploy/
    k8s/               - [Future] K3s cluster deployment manifests (.gitkeep)
      README.md
```

---

## Phase 0 Scope

### Implemented
- **React + Vite + TypeScript**: Set up with standard React and React-DOM versions.
- **Tailwind CSS v3 & shadcn/ui**: Local UI library configuration (button, card, badge, separator, scroll-area) for clean dark dashboard rendering.
- **Express Backend**: Minimal Node API listening on `0.0.0.0` at port `4000` (or `process.env.PORT`).
- **Health Check Route**: Exposes `GET /api/health` returning `{"ok": true, "service": "ai-radar-api"}`.
- **Docker Compose Setup**: Spawns an `api` service (Node dev mode using `tsx`) and a `web` service (production-grade Nginx builder and proxy).

### Intentionally Excluded
- SQLite database creation, schema, migrations, or seeding.
- Source crawlers (arXiv, GitHub Trending, standard RSS, RSSHub).
- Jina Reader markdown extraction.
- LLM enrichment logic or provider endpoints (Zhipu/GLM, OpenAI).
- Materialized daily briefs.
- Production multi-replica scaling configs or CronJobs.

---

## Running the Application

### 1. Local Development (npm)

Install dependencies:
```bash
npm install
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

In Docker mode, the API can be reached in two ways:
1. **Direct API Access**: `http://localhost:4000/api/health` (accesses the backend container directly on port 4000).
2. **Web-Proxied API Access**: `http://localhost:8080/api/health` (the Nginx container on port 8080 proxies paths prefixed with `/api` to the backend service container).

- **Frontend**: http://localhost:8080
