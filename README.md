# Rwanda Response Hub: local hackathon edition

This edition runs Next.js, PostgreSQL and the Python model on existing local hardware. SMS is permanently simulated, and only OpenStreetMap browser tiles remain external. No paid gateway, satellite layer, hosted model, external weather feed or cloud storage integration remains.

## Setup

- Install Node.js 22+, PostgreSQL and Python 3.11+. Run npm.cmd ci and install backend/requirements.txt into .venv. Initial dependency downloads require internet.
- Follow POSTGRES_SETUP.md for local initialization and account creation.
- Existing databases: run npm.cmd run db:migrate. If ownership blocks migration, execute scripts/verification-admin.sql and scripts/roles.sql as postgres in pgAdmin against the configured database. Users and reports are preserved; CHW requires the role migration.
- Configure .env.local with a loopback DATABASE_URL, APP_ORIGIN=http://localhost:3000, HAZARD_SERVICE_URL=http://127.0.0.1:8000, and a random HAZARD_API_KEY with at least 32 characters. This key authenticates the local service and has no billing relationship.
- Set the same key privately in the Python process environment, then run:
  .venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
- In another terminal run npm.cmd run dev and open http://localhost:3000. For a production build run npm.cmd run build then npm.cmd start. Use these launchers so loopback guards and telemetry suppression load before Next.js.

## Permanent mock SMS

Only admins/officers can simulate alerts within their jurisdiction. POST /api/sms accepts requestId (UUID v4), district, message and phones. Recipients use +2507XXXXXXXX; blank selects consented local contacts. Limits remain 50 recipients per batch and five batches per operator per 15 minutes.

The handler contains no HTTP calls, provider polling, gateway credentials or live-mode switch. Batch and message records commit atomically to local PostgreSQL with status simulated. New simulations display "Simulated — no message sent." Replayed IDs return 409. Historical statuses are preserved. Incident approval publishes to the local command-center ledger independently of mock SMS.

## Security and network boundary

- npm launch commands bind Next.js to 127.0.0.1 and preload lib/network-guard.mjs, rejecting non-loopback TCP/TLS. Telemetry is disabled before startup and in next.config.ts.
- Database URLs accept loopback PostgreSQL only and reject connection overrides. Admin scripts use the same validation. The narrow search_path override exists for isolated integration tests.
- Model URLs permit only loopback HTTP port 8000, fixed paths and no credentials/query strings. Redirects are rejected and localhost is pinned to 127.0.0.1.
- Python blocks external outbound sockets and external DNS resolution. Bind FastAPI to loopback.
- Browser CSP permits same-origin connections and OpenStreetMap images. Framing, external scripts/forms and production eval are blocked. Inline scripts/styles remain for Next.js and Leaflet.
- Sessions are hashed, HttpOnly, SameSite=Strict, expire after 12 hours and revoke on logout. Secure cookies apply for HTTPS APP_ORIGIN; loopback HTTP works locally. Mutations require an Origin matching the actual loopback Host and port; localhost aliases and fallback server ports work without changing APP_ORIGIN. External and cross-port origins remain blocked. Login is rate limited.
- These application guards are defense in depth, not an OS firewall. For protection against arbitrary changed code/child processes, configure host firewall egress restrictions while preserving loopback. Do not publicly expose or tunnel local servers.
- Software cannot cancel existing subscriptions, revoke credentials outside this checkout, or eliminate hardware, electricity, internet or unrelated cloud bills. Package downloads and browser/OS services are outside the server boundary.

## Preserved workflow

Role numbers: 1 National Command Center Admin, 2 District Disaster Officer, 3 Field Responder, 4 Citizen, 5 CHW. Use npm.cmd run users:create, users:list and users:reset. All except national admins require a district. CHWs have field-data/submission/tracking access without review or mock-dispatch privileges.

District privacy, independent report reviews, atomic review/audit/dispatch records, pulsing geolocated flags and live local updates are retained. No self-approval or repeated terminal review is allowed. SSE checks records and sessions every three seconds with a 30-second fallback refresh. No hosted realtime provider is required.

Manual observations and local sensor submissions remain. No external feed adapter is bundled. Telemetry may include data.modelFeatures for local predictions; rainfall, saturation, observedAt and coordinates remain required.

## Model

The local Random Forest trains once per process on data/Complete-data.csv. All twelve encoded features are required: Aspect, Curvature, Earthquake, Elevation, Flow, Lithology, NDVI, NDWI, Plan, Precipitation, Profile and Slope. Raw units need a validated encoding dictionary. Invalid/unobserved codes are rejected.

Authenticated /model returns feature codes, fingerprint and holdout AUC/Brier metrics. POST /predict-hazard returns probability (0–100), riskLevel, modelVersion and features. Bands: below 30% Low Risk, 30% to below 70% Elevated, 70%+ High Risk. Duplicate vectors are deduplicated and conflicting labels excluded/count reported before a fixed stratified holdout. Geographic validity and operational calibration still require independent validation.

Officers publish located predictions into the pending review queue. The server recomputes scores rather than trusting client probabilities.

## Maps and offline behavior

Only tile.openstreetmap.org is used, with attribution. Browser basemap tiles need internet, follow the public usage policy and have no SLA. Do not bulk-download public tiles for offline use. If tiles are unavailable, flags and coordinate selection remain interactive over an empty basemap. No satellite layer remains.

## Local backups

Run npm.cmd run db:backup. pg_dump writes a custom-format archive under the ignored backups/ directory through loopback PostgreSQL; nothing is uploaded. Redirected backup directories are rejected and partial failures removed. PostgreSQL 18's standard Windows executable is detected; otherwise pg_dump must be on PATH.

Backups include sensitive data. Keep the checkout/backups on an access-controlled local volume outside cloud-sync/network folders. Backups are manual, not scheduled. Test restoration into a separate local database before relying on them; never casually overwrite the active database.

## Checks

npm.cmd run typecheck
npm.cmd run test:safety
npm.cmd run build
npm.cmd run test:workflow
.venv/Scripts/python.exe -m pytest backend -q

Workflow tests use temporary local schemas/accounts, then remove them. They cover all five roles, login/logout, district privacy, reviews, concurrency, mock SMS persistence/replay protection and live revocation. CREATE SCHEMA permission is required. Safety tests verify endpoint/socket restrictions and gateway/map removal. Tests never send real SMS.
