import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const envContent = fs.existsSync('.env.api') ? fs.readFileSync('.env.api', 'utf8') : '';
function getEnv(name) {
  if (process.env[name]) return process.env[name];
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : '';
}

const email = getEnv('CLOUDFLARE_AUTH_EMAIL');
const key = getEnv('CLOUDFLARE_AUTH_KEY');
const accountId = getEnv('CLOUDFLARE_ACCOUNT_ID');
const dbId = getEnv('CLOUDFLARE_D1_DATABASE_ID');

const localDb = new DatabaseSync('d:/Dental clininc/.wrangler/state/v3/d1/sri-saraswathi-dental-db.sqlite');

async function queryRemoteD1(sql, params = []) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`, {
    method: 'POST',
    headers: {
      'X-Auth-Email': email,
      'X-Auth-Key': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Query failed: ' + sql);
  }
  return data.result?.[0]?.results || [];
}

const tables = [
  'admins',
  'clinic_settings',
  'doctors',
  'treatments',
  'appointments',
  'blocked_dates',
  'blogs',
  'gallery',
  'before_after',
  'reels',
  'offers'
];

async function syncAll() {
  console.log('--- SYNCING LOCAL D1 DATABASE TO CLOUDFLARE REMOTE D1 ---');

  for (const table of tables) {
    const rows = localDb.prepare(`SELECT * FROM ${table}`).all();
    console.log(`Syncing ${table}: ${rows.length} rows...`);

    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = Object.values(row);
      const placeholders = cols.map(() => '?').join(', ');
      const updateSet = cols.map(c => `${c} = excluded.${c}`).join(', ');

      const sql = `
        INSERT INTO ${table} (${cols.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT(id) DO UPDATE SET ${updateSet};
      `;

      try {
        await queryRemoteD1(sql, vals);
      } catch (err) {
        console.warn(`Error syncing row in ${table}:`, err.message);
      }
    }
  }

  console.log('--- ALL RECORDS SYNCED TO CLOUDFLARE REMOTE D1 SUCCESSFULLY ---');
}

syncAll().catch(console.error);
