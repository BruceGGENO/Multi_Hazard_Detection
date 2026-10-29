import { db, type User } from './db';
export async function readRecords(u: User) {
  // Owners retain access to submissions within their assignment. Unreviewed third-party reports
  // are visible only to the assigned review authority, never to other citizens.
  const result = await db.query(`SELECT id,kind,district,data,created_at,(user_id=$3) AS "isOwner" FROM records
    WHERE ($1::text IS NULL OR district=$1)
    AND ($2::boolean OR user_id=$3 OR kind='boundary' OR
      (data->>'verification'='verified' AND (kind IN ('report','warning') OR (kind='telemetry' AND data ? 'hazardType'))) OR
      ($4::boolean AND (kind IN ('resource','recovery') OR (kind='telemetry' AND NOT (data ? 'hazardType')))))
    ORDER BY created_at DESC,id DESC LIMIT 1000`,
    [u.role === 'National Command Center Admin' ? null : u.district,
      ['National Command Center Admin', 'District Disaster Officer'].includes(u.role), u.id, u.role === 'Field Responder']);
  return result.rows;
}
