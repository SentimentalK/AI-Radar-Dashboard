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

## Sync Job

Phase 3 introduces the first ingestion job. A sync job is responsible for fetching, validating, and writing new items to the database.

Run the sync job locally:
```bash
npm run sync
```

The job:
- Loads enabled sources from SQLite.
- Resolves registered adapters (only manual and generic RSS adapters are implemented in Phase 3).
- Fetches raw source items.
- Deduplicates items using stable hashes to prevent duplicate writes on subsequent executions.
- Inserts new items into SQLite (enrichment fields are left null).
- Records source-level execution history in `sync_runs`.
- Unsupported fetch methods and feed failures are logged as failures but do not crash the script, allowing remaining feeds to execute.

---

## Content Extraction

Phase 6 adds readable content extraction to compile full text for future LLM enrichment.

Run the extraction job locally:
```bash
npm run extract
```

Options:
- `--limit <number>`: limit batch processing (default is `EXTRACTION_BATCH_SIZE` or 25).
- `--retry-failures`: re-attempts previously failed candidates instead of ignoring them.

The extraction job:
- Finds items without extracted content (where `extracted_at IS NULL` by default).
- Implements a layered fallback strategy:
  1. **Feed Content**: Uses `rawContent` / `rawExcerpt` from RSS if >= 500 characters.
  2. **Jina Reader API**: If feed content is missing/short, crawls target URL to retrieve clean Markdown.
  3. **Raw Excerpt**: Falls back to the existing excerpt as a final safety measure.
- Runs crawlers and updates candidates one-by-one, releasing database connections during web request periods.
- Cleans and truncates extracted content (capped at `EXTRACTION_MAX_CHARS` or 40000).
- Updates `extracted_content`, `extraction_method`, `extracted_at`, and `extraction_error` columns in SQLite.
- Run history status is visible inside the card detail slide-over drawers.

---

## LLM Evaluation

Phase 7 introduces the LLM provider abstraction and evaluation framework. It supports running mock offline tests, Zhipu GLM completions, and Groq GPT-OSS-120B completions. Output responses are validated against a strict Zod-based radar card schema, processed by a deterministic enum-only repair layer on validation failure, audited for engineering quality, and recorded as JSON reports under the `reports/` folder.

**The evaluation job does not write any enrichment results or tags back to SQLite.** It is strictly evaluation-only.

### Run Offline Mock Evaluation
```bash
LLM_PROVIDER=mock npm run eval:llm
```

### Run Live Zhipu GLM Evaluation
Configure `ZHIPU_API_KEY` in `.env` and run:
```bash
LLM_PROVIDER=zhipu ZHIPU_API_KEY=your_key_here ZHIPU_MODEL=glm-4.5-flash npm run eval:llm
```

### Run Live Groq GPT-OSS-120B Evaluation
Configure `GROQ_API_KEY` in `.env` (requires available account quota) and run:
```bash
LLM_PROVIDER=groq GROQ_API_KEY=your_key_here GROQ_MODEL=openai/gpt-oss-120b npm run eval:llm
```

### Run Side-by-Side Comparison
Compare multiple targets concurrently by setting `LLM_EVAL_COMPARE=true`:
```bash
LLM_EVAL_COMPARE=true LLM_EVAL_COMPARE_TARGETS=zhipu:glm-4.5-flash,groq:openai/gpt-oss-120b npm run eval:llm
```
This generates a comparative JSON report `reports/llm-compare-<timestamp>.json` and outputs a side-by-side performance table.

Options:
- `LLM_EVAL_USE_LIVE_DB=true`: reads a small batch of actual database items (`extracted_content IS NOT NULL`) as inputs instead of using static fixtures.
- `LLM_EVAL_OUTPUT_DIR=<path>`: overrides the output folder for JSON reports.

