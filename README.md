# Rwanda Response Hub

Next.js server application with PostgreSQL persistence, role-scoped operations and Twilio SMS. Requires Node.js 22+ and PostgreSQL; static export is no longer supported.

## Setup

For local PostgreSQL initialization and account management, follow [POSTGRES_SETUP.md](POSTGRES_SETUP.md). Start with `npm run db:init`, then `npm run db:check` and `npm run users:create`. List emails/roles with `npm run users:list`; reset passwords with `npm run users:reset`. Existing passwords cannot be retrieved.

1. Run `npm install`.
2. Copy `.env.example` to `.env.local`. Set DATABASE_URL, APP_ORIGIN (the exact public origin, e.g. https://response.example.rw), and Twilio credentials plus an approved sender.
3. Run `node --env-file=.env.local scripts/setup.mjs` to apply the schema.
4. Set USER_EMAIL, USER_PASSWORD (14+ characters), USER_NAME, USER_ROLE and USER_DISTRICT in your shell and rerun setup to provision an account. Role defaults to National Command Center Admin. All other roles require a district. Clear provisioning variables afterwards. There are no default accounts.
5. Run `npm run dev`, or `npm run build` and `npm start`. Production requires HTTPS for Secure session cookies.

Roles: National Command Center Admin, District Disaster Officer, Field Responder, Citizen. Sessions use HttpOnly, SameSite cookies, expire after 12 hours, are hashed in PostgreSQL and revoked on logout. Login attempts are limited per account. Configure IP limits and request-size limits at ingress; preserve public host/protocol for Origin checks.

## Persistent data API

All endpoints require session cookies. Mutations require a matching Origin header. GET /api/records returns the latest 1,000 records in scope. GET /api/records/stream pushes changed snapshots using server-sent events, checking the database and session every three seconds. Clients reconnect automatically and fall back to a 30-second refresh. Disable proxy buffering for this route and use a host that supports long-lived responses.

POST /api/records accepts {kind,district,data}. Kinds: report, telemetry, warning, resource, boundary, recovery. All data objects need a detail string (maximum 2,000 characters). Reports and warnings require hazardType, severity (low/moderate/high/critical), numeric latitude (-90–90) and longitude (-180–180). Optional sector and cell names are accepted. Telemetry requires coordinates, rainfall (nonnegative), saturation (0–100), and observedAt (ISO timestamp); include hazardType and severity when the source detects a hazard. Boundary needs polygon with at least three [latitude,longitude] pairs. Import verified boundaries: none are bundled. Polygon rendering currently supports one exterior ring per district; extend to GeoJSON for multipolygons and holes.

Admins can read/write nationally. District officers can read/write within their district. Responders and citizens can submit pending district reports and see their own review status. Pending and rejected third-party incidents are private to review authorities. Verified incidents (including sensor hazards) and boundaries are visible within the assigned district; responders additionally read ordinary telemetry, resources and recovery. Roles/assignments are provisioned administratively. Resource and recovery records are descriptive; structured logistics editing and external sensor adapters remain follow-up work.

Example telemetry body:

```json
{"kind":"telemetry","district":"Nyabihu","data":{"detail":"Station observation","rainfall":12.4,"saturation":58,"observedAt":"2026-10-28T10:00:00Z","latitude":-1.65,"longitude":29.51}}
```

No synthetic readings, population totals, evacuation routes or readiness scores are shown. Missing data has explicit empty states.

## Live flags and verification

Apply the database additions before reviewing incidents: `npm run db:migrate`. In this installation the existing tables are owned by postgres and the application login lacks REFERENCES privileges. Connect in pgAdmin as postgres to rwanda_response and execute [scripts/verification-admin.sql](scripts/verification-admin.sql) instead. It creates record_reviews and incident_dispatches and grants the app access; existing accounts and records are preserved.

Reports, warnings and hazardous telemetry start Pending Review regardless of any client-supplied verification fields. Located incidents render severity-colored pulsing flags, safe-text tooltips and a detail drawer. Rejected incidents are removed from the map. Select coordinates using the report map, GPS or numeric inputs. Missing legacy coordinates are never guessed; legacy reports can be rejected with a request to resubmit, but cannot be approved without hazard metadata and location.

National admins and district officers see a Verification Queue within their authority. Independent review is required: users cannot review their own submissions. PATCH /api/records accepts `{id,decision,reason}` with decision verified or rejected. Rejection requires a reason. Reviews lock the incident row and atomically persist the decision and audit record. Approval additionally inserts exactly one command-center dispatch record. Concurrent/repeated decisions return 409; terminal decisions cannot be silently overwritten.

Reporters see Pending Review, Verified & Dispatched, or Rejected badges and review notes through the authenticated live stream. Dispatched means published to the command-center operational feed and dispatch ledger. SMS sending and confirmed handset delivery remain separate actions in Communications; approval never automatically sends SMS.

For automatic sensor flags, optionally set HAZARD_RAINFALL_THRESHOLD_MM in .env.local to your locally validated threshold and restart the server. Threshold-crossing telemetry is flagged as pending Heavy precipitation with high severity unless the source supplies hazard metadata. No operational threshold is assumed by default. Sensor adapters still need to submit authenticated records; a station's coordinates must be supplied with every observation.

## Live SMS

POST /api/sms accepts {requestId,district,message,phones}. Only admins and district officers can dispatch, within their scope. requestId is a UUID v4 persisted before sending; reuse returns 409 without resending. phones is a comma/space-separated list of +2507XXXXXXXX numbers; blank selects consented contacts from the contacts table. Import your verified directory administratively. Limit: 50 recipients per batch, five batches per operator per 15 minutes.

Credentials remain server-side. Twilio trial restrictions, sender approval, country permissions and credit apply. Each attempt is persisted before calling the gateway. GET /api/sms polls nonterminal provider statuses and returns the latest 100 logs. Queued/sent never means confirmed delivery. Timeouts are unknown: verify provider logs before retrying. Server interruption can leave submitting records requiring reconciliation.

Dispatch runs synchronously. Deploy to a long-running Node host with sufficient request timeouts. Durable queue workers, automated reconciliation, delivery monitoring and high-volume load testing are required before safety-critical rollout. USSD and evacuation routing are not implemented.

## Maps

OpenStreetMap standard and Esri World Imagery are keyless selectable layers with attribution. OSM shared servers have a usage policy and no SLA: use compliant hosted/self-hosted tiles for sustained large-scale traffic. Esri terms apply. Internet is required.

## Verification and deployment

- `npx tsc --noEmit --incremental false`
- `npm run build`
- `npm run test:workflow` after building: real PostgreSQL/API integration tests in an isolated temporary schema, with temporary accounts and a dedicated server on port 3117. Requires a local PostgreSQL connection and CREATE SCHEMA permission. The schema is removed afterwards; existing users and reports are untouched. Tests cover authorization, privacy, coordinates, forgery resistance, live approval updates, concurrent decisions, rejection, legacy reports and automatic sensor flags. Tests never send SMS.
- With the server running: `node --test scripts/api-smoke.mjs`. TEST_BASE_URL defaults to http://localhost:3000.

Smoke tests cover anonymous access, cross-origin mutation rejection and malformed login. They do not verify PostgreSQL or real delivery. Before operational use, test all four roles across two districts, logout/expiration, restart persistence, verified boundaries and approved handsets in staging. Configure database TLS/backups, account administration, retention/access policies, ingress monitoring and independent resilience/security review.

This is a server-backed integration foundation. Live operation requires database/account provisioning, gateway credentials, verified source integrations and deployment acceptance testing.
