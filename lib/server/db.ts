import { Pool } from 'pg';
import { localDatabaseUrl } from '../local-only.mjs';
const globalDb = globalThis as unknown as { pool?: Pool };
export const db = globalDb.pool ??= new Pool({ connectionString: localDatabaseUrl(process.env.DATABASE_URL), max: 10, connectionTimeoutMillis: 5000 });
export const roles = ['National Command Center Admin', 'District Disaster Officer', 'Field Responder', 'Citizen', 'CHW'] as const;
export type User = { id: string; name: string; role: typeof roles[number]; district: string | null };
