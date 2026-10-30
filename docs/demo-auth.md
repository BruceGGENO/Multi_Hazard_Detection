# Demo authentication on Vercel

Set `AUTH_SESSION_SECRET` to a random secret of at least 32 characters in Vercel's environment variables, then redeploy. Keep it consistent across instances and deployments to preserve sessions. Rotating it invalidates demo sessions.

The following accounts accept `Password123!` when primary authentication fails or the local database is unavailable or uninitialized:

| Email | Name | Role code | District |
| --- | --- | --- | --- |
| brucegeno34@gmail.com | Bruce GENO | ADMIN | National Headquarters |
| gisarobanks@gmail.com | Billy Gisaro | DISTRICT_OFFICER | Musanze |
| ericniyo@gmail.com | Eric Niyo | RESPONDER | RUBAVU |
| chw.cell@resilience.gov.rw | Chantal Uwase | FIELD_REPORTER | Gakenke |
| davidnshuti@gmail.com | David Nshuti | CITIZEN | Kigali |

Email matching ignores case and surrounding whitespace. Arbitrary passwords are rejected. Database rate-limit rejections remain enforced when the database is available.

`POST /api/auth` sets a signed, HTTP-only session cookie valid for 12 hours. `GET /api/auth` resolves demo sessions without querying the database. Profiles include `email` and `roleCode`; `role` retains the existing descriptive name used by dashboard and API authorization. `DELETE /api/auth` clears demo sessions without a database query.

The fallback provides authentication and existing dashboard permissions. Operational records, reporting, and messaging require PostgreSQL.

## Neon report storage on Vercel

Connect the Neon `rwanda-response-db` database to the Vercel project. Ensure `DATABASE_URL` contains the pooled PostgreSQL URL with `sslmode=require` (or `verify-full` / `verify-ca`), and is enabled for the deployment environment. Apply `scripts/schema.sql` once using the database SQL editor. The nine tables must exist before using reports.

On Vercel, the application accepts the configured remote PostgreSQL URL and uses a small connection pool. Local development retains its loopback database restriction. Prediction-service restrictions remain unchanged; ordinary reports do not require that service.

On the first data operation for each demo profile, the application creates a database user with a UUID, or reuses the existing user ID for that email without changing its password or metadata. Reports, ownership filters, reviews, and simulated messaging use that persistent UUID. Login and signed session validation remain independent of database availability.

Push the code changes and deploy a new version after configuring the database. Sign in as Eric, submit a report in `RUBAVU` with coordinates, hazard type, severity, and a description, then refresh and sign in again to confirm it persists. A district officer can review reports in their own district; the admin can review across districts. A reporter cannot review their own report.

Run `node --test scripts/cloud-reports.test.mjs` for the simulated-database regression checks, and `npm run typecheck` for TypeScript validation. Actual Neon connectivity and deployed persistence must be checked on the deployment.
