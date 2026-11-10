import crypto from 'node:crypto';
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

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function queryD1(sql, params = []) {
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

async function seed() {
  console.log('Seeding Remote Cloudflare D1 Database...');

  // 1. Seed Admin
  const admins = await queryD1("SELECT id FROM admins WHERE email = ?", ["admin@srisaraswathidental.com"]);
  if (admins.length === 0) {
    const passwordHash = hashPassword(process.env.ADMIN_PASSWORD || "Admin@dental2026");
    await queryD1(
      "INSERT INTO admins (name, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, 'admin', 'active', datetime('now'), datetime('now'))",
      ["Dr. Kishore Kumar", "admin@srisaraswathidental.com", passwordHash]
    );
    console.log("Seeded Cloudflare D1 admin: admin@srisaraswathidental.com");
  } else {
    console.log("Admin already exists in Cloudflare D1");
  }

  // 2. Seed Clinic Settings
  const settings = await queryD1("SELECT id FROM clinic_settings WHERE id = 1");
  if (settings.length === 0) {
    await queryD1(
      `INSERT INTO clinic_settings (id, clinic_name, phone, email, whatsapp_number, address, opening_hours, logo_key, logo_url, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, 'clinic/clinic-logo.webp', '/api/media/clinic/clinic-logo.webp', datetime('now'))`,
      [
        "Sri Saraswathi Dental Clinic",
        "0424 427 2494",
        "info@srisaraswathidental.com",
        "919345743409",
        "866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009",
        "Mon–Sat: 9:00 AM – 8:45 PM | Sunday: Emergency Only"
      ]
    );
    console.log("Seeded Cloudflare D1 clinic settings");
  }

  // 3. Seed Doctors
  const docs = await queryD1("SELECT COUNT(*) AS count FROM doctors");
  if (!docs[0]?.count || docs[0].count === 0) {
    await queryD1(
      `INSERT INTO doctors (name, qualification, specialization, experience, biography, profile_image_key, profile_image_url, status, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'doctors/dr-kishore-kumar.webp', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=600&auto=format&fit=crop', 'active', 1, datetime('now'), datetime('now'))`,
      [
        "Dr. Kishore Kumar",
        "BDS, MDS - Oral & Maxillofacial Surgery",
        "Chief Dental Surgeon & Implantologist",
        "14+ Years",
        "Dr. Kishore Kumar is a renowned dental surgeon specializing in advanced implants, painless root canals, and restorative dentistry. Dedicated to patient comfort with modern clinical excellence."
      ]
    );
    console.log("Seeded Cloudflare D1 chief doctor with R2 keys");
  }

  // 4. Seed Treatments
  const trts = await queryD1("SELECT COUNT(*) AS count FROM treatments");
  if (!trts[0]?.count || trts[0].count === 0) {
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
      await queryD1(
        `INSERT INTO treatments (treatment_name, slug, short_description, full_description, benefits, treatment_image_key, treatment_image_url, status, display_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))`,
        [t.name, t.slug, t.short, t.full, t.benefits, t.key, t.url, t.order]
      );
    }
    console.log("Seeded Cloudflare D1 treatments with R2 keys");
  }

  // 5. Seed Offers
  const ofrs = await queryD1("SELECT COUNT(*) AS count FROM offers");
  if (!ofrs[0]?.count || ofrs[0].count === 0) {
    await queryD1(
      `INSERT INTO offers (title, description, image_key, image_url, start_date, end_date, status, homepage_visibility, created_at)
       VALUES (?, ?, 'offers/checkup-offer.webp', 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=800&auto=format&fit=crop', '2026-01-01', '2026-12-31', 'active', 1, datetime('now'))`,
      [
        "Complete Oral Health Check-up & Consultation",
        "Includes comprehensive dental checkup, digital X-Ray assessment, and personalized treatment roadmap."
      ]
    );
    console.log("Seeded Cloudflare D1 offers");
  }

  // 6. Seed Gallery
  const gal = await queryD1("SELECT COUNT(*) AS count FROM gallery");
  if (!gal[0]?.count || gal[0].count === 0) {
    const galleryItems = [
      { title: "Advanced Clinic Operatory", category: "facility", key: "gallery/operatory.webp", url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop" },
      { title: "Digital Dental Scanning & Imaging", category: "technology", key: "gallery/scanning.webp", url: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?q=80&w=800&auto=format&fit=crop" },
      { title: "Sterilization & Hygiene Station", category: "hygiene", key: "gallery/hygiene.webp", url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=800&auto=format&fit=crop" },
    ];
    for (const g of galleryItems) {
      await queryD1(
        `INSERT INTO gallery (title, category, image_key, image_url, status, display_order, created_at)
         VALUES (?, ?, ?, ?, 'active', 0, datetime('now'))`,
        [g.title, g.category, g.key, g.url]
      );
    }
    console.log("Seeded Cloudflare D1 gallery");
  }

  // 7. Seed Reels
  const reels = await queryD1("SELECT COUNT(*) AS count FROM reels");
  if (!reels[0]?.count || reels[0].count === 0) {
    await queryD1(
      `INSERT INTO reels (title, description, video_key, video_url, thumbnail_key, thumbnail_url, homepage_visibility, status, display_order, created_at)
       VALUES (?, 'Modern endodontics walkthrough', 'reels/root-canal-reel.mp4', 'https://www.youtube.com/shorts/sample', 'reels/root-canal-thumb.webp', 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=600&auto=format&fit=crop', 1, 'active', 1, datetime('now'))`,
      ["How Modern Root Canal is 100% Pain-Free"]
    );
    console.log("Seeded Cloudflare D1 reels");
  }

  // 8. Seed Blogs
  const blogs = await queryD1("SELECT COUNT(*) AS count FROM blogs");
  if (!blogs[0]?.count || blogs[0].count === 0) {
    await queryD1(
      `INSERT INTO blogs (title, slug, category, description, content, cover_image_key, cover_image_url, status, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'blogs/root-canal-guide.webp', 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=800', 'published', datetime('now'), datetime('now'), datetime('now'))`,
      [
        "5 Signs You Might Need a Root Canal (And Why It Doesn't Hurt Anymore)",
        "5-signs-you-need-root-canal",
        "General Dentistry",
        "Modern rotary endodontics has completely eliminated the pain associated with root canals. Learn the warning signs early.",
        "Dental decay often progresses silently until it reaches the tooth nerve. Common symptoms include lingering sensitivity to hot foods, sharp pain when chewing, and tender gums. Thanks to advanced computerized apex locators and painless local anesthesia at Sri Saraswathi Dental Clinic, 95% of root canal treatments are completed comfortably in a single sitting."
      ]
    );
    console.log("Seeded Cloudflare D1 blogs");
  }

  console.log("CLOUDFLARE D1 SEEDING COMPLETE!");
}

seed().catch(console.error);
