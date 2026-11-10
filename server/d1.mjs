// server/d1.mjs
// Cloudflare D1 Database Architect & Adapter
// Sri Saraswathi Dental Clinic

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "";
const __dirname = __filename ? path.dirname(__filename) : process.cwd();
const ROOT_DIR = path.resolve(__dirname, "..");
const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
const WRANGLER_D1_DIR = isServerless ? "/tmp/d1" : path.join(ROOT_DIR, ".wrangler", "state", "v3", "d1");
const LOCAL_DB_PATH = path.join(WRANGLER_D1_DIR, "sri-saraswathi-dental-db.sqlite");
const MIGRATIONS_PATH = path.join(ROOT_DIR, "migrations", "0001_initial_schema.sql");

// Ensure local or serverless D1 directory exists
if (!fs.existsSync(WRANGLER_D1_DIR)) {
  try {
    fs.mkdirSync(WRANGLER_D1_DIR, { recursive: true });
  } catch {
    // Ignore in read-only environments
  }
}

// Background replication to Cloudflare Remote D1 database
async function replicateToRemoteD1(sql, params = []) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const dbId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const email = process.env.CLOUDFLARE_AUTH_EMAIL;
  const key = process.env.CLOUDFLARE_AUTH_KEY;
  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !dbId || (!key && !token)) return;

  try {
    const headers = { "Content-Type": "application/json" };
    if (email && key) {
      headers["X-Auth-Email"] = email;
      headers["X-Auth-Key"] = key;
    } else if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({ sql, params }),
    });
  } catch {
    // Non-blocking background replication
  }
}

class LocalD1PreparedStatement {
  constructor(localDb, query, params = []) {
    this.localDb = localDb;
    this.query = query;
    this.params = params;
  }

  bind(...params) {
    return new LocalD1PreparedStatement(this.localDb, this.query, params);
  }

  first(colName) {
    const stmt = this.localDb.prepare(this.query);
    const row = stmt.get(...this.params);
    if (!row) return null;
    if (colName) return row[colName];
    return row;
  }

  all() {
    const stmt = this.localDb.prepare(this.query);
    const rows = stmt.all(...this.params);
    return {
      results: rows,
      success: true,
      meta: {
        served_by: "local-cloudflare-d1",
        duration: 0,
        changes: 0,
        last_row_id: 0,
        rows_read: rows.length,
        rows_written: 0,
      },
    };
  }

  run() {
    const stmt = this.localDb.prepare(this.query);
    const info = stmt.run(...this.params);

    // Asynchronously replicate write mutations to Cloudflare Remote D1
    const trimmed = this.query.trim().toUpperCase();
    if (
      trimmed.startsWith("INSERT") ||
      trimmed.startsWith("UPDATE") ||
      trimmed.startsWith("DELETE") ||
      trimmed.startsWith("REPLACE")
    ) {
      replicateToRemoteD1(this.query, this.params).catch(() => {});
    }

    return {
      success: true,
      meta: {
        served_by: "local-cloudflare-d1",
        duration: 0,
        changes: info.changes,
        last_row_id: Number(info.lastInsertRowid),
        rows_read: 0,
        rows_written: info.changes,
      },
    };
  }

  raw() {
    const stmt = this.localDb.prepare(this.query);
    const rows = stmt.all(...this.params);
    return rows.map((r) => Object.values(r));
  }
}

class LocalD1Database {
  constructor(dbPath) {
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
  }

  prepare(query) {
    return new LocalD1PreparedStatement(this.db, query);
  }

  batch(statements) {
    this.db.exec("BEGIN TRANSACTION;");
    try {
      const results = statements.map((stmt) => stmt.run());
      this.db.exec("COMMIT;");
      return results;
    } catch (err) {
      this.db.exec("ROLLBACK;");
      throw err;
    }
  }

  exec(sql) {
    this.db.exec(sql);
    return { count: 1, duration: 0 };
  }
}

// Remote Cloudflare D1 HTTP REST API client
class RemoteD1Database {
  constructor({ accountId, databaseId, apiToken }) {
    this.accountId = accountId;
    this.databaseId = databaseId;
    this.apiToken = apiToken;
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
        return self._query(query, this.params);
      },
    };
  }

  async _query(sql, params = []) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
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

  d1Instance = new LocalD1Database(LOCAL_DB_PATH);
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  if (accountId && databaseId) {
    console.log(`Cloudflare D1 Database Active: ${databaseId} (Account: ${accountId}) with real-time remote sync`);
  }
  return d1Instance;
}

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

