export const hazardTypes = ['Landslide', 'Flood', 'Heavy precipitation', 'Slope movement', 'Other'] as const;
export const severities = ['low', 'moderate', 'high', 'critical'] as const;
export type Severity = typeof severities[number];
export type IncidentData = {
  detail: string; polygon?: [number, number][]; rainfall?: number; saturation?: number;
  observedAt?: string; hazardType?: string; severity?: Severity; latitude?: number; longitude?: number;
  sector?: string; cell?: string; verification?: 'pending' | 'unverified' | 'verified' | 'rejected';
  reviewedAt?: string; reviewedBy?: string; reviewReason?: string; dispatchedAt?: string;
};
export type RecordRow = { id: string; kind: string; district: string; data: IncidentData; created_at: string; isOwner: boolean };
export function isIncident(r: Pick<RecordRow, 'kind' | 'data'>) { return ['report', 'warning'].includes(r.kind) || (r.kind === 'telemetry' && !!r.data.hazardType); }
export function hasCoordinates(data: IncidentData): data is IncidentData & { latitude: number; longitude: number } {
  return typeof data.latitude === 'number' && Number.isFinite(data.latitude) && Math.abs(data.latitude) <= 90 && typeof data.longitude === 'number' && Number.isFinite(data.longitude) && Math.abs(data.longitude) <= 180;
}
export function statusLabel(data: IncidentData) {
  if (data.verification === 'rejected') return 'Rejected';
  if (data.verification === 'verified') return data.dispatchedAt ? 'Verified & Dispatched' : 'Verified';
  return 'Pending Review';
}
