'use client';
import { useEffect, useRef, useState } from 'react';
import { hasCoordinates, statusLabel, type IncidentData, type RecordRow } from '@/lib/incidents';
export function StatusBadge({data}:{data:IncidentData}) {
  return <span className={`verification-badge ${data.verification??'pending'}`}>{statusLabel(data)}</span>;
}
export type ReviewHandler = (id:string,decision:'verified'|'rejected',reason:string)=>void;
export function ReviewControls({record,busy,onReview}:{record:RecordRow;busy:boolean;onReview:ReviewHandler}) {
  const [reason,setReason]=useState('');
  const canApprove=hasCoordinates(record.data)&&!!record.data.hazardType&&!!record.data.severity;
  return <div className="review-controls"><label className="field">Review note (required for rejection)<textarea rows={2} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    {!canApprove&&<p>Legacy incident is missing coordinates or hazard metadata; it cannot be dispatched. Request a new, located report.</p>}
    <div className="review-actions"><button className="button broadcast" disabled={busy||!canApprove} onClick={()=>onReview(record.id,'verified',reason)}>Approve &amp; Verify</button><button className="button reject-button" disabled={busy||!reason.trim()} onClick={()=>onReview(record.id,'rejected',reason)}>Reject</button></div>
    <small>Approval publishes an operational dispatch to the command center. SMS is simulation only; no message is sent.</small></div>;
}
export function IncidentPanel({record,onClose,canReview,busy,onReview,onDispatch}:{record:RecordRow;onClose:()=>void;canReview:boolean;busy:boolean;onReview:ReviewHandler;onDispatch?:(record:RecordRow)=>void}) {
  const panel=useRef<HTMLElement>(null);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const listener=(e:KeyboardEvent)=>{
      if(e.key==='Escape')onClose();
      if(e.key==='Tab'){
        const elements=panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, [tabindex="0"]');if(!elements?.length)return;
        const first=elements[0],last=elements[elements.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',listener);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',listener);previous?.focus();};
  },[onClose]);
  const data=record.data;
  return <div className="incident-backdrop" onClick={onClose}><aside ref={panel} className="incident-panel" role="dialog" aria-modal="true" aria-labelledby="incident-title" onClick={e=>e.stopPropagation()}><button className="button secondary panel-close" onClick={onClose} aria-label="Close incident details">Close ×</button>
    <div className="eyebrow">INCIDENT INTELLIGENCE</div><h2 id="incident-title">{data.hazardType??'Reported incident'}</h2><p>{record.district} · {[data.sector,data.cell].filter(Boolean).join(' / ')||'Sector/cell not supplied'}</p><StatusBadge data={data}/>
    <dl className="incident-facts">{[['Severity',data.severity??'Unspecified'],['Source',record.kind],['Coordinates',hasCoordinates(data)?`${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`:'Not provided'],['Observed',new Date(data.observedAt??record.created_at).toLocaleString()],['Submitted',new Date(record.created_at).toLocaleString()],['Rainfall',data.rainfall!==undefined?`${data.rainfall} mm`:'Not provided'],['Saturation',data.saturation!==undefined?`${data.saturation}%`:'Not provided'],['Reviewed',data.reviewedAt?new Date(data.reviewedAt).toLocaleString():'Awaiting review']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {data.prediction&&<p className="notice">Landslide model: <strong>{data.prediction.probability.toFixed(2)}% · {data.prediction.riskLevel}</strong><br/>Model {data.prediction.modelVersion} · Decision support pending field validation.</p>}
    <p className="incident-description">{data.detail}</p>{data.reviewReason&&<p className="notice">Review note: {data.reviewReason}</p>}
    {canReview&&<ReviewControls record={record} busy={busy} onReview={onReview}/>}
    {onDispatch&&data.verification==='verified'&&<button className="button broadcast" disabled={busy} onClick={()=>onDispatch(record)}>Prepare simulated SMS</button>}
    {data.dispatchedAt&&<p className="notice">Published to command center at {new Date(data.dispatchedAt).toLocaleString()}. SMS simulation never sends a message.</p>}
    <details className="telemetry-payload"><summary>Full incident data</summary><pre>{JSON.stringify(data,null,2)}</pre></details>
  </aside></div>;
}
