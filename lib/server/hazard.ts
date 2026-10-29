import { hazardFeatures, type HazardMetrics, type HazardPrediction } from '@/lib/hazard';
import { localPredictionUrl } from '../local-only.mjs';

export function validateMetrics(value:unknown): HazardMetrics {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('400');
  const row=value as Record<string,unknown>;
  if(Object.keys(row).length!==hazardFeatures.length||!hazardFeatures.every(key=>typeof row[key]==='number'&&Number.isFinite(row[key])))throw new Error('400');
  return row as HazardMetrics;
}
export async function hazardService(path:'/model'|'/predict-hazard', metrics?:HazardMetrics) {
  const base=process.env.HAZARD_SERVICE_URL,key=process.env.HAZARD_API_KEY;
  if(!key)throw new Error('503');
  const response=await fetch(localPredictionUrl(base,path),{method:metrics?'POST':'GET',headers:{'X-API-Key':key,'Content-Type':'application/json'},body:metrics?JSON.stringify(metrics):undefined,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(response.status===422?'400':'503');
  return response.json();
}
export async function predictHazard(metrics:HazardMetrics):Promise<HazardPrediction> {
  const result=await hazardService('/predict-hazard',metrics);
  if(!Number.isFinite(result.probability)||result.probability<0||result.probability>100||!['High Risk','Elevated','Low Risk'].includes(result.riskLevel)||typeof result.modelVersion!=='string')throw new Error('503');
  return {...result,features:metrics};
}
