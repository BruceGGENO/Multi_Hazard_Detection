'use client';
import { useEffect, useState } from 'react';
import { hazardFeatures, type HazardMetrics, type HazardModel, type HazardPrediction } from '@/lib/hazard';
async function request(path:string,body?:unknown){
 const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const result=await response.json();if(!response.ok)throw new Error(result.error??'Prediction service unavailable');return result;
}
export default function HazardPredictionPanel({district,locked,onSaved}:{district:string;locked:boolean;onSaved:()=>Promise<void>}){
 const [model,setModel]=useState<HazardModel|null>(null),[metrics,setMetrics]=useState<Partial<HazardMetrics>>({});
 const [prediction,setPrediction]=useState<HazardPrediction|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [target,setTarget]=useState(district),[latitude,setLatitude]=useState(''),[longitude,setLongitude]=useState(''),[detail,setDetail]=useState('');
 useEffect(()=>{let active=true;request('/api/predict-hazard').then(result=>{if(active)setModel(result);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function run(save:boolean){
  setBusy(true);setError('');setNotice('');
  try{
   if(save){
    if(latitude===''||longitude===''||!target.trim()||!detail.trim())throw new Error('Supply district, coordinates and observation before publishing.');
    await request('/api/records',{kind:'warning',district:target,data:{detail,latitude:Number(latitude),longitude:Number(longitude),modelFeatures:metrics}});
    await onSaved();setNotice('Prediction published to the live map and independent verification queue.');
   }else setPrediction(await request('/api/predict-hazard',metrics));
  }catch(e){setError(e instanceof Error?e.message:'Prediction failed');}finally{setBusy(false);}
 }
 return <section className="panel"><div className="feature-heading"><h2>Landslide prediction</h2><p>Climate resilience decision support</p></div>
  <p className="notice">Use the dataset&apos;s encoded terrain and weather classes. Raw sensor units require a validated encoding adapter. Model estimates require officer review.</p>
  {error&&<p role="alert" className="notice error">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}
  {model&&<form className="operational-form" onSubmit={e=>{e.preventDefault();void run(false);}}>
   <div className="prediction-inputs">{hazardFeatures.map(name=><label className="field" key={name}>{name} (dataset code)<select required value={metrics[name]??''} onChange={e=>{setMetrics(previous=>({...previous,[name]:Number(e.target.value)}));setPrediction(null);setNotice('');}}><option value="" disabled>Select code</option>{model.features[name].values.map(value=><option key={value} value={value}>{value}</option>)}</select></label>)}</div>
   <button className="button broadcast" disabled={busy}>{busy?'Processing...':'Calculate landslide risk'}</button>
   {prediction&&<output className="prediction-result" aria-live="polite"><strong>{prediction.probability.toFixed(2)}%</strong> {prediction.riskLevel}<p>Model {prediction.modelVersion}</p></output>}
   <div className="form-pair"><label className="field">District<input disabled={locked} value={target} maxLength={80} onChange={e=>setTarget(e.target.value)}/></label><label className="field">Observation<textarea maxLength={2000} value={detail} onChange={e=>setDetail(e.target.value)}/></label></div>
   <div className="form-pair"><label className="field">Latitude<input type="number" min={-90} max={90} step="any" value={latitude} onChange={e=>setLatitude(e.target.value)}/></label><label className="field">Longitude<input type="number" min={-180} max={180} step="any" value={longitude} onChange={e=>setLongitude(e.target.value)}/></label></div>
   <button type="button" className="button secondary" disabled={busy||!prediction} onClick={()=>void run(true)}>Publish located prediction for review</button>
   <small>Holdout AUC {model.metrics.roc_auc.toFixed(3)}; Brier score {model.metrics.brier_score.toFixed(3)}; {model.metrics.evaluation_rows} evaluation rows. Random holdout does not establish geographic or operational performance.</small>
  </form>}
 </section>;
}
