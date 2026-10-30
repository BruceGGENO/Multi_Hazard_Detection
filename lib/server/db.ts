import { Pool } from 'pg';
import { localDatabaseUrl } from '../local-only.mjs';
const globalDb = globalThis as unknown as { pool?: Pool };
export function databaseConnectionString() {
 if (process.env.VERCEL !== '1') return localDatabaseUrl(process.env.DATABASE_URL);
 if (!process.env.DATABASE_URL) throw new Error('DATABASE_NOT_CONFIGURED');
 const url = new URL(process.env.DATABASE_URL);
 if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !['require','verify-ca','verify-full'].includes(url.searchParams.get('sslmode') ?? '')) throw new Error('DATABASE_NOT_CONFIGURED');
 if (['host','hostaddr','port','sslcert','sslkey','sslrootcert'].some(key => url.searchParams.has(key))) throw new Error('DATABASE_NOT_CONFIGURED');
 return url.toString();
}
// Delay configuration until a query is made so database-free demo sessions work.
export const db = new Proxy({} as Pool, { get(_target, property) {
 const pool = globalDb.pool ??= new Pool({ connectionString: databaseConnectionString(), max: process.env.VERCEL === '1' ? 2 : 10, connectionTimeoutMillis: 5000 });
 const value = Reflect.get(pool, property);
 return typeof value === 'function' ? value.bind(pool) : value;
} });
export const roles = ['National Command Center Admin', 'District Disaster Officer', 'Field Responder', 'Citizen', 'CHW'] as const;
export type User = { id: string; name: string; role: typeof roles[number]; district: string | null; email?: string; roleCode?: string };
