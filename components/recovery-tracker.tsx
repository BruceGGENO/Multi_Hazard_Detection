'use client';
import { useState } from 'react';
import { CheckCircle2, Clock3, Hammer, PackageCheck } from 'lucide-react';

const recovery = [
  { district: 'Nyabihu', response: 18, delivered: 840, target: 1200, milestones: [{ name: 'Restore community access road', progress: 65, owner: 'District infrastructure unit', due: 'Day 14' }, { name: 'Reopen damaged water points', progress: 100, owner: 'Water response team', due: 'Day 7' }, { name: 'Rehabilitate hillside drainage', progress: 35, owner: 'Environment unit', due: 'Day 30' }] },
  { district: 'Gakenke', response: 24, delivered: 680, target: 850, milestones: [{ name: 'Repair district access bridge', progress: 45, owner: 'District infrastructure unit', due: 'Day 21' }, { name: 'Restore health-post access', progress: 100, owner: 'Health response team', due: 'Day 7' }, { name: 'Rehabilitate drainage channels', progress: 70, owner: 'Environment unit', due: 'Day 30' }] },
  { district: 'Rusizi', response: 32, delivered: 480, target: 640, milestones: [{ name: 'Restore flood-damaged road', progress: 55, owner: 'District infrastructure unit', due: 'Day 21' }, { name: 'Repair community water supply', progress: 80, owner: 'Water response team', due: 'Day 14' }, { name: 'Clear blocked river culverts', progress: 100, owner: 'Environment unit', due: 'Day 7' }] },
  { district: 'Rulindo', response: 21, delivered: 390, target: 420, milestones: [{ name: 'Reopen community access path', progress: 100, owner: 'District infrastructure unit', due: 'Day 14' }, { name: 'Restore shelter water supply', progress: 100, owner: 'Water response team', due: 'Day 7' }, { name: 'Stabilize damaged drainage', progress: 75, owner: 'Environment unit', due: 'Day 30' }] },
];
export function RecoveryTracker() {
  const [district, setDistrict] = useState('All districts');
  const visible = recovery.filter(d => district === 'All districts' || d.district === district);
  const response = Math.round(visible.reduce((n, d) => n + d.response, 0) / visible.length);
  const delivered = visible.reduce((n, d) => n + d.delivered, 0); const target = visible.reduce((n, d) => n + d.target, 0);
  const complete = visible.flatMap(d => d.milestones).filter(m => m.progress === 100).length;
  return <section className="recovery-tracker"><div className="feature-heading"><div><h2><CheckCircle2 size={18}/> Recovery &amp; Imihigo Tracker</h2><p>Illustrative district performance commitments · Post-disaster recovery cycle</p></div><label className="field">District<select value={district} onChange={e => setDistrict(e.target.value)}><option>All districts</option>{recovery.map(d => <option key={d.district}>{d.district}</option>)}</select></label></div>
    <div className="recovery-metrics"><div><Clock3 size={20}/><span>Mean response time</span><strong>{response}<small> min</small></strong><p>Alert to team deployment · Target ≤30 min</p></div><div><PackageCheck size={20}/><span>Relief distribution</span><strong>{Math.round(delivered / target * 100)}<small>%</small></strong><p>{delivered.toLocaleString()} / {target.toLocaleString()} household kits</p></div><div><Hammer size={20}/><span>Repair milestones completed</span><strong>{complete}<small> / {visible.length * 3}</small></strong><p>Infrastructure restoration commitments</p></div></div>
    <div className="table-scroll"><table><thead><tr><th>DISTRICT / COMMITMENT</th><th>ACCOUNTABLE TEAM</th><th>RECOVERY TARGET</th><th>PROGRESS</th><th>STATUS</th></tr></thead><tbody>{visible.flatMap(d => d.milestones.map(m => <tr key={`${d.district}-${m.name}`}><td><strong>{m.name}</strong><span>{d.district}</span></td><td>{m.owner}</td><td>{m.due} after incident</td><td><div className="capacity"><span><strong>{m.progress}%</strong></span><div><i style={{ width: `${m.progress}%`, background: m.progress === 100 ? '#10b981' : '#f59e0b' }}/></div></div></td><td><span className={`status-pill ${m.progress === 100 ? 'deployed' : 'standby'}`}>{m.progress === 100 ? <><CheckCircle2 size={11}/> Complete</> : 'In progress'}</span></td></tr>))}</tbody></table></div>
    <p className="feature-note recovery-note">Demo Imihigo-style commitments support response timeliness, accountable relief delivery, and infrastructure restoration. Targets are illustrative, not official performance scores.</p>
  </section>;
}
