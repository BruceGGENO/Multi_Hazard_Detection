export const hazardFeatures = ['Aspect','Curvature','Earthquake','Elevation','Flow','Lithology','NDVI','NDWI','Plan','Precipitation','Profile','Slope'] as const;
export type HazardFeature = typeof hazardFeatures[number];
export type HazardMetrics = Record<HazardFeature,number>;
export type HazardPrediction = {probability:number;riskLevel:'High Risk'|'Elevated'|'Low Risk';modelVersion:string;features:HazardMetrics};
export type HazardModel = {features:Record<HazardFeature,{min:number;max:number;values:number[]}>;metrics:{roc_auc:number;brier_score:number;training_rows:number;evaluation_rows:number};modelVersion:string;inputEncoding:string};
