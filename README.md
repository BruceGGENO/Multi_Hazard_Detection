# Rwanda Response Hub

**Multi-Hazard Early Warning & Disaster Response System · Local hackathon edition**

A dark-mode command center that connects community hazard reports, local landslide susceptibility estimates, independent officer verification and simulated emergency communications. It is a decision-support prototype for Rwanda, not an operationally certified warning service.

## Purpose and NST2 context

Rwanda's NST2 (2024–2029) identifies stronger multi-hazard early warning and disaster response as climate-resilience priorities. This project demonstrates the reporting, risk interpretation and coordinated review workflow that can support that direction. Policy alignment is a design objective, not an endorsement or compliance certification. Reference: [MINECOFIN, NST2 abridged strategy](https://www.minecofin.gov.rw/fileadmin/user_upload/Minecofin/Publications/STRATEGIES/NST_2/NST2_2024-2029_Abridged.pdf).

## What the dashboard communicates

| Information | Current implementation |
| --- | --- |
| Landslide susceptibility | Local Random Forest probability, Low Risk / Elevated / High Risk band, model version and input feature codes |
| Multi-hazard observations | Geolocated reports and warnings for landslides, floods, heavy precipitation, slope movement and other incidents |
| Operational confidence | Pending Review, Verified & Dispatched, or Rejected; reviewer notes and timestamps |
| Field conditions | Submitted rainfall, saturation, observation time and incident details; no paid external feed |
| District coordination | Role-scoped records, verification queue, resources and recovery records when supplied |
| Vulnerability indices | **Not calculated in this edition.** Population, exposure and a validated vulnerability methodology are absent; no synthetic index is presented. |

Only landslide susceptibility is modelled. A flood report on the map is not a trained flood forecast. “Dispatched” denotes publication to the local command-center ledger, not handset SMS delivery.

## Data and model

The bundled [Complete-data.csv](data/Complete-data.csv) contains **1,212 observations, 12 encoded predictors and the binary Landslide target**. Terrain/weather factors include Precipitation, Slope, Elevation, NDVI, NDWI, Lithology, Aspect, Curvature, Earthquake, Flow, Plan and Profile.

The model excludes contradictory labels for identical vectors, deduplicates remaining vectors and uses a reproducible stratified 80/20 training/holdout split. A 300-tree Scikit-learn Random Forest trains once per service process. Model metadata exposes holdout ROC AUC, Brier score, row counts, excluded rows and a fingerprint. The held-out partition is not used to refit the serving model.

| Probability | Display band |
| --- | --- |
| Below 30% | Low Risk |
| 30% to below 70% | Elevated |
| 70% and above | High Risk |

These initial thresholds require local validation. Input values are **dataset classes**, not raw millimeters, meters or continuous satellite indices. Missing, nonnumeric and unobserved codes are rejected. The dataset has no coordinates or timestamps; map locations come from separate reports/operators. Temporal/geographic performance and operational probability calibration are unverified.

See [data/README.md](data/README.md) for the field guide, checksum, processing notes and citation template. The team identifies Kaggle as the source platform. **The exact dataset listing, original authorship, class codebook and public redistribution license have not been supplied. Resolve these before public submission.** The policy citation above is not a dataset citation.

## Interaction walkthrough

1. **Sign in** with a provisioned account. Sessions persist locally and logout revokes them.
2. **Inspect the map:** select a pulsing, severity-colored incident marker to open coordinates, observations, model probability and review details.
3. **Explore a susceptibility scenario:** officers change encoded feature selections in the Prediction tab, calculate risk and publish a located prediction for independent review. These are interactive what-if inputs, not a time-evolving disaster simulator.
4. **Submit a report:** choose a location on the map, enter coordinates or use browser geolocation, then supply the hazard and observation.
5. **Review independently:** a different authorized officer approves or rejects the report. Rejection requires a reason. The reporter sees live status updates.
6. **Simulate communications:** prepare an alert from a verified incident, select recipients and record a mock dispatch. The UI clearly displays **“Simulated — no message sent.”**

