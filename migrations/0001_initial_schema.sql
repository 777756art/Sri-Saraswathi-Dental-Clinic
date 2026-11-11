-- Cloudflare D1 Migration: 0001_initial_schema.sql
-- Sri Saraswathi Dental Clinic - Cloudflare D1 Relational Schema with Cloudflare R2 Media Keys

-- 1. Admins Table
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

-- 2. Doctors Table (with Cloudflare R2 object keys)
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

-- 3. Treatments Table (with Cloudflare R2 object keys)
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

-- 4. Appointments Table
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

-- 5. Blocked Dates Table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Blogs Table (with Cloudflare R2 object keys)
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

-- 7. Gallery Table (with Cloudflare R2 object keys)
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

-- 8. Before & After Table (with Cloudflare R2 object keys)
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

-- 9. Reels Table (with Cloudflare R2 object keys)
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

-- 10. Offers Table (with Cloudflare R2 object keys)
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

-- 11. Clinic Settings Table (with Cloudflare R2 logo keys)
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

-- 12. Registered Patients Table
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

-- 13. Contact Enquiries Table
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

-- High-performance database indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments(appointment_date, appointment_time, status);
CREATE INDEX IF NOT EXISTS idx_appointments_phone ON appointments(phone);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status, display_order);
CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status, display_order);
CREATE INDEX IF NOT EXISTS idx_blocked_dates ON blocked_dates(block_date);
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
CREATE INDEX IF NOT EXISTS idx_gallery_cat ON gallery(category, status, display_order);
CREATE INDEX IF NOT EXISTS idx_before_after_treatment ON before_after(treatment_id, status);
CREATE INDEX IF NOT EXISTS idx_reels_visible ON reels(homepage_visibility, status, display_order);
CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers(start_date, end_date, status, homepage_visibility);
