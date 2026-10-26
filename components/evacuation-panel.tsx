'use client';
import { useState } from 'react';
import { MapPin, Navigation, Users } from 'lucide-react';
import type { District } from '@/lib/data';
import { calculateDemoRoutes } from '@/lib/evacuation';

export function EvacuationPanel({ district }: { district: District }) {
  const [assisted, setAssisted] = useState(false);
  const routes = calculateDemoRoutes(district, assisted ? 2 : 3);
  const [routeId, setRouteId] = useState('a');
  const selected = routes.find(r => r.id === routeId) ?? routes[0];
  return <section className="evacuation-feature">
    <h3><Navigation size={18}/> Evacuation &amp; Safe Zone Panel</h3>
    <p className="feature-note">SIMULATED ROUTES · Synthetic paths and assembly points, not verified navigation.</p>
    <label className="voice-toggle"><input type="checkbox" checked={assisted} onChange={e => setAssisted(e.target.checked)}/><Users size={14}/> Assisted walking pace (2 km/h)</label>
    <div className="safe-zone-list">{routes.map((r, i) => <button key={r.id} className={`safe-zone ${selected.id === r.id ? 'chosen' : ''}`} onClick={() => setRouteId(r.id)} aria-pressed={selected.id === r.id}>
      <span><MapPin size={15}/><strong>{r.name}</strong>{i === 0 && <small>RECOMMENDED</small>}</span>
      <span>{r.distance.toFixed(1)} km · {r.minutes} min <b>{r.capacity - r.occupied} spaces available</b></span>
      <span className="shelter-progress"><i style={{ width: `${r.occupied / r.capacity * 100}%` }}/></span><span>{r.occupied} / {r.capacity} occupied</span>
    </button>)}</div>
    <ol className="route-steps"><li>Selected district departure point</li>{selected.waypoints.map(w => <li key={w}>{w}</li>)}<li>{selected.name}</li></ol>
    <div className="route-exclusion">Unstable ridge shortcut excluded. Remaining routes ranked by estimated walking time and available shelter capacity.</div>
  </section>;
}
