import fs from 'fs';

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

async function verify() {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`, {
    method: 'POST',
    headers: {
      'X-Auth-Email': email,
      'X-Auth-Key': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' ORDER BY name;" })
  });

  const data = await res.json();
  console.log('Tables in Cloudflare D1 (sri-saraswathi-dental-db):');
  const tables = data.result[0].results.map(r => r.name);
  console.log(tables);
  console.log('Count:', tables.length);
}

verify().catch(console.error);