const INLINE_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  qualification TEXT NOT NULL,
  specialization TEXT NOT NULL,
  experience TEXT NOT NULL,
  biography TEXT,
  profile_image_key TEXT,
  profile_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS treatments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  treatment_name TEXT NOT NULL,
  slug TEXT,
  short_description TEXT NOT NULL,
  full_description TEXT,
  benefits TEXT,
  treatment_image_key TEXT,
  treatment_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
  treatment_id INTEGER REFERENCES treatments(id) ON DELETE SET NULL,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  admin_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS blocked_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS blogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  description TEXT,
  content TEXT NOT NULL,
  cover_image_key TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  image_key TEXT,
  image_url TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS before_after (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  treatment_id INTEGER REFERENCES treatments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  before_image_key TEXT,
  before_image_url TEXT NOT NULL,
  after_image_key TEXT,
  after_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  video_key TEXT,
  video_url TEXT NOT NULL,
  thumbnail_key TEXT,
  thumbnail_url TEXT,
  homepage_visibility INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  image_key TEXT,
  image_url TEXT,
  start_date TEXT,
  end_date TEXT,
  homepage_visibility INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS clinic_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  address TEXT NOT NULL,
  opening_hours TEXT NOT NULL,
  logo_key TEXT,
  logo_url TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments(appointment_date, appointment_time, status);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status, display_order);
CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status, display_order);
`;

export async function initD1Schema(db) {
  if (fs.existsSync(MIGRATIONS_PATH)) {
    const migrationSql = fs.readFileSync(MIGRATIONS_PATH, "utf8");
    db.exec(migrationSql);
  } else {
    db.exec(INLINE_MIGRATION_SQL);
  }

  // Sync admins from Cloudflare Remote D1 if credentials exist
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const dbId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const email = process.env.CLOUDFLARE_AUTH_EMAIL;
  const key = process.env.CLOUDFLARE_AUTH_KEY;
  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (accountId && dbId && ((email && key) || token)) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (email && key) {
        headers["X-Auth-Email"] = email;
        headers["X-Auth-Key"] = key;
      } else if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sql: "SELECT * FROM admins" }),
      });
      const data = await res.json();
      const remoteAdmins = data.result?.[0]?.results || [];
      for (const a of remoteAdmins) {
        db.prepare(`
          INSERT INTO admins (id, name, email, password_hash, role, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            password_hash = excluded.password_hash,
            role = excluded.role,
            status = excluded.status,
            updated_at = excluded.updated_at
        `).bind(
          a.id,
          a.name,
          a.email,
          a.password_hash,
          a.role || "admin",
          a.status || "active",
          a.created_at || new Date().toISOString(),
          a.updated_at || new Date().toISOString()
        ).run();
      }
    } catch (err) {
      console.warn("Cloudflare D1 remote admin sync notice:", err?.message || err);
    }
  }

  // 1. Seed Admin
  const defaultPassword = process.env.ADMIN_PASSWORD || "Admin@dental2026";
  const passwordHash = hashPassword(defaultPassword);

  const adminCheck = db.prepare("SELECT id FROM admins WHERE email = ?").bind("admin@srisaraswathidental.com").first();
  if (!adminCheck) {
    db.prepare(`
      INSERT INTO admins (name, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', 'active', datetime('now'), datetime('now'))
    `).bind("Dr. Kishore Kumar", "admin@srisaraswathidental.com", passwordHash).run();
    console.log("Seeded Cloudflare D1 admin: admin@srisaraswathidental.com");
  }

  const karthikCheck = db.prepare("SELECT id FROM admins WHERE email = ?").bind("karthikeyanr359@gmail.com").first();
  if (!karthikCheck) {
    db.prepare(`
      INSERT INTO admins (name, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', 'active', datetime('now'), datetime('now'))
    `).bind("Karthikeyan R", "karthikeyanr359@gmail.com", passwordHash).run();
    console.log("Seeded Cloudflare D1 admin: karthikeyanr359@gmail.com");
  }

  // 2. Seed Clinic Settings (with R2 logo keys)
  const settingsCheck = db.prepare("SELECT id FROM clinic_settings WHERE id = 1").first();
  if (!settingsCheck) {
    db.prepare(`
      INSERT INTO clinic_settings (id, clinic_name, phone, email, whatsapp_number, address, opening_hours, logo_key, logo_url, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, 'clinic/clinic-logo.webp', '/api/media/clinic/clinic-logo.webp', datetime('now'))
    `).bind(
      "Sri Saraswathi Dental Clinic",
      "0424 427 2494",
      "info@srisaraswathidental.com",
      "919345743409",
      "866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009",
      "Mon–Sat: 9:00 AM – 8:45 PM | Sunday: Emergency Only"
    ).run();
    console.log("Seeded Cloudflare D1 clinic settings");
  }

  // 3. Seed Doctors (with R2 profile image keys)
  const doctorCheck = db.prepare("SELECT COUNT(*) AS count FROM doctors").first("count");
  if (!doctorCheck || doctorCheck === 0) {
    db.prepare(`
      INSERT INTO doctors (name, qualification, specialization, experience, biography, profile_image_key, profile_image_url, status, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'doctors/dr-kishore-kumar.webp', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=600&auto=format&fit=crop', 'active', 1, datetime('now'), datetime('now'))
    `).bind(
      "Dr. Kishore Kumar",
      "BDS, MDS - Oral & Maxillofacial Surgery",
      "Chief Dental Surgeon & Implantologist",
      "14+ Years",
      "Dr. Kishore Kumar is a renowned dental surgeon specializing in advanced implants, painless root canals, and restorative dentistry. Dedicated to patient comfort with modern clinical excellence."
    ).run();
    console.log("Seeded Cloudflare D1 chief doctor with R2 keys");
  }

  // 4. Seed Treatments (with R2 treatment image keys)
  const treatmentsCount = db.prepare("SELECT COUNT(*) AS count FROM treatments").first("count");
  if (!treatmentsCount || treatmentsCount === 0) {
    const initialTreatments = [
      {
        name: "General Check-up & Cleaning",
        slug: "general-checkup",
        short: "Routine oral examination, ultrasonic scaling, and stain removal.",
        full: "Comprehensive dental examination using digital imaging, ultrasonic tartar scaling, plaque polishing, and personalized oral hygiene guidance.",
        benefits: JSON.stringify(["Prevents gum diseases", "Removes tartar & bad breath", "Includes digital dental scan"]),
        key: "treatments/general-cleaning.webp",
        url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=600",
        order: 1,
      },
      {
        name: "Root Canal Treatment",
        slug: "root-canal",
        short: "Painless single-sitting rotary root canal therapy.",
        full: "State-of-the-art endodontic procedure using rotary instruments and apex locators to eliminate infection, relieve pain, and preserve the natural tooth.",
        benefits: JSON.stringify(["100% painless anesthesia", "Single-sitting available", "Lifetime tooth preservation"]),
        key: "treatments/root-canal.webp",
        url: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=600",
        order: 2,
      },
      {
        name: "Dental Implants",
        slug: "dental-implants",
        short: "Permanent titanium teeth replacements with natural bite force.",
        full: "Premium medical-grade titanium dental implants precision-placed for missing teeth. Restores 100% chewing function, facial aesthetics, and jawbone health.",
        benefits: JSON.stringify(["Lifetime warranty implants", "Natural tooth feel & look", "Prevents bone loss"]),
        key: "treatments/dental-implants.webp",
        url: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?q=80&w=600",
        order: 3,
      },
      {
        name: "Teeth Whitening",
        slug: "teeth-whitening",
        short: "Advanced LED laser whitening for a brighter, sparkling smile.",
        full: "Safe, effective clinical teeth whitening that lifts deep stains from coffee, tea, and age, brightening your smile up to 8 shades in a 45-minute visit.",
        benefits: JSON.stringify(["Up to 8 shades brighter", "Fast 45-min procedure", "Safe on enamel"]),
        key: "treatments/teeth-whitening.webp",
        url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=600",
        order: 4,
      },
      {
        name: "Orthodontics (Braces / Aligners)",
        slug: "orthodontics",
        short: "Clear invisible aligners and ceramic/metal braces for teeth alignment.",
        full: "Custom orthodontic treatment including discreet clear aligners and traditional ceramic braces to correct crooked teeth, gaps, and bite misalignments.",
        benefits: JSON.stringify(["Virtually invisible aligners", "Digital 3D smile preview", "Comfortable & removable"]),
        key: "treatments/orthodontics.webp",
        url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=600",
        order: 5,
      },
      {
        name: "Wisdom Tooth Extraction",
        slug: "wisdom-tooth",
        short: "Gentle surgical removal of impacted or painful wisdom teeth.",
        full: "Minimally invasive extraction of wisdom teeth with advanced local anesthesia and rapid healing protocols to relieve pain and protect adjacent molars.",
        benefits: JSON.stringify(["Gentle & pain-free", "Quick recovery protocol", "Prevents impaction damage"]),
        key: "treatments/wisdom-tooth.webp",
        url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=600",
        order: 6,
      },
    ];

    for (const t of initialTreatments) {
      db.prepare(`
        INSERT INTO treatments (treatment_name, slug, short_description, full_description, benefits, treatment_image_key, treatment_image_url, status, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))
      `).bind(t.name, t.slug, t.short, t.full, t.benefits, t.key, t.url, t.order).run();
    }
    console.log("Seeded Cloudflare D1 treatments with R2 keys");
  }

  // 5. Seed Offers (with R2 image keys)
  const offersCount = db.prepare("SELECT COUNT(*) AS count FROM offers").first("count");
  if (!offersCount || offersCount === 0) {
    db.prepare(`
      INSERT INTO offers (title, description, image_key, image_url, start_date, end_date, status, homepage_visibility, created_at)
      VALUES (?, ?, 'offers/checkup-offer.webp', 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=800&auto=format&fit=crop', '2026-01-01', '2026-12-31', 'active', 1, datetime('now'))
    `).bind(
      "Complete Oral Health Check-up & Consultation",
      "Includes comprehensive dental checkup, digital X-Ray assessment, and personalized treatment roadmap."
    ).run();
  }

  // 6. Seed Gallery (with R2 image keys)
  const galleryCount = db.prepare("SELECT COUNT(*) AS count FROM gallery").first("count");
  if (!galleryCount || galleryCount === 0) {
    const galleryItems = [
      { title: "Advanced Clinic Operatory", category: "facility", key: "gallery/operatory.webp", url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop" },
      { title: "Digital Dental Scanning & Imaging", category: "technology", key: "gallery/scanning.webp", url: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?q=80&w=800&auto=format&fit=crop" },
      { title: "Sterilization & Hygiene Station", category: "hygiene", key: "gallery/hygiene.webp", url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=800&auto=format&fit=crop" },
    ];
    for (const g of galleryItems) {
      db.prepare(`
        INSERT INTO gallery (title, category, image_key, image_url, status, display_order, created_at)
        VALUES (?, ?, ?, ?, 'active', 0, datetime('now'))
      `).bind(g.title, g.category, g.key, g.url).run();
    }
  }

  // 7. Seed Reels (with R2 video & thumbnail keys)
  const reelsCount = db.prepare("SELECT COUNT(*) AS count FROM reels").first("count");
  if (!reelsCount || reelsCount === 0) {
    db.prepare(`
      INSERT INTO reels (title, description, video_key, video_url, thumbnail_key, thumbnail_url, homepage_visibility, status, display_order, created_at)
      VALUES (?, 'Modern endodontics walkthrough', 'reels/root-canal-reel.mp4', 'https://www.youtube.com/shorts/sample', 'reels/root-canal-thumb.webp', 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=600&auto=format&fit=crop', 1, 'active', 1, datetime('now'))
    `).bind("How Modern Root Canal is 100% Pain-Free").run();
  }

  // 8. Seed Blogs (with R2 cover image keys)
  const blogsCount = db.prepare("SELECT COUNT(*) AS count FROM blogs").first("count");
  if (!blogsCount || blogsCount === 0) {
    db.prepare(`
      INSERT INTO blogs (title, slug, category, description, content, cover_image_key, cover_image_url, status, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'blogs/root-canal-guide.webp', 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=800', 'published', datetime('now'), datetime('now'), datetime('now'))
    `).bind(
      "5 Signs You Might Need a Root Canal (And Why It Doesn't Hurt Anymore)",
      "5-signs-you-need-root-canal",
      "General Dentistry",
      "Modern rotary endodontics has completely eliminated the pain associated with root canals. Learn the warning signs early.",
      "Dental decay often progresses silently until it reaches the tooth nerve. Common symptoms include lingering sensitivity to hot foods, sharp pain when chewing, and tender gums. Thanks to advanced computerized apex locators and painless local anesthesia at Sri Saraswathi Dental Clinic, 95% of root canal treatments are completed comfortably in a single sitting."
    ).run();
  }
}
