import { user, origin, failure } from '@/lib/server/auth';
import { hazardService, predictHazard, validateMetrics } from '@/lib/server/hazard';
export const runtime='nodejs';
async function operator(){const u=await user();if(!['National Command Center Admin','District Disaster Officer'].includes(u.role))throw new Error('403');}
export async function GET(){try{await operator();return Response.json(await hazardService('/model'),{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
export async function POST(request:Request){try{origin(request);await operator();return Response.json(await predictHazard(validateMetrics(await request.json())),{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
