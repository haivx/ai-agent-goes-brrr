# 🧭 Travel MCP Itinerary Planner — Agents.md

> **Goal**: A minimal, research‑grade system where an **agent** plans multi‑city trips by calling **MCP tools** (weather, places, travel time, itinerary) exposed by a Node/TypeScript MCP server. The same agent/UI can later swap providers (Google/OSM, OpenWeather/AccuWeather) without code changes, thanks to MCP abstraction.

---

## 1) High‑level Overview

**User / Agent (LLM or scripted)** → **MCP Client** ↔ **MCP Server (travel-mcp)** → **Adapters (APIs or mock)**

- MCP Server exposes tools:
  - `getPlaces(city, type, opts?)`
  - `getWeather(city, startDate, endDate)`
  - `estimateTravelTime(origin, destination, opts?)`
  - `planItinerary(cities, days, prefs?)`
- Adapters: `openweather`, `maps`, `fakeData` (mock for research), later add `hotels`, `openingStatus`.
- Agent chooses which tools to call (tool discovery), chains calls, returns a structured itinerary JSON.

**Non‑goals (v1):** Real booking/issuers (flights/hotels), payments, live user accounts.

---

## 2) Repository Layout (Monorepo, pnpm workspaces)

```
travel-mcp/
├─ apps/
│  ├─ mcp-server/                  # Node/TS MCP JSON-RPC server (HTTP or stdio)
│  │  ├─ src/
│  │  ├─ Dockerfile
│  │  └─ package.json
│  ├─ ui-client/                   # Next.js + Tailwind web UI (PR#5)
│  │  ├─ app/ | pages/
│  │  ├─ public/
│  │  ├─ Dockerfile
│  │  └─ package.json
│  └─ demo-client/                 # Tiny CLI for local tool calls (dev only, no Docker)
│     └─ package.json
├─ packages/
│  ├─ domain/                      # shared types & zod schemas (Place, Weather, Itinerary…)
│  │  └─ package.json
│  ├─ planner/                     # pure itinerary heuristics (no I/O)
│  │  └─ package.json
│  ├─ adapters/                    # providers: fake/, openweather/, maps/ (tree-shake via index)
│  │  └─ package.json
│  └─ mcp-common/                  # JSON-RPC helpers, error types, logger
│     └─ package.json
├─ infra/
│  ├─ docker-compose.yml           # Dev compose (mcp + ui)
│  └─ k8s/                         # Optional: Helm charts / manifests (prod)
├─ pnpm-workspace.yaml
├─ package.json                    # root scripts (build/test/typecheck)
├─ tsconfig.base.json
├─ turbo.json                      # (optional) cache/build graph
└─ .github/workflows/ci.yml        # CI (build selective images per app)
```

**Workspace files**

`pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@domain/*": ["packages/domain/src/*"],
      "@planner/*": ["packages/planner/src/*"],
      "@adapters/*": ["packages/adapters/src/*"],
      "@mcp-common/*": ["packages/mcp-common/src/*"]
    }
  }
}
```

**Root package.json (scripts)**
```json
{
  "name": "travel-mcp",
  "private": true,
  "scripts": {
    "dev": "pnpm -w -r --parallel dev",
    "build": "pnpm -w -r build",
    "typecheck": "pnpm -w -r typecheck",
    "lint": "pnpm -w -r lint",
    "test": "pnpm -w -r test"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "ts-node": "^10.9.2"
  }
}
```

---

## 3) Domain Types (shared)

```ts
// Minimal domain (packages/domain/src/types.ts)
export type PlaceType =
  | 'sightseeing' | 'food' | 'coffee' | 'museum' | 'park' | 'market' | 'temple' | 'indoor' | 'outdoor';

export interface Place {
  id: string; name: string; city: string; type: PlaceType;
  lat: number; lng: number; rating?: number; priceLevel?: 1|2|3|4;
  openingHours?: Array<{ day: 0|1|2|3|4|5|6; open: string; close: string }>; // local time
}

export interface WeatherDaily { date: string; tempMin: number; tempMax: number; condition: 'sunny'|'cloudy'|'rain'|'storm'; precipProb?: number; }

export interface TravelEstimate { durationMinutes: number; distanceKm: number; mode: 'walk'|'drive'|'transit'|'flight'; routePolyline?: string; }

export interface PlanPrefs {
  interests?: string[]; // e.g., ["food","history","coffee"]
  pace?: 'relaxed'|'standard'|'aggressive';
  budget?: 'low'|'mid'|'high';
  startCity?: string; endCity?: string; avoid?: string[]; // e.g., ["rainy-day-outdoor"]
}

export interface PlanBlock {
  start: string; // "09:00"
  end: string;   // "11:00"
  poiId?: string; name: string; type: PlaceType;
  notes?: string; travelBefore?: { mode: string; durationMinutes: number };
}

export interface CityDayPlan { date: string; blocks: PlanBlock[]; }

export interface CityPlan { city: string; dates: { start: string; end: string }; days: CityDayPlan[]; }

export interface Itinerary {
  cityPlan: CityPlan[];
  travelSegments: Array<{ fromCity: string; toCity: string; mode: 'flight'|'train'|'drive'; depart?: string; arrive?: string; estimateMinutes: number }>;
  hotelHints?: Array<{ city: string; area: string; reason: string }>;
}
```

