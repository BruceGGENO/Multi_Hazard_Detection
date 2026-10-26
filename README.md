# Rwanda Response Hub

Responsive Next.js App Router + TypeScript + Tailwind CSS dashboard with Lucide icons and an interactive Leaflet map.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Production: `npm run build`; static output is generated in `out/`.

## Interactive features

- Three hazard layers; clickable district polygons and markers reveal exposure profiles.
- Rainfall ≥160 mm or terrain slope ≥40° automatically creates a simulated warning event. Lower both controls to re-arm the simulation.
- Emergency broadcast preview and simulated delivery confirmation; no real SMS or USSD is sent.
- Resource tabs, sector search, shelter occupancy indicators, and CSV export.
- Responsive map expansion, map zoom/reset, and Rwanda local clock.

## Community and recovery operations

- Expand **Citizen Outreach & USSD Simulator** to dial the mock `*182#` menu, select a district, read a Kinyarwanda alert, and acknowledge receipt. Enable the optional audio mock to play a three-tone chime (not recorded Kinyarwanda speech).
- Select a district on the map to open **Evacuation & Safe Zone Panel**. Synthetic route candidates exclude a flagged unstable-slope shortcut and full shelters, then rank by calculated walking time. Assisted walking mode recalculates estimates at 2 km/h instead of 3 km/h. Routes, assembly points, and capacities are demo fixtures, not verified navigation.
- Use **Ground Reports** below the logistics table to submit CHW/farmer observations. Filter the combined community/sensor feed by district and source. Reports remain unverified and are stored in memory for this page session; switching tabs preserves them, while reloading clears them.
- Switch to **Recovery & Imihigo Tracker** for district-filtered response time, relief distribution, and repair milestones. Targets and commitments are illustrative rather than official Imihigo scores.

The outreach translation is a judging mock and requires local-language review before operational use. This frontend does not connect to telecom services, road-routing services, or a reporting backend.

All population, exposure, resource, telemetry and risk data are illustrative fixtures. Polygon boundaries are approximate demo shapes, not official administrative boundaries. Map tiles require an internet connection and use CARTO/OpenStreetMap attribution. NST2 alignment is a design theme, not an official endorsement or validated operational model.