### Key Assessment Rules:
- **Enum-only Repair**: If a schema validation fails, a deterministic repair layer attempts to map common out-of-bound strings (e.g. `web_framework -> infra`, `evaluate -> read`, `stable -> production`) for enums.
- **Pass Status**: Cases are assigned a `caseStatus` of `pass` (clean schema and quality checks), `pass_with_repair` (schema passed only after applying repairs), `warn` (schema passed but quality checks emitted warnings), or `fail`.
- **Model Selection**: The selected production model for Phase 8 should be chosen based on schema pass rate, warning counts, hallucination reviews, and average call latency.

*Note: Do not commit API keys or generated reports. All `reports/*.json` files are automatically excluded in `.gitignore`.*

---

## LLM Enrichment Pipeline

Phase 8 implements the production LLM enrichment pipeline. It selects candidates from the `items` table, processes them sequentially through Groq GPT-OSS-120B to analyze technologies, validates the output structured fields against a strict Zod schema, applies enum repairs if needed, and writes the validated enriched fields back to the `items` table along with updating the `tags` and `item_tags` tables transactionally.

### Local Ingestion & In-Production Enrichment Workflow
Run the pipeline locally:
```bash
npm run db:migrate
npm run db:seed
npm run sync
npm run extract
LLM_PROVIDER=groq GROQ_API_KEY=your_groq_api_key GROQ_MODEL=openai/gpt-oss-120b npm run enrich
npm run dev
```

### Docker Compose Production Enrichment Workflow
Run the pipeline containerized:
```bash
docker compose up -d --build
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed
docker compose exec api npm run sync
docker compose exec api npm run extract
docker compose exec api sh -c "LLM_PROVIDER=groq GROQ_API_KEY=your_groq_api_key GROQ_MODEL=openai/gpt-oss-120b npm run enrich"
```

### Options:
- `--limit <number>`: limit batch processing (default is `ENRICH_BATCH_SIZE` or 10).
- `--retry-failed`: retries items that previously failed enrichment (default is false).

### Configuration parameters (.env):
- `ENRICH_BATCH_SIZE`: Default number of items to enrich per run (default: 10).
- `ENRICH_MAX_CHARS`: Max extracted content chars sent to the model (default: 30000).
- `ENRICH_RETRY_FAILED`: If false, only enrich never-enriched items. If true, retry items with `enrichment_error`.
- `ENRICH_CONCURRENCY`: Sequential execution limit (default: 1).

*Note: Phase 8 enriches extracted items with Groq GPT-OSS-120B and writes validated structured fields to SQLite. It does not add new sources (Phase 10) or generate Daily Briefs (Phase 9).*

---

## Read-only API

Phase 4 exposes read-only API routes over the materialized SQLite data.

Routes:
- `GET /api/health`
- `GET /api/items` (query filters: `sourceType`, `sourceId`, `category`, `recommendedAction`, `minRelevance`, `q`, `limit`, `offset`)
- `GET /api/items/timeline` (query filters: `days`, `sourceType`, `category`, `recommendedAction`, `minRelevance`, `limitPerDay`)
- `GET /api/items/:id` (detail lookup, returns 404 error if missing)
- `GET /api/sources` (query filter: `enabled=true|false`)
- `GET /api/runs` (query filters: `status`, `sourceId`, `limit`, `offset`)
- `GET /api/tags`

### API Verification Examples

Direct API port (4000):
```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/sources
curl "http://localhost:4000/api/items?limit=5"
curl "http://localhost:4000/api/items/timeline?days=7"
curl http://localhost:4000/api/runs
curl http://localhost:4000/api/tags
```

Nginx container proxy (8080):
```bash
curl http://localhost:8080/api/items
curl http://localhost:8080/api/items/timeline
```

*Note: The API only reads from SQLite. It is strictly read-only and does not crawl external sources or execute LLMs during requests.*

---

## Frontend Dashboard

Phase 5 connects the React dashboard to the read-only API.

Pages:
- **Daily Brief**: placeholder explaining the pipeline status.
- **Timeline**: real materialized news items grouped by publish/fetch date.
- **Sources**: monitor configured sources and endpoints.
- **Sync Runs**: view pulling execution history, status badges, and fetch errors.

The frontend uses relative `/api` paths, allowing requests to work through the Vite dev server proxy locally and through the Nginx container proxy in Docker.

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