---

## 4) MCP Server — Tools Contract (JSON‑RPC)

**Manifest (served at startup for tool discovery):**
```json
{
  "mcp_version": "1.0",
  "server_name": "travel-mcp",
  "tools": [
    { "name": "getPlaces", "description": "List top places in a city" },
    { "name": "getWeather", "description": "Multi-day forecast" },
    { "name": "estimateTravelTime", "description": "Travel time between two points/cities" },
    { "name": "planItinerary", "description": "Build a weather-aware itinerary" }
  ]
}
```

**Methods**

- `getPlaces(city: string, type: PlaceType, opts?: { limit?: number; minRating?: number; priceLevel?: 1|2|3|4; openNow?: boolean }) => Place[]`
- `getWeather(city: string, startDate: ISODate, endDate: ISODate) => WeatherDaily[]`
- `estimateTravelTime(origin: string, destination: string, opts?: { mode?: 'walk'|'drive'|'transit'|'flight'; departAt?: string }) => TravelEstimate`
- `planItinerary(cities: string[], days: number, prefs?: PlanPrefs) => Itinerary`

**Example Call**
```json
{ "jsonrpc":"2.0", "id": 1, "method": "planItinerary", "params": {
  "cities": ["Hà Nội","Huế","Đà Nẵng"],
  "days": 7,
  "prefs": { "interests": ["food","history","coffee"], "pace": "standard", "budget": "mid" }
}}
```

---

## 5) Adapters (Providers)

- `openweather` → real API or offline mock for research.
- `maps` (Google Maps API, OpenRouteService, or OSRM) → travel time & geocoding.
- `places` (Google Places / OSM + curated JSON) → top POIs by city & type.
- `fakeData` → deterministic fixtures for tests.

All adapters hide provider details (keys, host, schema). MCP tools consume **domain types** only.

---

## 6) Planner Heuristics (packages/planner)

- **Day split**: distribute days across cities (e.g., 7d over 3 cities → 3/2/2; bias by prefs).
- **Weather‑aware**: if `precipProb >= 0.6` → prioritize `indoor` types (museum/market/cafe), otherwise outdoor.
- **Pace**: relaxed (≤4 blocks/day), standard (4–5), aggressive (6–7).
- **Travel insertion**: call `estimateTravelTime` between consecutive POIs; ensure 15–30m buffer.
- **Opening hours** (optional v1.5): if closed → swap with fallback POI.

Pure functions; deterministic given inputs to aid testing & reproducibility.

---

## 7) Security & Ops

- MCP server runs behind a gateway; expose only JSON‑RPC methods defined above.
- API keys live in server env (never in agent/client); rotate via secret manager.
- Rate limit & caching on provider calls; structured logging for every tool call.

---

## 8) Local Dev & Scripts

```
# install deps
pnpm install

# dev all (server + UI when present)
pnpm dev

# typecheck / lint / test
pnpm typecheck && pnpm lint && pnpm test

# run MCP server only
pnpm --filter mcp-server dev

# sample JSON-RPC call (curl)
curl -X POST http://localhost:4000/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getWeather","params":{"city":"Huế","startDate":"2025-11-03","endDate":"2025-11-05"}}'
```

---

## 9) Milestones (PR plan — Docker‑first)

- **PR#0 – Repo Init & Infra**
  - Add workspace files: `pnpm-workspace.yaml`, `tsconfig.base.json`, `turbo.json` (optional)
  - Root `package.json` scripts; `.editorconfig`, `.nvmrc`, `.gitignore`
  - Create skeleton packages: `domain`, `mcp-common`, `planner`, `adapters`
  - CI stub `.github/workflows/ci.yml` (install, typecheck)

- **PR#1 – MCP Server Skeleton + getWeather (fake) + Docker**
  - `apps/mcp-server`: HTTP JSON-RPC endpoint `/mcp`, tool manifest, healthz
  - Implement `getWeather` using `adapters/fake`
  - Add **Dockerfile** (multi-stage) for mcp-server; push image in CI
  - Add `infra/docker-compose.yml` (dev: run mcp on :4000)

- **PR#2 – getPlaces (fake) + Validation**
  - `adapters/fake` add places dataset & query by city/type
  - `packages/domain` + zod schemas; validate JSON-RPC params
  - Extend CI to run unit tests on packages

- **PR#3 – estimateTravelTime (mock haversine) + Tests + Docker cache**
  - Implement haversine + speed heuristics per mode (walk/drive/transit/flight)
  - Unit tests for estimator; optimize Docker layers for cache

- **PR#4 – planItinerary (planner core) + Golden tests**
  - `packages/planner`: weather‑aware schedule, pace blocks, travel insertion
  - Wire tool `planItinerary` in `mcp-server`
  - Golden snapshot tests for deterministic fixtures

