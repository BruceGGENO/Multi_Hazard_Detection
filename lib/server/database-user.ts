import { randomBytes, randomUUID } from 'node:crypto';
import { db, type User } from './db';

// Keep login database-independent; resolve a persistent owner for data operations.
export async function databaseUser(profile: User): Promise<User> {
 if (!profile.id.startsWith('demo-')) return profile;
 if (!profile.email) throw new Error('401');
 // No usable password is provisioned here; the signed demo login remains authoritative.
 const passwordHash = `${randomBytes(16).toString('hex')}:${randomBytes(64).toString('hex')}`;
 const result = await db.query(`INSERT INTO users(id,email,name,password_hash,role,district)
 VALUES($1,$2,$3,$4,$5,$6)
 ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email
 RETURNING id`, [randomUUID(), profile.email, profile.name, passwordHash, profile.role, profile.district]);
 return { ...profile, id: result.rows[0].id };
}
