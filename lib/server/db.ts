import { Pool } from 'pg';
import { localDatabaseUrl } from '../local-only.mjs';
const globalDb = globalThis as unknown as { pool?: Pool };
// Delay configuration until a query is made so database-free demo sessions work.
export const db = new Proxy({} as Pool, { get(_target, property) {
 const pool = globalDb.pool ??= new Pool({ connectionString: localDatabaseUrl(process.env.DATABASE_URL), max: 10, connectionTimeoutMillis: 5000 });
 const value = Reflect.get(pool, property);
 return typeof value === 'function' ? value.bind(pool) : value;
} });
export const roles = ['National Command Center Admin', 'District Disaster Officer', 'Field Responder', 'Citizen', 'CHW'] as const;
export type User = { id: string; name: string; role: typeof roles[number]; district: string | null; email?: string; roleCode?: string };