- **PR#5 – UI Client (Next.js + Tailwind) + Docker**
  - `apps/ui-client`: forms for `getWeather`, `getPlaces`, `planItinerary`
  - Itinerary day-by-day view; endpoint input (`NEXT_PUBLIC_MCP_ENDPOINT`)
  - **Dockerfile** for UI; update compose: ui depends on mcp

- **PR#6 – Real Adapters (feature‑flag) + Secrets** *(optional)*
  - `adapters/openweather`, `adapters/maps` behind env flags
  - Secret management (.env, GitHub Actions secrets); basic retry/cache

- **PR#7 – Ops & Hardening** *(optional)*
  - Rate limiting, structured logging, request IDs
  - K8s manifests under `infra/k8s/` (2 Deployments + 2 Services)
  - Helm chart or Kustomize overlays

---

## 10) Testing Strategy

- **Unit**: planner pure functions (deterministic fixtures), adapters mocked.
- **Contract**: JSON‑RPC schema (zod) for each tool; invalid params → typed errors.
- **Golden**: snapshot an itinerary for known inputs (cities/dates/weather) → diff on change.
- **Load (light)**: concurrent tool calls to check rate limiting & caching behavior.

---

## 11) Future Work

- `getHotels(city, opts?)` for lodging hints; `openingStatus(poiId, dateTime)`.
- Multi‑agent: planner agent + reviewer agent (policy guard: avoid-night-driving, budget cap).
- Persist itineraries; export to ICS/Google Calendar; shareable links.
- i18n content (vi/en) & local holiday awareness.

---

## 12) Appendix — Minimal JSON‑RPC Wrapper (client)

```ts
export async function mcpCall<T>(method: string, params: unknown, url = 'http://localhost:4000/mcp') {
  const res = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body.result as T;
}
```


## 10) Deployment (Monorepo)

### Docker Images (one per app)
- `apps/mcp-server/Dockerfile` → image: `ghcr.io/<org>/mcp-server:<sha>`
- `apps/ui-client/Dockerfile` → image: `ghcr.io/<org>/ui-client:<sha>`

**Compose (dev)** — `infra/docker-compose.yml`
```yaml
services:
  mcp:
    image: ghcr.io/you/mcp-server:${GIT_SHA}
    env_file: apps/mcp-server/.env
    ports: ["4000:4000"]
  ui:
    image: ghcr.io/you/ui-client:${GIT_SHA}
    environment:
      NEXT_PUBLIC_MCP_ENDPOINT: "http://mcp:4000/mcp"
    ports: ["3000:3000"]
    depends_on: [mcp]
```

**Kubernetes (prod)** — `infra/k8s/`
- `Deployment` + `Service` cho **mcp-server** và **ui-client** (2 pods riêng)
- UI có thể serve static qua CDN (Next standalone/export) nếu muốn

### Dockerfile Skeletons
`apps/mcp-server/Dockerfile`
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/mcp-server/package.json ./apps/mcp-server/package.json
RUN corepack enable && pnpm install -w --filter ./apps/mcp-server...

FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm -w -r build --filter ./apps/mcp-server...

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY --from=build /app/apps/mcp-server/dist ./apps/mcp-server/dist
COPY --from=build /app/apps/mcp-server/package.json ./apps/mcp-server/package.json
COPY --from=deps  /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "apps/mcp-server/dist/index.js"]
```

`apps/ui-client/Dockerfile`
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/ui-client/package.json ./apps/ui-client/package.json
RUN corepack enable && pnpm install -w --filter ./apps/ui-client...

FROM node:20-alpine AS build
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && pnpm --filter ./apps/ui-client... build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/apps/ui-client/.next ./apps/ui-client/.next
COPY --from=build /app/apps/ui-client/public ./apps/ui-client/public
COPY --from=build /app/apps/ui-client/package.json ./apps/ui-client/package.json
COPY --from=deps  /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "apps/ui-client/node_modules/next/dist/bin/next", "start", "-p", "3000", "apps/ui-client"]
```

### CI (GitHub Actions) — `.github/workflows/ci.yml`
- Cache pnpm; `pnpm install`
- `pnpm typecheck && pnpm lint && pnpm test`
- **Build images per app** (matrix) & push (GHCR/ECR/GCR)

```yaml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [mcp-server, ui-client]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install
      - run: pnpm typecheck && pnpm lint && pnpm test
      - run: docker build -f apps/${{ matrix.app }}/Dockerfile -t ghcr.io/you/${{ matrix.app }}:${{ github.sha }} .
      - run: echo ${{ secrets.GH_PAT }} | docker login ghcr.io -u you --password-stdin
      - run: docker push ghcr.io/you/${{ matrix.app }}:${{ github.sha }}
```

---

## 11) Future Work

- `getHotels(city, opts?)`, `openingStatus(poiId, dateTime)`
- Multi-agent (planner + reviewer), policy guard (avoid-night-driving, budget cap)
- Persist itineraries, ICS export, Google Calendar share
- i18n (vi/en), local holidays

