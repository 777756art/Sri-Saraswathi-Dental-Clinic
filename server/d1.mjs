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
      CREATE TABLE IF NOT EXISTS d1_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS site_content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        subtitle TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '',
        excerpt TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        media_url TEXT NOT NULL DEFAULT '',
        mobile_media_url TEXT NOT NULL DEFAULT '',
        logo_url TEXT NOT NULL DEFAULT '',
        before_image TEXT NOT NULL DEFAULT '',
        after_image TEXT NOT NULL DEFAULT '',
        link_url TEXT NOT NULL DEFAULT '',
        cta_label TEXT NOT NULL DEFAULT '',
        secondary_cta_label TEXT NOT NULL DEFAULT '',
        secondary_cta_url TEXT NOT NULL DEFAULT '',
        badge_text TEXT NOT NULL DEFAULT '',
        rating_score TEXT NOT NULL DEFAULT '',
        rating_verified INTEGER NOT NULL DEFAULT 0,
        review_count TEXT NOT NULL DEFAULT '',
        trust_badge_text TEXT NOT NULL DEFAULT '',
        start_date TEXT NOT NULL DEFAULT '',
        end_date TEXT NOT NULL DEFAULT '',
        published_at TEXT NOT NULL DEFAULT '',
        seo_title TEXT NOT NULL DEFAULT '',
        seo_description TEXT NOT NULL DEFAULT '',
        price INTEGER NOT NULL DEFAULT 0,
        sessions TEXT NOT NULL DEFAULT '',
        duration TEXT NOT NULL DEFAULT '',
        available_for_booking INTEGER NOT NULL DEFAULT 1,
        qualification TEXT NOT NULL DEFAULT '',
        specialization TEXT NOT NULL DEFAULT '',
        years_experience TEXT NOT NULL DEFAULT '',
        registration_number TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        homepage_highlight INTEGER NOT NULL DEFAULT 0,
        patient_consent INTEGER NOT NULL DEFAULT 0,
        published INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 0,
        legacy_table TEXT NOT NULL DEFAULT '',
        legacy_id INTEGER DEFAULT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(type, slug)
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_site_content_type_order ON site_content(type, published, display_order, id);
      CREATE INDEX IF NOT EXISTS idx_site_content_slug ON site_content(slug);
      CREATE INDEX IF NOT EXISTS idx_site_content_legacy ON site_content(legacy_table, legacy_id);
    `);

    // One-time seed of legacy tables into site_content so existing D1 items remain editable in CMS
    const seededMeta = await db.prepare("SELECT value FROM d1_meta WHERE key = 'site_content_seeded'").first();
    if (!seededMeta) {
      const legacySeeds = [
        `INSERT OR IGNORE INTO site_content (
          type, slug, title, subtitle, specialization, qualification, years_experience,
          body, media_url, homepage_highlight, published, display_order, legacy_table, legacy_id, created_at, updated_at
        )
        SELECT
          'doctor', 'doctor-' || id, COALESCE(name, ''), COALESCE(specialization, ''),
          COALESCE(specialization, ''), COALESCE(qualification, ''), COALESCE(experience, ''),
          COALESCE(biography, ''), COALESCE(profile_image_url, ''), 1,
          CASE WHEN status = 'inactive' THEN 0 ELSE 1 END, COALESCE(display_order, 0),
          'doctors', id, COALESCE(created_at, datetime('now')), COALESCE(updated_at, datetime('now'))
        FROM doctors d
        WHERE NOT EXISTS (SELECT 1 FROM site_content sc WHERE sc.legacy_table = 'doctors' AND sc.legacy_id = d.id)`,

        `INSERT OR IGNORE INTO site_content (
          type, slug, title, excerpt, body, media_url, available_for_booking,
          homepage_highlight, published, display_order, legacy_table, legacy_id, created_at, updated_at
        )
        SELECT
          'treatment', COALESCE(NULLIF(slug, ''), 'treatment-' || id), COALESCE(treatment_name, ''),
          COALESCE(short_description, ''), COALESCE(full_description, ''), COALESCE(treatment_image_url, ''),
          1, 1, CASE WHEN status = 'inactive' THEN 0 ELSE 1 END, COALESCE(display_order, 0),
          'treatments', id, COALESCE(created_at, datetime('now')), COALESCE(updated_at, datetime('now'))
        FROM treatments t
        WHERE NOT EXISTS (SELECT 1 FROM site_content sc WHERE sc.legacy_table = 'treatments' AND sc.legacy_id = t.id)`,

        `INSERT OR IGNORE INTO site_content (
          type, slug, title, category, excerpt, body, media_url, published_at,
          homepage_highlight, published, legacy_table, legacy_id, created_at, updated_at
        )
        SELECT
          'blog', COALESCE(NULLIF(slug, ''), 'blog-' || id), COALESCE(title, ''),
          COALESCE(category, 'Dental Health'), COALESCE(description, ''), COALESCE(content, ''),
          COALESCE(cover_image_url, ''), COALESCE(published_at, created_at, datetime('now')),
          1, CASE WHEN status IN ('draft', 'inactive') THEN 0 ELSE 1 END,
          'blogs', id, COALESCE(created_at, datetime('now')), COALESCE(updated_at, datetime('now'))
        FROM blogs b
        WHERE NOT EXISTS (SELECT 1 FROM site_content sc WHERE sc.legacy_table = 'blogs' AND sc.legacy_id = b.id)`,

        `INSERT OR IGNORE INTO site_content (
          type, slug, title, category, excerpt, media_url, homepage_highlight,
          published, display_order, legacy_table, legacy_id, created_at, updated_at
        )
        SELECT
          'image', 'image-' || id, COALESCE(title, 'Clinic Photo'), COALESCE(category, 'Facility'),
          COALESCE(description, ''), COALESCE(image_url, ''), 1,
          CASE WHEN status = 'inactive' THEN 0 ELSE 1 END, COALESCE(display_order, 0),
          'gallery', id, COALESCE(created_at, datetime('now')), COALESCE(created_at, datetime('now'))
        FROM gallery g
        WHERE NOT EXISTS (SELECT 1 FROM site_content sc WHERE sc.legacy_table = 'gallery' AND sc.legacy_id = g.id)`,

        `INSERT OR IGNORE INTO site_content (
          type, slug, title, excerpt, before_image, after_image, patient_consent,
          homepage_highlight, published, legacy_table, legacy_id, created_at, updated_at
        )
        SELECT
          'gallery', 'gallery-' || id, COALESCE(title, 'Smile Transformation'),
          COALESCE(description, ''), COALESCE(before_image_url, ''), COALESCE(after_image_url, ''),
          1, 1, CASE WHEN status = 'inactive' THEN 0 ELSE 1 END,
          'before_after', id, COALESCE(created_at, datetime('now')), COALESCE(created_at, datetime('now'))
        FROM before_after ba
        WHERE NOT EXISTS (SELECT 1 FROM site_content sc WHERE sc.legacy_table = 'before_after' AND sc.legacy_id = ba.id)`,

        `INSERT OR IGNORE INTO site_content (
          type, slug, title, excerpt, media_url, mobile_media_url, homepage_highlight,
          published, display_order, legacy_table, legacy_id, created_at, updated_at
        )
        SELECT
          'reel', 'reel-' || id, COALESCE(title, 'Dental Reel'), COALESCE(description, ''),
          COALESCE(video_url, ''), COALESCE(thumbnail_url, ''), COALESCE(homepage_visibility, 1),
          CASE WHEN status = 'inactive' THEN 0 ELSE 1 END, COALESCE(display_order, 0),
          'reels', id, COALESCE(created_at, datetime('now')), COALESCE(created_at, datetime('now'))
        FROM reels r
        WHERE NOT EXISTS (SELECT 1 FROM site_content sc WHERE sc.legacy_table = 'reels' AND sc.legacy_id = r.id)`,

        `INSERT OR IGNORE INTO site_content (
          type, slug, title, excerpt, media_url, start_date, end_date, homepage_highlight,
          published, legacy_table, legacy_id, created_at, updated_at
        )
        SELECT
          'offer', 'offer-' || id, COALESCE(title, ''), COALESCE(description, ''),
          COALESCE(image_url, ''), COALESCE(start_date, ''), COALESCE(end_date, ''),
          COALESCE(homepage_visibility, 1), CASE WHEN status = 'inactive' THEN 0 ELSE 1 END,
          'offers', id, COALESCE(created_at, datetime('now')), COALESCE(created_at, datetime('now'))
        FROM offers o
        WHERE NOT EXISTS (SELECT 1 FROM site_content sc WHERE sc.legacy_table = 'offers' AND sc.legacy_id = o.id)`,
      ];

      for (const stmt of legacySeeds) {
        try {
          await db.prepare(stmt).run();
        } catch (seedErr) {
          console.warn("Legacy seed notice:", seedErr?.message || seedErr);
        }
      }
      await db
        .prepare("INSERT OR REPLACE INTO d1_meta (key, value, updated_at) VALUES ('site_content_seeded', '1', datetime('now'))")
        .run();
    }

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
