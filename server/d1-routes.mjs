// server/d1-routes.mjs
// Cloudflare D1 Relational Database & Cloudflare R2 Media Integration
// Sri Saraswathi Dental Clinic

import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { hashPassword, verifyPassword } from "./d1.mjs";
import {
  getR2Bucket,
  generateR2Key,
  getR2PublicUrl,
  safeDeleteR2File,
  ALLOWED_MIME_TYPES,
  R2_FOLDERS,
} from "./r2.mjs";

const COOKIE_NAME = "sc_session";
const SESSION_DAYS = 7;
const SLOT_CAPACITY = 2;

const SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM",
  "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM",
];

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");

function signSession(user, secret) {
  const payload = b64url(
    JSON.stringify({ uid: user.id, email: user.email, role: user.role, exp: Date.now() + SESSION_DAYS * 864e5 }),
  );
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifySession(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.exp && data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function cleanPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

function formatWhatsAppLink(phone, message) {
  const p = cleanPhone(phone);
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(message)}` : null;
}

function formatRef(id, date) {
  const d = String(date || "").replace(/\D/g, "").slice(2, 8) || "261110";
  const hex = Number(id).toString(16).toUpperCase().padStart(4, "0").slice(-4);
  return `SC-${d}-${hex}`;
}

export function registerD1Routes(app, d1, sessionSecret = "clinic-d1-secure-secret-key-2026") {
  const r2 = getR2Bucket();

  // Middleware: Authenticate Admin via D1
  const requireAdmin = async (req, res, next) => {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    const session = verifySession(token, sessionSecret);
    if (!session || session.role !== "admin") {
      return res.status(401).json({ error: "Unauthorized. Admin access required." });
    }
    const admin = await d1.prepare("SELECT id, name, email, role, status FROM admins WHERE id = ?").bind(session.uid).first();
    if (!admin || admin.status === "inactive") {
      return res.status(401).json({ error: "Session invalid or admin account inactive." });
    }
    req.admin = admin;
    next();
  };

  /* ------------------------------------------------------------- CLOUDFLARE R2 MEDIA UPLOAD & STREAMING */

  // 1. Upload media directly to Cloudflare R2
  const handleR2Upload = async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "Choose a file to upload." });
      }

      const mimeType = String(req.query.mime || req.headers["content-type"] || "image/jpeg").toLowerCase().split(";")[0].trim();
      const folder = String(req.query.folder || "gallery").toLowerCase().trim();
      const originalName = String(req.query.filename || "media.jpg").trim();

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return res.status(415).json({
          error: "Unsupported file type. Supported formats: JPG, JPEG, PNG, WEBP, AVIF, MP4, WEBM.",
        });
      }

      // Max size: 15MB for images, 50MB for video
      const isVideo = mimeType.startsWith("video/");
      const maxSize = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
      if (req.body.length > maxSize) {
        return res.status(413).json({ error: `File too large. Max size is ${isVideo ? "50MB" : "15MB"}.` });
      }

      const r2Key = generateR2Key(folder, originalName, mimeType);
      await r2.put(r2Key, req.body, {
        httpMetadata: { contentType: mimeType },
        customMetadata: { originalName, uploadedBy: req.admin?.email || "admin" },
      });

      const publicUrl = getR2PublicUrl(r2Key);
      res.status(201).json({
        success: true,
        key: r2Key,
        url: publicUrl,
        mimeType,
        size: req.body.length,
      });
    } catch (err) {
      console.error("R2 Upload Error:", err);
      res.status(500).json({ error: err.message || "Failed to upload file to Cloudflare R2." });
    }
  };

  app.post("/api/upload", requireAdmin, express.raw({ type: "*/*", limit: "50mb" }), handleR2Upload);
  app.post("/api/admin/uploads", requireAdmin, express.raw({ type: "*/*", limit: "50mb" }), handleR2Upload);

  // 2. Stream media directly from Cloudflare R2
  app.get(/^\/api\/media\/(.+)$/, async (req, res, next) => {
    try {
      const key = decodeURIComponent(req.params[0] || "");
      if (!key || key.includes("..")) return res.status(404).json({ error: "Media not found." });

      const item = await r2.get(key);
      if (item) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Content-Type", item.contentType || "application/octet-stream");
        res.setHeader("ETag", `"${item.etag}"`);
        return res.send(item.body);
      }

      // Fallback: check if file exists in legacy uploads dir
      const fallbackPath = path.join(path.resolve("server", "data", "uploads"), path.basename(key));
      if (fs.existsSync(fallbackPath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.sendFile(fallbackPath);
      }

      res.status(404).json({ error: "Media file not found in Cloudflare R2." });
    } catch (err) {
      next(err);
    }
  });

  // 3. Delete media from Cloudflare R2
  app.delete("/api/admin/media", requireAdmin, async (req, res) => {
    try {
      const key = String(req.body?.key || req.query?.key || "").trim();
      if (!key) return res.status(400).json({ error: "Media key is required." });
      await safeDeleteR2File(r2, key);
      res.json({ success: true, key });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 1. ADMINS & AUTH */

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }
      const admin = await d1.prepare("SELECT * FROM admins WHERE email = ?").bind(String(email).trim().toLowerCase()).first();
      if (!admin || !verifyPassword(password, admin.password_hash)) {
        return res.status(401).json({ error: "Invalid email or password." });
      }
      if (admin.status === "inactive") {
        return res.status(403).json({ error: "Account is inactive. Contact the chief surgeon." });
      }
      const token = signSession(admin, sessionSecret);
      const attributes = process.env.NODE_ENV === "production" ? "; Secure; SameSite=Lax" : "; SameSite=Lax";
      res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; HttpOnly${attributes}; Path=/; Max-Age=${SESSION_DAYS * 86400}`);

      const [firstName, ...rest] = admin.name.split(" ");
      res.json({
        user: {
          id: admin.id,
          firstName: firstName || "Admin",
          lastName: rest.join(" ") || "",
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "Login failed." });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    const session = verifySession(token, sessionSecret);
    if (!session) return res.status(401).json({ error: "Not authenticated." });
    const admin = await d1.prepare("SELECT id, name, email, role FROM admins WHERE id = ?").bind(session.uid).first();
    if (!admin) return res.status(401).json({ error: "User not found." });
    const [firstName, ...rest] = admin.name.split(" ");
    res.json({
      user: {
        id: admin.id,
        firstName: firstName || "Admin",
        lastName: rest.join(" ") || "",
        email: admin.email,
        role: admin.role,
      },
    });
  });

  app.post("/api/auth/logout", async (_req, res) => {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`);
    res.json({ ok: true });
  });

  /* ------------------------------------------------------------- 2. DOCTORS (with R2 Profile Photo) */

  app.get("/api/doctors", async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM doctors WHERE status = 'active' ORDER BY display_order ASC, id ASC").all()).results;
      res.json({ doctors: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/doctors", requireAdmin, async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM doctors ORDER BY display_order ASC, id ASC").all()).results;
      res.json({ doctors: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/doctors", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      if (!b.name || !b.specialization) {
        return res.status(400).json({ error: "Doctor name and specialization are required." });
      }
      const imageKey = b.profile_image_key || (b.image_key ? String(b.image_key) : null);
      const imageUrl = b.profile_image_url || b.profile_image || (imageKey ? getR2PublicUrl(imageKey) : "");

      const info = await d1.prepare(`
        INSERT INTO doctors (name, qualification, specialization, experience, biography, profile_image_key, profile_image_url, status, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        String(b.name).trim(),
        String(b.qualification || "BDS").trim(),
        String(b.specialization).trim(),
        String(b.experience || "5+ Years").trim(),
        String(b.biography || "").trim(),
        imageKey,
        imageUrl,
        b.status === "inactive" ? "inactive" : "active",
        Number(b.display_order || 0)
      ).run();
      const created = await d1.prepare("SELECT * FROM doctors WHERE id = ?").bind(info.meta.last_row_id).first();
      res.status(201).json({ doctor: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/doctors/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT * FROM doctors WHERE id = ?").bind(id).first();
      if (!existing) return res.status(404).json({ error: "Doctor not found." });
      const b = req.body || {};

      let imageKey = existing.profile_image_key;
      let imageUrl = existing.profile_image_url;

      if (b.profile_image_key !== undefined || b.image_key !== undefined) {
        const newKey = b.profile_image_key || b.image_key;
        if (newKey && newKey !== existing.profile_image_key) {
          await safeDeleteR2File(r2, existing.profile_image_key);
          imageKey = newKey;
          imageUrl = b.profile_image_url || getR2PublicUrl(newKey);
        }
      } else if (b.profile_image_url !== undefined || b.profile_image !== undefined) {
        imageUrl = b.profile_image_url || b.profile_image;
      }

      await d1.prepare(`
        UPDATE doctors SET
          name = ?, qualification = ?, specialization = ?, experience = ?,
          biography = ?, profile_image_key = ?, profile_image_url = ?, status = ?,
          display_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        b.name !== undefined ? String(b.name).trim() : existing.name,
        b.qualification !== undefined ? String(b.qualification).trim() : existing.qualification,
        b.specialization !== undefined ? String(b.specialization).trim() : existing.specialization,
        b.experience !== undefined ? String(b.experience).trim() : existing.experience,
        b.biography !== undefined ? String(b.biography).trim() : existing.biography,
        imageKey,
        imageUrl,
        b.status !== undefined ? b.status : existing.status,
        b.display_order !== undefined ? Number(b.display_order) : existing.display_order,
        id
      ).run();
      const updated = await d1.prepare("SELECT * FROM doctors WHERE id = ?").bind(id).first();
      res.json({ doctor: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/doctors/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT profile_image_key FROM doctors WHERE id = ?").bind(id).first();
      if (existing?.profile_image_key) {
        await safeDeleteR2File(r2, existing.profile_image_key);
      }
      await d1.prepare("DELETE FROM doctors WHERE id = ?").bind(id).run();
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 3. TREATMENTS (with R2 Image) */

  app.get("/api/treatments", async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM treatments WHERE status = 'active' ORDER BY display_order ASC, id ASC").all()).results;
      res.json({ treatments: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/treatments", requireAdmin, async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM treatments ORDER BY display_order ASC, id ASC").all()).results;
      res.json({ treatments: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/treatments", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      if (!b.treatment_name || !b.short_description) {
        return res.status(400).json({ error: "Treatment name and short description are required." });
      }
      let slug = String(b.slug || b.treatment_name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const existingSlug = await d1.prepare("SELECT id FROM treatments WHERE slug = ?").bind(slug).first();
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
      const benefitsStr = Array.isArray(b.benefits) ? JSON.stringify(b.benefits) : String(b.benefits || "");
      const imageKey = b.treatment_image_key || (b.image_key ? String(b.image_key) : null);
      const imageUrl = b.treatment_image_url || b.treatment_image || (imageKey ? getR2PublicUrl(imageKey) : "");

      const info = await d1.prepare(`
        INSERT INTO treatments (treatment_name, slug, short_description, full_description, benefits, treatment_image_key, treatment_image_url, status, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        String(b.treatment_name).trim(),
        slug,
        String(b.short_description).trim(),
        String(b.full_description || "").trim(),
        benefitsStr,
        imageKey,
        imageUrl,
        b.status === "inactive" ? "inactive" : "active",
        Number(b.display_order || 0)
      ).run();
      const created = await d1.prepare("SELECT * FROM treatments WHERE id = ?").bind(info.meta.last_row_id).first();
      res.status(201).json({ treatment: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/treatments/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT * FROM treatments WHERE id = ?").bind(id).first();
      if (!existing) return res.status(404).json({ error: "Treatment not found." });
      const b = req.body || {};

      let imageKey = existing.treatment_image_key;
      let imageUrl = existing.treatment_image_url;

      if (b.treatment_image_key !== undefined || b.image_key !== undefined) {
        const newKey = b.treatment_image_key || b.image_key;
        if (newKey && newKey !== existing.treatment_image_key) {
          await safeDeleteR2File(r2, existing.treatment_image_key);
          imageKey = newKey;
          imageUrl = b.treatment_image_url || getR2PublicUrl(newKey);
        }
      } else if (b.treatment_image_url !== undefined || b.treatment_image !== undefined) {
        imageUrl = b.treatment_image_url || b.treatment_image;
      }

      const benefitsStr = b.benefits !== undefined
        ? (Array.isArray(b.benefits) ? JSON.stringify(b.benefits) : String(b.benefits))
        : existing.benefits;

      await d1.prepare(`
        UPDATE treatments SET
          treatment_name = ?, slug = ?, short_description = ?, full_description = ?,
          benefits = ?, treatment_image_key = ?, treatment_image_url = ?, status = ?,
          display_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        b.treatment_name !== undefined ? String(b.treatment_name).trim() : existing.treatment_name,
        b.slug !== undefined ? String(b.slug).trim() : existing.slug,
        b.short_description !== undefined ? String(b.short_description).trim() : existing.short_description,
        b.full_description !== undefined ? String(b.full_description).trim() : existing.full_description,
        benefitsStr,
        imageKey,
        imageUrl,
        b.status !== undefined ? b.status : existing.status,
        b.display_order !== undefined ? Number(b.display_order) : existing.display_order,
        id
      ).run();
      const updated = await d1.prepare("SELECT * FROM treatments WHERE id = ?").bind(id).first();
      res.json({ treatment: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/treatments/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT treatment_image_key FROM treatments WHERE id = ?").bind(id).first();
      if (existing?.treatment_image_key) {
        await safeDeleteR2File(r2, existing.treatment_image_key);
      }
      await d1.prepare("DELETE FROM treatments WHERE id = ?").bind(id).run();
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 4. BLOCKED DATES */

  app.get("/api/admin/blocked-dates", requireAdmin, async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM blocked_dates ORDER BY block_date DESC, id DESC").all()).results;
      res.json({ blockedDates: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/blocked-dates", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      if (!b.block_date) return res.status(400).json({ error: "Block date (YYYY-MM-DD) is required." });
      const info = await d1.prepare(`
        INSERT INTO blocked_dates (block_date, start_time, end_time, reason, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(
        String(b.block_date).trim(),
        b.start_time ? String(b.start_time).trim() : null,
        b.end_time ? String(b.end_time).trim() : null,
        String(b.reason || "Doctor unavailable / Holiday").trim()
      ).run();
      const created = await d1.prepare("SELECT * FROM blocked_dates WHERE id = ?").bind(info.meta.last_row_id).first();
      res.status(201).json({ blockedDate: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/blocked-dates/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await d1.prepare("DELETE FROM blocked_dates WHERE id = ?").bind(id).run();
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 5. APPOINTMENTS & AVAILABILITY */

  app.get("/api/availability", async (req, res) => {
    try {
      const date = String(req.query.date || "").trim();
      if (!date) return res.status(400).json({ error: "Date parameter is required (YYYY-MM-DD)." });

      const blocked = await d1.prepare("SELECT * FROM blocked_dates WHERE block_date = ? AND start_time IS NULL").bind(date).first();
      if (blocked) {
        return res.json({ date, closed: true, reason: blocked.reason || "Clinic closed on this date", slots: [] });
      }

      const counts = await d1.prepare(`
        SELECT appointment_time, COUNT(*) as count
        FROM appointments
        WHERE appointment_date = ? AND status NOT IN ('Cancelled', 'cancelled', 'Rejected', 'rejected')
        GROUP BY appointment_time
      `).bind(date).all().results;

      const countMap = Object.fromEntries(counts.map((c) => [c.appointment_time, c.count]));

      const slots = SLOTS.map((time) => {
        const booked = countMap[time] || 0;
        return {
          time,
          remaining: Math.max(0, SLOT_CAPACITY - booked),
        };
      });

      res.json({ date, closed: false, slots });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const handleCreateAppointment = async (req, res) => {
    try {
      const b = req.body || {};
      const patientName = String(b.patientName || b.patient_name || "").trim();
      const phone = String(b.patientPhone || b.phone || "").trim();
      const email = String(b.patientEmail || b.email || "").trim();
      const date = String(b.date || b.appointment_date || "").trim();
      const time = String(b.time || b.appointment_time || "").trim();
      const notes = String(b.notes || b.message || "").trim();
      const doctorId = b.doctorId || b.doctor_id ? Number(b.doctorId || b.doctor_id) : 1;

      if (!patientName) return res.status(400).json({ error: "Patient name is required." });
      if (phone.replace(/\D/g, "").length < 10) return res.status(400).json({ error: "Valid 10-digit phone number is required." });
      if (!date || !time) return res.status(400).json({ error: "Appointment date and time are required." });

      const blocked = await d1.prepare("SELECT * FROM blocked_dates WHERE block_date = ? AND start_time IS NULL").bind(date).first();
      if (blocked) {
        return res.status(400).json({ error: `Selected date is unavailable: ${blocked.reason || "Clinic closed."}` });
      }

      const currentBookings = await d1.prepare(`
        SELECT COUNT(*) as count FROM appointments
        WHERE appointment_date = ? AND appointment_time = ? AND status NOT IN ('Cancelled', 'cancelled', 'Rejected', 'rejected')
      `).bind(date, time).first("count");

      if (currentBookings >= SLOT_CAPACITY) {
        return res.status(400).json({ error: "Please choose an available time slot. This slot is fully booked." });
      }

      let treatmentId = b.treatmentId || b.treatment_id ? Number(b.treatmentId || b.treatment_id) : null;
      let serviceLabel = "Comprehensive Dental Check-up";
      if (!treatmentId && b.service) {
        const found = await d1.prepare("SELECT id, treatment_name FROM treatments WHERE treatment_name LIKE ?").bind(`%${b.service}%`).first();
        if (found) {
          treatmentId = found.id;
          serviceLabel = found.treatment_name;
        }
      } else if (treatmentId) {
        const found = await d1.prepare("SELECT treatment_name FROM treatments WHERE id = ?").bind(treatmentId).first();
        if (found) serviceLabel = found.treatment_name;
      }

      const info = await d1.prepare(`
        INSERT INTO appointments (patient_name, phone, email, doctor_id, treatment_id, appointment_date, appointment_time, message, status, admin_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', '', datetime('now'), datetime('now'))
      `).bind(patientName, phone, email, doctorId, treatmentId, date, time, notes).run();

      const newId = info.meta.last_row_id;
      const ref = formatRef(newId, date);

      const waMsg = [
        `✅ APPOINTMENT SCHEDULED!`,
        ``,
        `Dear ${patientName.split(" ")[0]},`,
        `Your appointment at Sri Saraswathi Dental Clinic is received.`,
        ``,
        `• Token Ref: ${ref}`,
        `• Treatment: ${serviceLabel}`,
        `• Date: ${date}`,
        `• Time: ${time}`,
        `• Doctor: Dr. Kishore Kumar`,
        `• Location: 866, Soli Complex, Surampatti Four Rd, Erode - 638009`,
        `• Google Maps: https://maps.google.com/?q=Sri+Saraswathi+Dental+Clinic+Erode`,
        ``,
        `We look forward to seeing you! Contact: 0424 427 2494 / 9345743409.`,
      ].join("\n");

      const bookingRecord = {
        id: newId,
        ref,
        patientName,
        patientPhone: phone,
        patientEmail: email,
        service: String(b.service || "general-dentistry"),
        serviceLabel,
        date,
        dateLabel: date,
        time,
        dentist: "Dr. Kishore Kumar",
        notes,
        status: "pending",
        statusLabel: "Pending confirmation",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        whatsapp: {
          patient: formatWhatsAppLink(phone, waMsg),
          clinic: formatWhatsAppLink("9345743409", `🔔 New Booking Alert: ${patientName} (${phone}) - ${serviceLabel} on ${date} at ${time}`),
        },
      };

      res.status(201).json({ booking: bookingRecord, appointment: bookingRecord });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  app.post("/api/appointments", handleCreateAppointment);
  app.post("/api/bookings", handleCreateAppointment);

  const handleListAppointments = async (_req, res) => {
    try {
      const rows = await d1.prepare(`
        SELECT
          a.*,
          d.name as doctor_name,
          t.treatment_name as treatment_label
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN treatments t ON a.treatment_id = t.id
        ORDER BY a.appointment_date DESC, a.id DESC
      `).all().results;

      const formatted = rows.map((r) => {
        const ref = formatRef(r.id, r.appointment_date);
        const first = r.patient_name.split(" ")[0] || "there";
        const serviceLabel = r.treatment_label || "Dental Care & Checkup";
        const confirmMsg = `✅ APPOINTMENT CONFIRMED!\n\nDear ${first},\nYour appointment at Sri Saraswathi Dental Clinic is confirmed.\n\n• Token Ref: ${ref}\n• Treatment: ${serviceLabel}\n• Date: ${r.appointment_date}\n• Time: ${r.appointment_time}\n• Doctor: ${r.doctor_name || "Dr. Kishore Kumar"}\n• Address: 866, Soli Complex, Surampatti Four Rd, Erode - 638009\n• Map: https://maps.google.com/?q=Sri+Saraswathi+Dental+Clinic+Erode\n\nContact: 0424 427 2494 / 9345743409.`;

        const normalizedStatus = String(r.status || "Pending").toLowerCase();

        return {
          id: r.id,
          ref,
          patientName: r.patient_name,
          patientPhone: r.phone,
          patientEmail: r.email || "",
          service: "general-dentistry",
          serviceLabel,
          date: r.appointment_date,
          dateLabel: r.appointment_date,
          time: r.appointment_time,
          dentist: r.doctor_name || "Dr. Kishore Kumar",
          notes: r.message || "",
          adminNotes: r.admin_notes || "",
          status: normalizedStatus,
          statusLabel: normalizedStatus === "confirmed" ? "Confirmed" : normalizedStatus === "cancelled" ? "Cancelled" : normalizedStatus === "completed" ? "Completed" : "Pending",
          createdAt: r.created_at,
          updatedAt: r.updated_at || r.created_at,
          whatsapp: {
            patient: formatWhatsAppLink(r.phone, confirmMsg),
          },
        };
      });

      res.json({ appointments: formatted, bookings: formatted });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  app.get("/api/admin/appointments", requireAdmin, handleListAppointments);
  app.get("/api/admin/bookings", requireAdmin, handleListAppointments);

  const handleUpdateAppointment = async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT * FROM appointments WHERE id = ?").bind(id).first();
      if (!existing) return res.status(404).json({ error: "Appointment not found." });

      const b = req.body || {};
      const newStatus = b.status || existing.status;
      const newDate = b.date || b.appointment_date || existing.appointment_date;
      const newTime = b.time || b.appointment_time || existing.appointment_time;
      const newNotes = b.notes !== undefined ? b.notes : (b.message !== undefined ? b.message : existing.message);
      const adminNotes = b.admin_notes !== undefined ? b.admin_notes : (b.adminNotes !== undefined ? b.adminNotes : existing.admin_notes);
      const newDoctorId = b.doctorId || b.doctor_id ? Number(b.doctorId || b.doctor_id) : existing.doctor_id;

      await d1.prepare(`
        UPDATE appointments SET
          status = ?, appointment_date = ?, appointment_time = ?,
          doctor_id = ?, message = ?, admin_notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(newStatus, newDate, newTime, newDoctorId, newNotes, adminNotes, id).run();

      const updated = await d1.prepare(`
        SELECT a.*, d.name as doctor_name, t.treatment_name as treatment_label
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN treatments t ON a.treatment_id = t.id
        WHERE a.id = ?
      `).bind(id).first();

      const ref = formatRef(updated.id, updated.appointment_date);
      const first = updated.patient_name.split(" ")[0] || "there";
      const serviceLabel = updated.treatment_label || "Dental Care & Checkup";
      const statusMsg = `Hi ${first}, update on your appointment (${ref}) at Sri Saraswathi Dental Clinic: ${newStatus.toUpperCase()}.\nDate: ${updated.appointment_date} at ${updated.appointment_time}.\nDoctor: ${updated.doctor_name || "Dr. Kishore Kumar"}.\nContact 9345743409 for queries.`;

      const normalizedStatus = String(updated.status || "Pending").toLowerCase();

      const formatted = {
        id: updated.id,
        ref,
        patientName: updated.patient_name,
        patientPhone: updated.phone,
        patientEmail: updated.email || "",
        service: "general-dentistry",
        serviceLabel,
        date: updated.appointment_date,
        dateLabel: updated.appointment_date,
        time: updated.appointment_time,
        dentist: updated.doctor_name || "Dr. Kishore Kumar",
        notes: updated.message || "",
        adminNotes: updated.admin_notes || "",
        status: normalizedStatus,
        statusLabel: normalizedStatus === "confirmed" ? "Confirmed" : normalizedStatus === "cancelled" ? "Cancelled" : normalizedStatus === "completed" ? "Completed" : "Pending",
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        whatsapp: {
          patient: formatWhatsAppLink(updated.phone, statusMsg),
        },
      };

      res.json({ appointment: formatted, booking: formatted });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  app.patch("/api/admin/appointments/:id", requireAdmin, handleUpdateAppointment);
  app.patch("/api/admin/bookings/:id", requireAdmin, handleUpdateAppointment);

  app.delete("/api/admin/appointments/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await d1.prepare("DELETE FROM appointments WHERE id = ?").bind(id).run();
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 6. BLOGS (with R2 Cover Image) */

  const handleGetBlogs = async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM blogs WHERE status = 'published' ORDER BY published_at DESC, id DESC").all()).results;
      const formatted = rows.map(b => ({
        ...b,
        coverImage: b.cover_image_url || (b.cover_image_key ? getR2PublicUrl(b.cover_image_key) : ""),
        coverImageUrl: b.cover_image_url || (b.cover_image_key ? getR2PublicUrl(b.cover_image_key) : ""),
        cover_image: b.cover_image_url || (b.cover_image_key ? getR2PublicUrl(b.cover_image_key) : ""),
        readTime: b.read_time || "4 min read",
      }));
      res.json({ blogs: formatted, items: formatted });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  app.get("/api/blogs", handleGetBlogs);
  app.get("/api/blog", handleGetBlogs);

  const handleGetBlogBySlug = async (req, res) => {
    try {
      const slug = String(req.params.slug).trim();
      const blog = await d1.prepare("SELECT * FROM blogs WHERE slug = ?").bind(slug).first();
      if (!blog) return res.status(404).json({ error: "Blog not found." });
      const formatted = {
        ...blog,
        coverImage: blog.cover_image_url || (blog.cover_image_key ? getR2PublicUrl(blog.cover_image_key) : ""),
        coverImageUrl: blog.cover_image_url || (blog.cover_image_key ? getR2PublicUrl(blog.cover_image_key) : ""),
        cover_image: blog.cover_image_url || (blog.cover_image_key ? getR2PublicUrl(blog.cover_image_key) : ""),
        readTime: blog.read_time || "4 min read",
      };
      const related = (await d1.prepare("SELECT * FROM blogs WHERE status = 'published' AND id != ? ORDER BY id DESC LIMIT 3").bind(blog.id).all()).results;
      res.json({ blog: formatted, item: formatted, related });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  app.get("/api/blogs/:slug", handleGetBlogBySlug);
  app.get("/api/blog/:slug", handleGetBlogBySlug);

  app.get("/api/admin/blogs", requireAdmin, async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM blogs ORDER BY id DESC").all()).results;
      res.json({ blogs: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/blogs", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      if (!b.title || !b.content) return res.status(400).json({ error: "Title and content are required." });
      let slug = String(b.slug || b.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const existingSlug = await d1.prepare("SELECT id FROM blogs WHERE slug = ?").bind(slug).first();
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
      const imageKey = b.cover_image_key || (b.image_key ? String(b.image_key) : null);
      const imageUrl = b.cover_image_url || b.cover_image || (imageKey ? getR2PublicUrl(imageKey) : "");

      const info = await d1.prepare(`
        INSERT INTO blogs (title, slug, category, description, content, cover_image_key, cover_image_url, status, published_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
      `).bind(
        String(b.title).trim(),
        slug,
        String(b.category || "General").trim(),
        String(b.description || "").trim(),
        String(b.content).trim(),
        imageKey,
        imageUrl,
        b.status === "draft" ? "draft" : "published"
      ).run();
      const created = await d1.prepare("SELECT * FROM blogs WHERE id = ?").bind(info.meta.last_row_id).first();
      res.status(201).json({ blog: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/blogs/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT * FROM blogs WHERE id = ?").bind(id).first();
      if (!existing) return res.status(404).json({ error: "Blog not found." });
      const b = req.body || {};

      let imageKey = existing.cover_image_key;
      let imageUrl = existing.cover_image_url;

      if (b.cover_image_key !== undefined || b.image_key !== undefined) {
        const newKey = b.cover_image_key || b.image_key;
        if (newKey && newKey !== existing.cover_image_key) {
          await safeDeleteR2File(r2, existing.cover_image_key);
          imageKey = newKey;
          imageUrl = b.cover_image_url || getR2PublicUrl(newKey);
        }
      } else if (b.cover_image_url !== undefined || b.cover_image !== undefined) {
        imageUrl = b.cover_image_url || b.cover_image;
      }

      await d1.prepare(`
        UPDATE blogs SET
          title = ?, slug = ?, category = ?, description = ?, content = ?,
          cover_image_key = ?, cover_image_url = ?, status = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        b.title !== undefined ? String(b.title).trim() : existing.title,
        b.slug !== undefined ? String(b.slug).trim() : existing.slug,
        b.category !== undefined ? String(b.category).trim() : existing.category,
        b.description !== undefined ? String(b.description).trim() : existing.description,
        b.content !== undefined ? String(b.content).trim() : existing.content,
        imageKey,
        imageUrl,
        b.status !== undefined ? b.status : existing.status,
        id
      ).run();
      const updated = await d1.prepare("SELECT * FROM blogs WHERE id = ?").bind(id).first();
      res.json({ blog: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/blogs/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT cover_image_key FROM blogs WHERE id = ?").bind(id).first();
      if (existing?.cover_image_key) {
        await safeDeleteR2File(r2, existing.cover_image_key);
      }
      await d1.prepare("DELETE FROM blogs WHERE id = ?").bind(id).run();
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 7. GALLERY (with R2 Photo) */

  app.get("/api/gallery", async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM gallery WHERE status = 'active' ORDER BY display_order ASC, id DESC").all()).results;
      res.json({ gallery: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/gallery", requireAdmin, async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM gallery ORDER BY display_order ASC, id DESC").all()).results;
      res.json({ gallery: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/gallery", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const imageKey = b.image_key ? String(b.image_key).trim() : null;
      const imageUrl = b.image_url ? String(b.image_url).trim() : (imageKey ? getR2PublicUrl(imageKey) : "");
      if (!imageUrl && !imageKey) return res.status(400).json({ error: "Image URL or image key is required." });

      const info = await d1.prepare(`
        INSERT INTO gallery (title, description, image_key, image_url, category, status, display_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        String(b.title || "").trim(),
        String(b.description || "").trim(),
        imageKey,
        imageUrl,
        String(b.category || "clinic").trim(),
        b.status === "inactive" ? "inactive" : "active",
        Number(b.display_order || 0)
      ).run();
      const created = await d1.prepare("SELECT * FROM gallery WHERE id = ?").bind(info.meta.last_row_id).first();
      res.status(201).json({ gallery: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/gallery/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT image_key FROM gallery WHERE id = ?").bind(id).first();
      if (existing?.image_key) {
        await safeDeleteR2File(r2, existing.image_key);
      }
      await d1.prepare("DELETE FROM gallery WHERE id = ?").bind(id).run();
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 8. BEFORE & AFTER (with R2 Before/After Images) */

  app.get("/api/before-after", async (_req, res) => {
    try {
      const rows = await d1.prepare(`
        SELECT ba.*, t.treatment_name
        FROM before_after ba
        LEFT JOIN treatments t ON ba.treatment_id = t.id
        WHERE ba.status = 'active'
        ORDER BY ba.id DESC
      `).all().results;
      res.json({ showcases: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/before-after", requireAdmin, async (_req, res) => {
    try {
      const rows = await d1.prepare(`
        SELECT ba.*, t.treatment_name
        FROM before_after ba
        LEFT JOIN treatments t ON ba.treatment_id = t.id
        ORDER BY ba.id DESC
      `).all().results;
      res.json({ showcases: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/before-after", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const beforeKey = b.before_image_key || null;
      const beforeUrl = b.before_image_url || b.before_image || (beforeKey ? getR2PublicUrl(beforeKey) : "");
      const afterKey = b.after_image_key || null;
      const afterUrl = b.after_image_url || b.after_image || (afterKey ? getR2PublicUrl(afterKey) : "");

      if (!b.title || !beforeUrl || !afterUrl) {
        return res.status(400).json({ error: "Title, before image, and after image are required." });
      }
      const treatmentId = b.treatment_id ? Number(b.treatment_id) : null;
      const info = await d1.prepare(`
        INSERT INTO before_after (treatment_id, title, description, before_image_key, before_image_url, after_image_key, after_image_url, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        treatmentId,
        String(b.title).trim(),
        String(b.description || "").trim(),
        beforeKey,
        beforeUrl,
        afterKey,
        afterUrl,
        b.status === "inactive" ? "inactive" : "active"
      ).run();
      const created = await d1.prepare("SELECT * FROM before_after WHERE id = ?").bind(info.meta.last_row_id).first();
      res.status(201).json({ showcase: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/before-after/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT before_image_key, after_image_key FROM before_after WHERE id = ?").bind(id).first();
      if (existing?.before_image_key) await safeDeleteR2File(r2, existing.before_image_key);
      if (existing?.after_image_key) await safeDeleteR2File(r2, existing.after_image_key);
      await d1.prepare("DELETE FROM before_after WHERE id = ?").bind(id).run();
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 9. REELS (with R2 Video & Thumbnail) */

  app.get("/api/reels", async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM reels WHERE status = 'active' AND homepage_visibility = 1 ORDER BY display_order ASC, id DESC").all()).results;
      res.json({ reels: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/reels", requireAdmin, async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM reels ORDER BY display_order ASC, id DESC").all()).results;
      res.json({ reels: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/reels", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const videoKey = b.video_key || null;
      const videoUrl = b.video_url || (videoKey ? getR2PublicUrl(videoKey) : "");
      const thumbKey = b.thumbnail_key || null;
      const thumbUrl = b.thumbnail_url || b.thumbnail || (thumbKey ? getR2PublicUrl(thumbKey) : "");

      if (!b.title || !videoUrl) return res.status(400).json({ error: "Title and video URL are required." });
      const info = await d1.prepare(`
        INSERT INTO reels (title, description, video_key, video_url, thumbnail_key, thumbnail_url, homepage_visibility, status, display_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        String(b.title).trim(),
        String(b.description || "").trim(),
        videoKey,
        videoUrl,
        thumbKey,
        thumbUrl,
        b.homepage_visibility !== undefined ? (b.homepage_visibility ? 1 : 0) : 1,
        b.status === "inactive" ? "inactive" : "active",
        Number(b.display_order || 0)
      ).run();
      const created = await d1.prepare("SELECT * FROM reels WHERE id = ?").bind(info.meta.last_row_id).first();
      res.status(201).json({ reel: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/reels/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT * FROM reels WHERE id = ?").bind(id).first();
      if (!existing) return res.status(404).json({ error: "Reel not found." });
      const b = req.body || {};

      let videoKey = existing.video_key;
      let videoUrl = existing.video_url;
      let thumbKey = existing.thumbnail_key;
      let thumbUrl = existing.thumbnail_url;

      if (b.video_key !== undefined) {
        if (b.video_key && b.video_key !== existing.video_key) {
          await safeDeleteR2File(r2, existing.video_key);
          videoKey = b.video_key;
          videoUrl = b.video_url || getR2PublicUrl(b.video_key);
        }
      } else if (b.video_url !== undefined) {
        videoUrl = b.video_url;
      }

      if (b.thumbnail_key !== undefined) {
        if (b.thumbnail_key && b.thumbnail_key !== existing.thumbnail_key) {
          await safeDeleteR2File(r2, existing.thumbnail_key);
          thumbKey = b.thumbnail_key;
          thumbUrl = b.thumbnail_url || getR2PublicUrl(b.thumbnail_key);
        }
      } else if (b.thumbnail_url !== undefined || b.thumbnail !== undefined) {
        thumbUrl = b.thumbnail_url || b.thumbnail;
      }

      await d1.prepare(`
        UPDATE reels SET
          title = ?, description = ?, video_key = ?, video_url = ?,
          thumbnail_key = ?, thumbnail_url = ?, homepage_visibility = ?,
          status = ?, display_order = ?
        WHERE id = ?
      `).bind(
        b.title !== undefined ? String(b.title).trim() : existing.title,
        b.description !== undefined ? String(b.description).trim() : existing.description,
        videoKey,
        videoUrl,
        thumbKey,
        thumbUrl,
        b.homepage_visibility !== undefined ? (b.homepage_visibility ? 1 : 0) : existing.homepage_visibility,
        b.status !== undefined ? b.status : existing.status,
        b.display_order !== undefined ? Number(b.display_order) : existing.display_order,
        id
      ).run();
      const updated = await d1.prepare("SELECT * FROM reels WHERE id = ?").bind(id).first();
      res.json({ reel: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/reels/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT video_key, thumbnail_key FROM reels WHERE id = ?").bind(id).first();
      if (existing?.video_key) await safeDeleteR2File(r2, existing.video_key);
      if (existing?.thumbnail_key) await safeDeleteR2File(r2, existing.thumbnail_key);
      await d1.prepare("DELETE FROM reels WHERE id = ?").bind(id).run();
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 10. OFFERS (with R2 Promo Image) */

  app.get("/api/offers", async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM offers WHERE status = 'active' AND homepage_visibility = 1 ORDER BY id DESC").all()).results;
      res.json({ offers: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/offers", requireAdmin, async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM offers ORDER BY id DESC").all()).results;
      res.json({ offers: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/offers", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      if (!b.title) return res.status(400).json({ error: "Offer title is required." });
      const imageKey = b.image_key || null;
      const imageUrl = b.image_url || (imageKey ? getR2PublicUrl(imageKey) : "");

      const info = await d1.prepare(`
        INSERT INTO offers (title, description, image_key, image_url, start_date, end_date, homepage_visibility, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        String(b.title).trim(),
        String(b.description || "").trim(),
        imageKey,
        imageUrl,
        b.start_date || null,
        b.end_date || null,
        b.homepage_visibility !== undefined ? (b.homepage_visibility ? 1 : 0) : 1,
        b.status === "inactive" ? "inactive" : "active"
      ).run();
      const created = await d1.prepare("SELECT * FROM offers WHERE id = ?").bind(info.meta.last_row_id).first();
      res.status(201).json({ offer: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/offers/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT image_key FROM offers WHERE id = ?").bind(id).first();
      if (existing?.image_key) await safeDeleteR2File(r2, existing.image_key);
      await d1.prepare("DELETE FROM offers WHERE id = ?").bind(id).run();
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 11. CLINIC SETTINGS (with R2 Logo) */

  const getSettings = async () => {
    let s = await d1.prepare("SELECT * FROM clinic_settings WHERE id = 1").first();
    if (!s) {
      await d1.prepare(`
        INSERT INTO clinic_settings (id, clinic_name, phone, email, whatsapp_number, address, opening_hours, logo_key, logo_url, updated_at)
        VALUES (1, 'Sri Saraswathi Dental Clinic', '0424 427 2494', 'info@srisaraswathidental.com', '919345743409', '866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009', 'Mon–Sat: 9:00 AM – 8:45 PM', 'clinic/logo.webp', '/api/media/clinic/logo.webp', datetime('now'))
      `).run();
      s = await d1.prepare("SELECT * FROM clinic_settings WHERE id = 1").first();
    }
    return s;
  };

  app.get("/api/clinic-settings", async (_req, res) => {
    try {
      res.json({ settings: await getSettings() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/clinic-settings", requireAdmin, async (_req, res) => {
    try {
      res.json({ settings: await getSettings() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/clinic-settings", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const existing = await getSettings();

      let logoKey = existing.logo_key;
      let logoUrl = existing.logo_url;

      if (b.logo_key !== undefined) {
        if (b.logo_key && b.logo_key !== existing.logo_key) {
          await safeDeleteR2File(r2, existing.logo_key);
          logoKey = b.logo_key;
          logoUrl = b.logo_url || getR2PublicUrl(b.logo_key);
        }
      } else if (b.logo_url !== undefined) {
        logoUrl = b.logo_url;
      }

      await d1.prepare(`
        UPDATE clinic_settings SET
          clinic_name = ?, phone = ?, email = ?, whatsapp_number = ?,
          address = ?, opening_hours = ?, logo_key = ?, logo_url = ?, updated_at = datetime('now')
        WHERE id = 1
      `).bind(
        b.clinic_name !== undefined ? String(b.clinic_name).trim() : existing.clinic_name,
        b.phone !== undefined ? String(b.phone).trim() : existing.phone,
        b.email !== undefined ? String(b.email).trim() : existing.email,
        b.whatsapp_number !== undefined ? String(b.whatsapp_number).trim() : existing.whatsapp_number,
        b.address !== undefined ? String(b.address).trim() : existing.address,
        b.opening_hours !== undefined ? String(b.opening_hours).trim() : existing.opening_hours,
        logoKey,
        logoUrl
      ).run();
      res.json({ settings: await getSettings() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- COMPATIBILITY BRIDGE: /api/content */
  app.get("/api/content", async (req, res) => {
    try {
      const type = req.query.type;
      const all = [];

      // 1. Doctors
      if (!type || type === "doctor") {
        const docs = (await d1.prepare("SELECT * FROM doctors WHERE status = 'active' ORDER BY display_order ASC").all()).results;
        all.push(...docs.map(d => {
          const img = d.profile_image_url || (d.profile_image_key ? getR2PublicUrl(d.profile_image_key) : "");
          return {
            id: d.id,
            type: "doctor",
            title: d.name,
            name: d.name,
            subtitle: d.specialization,
            specialization: d.specialization,
            category: d.qualification,
            qualification: d.qualification,
            description: d.biography,
            experience: d.experience,
            mediaUrl: img,
            media_url: img,
            profileImageUrl: img,
            displayOrder: d.display_order,
            display_order: d.display_order,
            data: { experience: d.experience, profile_image_key: d.profile_image_key },
            published: 1,
            status: "active",
          };
        }));
      }

      // 2. Treatments
      if (!type || type === "treatment") {
        const trts = (await d1.prepare("SELECT * FROM treatments WHERE status = 'active' ORDER BY display_order ASC").all()).results;
        all.push(...trts.map(t => {
          const img = t.treatment_image_url || (t.treatment_image_key ? getR2PublicUrl(t.treatment_image_key) : "");
          return {
            id: t.id,
            type: "treatment",
            slug: t.slug,
            title: t.treatment_name,
            treatment_name: t.treatment_name,
            subtitle: t.short_description,
            short_description: t.short_description,
            description: t.full_description,
            full_description: t.full_description,
            mediaUrl: img,
            media_url: img,
            displayOrder: t.display_order,
            display_order: t.display_order,
            data: { benefits: t.benefits, treatment_image_key: t.treatment_image_key },
            published: 1,
            status: "active",
          };
        }));
      }

      // 3. Blogs
      if (!type || type === "blog") {
        const blogs = (await d1.prepare("SELECT * FROM blogs WHERE status = 'published' ORDER BY id DESC").all()).results;
        all.push(...blogs.map(b => {
          const img = b.cover_image_url || (b.cover_image_key ? getR2PublicUrl(b.cover_image_key) : "");
          return {
            id: b.id,
            type: "blog",
            title: b.title,
            slug: b.slug,
            subtitle: b.description,
            description: b.content,
            content: b.content,
            mediaUrl: img,
            media_url: img,
            coverImage: img,
            category: b.category,
            data: { cover_image_key: b.cover_image_key },
            published: 1,
            status: "published",
          };
        }));
      }

      // 4. Gallery & Images
      if (!type || type === "gallery" || type === "image") {
        const items = (await d1.prepare("SELECT * FROM gallery WHERE status = 'active' ORDER BY display_order ASC").all()).results;
        all.push(...items.map(g => {
          const img = g.image_url || (g.image_key ? getR2PublicUrl(g.image_key) : "");
          return {
            id: g.id,
            type: "image",
            title: g.title,
            category: g.category,
            mediaUrl: img,
            media_url: img,
            displayOrder: g.display_order,
            display_order: g.display_order,
            data: { image_key: g.image_key },
            published: 1,
            status: "active",
          };
        }));
      }

      // 5. Before & After Transformations
      if (!type || type === "before_after" || type === "before-after" || type === "transformation") {
        const bas = (await d1.prepare("SELECT * FROM before_after WHERE status = 'active' ORDER BY id DESC").all()).results;
        all.push(...bas.map(ba => {
          const bImg = ba.before_image_url || (ba.before_image_key ? getR2PublicUrl(ba.before_image_key) : "");
          const aImg = ba.after_image_url || (ba.after_image_key ? getR2PublicUrl(ba.after_image_key) : "");
          return {
            id: ba.id,
            type: "before_after",
            title: ba.title,
            description: ba.description,
            beforeImage: bImg,
            before_image: bImg,
            before_image_url: bImg,
            afterImage: aImg,
            after_image: aImg,
            after_image_url: aImg,
            mediaUrl: aImg,
            media_url: aImg,
            published: 1,
            status: "active",
          };
        }));
      }

      // 6. Reels & Videos
      if (!type || type === "reel" || type === "video") {
        const reels = (await d1.prepare("SELECT * FROM reels WHERE status = 'active' AND homepage_visibility = 1 ORDER BY display_order ASC").all()).results;
        all.push(...reels.map(r => {
          const vid = r.video_url || (r.video_key ? getR2PublicUrl(r.video_key) : "");
          const thumb = r.thumbnail_url || (r.thumbnail_key ? getR2PublicUrl(r.thumbnail_key) : "");
          return {
            id: r.id,
            type: "reel",
            title: r.title,
            mediaUrl: vid,
            media_url: vid,
            thumbnail: thumb,
            data: { thumbnail: thumb, video_key: r.video_key, thumbnail_key: r.thumbnail_key },
            displayOrder: r.display_order,
            display_order: r.display_order,
            published: 1,
            status: "active",
          };
        }));
      }

      // 7. Offers
      if (!type || type === "offer") {
        const offers = (await d1.prepare("SELECT * FROM offers WHERE status = 'active' AND homepage_visibility = 1 ORDER BY id DESC").all()).results;
        all.push(...offers.map(o => {
          const img = o.image_url || (o.image_key ? getR2PublicUrl(o.image_key) : "");
          return {
            id: o.id,
            type: "offer",
            title: o.title,
            description: o.description,
            mediaUrl: img,
            media_url: img,
            data: { startDate: o.start_date, endDate: o.end_date, image_key: o.image_key },
            startDate: o.start_date,
            endDate: o.end_date,
            published: 1,
            status: "active",
          };
        }));
      }

      // 8. Hero Banners
      if (!type || type === "hero") {
        all.push({
          id: "hero-1",
          type: "hero",
          title: "Advanced Dental Care with a Gentle Touch",
          subtitle: "State-of-the-Art Technology & Painless Root Canal Treatments in Erode",
          description: "Compassionate dental expertise powered by computerized apex locators and painless anesthesia.",
          mediaUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200&auto=format&fit=crop",
          media_url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200&auto=format&fit=crop",
          displayOrder: 1,
          display_order: 1,
          published: 1,
          status: "active",
        });
      }

      res.json({ items: all });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
