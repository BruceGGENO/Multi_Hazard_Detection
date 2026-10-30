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

The fallback provides authentication and existing dashboard permissions. Operational records, reporting, and messaging still require the application's PostgreSQL database; this change does not provide a substitute data store. Existing local-only database and prediction-service restrictions remain in place.
