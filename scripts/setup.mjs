import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
const pool=new Pool({connectionString:process.env.DATABASE_URL});
try {
 if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
 await pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 if(process.env.USER_EMAIL){
 const {USER_EMAIL:email,USER_PASSWORD:password,USER_NAME:name,USER_ROLE:role='National Command Center Admin',USER_DISTRICT:district}=process.env;
 if(!password||password.length<14||!name)throw new Error('Set USER_NAME and USER_PASSWORD (at least 14 characters)');
 const salt=randomBytes(16).toString('hex');
 await pool.query('INSERT INTO users(id,email,name,password_hash,role,district) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),email.toLowerCase().trim(),name,`${salt}:${scryptSync(password,salt,64).toString('hex')}`,role,district??null]);
 console.log('Account provisioned');
 }else console.log('Schema ready');
}finally{await pool.end();}