The current map is **OpenStreetMap street mapping**, not live satellite imagery. Satellite providers were deliberately removed to preserve the local, no-paid-API scope. OSM tiles require browser internet access and follow the [public tile policy](https://operations.osmfoundation.org/policies/tiles/); no SLA or offline bulk downloading is provided. Incident overlays remain interactive on an empty basemap if tiles cannot load.

### Roles

| Account creation choice | Role | Access |
| --- | --- | --- |
| 1 | National Command Center Admin | National records, predictions, independent reviews and mock dispatch |
| 2 | District Disaster Officer | The same operational functions within the assigned district |
| 3 | Field Responder | Submit/track own reports and read permitted district field data |
| 4 | Citizen | Submit/track own reports and view verified district incidents |
| 5 | CHW (Community Health Worker) | District field-data access and report submission/tracking; no approval or mock-dispatch authority |

There are no default passwords. All roles except national admins require a district. Pending and rejected third-party reports are private to review authorities.

## Repository layout

```text
.
├── frontend/
│   ├── app/                 # Next.js interface, styles and same-origin API routes
│   ├── components/          # Leaflet map, prediction form, incident/review panels
│   ├── public/              # Static assets, where present
│   └── next.config.ts       # Local-only security headers and telemetry opt-out
├── backend/
│   ├── main.py              # Training, schema validation and inference API
│   ├── run.py               # Root .env.local loader and loopback launcher
│   ├── local_network.py     # Python outbound network restriction
│   ├── requirements.txt
│   └── test_hazard.py
├── data/
│   ├── Complete-data.csv
│   └── README.md            # Data identity, codebook gaps and citation status
├── lib/                     # Shared TypeScript types, auth, DB and network guards
├── scripts/                 # Account tools, migrations, backup, launch and checks
├── docs/
│   ├── submission-checklist.md
│   └── eligibility/         # Public instructions only; actual evidence stays private
├── .env.example             # Safe local configuration template
├── package.json             # Run standard npm commands from this directory
└── package-lock.json
```

The Next.js server API intentionally remains with the frontend application; FastAPI provides the separate Python model service. Shared application helpers stay in lib/. There is one root npm installation and lockfile, not two independent frontend dependency trees.

## Reproduce locally

### Prerequisites

- Node.js **22+** with npm; Python **3.11+**; local PostgreSQL. The existing test machine uses Node 24, Python 3.14 and PostgreSQL 18.
- PostgreSQL credentials for your own installation. No cloud database is required or permitted.
- Internet for initial package downloads and OSM basemap tiles. Server-side runtime connections are restricted to loopback.
- Run all commands below from the **repository root**. On Windows PowerShell, use npm.cmd if execution policy blocks npm.ps1.

### 1. Install and configure the application

```sh
npm install
```

For a clean checkout, copy .env.example to .env.local:

```powershell
# Windows PowerShell; do not overwrite an existing configured .env.local.
Copy-Item .env.example .env.local
```

```sh
# macOS/Linux; do not overwrite an existing configured .env.local.
cp .env.example .env.local
```

Configure these local values in .env.local:

```dotenv
DATABASE_URL=postgresql://YOUR_LOCAL_USER:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/YOUR_DATABASE
APP_ORIGIN=http://localhost:3000
NEXT_TELEMETRY_DISABLED=1
HAZARD_SERVICE_URL=http://127.0.0.1:8000
HAZARD_API_KEY=REPLACE_WITH_A_RANDOM_LOCAL_SECRET_OF_AT_LEAST_32_CHARACTERS
```

The key authenticates only your local Python service; it has no billing relationship. Use a randomly generated private value, not the displayed placeholder. Do not commit or screen-record it. The PostgreSQL initializer below can create and write the real DATABASE_URL for you.

### 2. Initialize PostgreSQL and accounts

```sh
npm run db:init
npm run db:check
npm run users:create
```

Use the installed PostgreSQL administrator credentials in the interactive initializer. It creates a restricted application database login and schema; it does not install or start PostgreSQL. Repeat users:create for reporter and officer accounts. For local service installation/permissions and password reset, see [POSTGRES_SETUP.md](POSTGRES_SETUP.md).

For an existing database run npm run db:migrate. If table ownership blocks migration, execute scripts/verification-admin.sql and scripts/roles.sql as the table owner in pgAdmin against the configured database. Existing accounts and records are preserved. The CHW role requires the role-constraint migration.

### 3. Install and start Python

```powershell
# Windows, terminal A
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
.venv/Scripts/python.exe -m backend.run
```

```sh
# macOS/Linux, terminal A
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
.venv/bin/python -m backend.run
```

The launcher reads root .env.local and binds to 127.0.0.1:8000. Startup trains the model; /health becomes available once startup succeeds. It fails closed if the local service key is absent/short or the dataset is invalid.

### 4. Start the command center

```sh
# Terminal B
npm run dev
```

Open the local URL printed in the terminal and sign in with an account you created. The launcher selects frontend/, loads root .env.local, binds loopback and preloads the network guard. Same-origin requests work through localhost or 127.0.0.1, including a fallback local port; cross-origin submissions remain blocked.

For a production-style **local** build:

```sh
npm run build
npm start
```

Restart services after changing environment settings. Do not bypass the root launcher or expose/tunnel the servers publicly.

## API and persistence

| Endpoint | Access and purpose |
| --- | --- |
| /api/auth | Login, current session and logout |
| /api/records | Authorized district/national reads, submissions and independent review |
| /api/records/stream | Authenticated local server-sent updates; session rechecked every cycle |
| /api/predict-hazard | Officer-only same-origin proxy to the local Python service |
| /api/sms | Authorized mock dispatch recording and local history only |
| Python /health | Service startup readiness |
| Python /model | Local key required; input schema, fingerprint and evaluation metadata |
| Python POST /predict-hazard | Local key required; validated encoded inputs and susceptibility result |

PostgreSQL stores sessions, reports, review audit records, dispatches and simulated messages. Reviews and mock dispatch batches are atomic; replayed dispatch IDs and repeated terminal review decisions are rejected. No self-approval is allowed. Live state uses local SSE with a periodic refresh fallback.

## Cost boundary and security

- No live SMS implementation, satellite service, paid weather feed, hosted inference or cloud bucket is configured.
- SMS simulations never contact a gateway. They retain recipient validation, role/district checks, replay protection and local abuse limits.
- Database URLs accept loopback only; model requests accept fixed loopback paths on port 8000 and reject redirects.
- Node TCP/TLS and Python outbound socket guards reject remote destinations. These are defense in depth, not an OS firewall against arbitrary modified code or subprocesses.
- Next.js telemetry is disabled before startup and in frontend/next.config.ts.
- Sessions are hashed, HttpOnly and SameSite=Strict, expire after 12 hours and revoke on logout. HTTPS origins enable Secure cookies; local HTTP is supported.
- CSP limits browser connections to the app and map images to OSM; framing, external scripts/forms and production eval are blocked. Inline scripts/styles remain required by this setup.
- No claim of a complete security audit or nationwide operational readiness is made. Existing provider subscriptions, hardware, electricity and internet remain outside this software's cost boundary.

### Local backup

```sh
npm run db:backup
```

pg_dump writes a custom-format archive into ignored backups/ using loopback PostgreSQL. Standard PostgreSQL 18 Windows installation is detected; otherwise pg_dump must be on PATH. No cloud upload or automatic scheduling occurs. Archives contain sensitive data: keep them on an access-controlled local volume outside sync folders. Validate restoration into a separate database before relying on a backup.

## Validation

```sh
npm run typecheck
npm run test:safety
npm run build
npm run test:workflow
```

```powershell
.venv/Scripts/python.exe -m pytest backend -q
```

Use .venv/bin/python on macOS/Linux. Workflow tests require local PostgreSQL and CREATE SCHEMA permission; they use temporary schemas/accounts and clean up afterward. They exercise login/logout, all five roles, district privacy, reviews, concurrency, mock dispatch and live session revocation. Safety tests check egress restrictions, local URLs, Origin validation and provider removal. Tests never send real SMS. Browser/device acceptance testing remains a separate review.

For repeatable Node installation use npm ci against the committed lockfile. Python version ranges are in requirements.txt; record the resolved environment with python -m pip freeze for the final judging machine rather than assuming identical package resolution on every platform.

## Three-minute desktop demonstration

Use the [timed walkthrough and submission checklist](docs/submission-checklist.md). Record at most **3:00**, showing the desktop web command center, encoded-input prediction, marker details, separate reporter/officer accounts, live verification and the visible simulation badge. Explain the OSM basemap and model limitations accurately.

**Demo recording status: not yet supplied.** Add the final video URL to the organizer's submission form after checking playback and permissions. Do not record environment secrets, private eligibility evidence, personal contacts or password entry.

## Eligibility, attribution and submission readiness

[docs/eligibility/README.md](docs/eligibility/README.md) defines the private verification workflow. The tracked folder contains instructions only. Student cards and official documents should remain outside the repository; temporary private staging contents are ignored, which is not encryption or access control.

Before publishing: confirm dataset provenance/redistribution, obtain team agreement on a source-code license, complete private eligibility verification, record the demo and run a clean-clone acceptance test. No source license, eligibility evidence, team identity or organizer-specific compliance claim has been invented. No GitHub publication, commit, tag or document submission is performed automatically.
