import { createHmac, timingSafeEqual } from 'node:crypto';
import type { User } from './db';

export const demoAccounts: User[] = [
 { id: 'demo-admin', email: 'brucegeno34@gmail.com', name: 'Bruce GENO', roleCode: 'ADMIN', role: 'National Command Center Admin', district: 'National Headquarters' },
 { id: 'demo-officer', email: 'gisarobanks@gmail.com', name: 'Billy Gisaro', roleCode: 'DISTRICT_OFFICER', role: 'District Disaster Officer', district: 'Musanze' },
 { id: 'demo-responder', email: 'ericniyo@gmail.com', name: 'Eric Niyo', roleCode: 'RESPONDER', role: 'Field Responder', district: 'RUBAVU' },
 { id: 'demo-chw', email: 'chw.cell@resilience.gov.rw', name: 'Chantal Uwase', roleCode: 'FIELD_REPORTER', role: 'CHW', district: 'Gakenke' },
 { id: 'demo-citizen', email: 'davidnshuti@gmail.com', name: 'David Nshuti', roleCode: 'CITIZEN', role: 'Citizen', district: 'Kigali' },
];
function sign(payload: string) {
 const secret = process.env.AUTH_SESSION_SECRET;
 if (!secret || secret.length < 32) throw new Error('AUTH_SESSION_SECRET_MISSING');
 return createHmac('sha256', secret).update(payload).digest('hex');
}
export function createDemoSession(account: User) {
 const payload = `demo.${account.id}.${Date.now() + 43200000}`;
 return `${payload}.${sign(payload)}`;
}
export function readDemoSession(token: string): User {
 const [prefix, id, expiry, signature, extra] = token.split('.');
 if (prefix !== 'demo' || extra !== undefined || !/^\d+$/.test(expiry ?? '') || Number(expiry) <= Date.now() || !/^[a-f0-9]{64}$/.test(signature ?? '')) throw new Error('401');
 const expected = sign(`${prefix}.${id}.${expiry}`);
 if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) throw new Error('401');
 const account = demoAccounts.find(account => account.id === id);
 if (!account) throw new Error('401');
 return { ...account };
}
