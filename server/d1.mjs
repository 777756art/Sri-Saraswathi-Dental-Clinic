// server/d1.mjs
// Cloudflare D1 Database Architect & Adapter
// Sri Saraswathi Dental Clinic

import crypto from "node:crypto";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// Remote Cloudflare D1 HTTP REST API Client
class RemoteD1Database {
  constructor({ accountId, databaseId, apiToken, authEmail, authKey }) {
    this.accountId = accountId;
    this.databaseId = databaseId;
    this.apiToken = apiToken;
    this.authEmail = authEmail;
    this.authKey = authKey;
    this.endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  }

  prepare(query) {
    const self = this;
    return {
      params: [],
      bind(...params) {
        this.params = params;
        return this;
      },
      async first(colName) {
        const res = await self._query(query, this.params);
        const row = res.results?.[0] || null;
        if (!row) return null;
        return colName ? row[colName] : row;
      },
      async all() {
        return self._query(query, this.params);
      },
      async run() {
        const res = await self._query(query, this.params);
        return {
          success: true,
          meta: {
            changes: res.meta?.changes ?? 1,
            last_row_id: res.meta?.last_row_id ?? 1,
          },
        };
      },
      async raw() {
        const res = await self._query(query, this.params);
        return (res.results || []).map((r) => Object.values(r));
      },
    };
  }

  async batch(statements) {
    const results = [];
    for (const stmt of statements) {
      results.push(await stmt.run());
    }
    return results;
  }

  async exec(sql) {
    await this._query(sql);
    return { count: 1, duration: 0 };
  }

  async _query(sql, params = []) {
    const headers = { "Content-Type": "application/json" };
    if (this.authEmail && this.authKey) {
      headers["X-Auth-Email"] = this.authEmail;
      headers["X-Auth-Key"] = this.authKey;
    } else if (this.apiToken) {
      headers["Authorization"] = `Bearer ${this.apiToken}`;
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ sql, params }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || "Cloudflare D1 Query failed");
    }

    const result = data.result?.[0] || {};
    return {
      results: result.results || [],
      success: true,
      meta: result.meta || {},
    };
  }
}

let d1Instance = null;

export function getD1Database(env = {}) {
  if (env && env.DB) {
    return env.DB;
  }

  if (d1Instance) return d1Instance;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const authEmail = process.env.CLOUDFLARE_AUTH_EMAIL;
  const authKey = process.env.CLOUDFLARE_AUTH_KEY;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  d1Instance = new RemoteD1Database({
    accountId,
    databaseId,
    authEmail,
    authKey,
    apiToken,
  });

  return d1Instance;
}

export async function initD1Schema(db) {
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'patient',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login_at TEXT DEFAULT (datetime('now')),
        login_count INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS contact_enquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    `);

    const adminEmail = process.env.ADMIN_EMAIL || process.env.CLOUDFLARE_AUTH_EMAIL || "admin@srisaraswathidental.com";
    const admin = await db.prepare("SELECT id FROM admins WHERE email = ?").bind(adminEmail).first();
    if (!admin) {
      const defaultPassword = process.env.ADMIN_PASSWORD || "Admin@dental2026";
      const passwordHash = hashPassword(defaultPassword);
      await db.prepare(
        "INSERT INTO admins (name, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, 'admin', 'active', datetime('now'), datetime('now'))"
      ).bind("Clinic Administrator", adminEmail, passwordHash).run();
    }
  } catch (err) {
    console.warn("Cloudflare D1 schema check notice:", err?.message || err);
  }
}
