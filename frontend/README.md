# Frontend and application API

This directory contains the Next.js App Router interface, same-origin API routes and Leaflet components. Shared domain types and PostgreSQL/authentication helpers are in the root `lib/` directory; this is one application, with one root npm lockfile.

Run all commands **from the repository root**:

```sh
npm install
npm run dev
```

Configuration is read from the root `.env.local`, not this folder. The root launcher binds loopback, loads the outbound network guard, disables framework telemetry and selects this directory automatically. `npm run build` and `npm start` use the same boundary. Do not start Next.js directly to bypass these safeguards.

See the root [README](../README.md) for PostgreSQL, model service, role provisioning and checks.
