'use client';
import { useState } from 'react';
import { CheckCircle2, MessageSquareWarning } from 'lucide-react';
import { CitizenOutreach } from './citizen-outreach';
import { GroundReports } from './ground-reports';
import { RecoveryTracker } from './recovery-tracker';

export function OperationsCenter({ rainfall, highRisk }: { rainfall: number; highRisk: boolean }) {
  const [view, setView] = useState<'reports' | 'recovery'>('reports');
  return <div className="operations-center" id="operations"><CitizenOutreach/><section className="panel operations-workspace"><div className="operations-tabs" role="tablist" aria-label="Community and recovery operations" onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') { e.preventDefault(); const next = e.key === 'Home' ? 'reports' : e.key === 'End' ? 'recovery' : view === 'reports' ? 'recovery' : 'reports'; setView(next); document.getElementById(`tab-${next}`)?.focus(); } }}>
    <button id="tab-reports" role="tab" aria-selected={view === 'reports'} aria-controls="panel-reports" tabIndex={view === 'reports' ? 0 : -1} onClick={() => setView('reports')}><MessageSquareWarning size={16}/> Ground Reports</button><button id="tab-recovery" role="tab" aria-selected={view === 'recovery'} aria-controls="panel-recovery" tabIndex={view === 'recovery' ? 0 : -1} onClick={() => setView('recovery')}><CheckCircle2 size={16}/> Recovery &amp; Imihigo Tracker</button>
  </div><div id="panel-reports" role="tabpanel" aria-labelledby="tab-reports" hidden={view !== 'reports'}><GroundReports rainfall={rainfall} highRisk={highRisk}/></div><div id="panel-recovery" role="tabpanel" aria-labelledby="tab-recovery" hidden={view !== 'recovery'}><RecoveryTracker/></div></section></div>;
}
