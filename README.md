# AI Phone Performance Copilot — skeleton

A minimal, modular foundation: simulated phone telemetry stored in SQLite, rule-based
diagnosis and prediction over it, and a single React dashboard that reads the API.

## Run it

Two terminals, from this folder.

```bash
cd backend && npm install && npm run dev     # http://localhost:4000
cd frontend && npm install && npm run dev    # http://localhost:5173
```

The frontend proxies `/api` to port 4000, so nothing needs configuring.

## API

| Endpoint | Returns |
| --- | --- |
| `GET /api/telemetry?limit=30` | Latest sample plus recent history, oldest first |
| `GET /api/diagnosis` | Health score, status, and any issues with recommendations |
| `GET /api/prediction` | Projected health score, trend, and battery runway |

Telemetry is sampled every 3 seconds (`SAMPLE_INTERVAL_MS`) and written to
`backend/data/telemetry.db`. The database seeds itself on first start so the chart
has something to draw.

## Layout

```
backend/src
  database/     db.ts (schema), telemetryRepository.ts (all SQL)
  services/     simulatedTelemetrySource.ts, telemetryService.ts,
                diagnosisService.ts, predictionService.ts
  routes/       telemetry.ts, diagnosis.ts, prediction.ts
  types.ts      shared contracts, including the swap-in interfaces

frontend/src
  components/   Dashboard, HealthScore, MetricCard, TelemetryChart, IssueList
  services/     apiClient, dashboardService, useDashboard, formatters, chartGeometry
  types/        telemetry.ts — mirrors the backend contract
```

Components render props. Fetching, polling, thresholds, and geometry live in
`services/`.

## Swapping the placeholders

Three interfaces in `backend/src/types.ts` are the seams.

**Android instead of the simulator** — implement `TelemetrySource`, then call
`setTelemetrySource(androidSource)` in `backend/src/index.ts` before
`startTelemetryCollection()`. Storage, routes, and the frontend are unaffected.

**A model instead of the rules** — implement `DiagnosisEngine` or
`PredictionEngine` and pass it to `setDiagnosisEngine` / `setPredictionEngine`.
The response shape stays the same, so the dashboard needs no changes. The
thresholds in `RULES` stay put as a baseline to compare a model against.

## Not included

No auth, Android integration, real ML, LLM calls, Docker, or deployment config.
