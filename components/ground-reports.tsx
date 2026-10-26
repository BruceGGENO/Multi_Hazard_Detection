'use client';
import { useState } from 'react';
import { Activity, MessageSquareWarning, Plus, Send } from 'lucide-react';
import { districts } from '@/lib/data';

type Report = { id: string; district: string; source: 'CHW' | 'Farmer' | 'Sensor'; anomaly: string; detail: string; time: string };
const initial: Report[] = [
  { id: '1', district: 'Nyabihu', source: 'CHW', anomaly: 'Soil cracks', detail: 'New cracks observed near the community footpath. District verification requested.', time: '14:31' },
  { id: '2', district: 'Rusizi', source: 'Farmer', anomaly: 'River swelling', detail: 'River rising beyond its usual bank near cultivated plots.', time: '14:29' },
];
export function GroundReports({ rainfall, highRisk }: { rainfall: number; highRisk: boolean }) {
  const [reports, setReports] = useState<Report[]>(initial);
  const [district, setDistrict] = useState('Nyabihu'); const [source, setSource] = useState<'CHW' | 'Farmer'>('CHW');
  const [anomaly, setAnomaly] = useState('Soil cracks'); const [detail, setDetail] = useState('');
  const [filter, setFilter] = useState('All districts'); const [sourceFilter, setSourceFilter] = useState('All sources'); const [notice, setNotice] = useState('');
  const sensor: Report = { id: 'sensor', district: 'Nyabihu', source: 'Sensor', anomaly: highRisk ? 'Critical threshold event' : 'Rainfall observation', detail: `48-hour rainfall: ${rainfall} mm. ${highRisk ? 'Scenario threshold crossed.' : 'Below critical scenario thresholds.'}`, time: 'LIVE' };
  const feed = [sensor, ...reports].filter(r => (filter === 'All districts' || r.district === filter) && (sourceFilter === 'All sources' || r.source === sourceFilter));
  return <section className="ground-reports"><div className="feature-heading"><div><h2><MessageSquareWarning size={18}/> Ground Reports</h2><p>Community observations alongside the live simulation telemetry.</p></div><span className="simulation-badge">DEMO FEED</span></div>
    <div className="reports-grid"><form className="report-form" onSubmit={e => { e.preventDefault(); if (!detail.trim()) return; setReports(r => [{ id: crypto.randomUUID(), district, source, anomaly, detail: detail.trim(), time: new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Kigali', hour: '2-digit', minute: '2-digit' }) }, ...r]); setDetail(''); setFilter('All districts'); setSourceFilter('All sources'); setNotice('Report added to the demo feed. Awaiting district verification.'); }}>
      <h3><Plus size={16}/> Submit an observation</h3><div className="form-pair"><label className="field">District<select value={district} onChange={e => setDistrict(e.target.value)}>{districts.map(d => <option key={d.name}>{d.name}</option>)}</select></label><label className="field">Reporter role<select value={source} onChange={e => setSource(e.target.value as 'CHW' | 'Farmer')}><option value="CHW">Community Health Worker</option><option>Farmer</option></select></label></div>
      <label className="field">Anomaly<select value={anomaly} onChange={e => setAnomaly(e.target.value)}>{['Soil cracks', 'River swelling', 'Slope movement', 'Blocked drainage'].map(a => <option key={a}>{a}</option>)}</select></label>
      <label className="field">Observation<textarea required maxLength={500} rows={4} value={detail} onChange={e => setDetail(e.target.value)} placeholder="Describe what changed and the nearby landmark…"/></label><button className="button broadcast" type="submit"><Send size={14}/> Submit demo report</button><p role="status" className="form-notice">{notice}</p><p className="feature-note">Reports are unverified and held in this browser session only.</p>
    </form><div className="report-feed"><div className="feed-filters"><label className="field">District filter<select value={filter} onChange={e => setFilter(e.target.value)}><option>All districts</option>{districts.map(d => <option key={d.name}>{d.name}</option>)}</select></label><label className="field">Source filter<select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>{['All sources', 'CHW', 'Farmer', 'Sensor'].map(s => <option key={s}>{s}</option>)}</select></label></div><div className="ground-feed-list" aria-live="polite">{feed.map(r => <article className="ground-report" key={r.id}><div className="report-source-icon">{r.source === 'Sensor' ? <Activity size={17}/> : <MessageSquareWarning size={17}/>}</div><div><div className="report-meta"><strong>{r.district} · {r.anomaly}</strong><time>{r.time}</time></div><p>{r.detail}</p><div className="report-tags"><span>{r.source === 'CHW' ? 'Community Health Worker' : r.source}</span><span className={r.source === 'Sensor' ? 'sensor-tag' : 'unverified-tag'}>{r.source === 'Sensor' ? 'Simulated telemetry' : 'Awaiting verification'}</span></div></div></article>)}{!feed.length && <p className="empty-state">No reports match these filters.</p>}</div></div></div>
  </section>;
}
