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
  resolveMediaMimeType,
  ALLOWED_MIME_TYPES,
} from "./r2.mjs";
import { registerChatbotRoutes } from "./chatbot-routes.mjs";
import { registerSeoRoutes } from "./seo-routes.mjs";

const COOKIE_NAME = "sc_session";
const SESSION_DAYS = 7;
const SLOT_CAPACITY = 2;

const SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM",
  "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM",
];

const CLINIC_TIMEZONE = "Asia/Kolkata";

function getNowIST() {
  const now = new Date();
  const istStr = now.toLocaleString("en-US", { timeZone: CLINIC_TIMEZONE });
  return new Date(istStr);
}

function getTodayISTString() {
  const ist = getNowIST();
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return -1;
  const str = String(timeStr).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return -1;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridian = match[3] ? match[3].toUpperCase() : null;
  if (meridian === "PM" && h < 12) h += 12;
  if (meridian === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function formatMinutesToTime(totalMinutes) {
  let h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const meridian = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${meridian}`;
}

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

let ephemeralSecret = null;
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

async function logAdminActivity(d1, adminId, adminName, action, details = "", req = null) {
  try {
    const ip = req ? (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim() : "";
    await d1.prepare(
      "INSERT INTO admin_activity_logs (admin_id, admin_name, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
    ).bind(adminId || null, String(adminName || "Dr. Kishore Kumar"), String(action), String(details || ""), ip).run();
  } catch (err) {
    console.error("Failed to write admin activity log:", err.message);
  }
}

export function registerD1Routes(app, d1, sessionSecret = null) {
  const secret = sessionSecret || process.env.SESSION_SECRET || (ephemeralSecret ||= crypto.randomBytes(32).toString("hex"));
  const r2 = getR2Bucket();

  const cookieAttrs = (req) => {
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
    return isHttps ? "; Secure; SameSite=Lax" : "; SameSite=Lax";
  };

  const setSessionCookie = (req, res, user) => {
    const token = signSession(user, secret);
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; HttpOnly${cookieAttrs(req)}; Path=/; Max-Age=${SESSION_DAYS * 86400}`);
  };

  const clearSessionCookie = (req, res) => {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly${cookieAttrs(req)}; Path=/; Max-Age=0`);
  };

  const getSessionUser = async (req) => {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    const session = verifySession(token, secret);
    if (!session) return null;

    if (session.role === "admin") {
      const admin = await d1.prepare("SELECT id, name, email, role, status FROM admins WHERE id = ?").bind(session.uid).first();
      if (!admin || admin.status === "inactive") return null;
      const fullName = admin.name || "Dr. Kishore Kumar";
      return {
        id: admin.id,
        firstName: fullName,
        lastName: "",
        name: fullName,
        email: admin.email,
        phone: "",
        role: admin.role || "admin",
      };
    }

    const patient = await d1.prepare("SELECT id, first_name, last_name, email, phone, role, profile_picture, auth_provider FROM users WHERE id = ?").bind(session.uid).first();
    if (!patient) return null;
    return {
      id: patient.id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      name: `${patient.first_name} ${patient.last_name}`.trim(),
      email: patient.email,
      phone: patient.phone || "",
      role: patient.role || "patient",
      picture: patient.profile_picture || null,
      authProvider: patient.auth_provider || "local",
    };
  };

  // Middleware: Authenticate Admin via D1
  const requireAdmin = async (req, res, next) => {
    try {
      const user = await getSessionUser(req);
      if (!user || user.role !== "admin") {
        return res.status(401).json({ error: "Unauthorized. Admin access required." });
      }
      req.admin = user;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  // Middleware: Authenticate Patient or Admin via D1
  const requireAuth = async (req, res, next) => {
    try {
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Please sign in to continue." });
      }
      req.user = user;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  /* ------------------------------------------------------------- CLOUDFLARE R2 MEDIA UPLOAD & STREAMING */

  // 1. Upload media directly to Cloudflare R2
  const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;
  const MAX_SERVER_VIDEO_UPLOAD_BYTES = 150 * 1024 * 1024;
  const REELS_STORAGE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2GB (2048MB) total Reels & Videos quota
  const MULTIPART_PART_SIZE_BYTES = 8 * 1024 * 1024; // 8MB chunks (>= 5MB R2/S3 part minimum)
  const DEFAULT_REELS_SECTION_SETTINGS = {
    enabled: true,
    heading: "Trending Reels & Videos",
    subtitle: "Watch real patient experiences, dental care videos, clinic moments and educational content.",
  };
  const DEFAULT_BEFORE_AFTER_SETTINGS = {
    enabled: true,
    heading: "REAL SMILES. CONFIDENT RESULTS.",
    subtitle: "Your Smile Transformation Starts Here.",
    heroImage: "",
    heroImageMobile: "",
    heroImageAlt: "Sri Saraswathi Dental Clinic - Smile Transformation",
    displayPosition: "below_promotional_container",
    displayStatus: "published",
  };
  const DEFAULT_THEME_COLORS = {
    primary: "#1F6878",
    secondary: "#E4F0F2",
    accent: "#E95A35",
    background: "#F5F2EB",
    text: "#15191B",
    header: "#FFFFFF",
    footer: "#1F6878",
  };

  const formatBytesLabel = (bytes) => {
    const val = Math.max(0, Number(bytes || 0));
    if (val >= 1024 * 1024 * 1024) return `${(val / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (val >= 1024 * 1024) return `${(val / (1024 * 1024)).toFixed(1)} MB`;
    if (val >= 1024) return `${(val / 1024).toFixed(0)} KB`;
    return `${val} B`;
  };

  const extractR2KeyFromUrl = (url) => {
    const s = String(url || "").trim();
    if (!s) return "";
    const apiMatch = s.match(/\/api\/media\/(.+?)(?:\?.*)?$/);
    if (apiMatch) {
      try {
        return decodeURIComponent(apiMatch[1]);
      } catch {
        return apiMatch[1];
      }
    }
    const publicDomain = (process.env.R2_PUBLIC_DOMAIN || "").replace(/\/+$/, "");
    if (publicDomain && s.startsWith(`${publicDomain}/`)) {
      const raw = s.slice(publicDomain.length + 1).split("?")[0];
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
    return "";
  };

  const resolveVideoObjectMeta = async (mediaUrl, fallbackSize = 0, fallbackMime = "") => {
    const key = extractR2KeyFromUrl(mediaUrl);
    if (key && typeof r2.head === "function") {
      try {
        const meta = await r2.head(key);
        if (meta) {
          return {
            key,
            fileSize: Math.max(0, Number(meta.size || fallbackSize || 0)),
            mimeType: meta.contentType || String(fallbackMime || ""),
          };
        }
      } catch {}
    }
    return {
      key,
      fileSize: Math.max(0, Number(fallbackSize || 0)),
      mimeType: String(fallbackMime || ""),
    };
  };

  const getReelsStorageUsage = async ({ excludeContentId = null } = {}) => {
    const rows =
      (
        await d1
          .prepare("SELECT id, media_url, file_size, mime_type, legacy_table, legacy_id FROM site_content WHERE type IN ('reel', 'video')")
          .all()
      ).results || [];

    let usedBytes = 0;
    let videoCount = 0;
    const countedKeys = new Set();

    for (const row of rows) {
      if (excludeContentId && Number(row.id) === Number(excludeContentId)) {
        continue;
      }
      const key = extractR2KeyFromUrl(row.media_url);
      const dedupeToken = key || (row.media_url ? `url:${row.media_url}` : `id:${row.id}`);
      if (countedKeys.has(dedupeToken)) {
        continue;
      }
      if (row.media_url) {
        countedKeys.add(dedupeToken);
        videoCount += 1;
      }

      let size = Math.max(0, Number(row.file_size || 0));
      if (size === 0 && key && typeof r2.head === "function") {
        try {
          const meta = await r2.head(key);
          if (meta && Number(meta.size || 0) > 0) {
            size = Number(meta.size);
            const resolvedMime = row.mime_type || meta.contentType || "";
            await d1
              .prepare("UPDATE site_content SET file_size = ?, mime_type = ? WHERE id = ?")
              .bind(size, resolvedMime, Number(row.id))
              .run()
              .catch(() => {});
            if (row.legacy_table === "reels" && row.legacy_id) {
              await d1
                .prepare("UPDATE reels SET file_size = ? WHERE id = ?")
                .bind(size, Number(row.legacy_id))
                .run()
                .catch(() => {});
            }
          }
        } catch {}
      }
      usedBytes += size;
    }

    const availableBytes = Math.max(0, REELS_STORAGE_QUOTA_BYTES - usedBytes);
    const usedPercent = Number(Math.min(100, (usedBytes / REELS_STORAGE_QUOTA_BYTES) * 100).toFixed(2));
    return {
      usedBytes,
      quotaBytes: REELS_STORAGE_QUOTA_BYTES,
      availableBytes,
      usedPercent,
      videoCount,
    };
  };

  const checkReelsQuota = async (incomingBytes, { excludeContentId = null } = {}) => {
    const incoming = Math.max(0, Number(incomingBytes || 0));
    const storage = await getReelsStorageUsage({ excludeContentId });
    if (incoming > REELS_STORAGE_QUOTA_BYTES || storage.usedBytes + incoming > REELS_STORAGE_QUOTA_BYTES) {
      return {
        ok: false,
        storage,
        error:
          storage.availableBytes <= 0
            ? "Video storage is full (2 GB limit reached). Please delete existing videos to free storage before uploading."
            : `Upload exceeds your remaining Reels video storage (${formatBytesLabel(storage.availableBytes)} available of 2 GB total). Please delete older videos or choose a smaller video.`,
      };
    }
    return { ok: true, storage };
  };

  let cachedReelsSettings = null;
  let cachedReelsSettingsExpiry = 0;

  const getReelsSectionSettings = async () => {
    const now = Date.now();
    if (cachedReelsSettings && now < cachedReelsSettingsExpiry) {
      return cachedReelsSettings;
    }
    try {
      const row = await d1.prepare("SELECT value FROM d1_meta WHERE key = 'reels_section_settings'").first();
      if (!row?.value) return { ...DEFAULT_REELS_SECTION_SETTINGS };
      const parsed = JSON.parse(row.value);
      const result = {
        enabled: parsed.enabled !== undefined ? Boolean(parsed.enabled) : true,
        heading:
          typeof parsed.heading === "string" && parsed.heading.trim()
            ? parsed.heading.trim()
            : DEFAULT_REELS_SECTION_SETTINGS.heading,
        subtitle:
          typeof parsed.subtitle === "string" && parsed.subtitle.trim()
            ? parsed.subtitle.trim()
            : DEFAULT_REELS_SECTION_SETTINGS.subtitle,
      };
      cachedReelsSettings = result;
      cachedReelsSettingsExpiry = now + 60000; // 60-second TTL
      return result;
    } catch {
      return { ...DEFAULT_REELS_SECTION_SETTINGS };
    }
  };

  const saveReelsSectionSettings = async (patch = {}) => {
    cachedReelsSettingsExpiry = 0; // Invalidate cache immediately on edit
    const current = await getReelsSectionSettings();
    const next = {
      enabled: patch.enabled !== undefined ? Boolean(patch.enabled) : current.enabled,
      heading:
        patch.heading !== undefined && String(patch.heading).trim()
          ? String(patch.heading).trim()
          : DEFAULT_REELS_SECTION_SETTINGS.heading,
      subtitle:
        patch.subtitle !== undefined && String(patch.subtitle).trim()
          ? String(patch.subtitle).trim()
          : DEFAULT_REELS_SECTION_SETTINGS.subtitle,
    };
    await d1
      .prepare(
        `INSERT INTO d1_meta (key, value, updated_at)
         VALUES ('reels_section_settings', ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      )
      .bind(JSON.stringify(next))
      .run();
    return next;
  };

  /* ------------------------------------------------------------- THEME COLOUR SETTINGS HELPERS */
  const normalizeHex = (val, fallback) => {
    if (typeof val !== "string") return fallback;
    const trimmed = val.trim();
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed)) {
      if (trimmed.length === 4) {
        return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
      }
      return trimmed.toUpperCase();
    }
    if (/^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed)) {
      const withHash = `#${trimmed}`;
      if (withHash.length === 4) {
        return `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`.toUpperCase();
      }
      return withHash.toUpperCase();
    }
    return fallback;
  };

  const getThemeColors = async () => {
    try {
      const row = await d1.prepare("SELECT value FROM d1_meta WHERE key = 'theme_colors'").first();
      if (!row?.value) return { ...DEFAULT_THEME_COLORS };
      const parsed = JSON.parse(row.value);
      return {
        primary: normalizeHex(parsed.primary, DEFAULT_THEME_COLORS.primary),
        secondary: normalizeHex(parsed.secondary, DEFAULT_THEME_COLORS.secondary),
        accent: normalizeHex(parsed.accent, DEFAULT_THEME_COLORS.accent),
        background: normalizeHex(parsed.background, DEFAULT_THEME_COLORS.background),
        text: normalizeHex(parsed.text, DEFAULT_THEME_COLORS.text),
        header: normalizeHex(parsed.header, DEFAULT_THEME_COLORS.header),
        footer: normalizeHex(parsed.footer, DEFAULT_THEME_COLORS.footer),
      };
    } catch {
      return { ...DEFAULT_THEME_COLORS };
    }
  };

  const saveThemeColors = async (patch = {}) => {
    const current = await getThemeColors();
    const next = {
      primary: patch.primary !== undefined ? normalizeHex(patch.primary, current.primary) : current.primary,
      secondary: patch.secondary !== undefined ? normalizeHex(patch.secondary, current.secondary) : current.secondary,
      accent: patch.accent !== undefined ? normalizeHex(patch.accent, current.accent) : current.accent,
      background: patch.background !== undefined ? normalizeHex(patch.background, current.background) : current.background,
      text: patch.text !== undefined ? normalizeHex(patch.text, current.text) : current.text,
      header: patch.header !== undefined ? normalizeHex(patch.header, current.header) : current.header,
      footer: patch.footer !== undefined ? normalizeHex(patch.footer, current.footer) : current.footer,
    };
    await d1
      .prepare(
        `INSERT INTO d1_meta (key, value, updated_at)
         VALUES ('theme_colors', ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      )
      .bind(JSON.stringify(next))
      .run();
    return next;
  };

  let cachedBeforeAfterSettings = null;
  let cachedBeforeAfterSettingsExpiry = 0;

  const getBeforeAfterSectionSettings = async () => {
    const now = Date.now();
    if (cachedBeforeAfterSettings && now < cachedBeforeAfterSettingsExpiry) {
      return cachedBeforeAfterSettings;
    }
    try {
      const row = await d1.prepare("SELECT value FROM d1_meta WHERE key = 'before_after_settings'").first();
      if (!row?.value) return { ...DEFAULT_BEFORE_AFTER_SETTINGS };
      const parsed = JSON.parse(row.value);
      const result = {
        enabled: parsed.enabled !== undefined ? Boolean(parsed.enabled) : DEFAULT_BEFORE_AFTER_SETTINGS.enabled,
        heading:
          typeof parsed.heading === "string" && parsed.heading.trim()
            ? parsed.heading.trim()
            : DEFAULT_BEFORE_AFTER_SETTINGS.heading,
        subtitle:
          typeof parsed.subtitle === "string" && parsed.subtitle.trim()
            ? parsed.subtitle.trim()
            : DEFAULT_BEFORE_AFTER_SETTINGS.subtitle,
        heroImage: typeof parsed.heroImage === "string" ? parsed.heroImage.trim() : "",
        heroImageMobile: typeof parsed.heroImageMobile === "string" ? parsed.heroImageMobile.trim() : "",
        heroImageAlt:
          typeof parsed.heroImageAlt === "string" && parsed.heroImageAlt.trim()
            ? parsed.heroImageAlt.trim()
            : DEFAULT_BEFORE_AFTER_SETTINGS.heroImageAlt,
        displayPosition: "below_promotional_container",
        displayStatus: parsed.displayStatus === "draft" ? "draft" : "published",
      };
      cachedBeforeAfterSettings = result;
      cachedBeforeAfterSettingsExpiry = now + 60000; // 60-second TTL
      return result;
    } catch {
      return { ...DEFAULT_BEFORE_AFTER_SETTINGS };
    }
  };

  const saveBeforeAfterSectionSettings = async (patch = {}) => {
    cachedBeforeAfterSettingsExpiry = 0; // Invalidate cache immediately on edit
    const current = await getBeforeAfterSectionSettings();
    const next = {
      enabled: patch.enabled !== undefined ? Boolean(patch.enabled) : current.enabled,
      heading:
        patch.heading !== undefined && String(patch.heading).trim()
          ? String(patch.heading).trim()
          : current.heading,
      subtitle:
        patch.subtitle !== undefined && String(patch.subtitle).trim()
          ? String(patch.subtitle).trim()
          : current.subtitle,
      heroImage: patch.heroImage !== undefined ? String(patch.heroImage).trim() : current.heroImage,
      heroImageMobile:
        patch.heroImageMobile !== undefined ? String(patch.heroImageMobile).trim() : current.heroImageMobile,
      heroImageAlt:
        patch.heroImageAlt !== undefined && String(patch.heroImageAlt).trim()
          ? String(patch.heroImageAlt).trim()
          : current.heroImageAlt,
      displayPosition: "below_promotional_container",
      displayStatus: patch.displayStatus === "draft" ? "draft" : "published",
    };
    await d1
      .prepare(
        `INSERT INTO d1_meta (key, value, updated_at)
         VALUES ('before_after_settings', ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      )
      .bind(JSON.stringify(next))
      .run();
    return next;
  };

  /* ------------------------------------------------------------- GOOGLE BUSINESS PROFILE REVIEWS */
  const DEFAULT_GOOGLE_REVIEWS_URL = "https://share.google/Audp52vAIaRkaW1vL";
  const GOOGLE_REVIEWS_CONFIG_KEY = "google_reviews_config";
  const DEFAULT_GOOGLE_REVIEWS_CONFIG = {
    enabled: true,
    googleReviewsUrl: DEFAULT_GOOGLE_REVIEWS_URL,
    googleMapsUri: "https://maps.google.com/?cid=sreesaraswathidental",
    writeReviewUrl: "",
    placeId: "",
    businessName: "Sreesaraswathi Dental Clinic",
    overallRating: 4.9,
    totalReviews: 449,
    maxDisplayCount: 6,
    displayMode: "carousel_desktop_grid",
    lastSyncedAt: "",
    lastSyncError: "",
    syncSource: "manual",
  };

  let googleReviewsMemoryCache = null;
  let inFlightGoogleSyncPromise = null;

  const isValidHttpUrl = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return false;
    try {
      const parsed = new URL(raw);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const getServerGoogleApiKey = () => {
    const key = String(
      process.env.GOOGLE_PLACES_API_KEY ||
        process.env.GOOGLE_MAPS_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        ""
    ).trim();
    return (key && key.toLowerCase() !== "none" && key.toLowerCase() !== "placeholder") ? key : "";
  };

  const getGooglePlacesV1Origin = () =>
    String(process.env.GOOGLE_PLACES_API_BASE_URL || "https://places.googleapis.com")
      .trim()
      .replace(/\/$/, "");

  const getGoogleMapsApiOrigin = () =>
    String(process.env.GOOGLE_MAPS_API_BASE_URL || "https://maps.googleapis.com")
      .trim()
      .replace(/\/$/, "");

  const getGoogleReviewsSyncIntervalMs = () => {
    const mins = Number(process.env.GOOGLE_REVIEWS_CACHE_MINUTES || 360);
    const safeMins = Number.isFinite(mins) && mins >= 5 ? mins : 360;
    return safeMins * 60 * 1000;
  };

  const extractPlaceIdFromUrlString = (rawUrl) => {
    const value = String(rawUrl || "").trim();
    if (!value) return "";
    try {
      const parsed = new URL(value);
      const qPlaceId =
        parsed.searchParams.get("place_id") ||
        parsed.searchParams.get("placeid") ||
        parsed.searchParams.get("query_place_id");
      if (qPlaceId && /^ChIJ[A-Za-z0-9_-]{8,}$/.test(qPlaceId.trim())) {
        return qPlaceId.trim();
      }
    } catch {
      // Ignore non-URL strings
    }
    const chijMatch = value.match(/(ChIJ[A-Za-z0-9_-]{12,})/);
    return chijMatch ? chijMatch[1] : "";
  };

  const deriveEffectiveWriteReviewUrl = (cfg) => {
    if (isValidHttpUrl(cfg.writeReviewUrl)) return cfg.writeReviewUrl.trim();
    const envPid = String(process.env.GOOGLE_PLACE_ID || "").trim();
    const pid = String(cfg.placeId || (envPid && envPid.toLowerCase() !== "none" && envPid.toLowerCase() !== "placeholder" ? envPid : "")).trim();
    if (pid) return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(pid)}`;
    if (isValidHttpUrl(cfg.googleMapsUri)) return cfg.googleMapsUri.trim();
    return isValidHttpUrl(cfg.googleReviewsUrl) ? cfg.googleReviewsUrl.trim() : DEFAULT_GOOGLE_REVIEWS_URL;
  };

  const parseRatingValue = (raw) => {
    if (raw === null || raw === undefined || raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1 || n > 5) return null;
    return Math.round(n * 10) / 10;
  };

  const parseCountValue = (raw) => {
    if (raw === null || raw === undefined || raw === "") return null;
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };

  const getGoogleReviewsConfig = async () => {
    let parsed = {};
    try {
      const row = await d1.prepare("SELECT value FROM d1_meta WHERE key = ?").bind(GOOGLE_REVIEWS_CONFIG_KEY).first();
      if (row?.value) parsed = JSON.parse(row.value) || {};
    } catch {
      parsed = {};
    }

    const envPlaceId = String(process.env.GOOGLE_PLACE_ID || "").trim();
    const cleanEnvPlaceId = (envPlaceId && envPlaceId.toLowerCase() !== "none" && envPlaceId.toLowerCase() !== "placeholder") ? envPlaceId : "";
    const placeId = String(cleanEnvPlaceId || parsed.placeId || "").trim();
    const googleReviewsUrl = isValidHttpUrl(parsed.googleReviewsUrl)
      ? parsed.googleReviewsUrl.trim()
      : DEFAULT_GOOGLE_REVIEWS_URL;
    const googleMapsUri = isValidHttpUrl(parsed.googleMapsUri) ? parsed.googleMapsUri.trim() : "";
    const writeReviewUrl = isValidHttpUrl(parsed.writeReviewUrl) ? parsed.writeReviewUrl.trim() : "";

    const cfg = {
      enabled: parsed.enabled !== false,
      googleReviewsUrl,
      googleMapsUri,
      writeReviewUrl,
      placeId,
      businessName:
        typeof parsed.businessName === "string" && parsed.businessName.trim()
          ? parsed.businessName.trim()
          : DEFAULT_GOOGLE_REVIEWS_CONFIG.businessName,
      overallRating: parseRatingValue(parsed.overallRating),
      totalReviews: parseCountValue(parsed.totalReviews),
      maxDisplayCount:
        typeof parsed.maxDisplayCount === "number" && parsed.maxDisplayCount > 0
          ? parsed.maxDisplayCount
          : DEFAULT_GOOGLE_REVIEWS_CONFIG.maxDisplayCount,
      displayMode: parsed.displayMode || DEFAULT_GOOGLE_REVIEWS_CONFIG.displayMode,
      lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : "",
      lastSyncError: typeof parsed.lastSyncError === "string" ? parsed.lastSyncError : "",
      syncSource: parsed.syncSource === "google_api" ? "google_api" : "manual",
    };

    return {
      ...cfg,
      effectiveWriteReviewUrl: deriveEffectiveWriteReviewUrl(cfg),
    };
  };

  const saveGoogleReviewsConfig = async (patch = {}) => {
    const current = await getGoogleReviewsConfig();
    const nextGoogleUrl =
      patch.googleReviewsUrl !== undefined
        ? isValidHttpUrl(patch.googleReviewsUrl)
          ? String(patch.googleReviewsUrl).trim()
          : DEFAULT_GOOGLE_REVIEWS_URL
        : current.googleReviewsUrl;

    const nextMapsUri =
      patch.googleMapsUri !== undefined
        ? isValidHttpUrl(patch.googleMapsUri)
          ? String(patch.googleMapsUri).trim()
          : ""
        : current.googleMapsUri;

    const nextWriteUrl =
      patch.writeReviewUrl !== undefined
        ? isValidHttpUrl(patch.writeReviewUrl)
          ? String(patch.writeReviewUrl).trim()
          : ""
        : current.writeReviewUrl;

    const nextPlaceId =
      patch.placeId !== undefined ? String(patch.placeId || "").trim() : current.placeId;

    const nextRating =
      patch.overallRating !== undefined ? parseRatingValue(patch.overallRating) : current.overallRating;

    const nextTotal =
      patch.totalReviews !== undefined ? parseCountValue(patch.totalReviews) : current.totalReviews;

    const next = {
      enabled: patch.enabled !== undefined ? Boolean(patch.enabled) : current.enabled,
      googleReviewsUrl: nextGoogleUrl,
      googleMapsUri: nextMapsUri,
      writeReviewUrl: nextWriteUrl,
      placeId: nextPlaceId,
      businessName:
        patch.businessName !== undefined && String(patch.businessName).trim()
          ? String(patch.businessName).trim()
          : current.businessName,
      overallRating: nextRating,
      totalReviews: nextTotal,
      maxDisplayCount:
        typeof patch.maxDisplayCount === "number" && patch.maxDisplayCount > 0
          ? patch.maxDisplayCount
          : current.maxDisplayCount,
      displayMode: patch.displayMode || current.displayMode,
      lastSyncedAt: patch.lastSyncedAt !== undefined ? String(patch.lastSyncedAt || "") : current.lastSyncedAt,
      lastSyncError: patch.lastSyncError !== undefined ? String(patch.lastSyncError || "") : current.lastSyncError,
      syncSource: patch.syncSource === "google_api" ? "google_api" : "manual",
    };

    await d1
      .prepare(
        `INSERT INTO d1_meta (key, value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      )
      .bind(GOOGLE_REVIEWS_CONFIG_KEY, JSON.stringify(next))
      .run();

    googleReviewsMemoryCache = null;

    return {
      ...next,
      effectiveWriteReviewUrl: deriveEffectiveWriteReviewUrl(next),
    };
  };

  const serializeGoogleReviewRow = (row) => {
    let meta = {};
    try {
      meta = row.seo_description ? JSON.parse(row.seo_description) : {};
    } catch {
      meta = {};
    }
    const rawRating = Number(row.rating_score);
    const rating = Number.isFinite(rawRating) && rawRating >= 1 && rawRating <= 5 ? Math.round(rawRating) : 5;
    return {
      id: Number(row.id),
      author: row.author || row.title || "Patient",
      rating,
      comment: row.body || row.excerpt || "",
      reviewDate: row.published_at || (row.created_at ? row.created_at.slice(0, 10) : ""),
      relativeTime: typeof meta.relativeTime === "string" && meta.relativeTime ? meta.relativeTime : row.subtitle || "",
      source: meta.source === "google_api" ? "google_api" : "manual",
      authorPhotoUrl: row.media_url || (typeof meta.authorPhotoUrl === "string" ? meta.authorPhotoUrl : ""),
      reviewUrl: row.link_url || DEFAULT_GOOGLE_REVIEWS_URL,
      isVerified: row.rating_verified === 1 || Boolean(meta.isVerified),
      published: Boolean(row.published),
      displayOrder: Number(row.display_order || 0),
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
    };
  };

  const resolveGooglePlaceId = async (apiKey, config) => {
    const explicitId = String(config.placeId || process.env.GOOGLE_PLACE_ID || "").trim();
    if (explicitId) return { placeId: explicitId, businessName: config.businessName, googleMapsUri: config.googleMapsUri };

    const fromConfigUrl = extractPlaceIdFromUrlString(config.googleReviewsUrl);
    if (fromConfigUrl) return { placeId: fromConfigUrl, businessName: config.businessName, googleMapsUri: config.googleMapsUri };

    // Inspect single-hop redirect Location header (no HTML scraping) if a share link redirects with a Place ID
    if (isValidHttpUrl(config.googleReviewsUrl)) {
      try {
        const headRes = await fetch(config.googleReviewsUrl, { method: "HEAD", redirect: "manual" });
        const loc = headRes.headers.get("location");
        const fromLoc = extractPlaceIdFromUrlString(loc);
        if (fromLoc) return { placeId: fromLoc, businessName: config.businessName, googleMapsUri: config.googleMapsUri };
      } catch {
        // Ignore network/shortlink resolution failure and continue to official Places API Text Search
      }
    }

    // Build accurate search query from clinic settings stored in D1
    let clinicRow = null;
    try {
      clinicRow = await d1.prepare("SELECT clinic_name, address FROM clinic_settings WHERE id = 1").first();
    } catch {
      clinicRow = null;
    }
    const queryCandidates = [
      [
        clinicRow?.clinic_name || config.businessName || "Sri Saraswathi Dental Clinic",
        clinicRow?.address || "866 Soli Complex Surampatti Four Rd Erode Tamil Nadu 638009",
      ]
        .filter(Boolean)
        .join(", "),
      "Sri Saraswathi Dental Clinic, EVN Road, Erode",
      "Sree Saraswathi Dental Clinic, 866 Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009",
      "Sri Saraswathi Dental Clinic Erode",
    ];

    const v1Origin = getGooglePlacesV1Origin();
    for (const textQuery of queryCandidates) {
      const searchRes = await fetch(`${v1Origin}/v1/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.googleMapsUri",
        },
        body: JSON.stringify({
          textQuery,
          languageCode: "en",
          maxResultCount: 3,
        }),
      });

      if (searchRes.ok) {
        const searchJson = await searchRes.json().catch(() => ({}));
        const matched = Array.isArray(searchJson?.places) ? searchJson.places.find((p) => p?.id) : null;
        if (matched?.id) {
          return {
            placeId: String(matched.id).trim(),
            businessName: String(matched.displayName?.text || config.businessName || "").trim(),
            googleMapsUri: String(matched.googleMapsUri || config.googleMapsUri || "").trim(),
          };
        }
      }
    }

    // Fallback to official Legacy Find Place API
    const legacyOrigin = getGoogleMapsApiOrigin();
    const findUrl = `${legacyOrigin}/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
      queryCandidates[0]
    )}&inputtype=textquery&fields=place_id,name&key=${encodeURIComponent(apiKey)}`;
    const findRes = await fetch(findUrl, { headers: { Accept: "application/json" } });
    const findJson = await findRes.json().catch(() => ({}));
    const candidate = Array.isArray(findJson?.candidates) ? findJson.candidates.find((c) => c?.place_id) : null;
    if (findRes.ok && candidate?.place_id) {
      return {
        placeId: String(candidate.place_id).trim(),
        businessName: String(candidate.name || config.businessName || "").trim(),
        googleMapsUri: config.googleMapsUri || "",
      };
    }

    throw new Error(
      findJson?.error_message ||
        "Could not resolve Google Place ID automatically via Places API. Verify API key permissions or set GOOGLE_PLACE_ID."
    );
  };

  const fetchOfficialGooglePlaceReviews = async (placeId, apiKey) => {
    const cleanPlaceId = String(placeId || "").trim();
    const cleanKey = String(apiKey || "").trim();
    if (!cleanPlaceId || !cleanKey) {
      throw new Error("Both Google Place ID and server GOOGLE_PLACES_API_KEY are required.");
    }

    // 1. Official Places API (New) v1
    const v1Origin = getGooglePlacesV1Origin();
    const v1Url = `${v1Origin}/v1/places/${encodeURIComponent(cleanPlaceId)}?languageCode=en`;
    const v1Res = await fetch(v1Url, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": cleanKey,
        "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,googleMapsUri,reviews",
        Accept: "application/json",
      },
    });

    if (v1Res.ok) {
      const payload = await v1Res.json();
      const reviews = Array.isArray(payload.reviews)
        ? payload.reviews
            .map((rev, idx) => {
              const author = String(rev?.authorAttribution?.displayName || "").trim();
              const comment = String(rev?.text?.text || rev?.originalText?.text || "").trim();
              const rating = Math.max(1, Math.min(5, Math.round(Number(rev?.rating) || 5)));
              const publishTime = String(rev?.publishTime || "").trim();
              const relativeTime = String(rev?.relativePublishTimeDescription || "").trim();
              const reviewSlugSeed = rev?.name || `${author}-${publishTime}-${idx}`;
              const externalHash = crypto.createHash("sha256").update(String(reviewSlugSeed)).digest("hex").slice(0, 14);
              return {
                slug: `gapi-${externalHash}`,
                author,
                rating,
                comment,
                reviewDate: publishTime ? publishTime.slice(0, 10) : "",
                relativeTime,
                authorPhotoUrl: String(rev?.authorAttribution?.photoUri || "").trim(),
                reviewUrl: String(rev?.authorAttribution?.uri || payload?.googleMapsUri || "").trim(),
              };
            })
            .filter((r) => r.author && r.comment)
        : [];

      return {
        placeId: String(payload?.id || cleanPlaceId).trim(),
        businessName: String(payload?.displayName?.text || "").trim(),
        overallRating: parseRatingValue(payload?.rating),
        totalReviews: parseCountValue(payload?.userRatingCount),
        googleMapsUri: String(payload?.googleMapsUri || "").trim(),
        reviews,
      };
    }

    // 2. Fallback to Official Legacy Place Details REST API
    const legacyOrigin = getGoogleMapsApiOrigin();
    const legacyUrl = `${legacyOrigin}/maps/api/place/details/json?place_id=${encodeURIComponent(
      cleanPlaceId
    )}&fields=place_id,name,rating,user_ratings_total,url,reviews&language=en&reviews_sort=most_relevant&key=${encodeURIComponent(
      cleanKey
    )}`;
    const legacyRes = await fetch(legacyUrl, { headers: { Accept: "application/json" } });
    const legacyJson = await legacyRes.json().catch(() => ({}));
    if (!legacyRes.ok || legacyJson.status !== "OK") {
      const v1ErrJson = await v1Res.json().catch(() => ({}));
      const apiErrMsg =
        v1ErrJson?.error?.message ||
        legacyJson?.error_message ||
        legacyJson?.status ||
        `Google Places API returned HTTP ${v1Res.status}`;
      throw new Error(`Google Places API sync failed: ${apiErrMsg}`);
    }

    const resObj = legacyJson.result || {};
    const reviews = Array.isArray(resObj.reviews)
      ? resObj.reviews
          .map((rev, idx) => {
            const author = String(rev?.author_name || "").trim();
            const comment = String(rev?.text || "").trim();
            const rating = Math.max(1, Math.min(5, Math.round(Number(rev?.rating) || 5)));
            const reviewDate = rev?.time ? new Date(Number(rev.time) * 1000).toISOString().slice(0, 10) : "";
            const relativeTime = String(rev?.relative_time_description || "").trim();
            const seed = `${author}-${rev?.time || idx}`;
            const externalHash = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 14);
            return {
              slug: `gapi-${externalHash}`,
              author,
              rating,
              comment,
              reviewDate,
              relativeTime,
              authorPhotoUrl: String(rev?.profile_photo_url || "").trim(),
              reviewUrl: String(rev?.author_url || resObj?.url || "").trim(),
            };
          })
          .filter((r) => r.author && r.comment)
      : [];

    return {
      placeId: String(resObj?.place_id || cleanPlaceId).trim(),
      businessName: String(resObj?.name || "").trim(),
      overallRating: parseRatingValue(resObj?.rating),
      totalReviews: parseCountValue(resObj?.user_ratings_total),
      googleMapsUri: String(resObj?.url || "").trim(),
      reviews,
    };
  };

  const syncGoogleReviewsFromApi = async (placeIdOverride = "") => {
    const apiKey = getServerGoogleApiKey();
    if (!apiKey) {
      throw new Error(
        "GOOGLE_PLACES_API_KEY is not configured in server/Hostinger environment variables."
      );
    }

    if (inFlightGoogleSyncPromise) {
      return inFlightGoogleSyncPromise;
    }

    inFlightGoogleSyncPromise = (async () => {
      const current = await getGoogleReviewsConfig();
      const targetConfig = placeIdOverride
        ? { ...current, placeId: String(placeIdOverride).trim() }
        : current;

      const resolved = await resolveGooglePlaceId(apiKey, targetConfig);
      const remote = await fetchOfficialGooglePlaceReviews(resolved.placeId, apiKey);
      const finalPlaceId = remote.placeId || resolved.placeId;
      const finalMapsUri = remote.googleMapsUri || resolved.googleMapsUri || current.googleMapsUri;

      // Replace only API-synced Google reviews cleanly with the latest official Google API response, preserving manual entries
      await d1.prepare("DELETE FROM site_content WHERE type = 'google_review' AND seo_description LIKE '%\"google_api\"%'").run();

      let importedCount = 0;
      for (let i = 0; i < remote.reviews.length; i += 1) {
        const r = remote.reviews[i];
        const seoMeta = JSON.stringify({
          source: "google_api",
          relativeTime: r.relativeTime,
          authorPhotoUrl: r.authorPhotoUrl,
          externalId: r.slug,
        });

        await d1
          .prepare(
            `INSERT INTO site_content (
               type, slug, title, subtitle, author, excerpt, body,
               media_url, link_url, rating_score, rating_verified,
               published_at, seo_description, patient_consent, published, display_order,
               created_at, updated_at
             ) VALUES (
               'google_review', ?, ?, ?, ?, ?, ?,
               ?, ?, ?, 1,
               ?, ?, 1, 1, ?,
               datetime('now'), datetime('now')
             )`
          )
          .bind(
            r.slug,
            r.author,
            r.relativeTime || "Google Review",
            r.author,
            r.comment,
            r.comment,
            r.authorPhotoUrl,
            r.reviewUrl || finalMapsUri || current.googleReviewsUrl,
            String(r.rating),
            r.reviewDate,
            seoMeta,
            i
          )
          .run();
        importedCount += 1;
      }

      const nextConfig = await saveGoogleReviewsConfig({
        placeId: finalPlaceId,
        googleMapsUri: finalMapsUri,
        businessName: remote.businessName || resolved.businessName || current.businessName,
        overallRating: remote.overallRating,
        totalReviews: remote.totalReviews,
        lastSyncedAt: new Date().toISOString(),
        lastSyncError: "",
        syncSource: "google_api",
      });

      const rows =
        (
          await d1
            .prepare("SELECT * FROM site_content WHERE type = 'google_review' ORDER BY display_order ASC, id DESC")
            .all()
        ).results || [];

      const result = {
        config: nextConfig,
        reviews: rows.map(serializeGoogleReviewRow),
        importedCount,
      };
      googleReviewsMemoryCache = {
        expiresAt: Date.now() + 15 * 60 * 1000,
        payload: {
          status: result.reviews.length > 0 ? "synced" : "empty",
          apiConfigured: true,
          cached: false,
          maxApiReviewsNotice: "Google Places API returns up to 5 most relevant reviews per business.",
          config: nextConfig,
          reviews: result.reviews,
        },
      };
      return result;
    })();

    try {
      return await inFlightGoogleSyncPromise;
    } catch (err) {
      await saveGoogleReviewsConfig({
        lastSyncError: err instanceof Error ? err.message : "Unable to sync Google reviews",
      }).catch(() => {});
      throw err;
    } finally {
      inFlightGoogleSyncPromise = null;
    }
  };

  const validateMediaUpload = (rawMime, originalName, byteLength, { direct = false } = {}) => {
    const mimeType = resolveMediaMimeType(rawMime, originalName);
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return {
        errorStatus: 415,
        error: "Unsupported file type. Supported formats: JPG, JPEG, PNG, WEBP, AVIF, GIF, SVG, MP4, MOV, M4V, WEBM.",
      };
    }
    const isVideo = mimeType.startsWith("video/") || mimeType === "application/mp4";
    const maxSize = isVideo
      ? direct
        ? REELS_STORAGE_QUOTA_BYTES
        : MAX_SERVER_VIDEO_UPLOAD_BYTES
      : MAX_IMAGE_UPLOAD_BYTES;
    if (Number.isFinite(byteLength) && byteLength > maxSize) {
      return {
        errorStatus: 413,
        error: isVideo
          ? direct
            ? "Video file exceeds the 2 GB maximum storage quota."
            : "File too large for direct server upload. Use chunked/direct upload or keep under 150MB."
          : "File too large. Max size is 15MB.",
      };
    }
    return { mimeType, isVideo };
  };

  const handleR2Upload = async (req, res) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "Choose a file to upload." });
      }

      const rawMime = String(req.query.mime || req.headers["content-type"] || "").trim();
      const folder = String(req.query.folder || "gallery").toLowerCase().trim();
      const originalName = String(req.query.filename || "media.jpg").trim();
      const replaceContentId = req.query.replaceContentId ? Number(req.query.replaceContentId) : null;

      const checked = validateMediaUpload(rawMime, originalName, req.body.length, { direct: false });
      if ("error" in checked) {
        return res.status(checked.errorStatus).json({ error: checked.error });
      }
      const { mimeType, isVideo } = checked;

      if (isVideo) {
        const quota = await checkReelsQuota(req.body.length, { excludeContentId: replaceContentId });
        if (!quota.ok) {
          return res.status(413).json({
            error: quota.error,
            code: "STORAGE_QUOTA_EXCEEDED",
            storage: quota.storage,
          });
        }
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

  const handleR2Presign = async (req, res) => {
    try {
      const filename = String(req.body?.filename || "upload.bin").trim();
      const folder = String(req.body?.folder || "gallery").toLowerCase().trim();
      const rawMime = String(req.body?.mimeType || "").trim();
      const size = Number(req.body?.size ?? 0);
      const replaceContentId = req.body?.replaceContentId ? Number(req.body.replaceContentId) : null;

      if (!Number.isFinite(size) || size <= 0) {
        return res.status(400).json({ error: "Choose a non-empty file to upload." });
      }

      const checked = validateMediaUpload(rawMime, filename, size, { direct: true });
      if ("error" in checked) {
        return res.status(checked.errorStatus).json({ error: checked.error });
      }
      const { mimeType, isVideo } = checked;

      if (isVideo) {
        const quota = await checkReelsQuota(size, { excludeContentId: replaceContentId });
        if (!quota.ok) {
          return res.status(413).json({
            error: quota.error,
            code: "STORAGE_QUOTA_EXCEEDED",
            storage: quota.storage,
          });
        }
      }

      if (typeof r2.createPresignedUrl !== "function") {
        return res.json({ direct: false, mimeType });
      }

      await r2.ensureCors?.().catch(() => false);
      const r2Key = generateR2Key(folder, filename, mimeType);
      const presignedUrl = r2.createPresignedUrl("PUT", r2Key, {
        expiresInSeconds: 3600,
        contentType: mimeType,
      });

      return res.json({
        direct: true,
        presignedUrl,
        method: "PUT",
        headers: { "Content-Type": mimeType },
        key: r2Key,
        url: getR2PublicUrl(r2Key),
        mimeType,
      });
    } catch (err) {
      console.error("R2 Presign Error:", err);
      return res.status(500).json({ error: err.message || "Could not prepare direct R2 upload." });
    }
  };

  const handleUploadMiddlewareError = (err, _req, res, next) => {
    if (err?.status === 413 || err?.type === "entity.too.large") {
      return res.status(413).json({
        error: "File too large for server proxy upload. Please use direct/chunked upload or keep under 150MB.",
      });
    }
    return next(err);
  };

  app.post("/api/upload/presign", requireAdmin, express.json({ limit: "16kb" }), handleR2Presign);
  app.post("/api/admin/uploads/presign", requireAdmin, express.json({ limit: "16kb" }), handleR2Presign);
  app.post("/api/upload", requireAdmin, express.raw({ type: "*/*", limit: "150mb" }), handleR2Upload, handleUploadMiddlewareError);
  app.post("/api/admin/uploads", requireAdmin, express.raw({ type: "*/*", limit: "150mb" }), handleR2Upload, handleUploadMiddlewareError);

  // Multipart / chunked direct R2 video uploads (enforces 2GB total section quota)
  app.post("/api/admin/uploads/multipart/init", requireAdmin, express.json({ limit: "16kb" }), async (req, res) => {
    try {
      const filename = String(req.body?.filename || "reel.mp4").trim();
      const folder = String(req.body?.folder || "reels").toLowerCase().trim();
      const rawMime = String(req.body?.mimeType || "").trim();
      const size = Number(req.body?.size ?? 0);
      const replaceContentId = req.body?.replaceContentId ? Number(req.body.replaceContentId) : null;

      if (!Number.isFinite(size) || size <= 0) {
        return res.status(400).json({ error: "Choose a valid non-empty video file." });
      }

      const checked = validateMediaUpload(rawMime, filename, size, { direct: true });
      if ("error" in checked) {
        return res.status(checked.errorStatus).json({ error: checked.error });
      }
      if (!checked.isVideo) {
        return res.status(415).json({ error: "Only supported video formats (MP4, MOV, WebM) can use video multipart upload." });
      }

      const quota = await checkReelsQuota(size, { excludeContentId: replaceContentId });
      if (!quota.ok) {
        return res.status(413).json({
          error: quota.error,
          code: "STORAGE_QUOTA_EXCEEDED",
          storage: quota.storage,
        });
      }

      if (typeof r2.createMultipartUpload !== "function") {
        return res.status(501).json({ error: "Multipart upload is not supported by storage adapter." });
      }

      await r2.ensureCors?.().catch(() => false);
      const r2Key = generateR2Key(folder, filename, checked.mimeType);
      const uploadId = await r2.createMultipartUpload(r2Key, checked.mimeType);
      const totalParts = Math.max(1, Math.ceil(size / MULTIPART_PART_SIZE_BYTES));

      return res.json({
        uploadId,
        key: r2Key,
        url: getR2PublicUrl(r2Key),
        mimeType: checked.mimeType,
        partSize: MULTIPART_PART_SIZE_BYTES,
        totalParts,
        directMultipart: typeof r2.createPresignedPartUrl === "function",
        storage: quota.storage,
      });
    } catch (err) {
      console.error("Multipart init error:", err);
      return res.status(500).json({ error: err.message || "Could not initialize chunked upload." });
    }
  });

  app.post("/api/admin/uploads/multipart/sign-part", requireAdmin, express.json({ limit: "16kb" }), async (req, res) => {
    try {
      const key = String(req.body?.key || "").replace(/^\/+/, "").trim();
      const uploadId = String(req.body?.uploadId || "").trim();
      const partNumber = Number(req.body?.partNumber || 0);

      if (!key || key.includes("..") || !uploadId || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
        return res.status(400).json({ error: "Invalid multipart part parameters." });
      }

      if (typeof r2.createPresignedPartUrl === "function") {
        await r2.ensureCors?.().catch(() => false);
        const uploadUrl = r2.createPresignedPartUrl(key, uploadId, partNumber, { expiresInSeconds: 3600 });
        return res.json({ direct: true, uploadUrl, method: "PUT", partNumber });
      }

      return res.json({
        direct: false,
        uploadUrl: `/api/admin/uploads/multipart/part?uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`,
        method: "PUT",
        partNumber,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Could not sign upload chunk." });
    }
  });

  app.put(
    "/api/admin/uploads/multipart/part",
    requireAdmin,
    express.raw({ type: "*/*", limit: "20mb" }),
    async (req, res) => {
      try {
        const uploadId = String(req.query?.uploadId || "").trim();
        const partNumber = Number(req.query?.partNumber || 0);
        if (!uploadId || !Number.isInteger(partNumber) || partNumber < 1 || !Buffer.isBuffer(req.body) || req.body.length === 0) {
          return res.status(400).json({ error: "Invalid video chunk." });
        }
        if (typeof r2.uploadPart !== "function") {
          return res.status(400).json({ error: "Direct R2 part URL must be used in live storage mode." });
        }
        const etag = await r2.uploadPart(uploadId, partNumber, req.body);
        res.setHeader("ETag", `"${etag}"`);
        return res.json({ ok: true, partNumber, etag });
      } catch (err) {
        return res.status(500).json({ error: err.message || "Failed to store video chunk." });
      }
    },
    handleUploadMiddlewareError
  );

  app.post("/api/admin/uploads/multipart/complete", requireAdmin, express.json({ limit: "256kb" }), async (req, res) => {
    try {
      const key = String(req.body?.key || "").replace(/^\/+/, "").trim();
      const uploadId = String(req.body?.uploadId || "").trim();
      const parts = Array.isArray(req.body?.parts) ? req.body.parts : [];
      const replaceContentId = req.body?.replaceContentId ? Number(req.body.replaceContentId) : null;

      if (!key || key.includes("..") || !uploadId || parts.length === 0) {
        return res.status(400).json({ error: "Missing multipart completion payload." });
      }

      const completed = await r2.completeMultipartUpload(key, uploadId, parts);
      const headMeta = typeof r2.head === "function" ? await r2.head(key).catch(() => null) : null;
      const actualSize = Math.max(0, Number(headMeta?.size || completed?.size || 0));
      const mimeType = headMeta?.contentType || completed?.httpMetadata?.contentType || "video/mp4";

      const quota = await checkReelsQuota(actualSize, { excludeContentId: replaceContentId });
      if (!quota.ok) {
        await safeDeleteR2File(r2, key);
        return res.status(413).json({
          error: quota.error,
          code: "STORAGE_QUOTA_EXCEEDED",
          storage: quota.storage,
        });
      }

      return res.status(201).json({
        success: true,
        key,
        url: getR2PublicUrl(key),
        size: actualSize,
        mimeType,
        etag: completed?.etag || headMeta?.etag || "",
      });
    } catch (err) {
      console.error("Multipart complete error:", err);
      return res.status(500).json({ error: err.message || "Failed to finalize chunked video upload." });
    }
  });

  app.post("/api/admin/uploads/multipart/abort", requireAdmin, express.json({ limit: "16kb" }), async (req, res) => {
    try {
      const key = String(req.body?.key || "").replace(/^\/+/, "").trim();
      const uploadId = String(req.body?.uploadId || "").trim();
      if (key && uploadId && !key.includes("..") && typeof r2.abortMultipartUpload === "function") {
        await r2.abortMultipartUpload(key, uploadId).catch(() => {});
      }
      return res.json({ ok: true });
    } catch {
      return res.json({ ok: true });
    }
  });

  app.post("/api/admin/uploads/cleanup", requireAdmin, express.json({ limit: "32kb" }), async (req, res) => {
    try {
      const urls = Array.isArray(req.body?.urls) ? req.body.urls.map(String) : [];
      const keys = Array.isArray(req.body?.keys) ? req.body.keys.map((k) => `/api/media/${String(k).replace(/^\/+/, "")}`) : [];
      const allUrls = Array.from(new Set([...urls, ...keys].filter(Boolean)));
      if (allUrls.length > 0) {
        await deleteUnreferencedR2Media(allUrls, null);
      }
      return res.json({ ok: true });
    } catch {
      return res.json({ ok: true });
    }
  });

  // 2. Stream media directly from Cloudflare R2
  app.get(/^\/api\/media\/(.+)$/, async (req, res, next) => {
    try {
      const key = decodeURIComponent(req.params[0] || "");
      if (!key || key.includes("..")) return res.status(404).json({ error: "Media not found." });

      // Redirect large files / video streams to short-lived presigned R2 URLs so byte-ranges stream straight from R2 edge
      if (typeof r2.head === "function" && typeof r2.createPresignedUrl === "function") {
        const meta = await r2.head(key);
        if (meta && (meta.contentType.startsWith("video/") || meta.contentType === "application/mp4" || meta.size > 4 * 1024 * 1024)) {
          const signedGetUrl = r2.createPresignedUrl("GET", key, { expiresInSeconds: 3600 });
          res.setHeader("Cache-Control", "private, max-age=300");
          return res.redirect(302, signedGetUrl);
        }
      }

      const item = await r2.get(key);
      if (item) {
        const bodyBuf = Buffer.isBuffer(item.body) ? item.body : Buffer.from(item.body);
        const total = bodyBuf.length;
        const contentType = item.contentType || "application/octet-stream";
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Content-Type", contentType);
        res.setHeader("Accept-Ranges", "bytes");
        if (item.etag) res.setHeader("ETag", `"${item.etag}"`);

        const rangeHeader = req.headers.range;
        if (rangeHeader && /^bytes=/i.test(rangeHeader)) {
          const match = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader).trim());
          if (match && (match[1] || match[2])) {
            if (total === 0) {
              res.setHeader("Content-Range", "bytes */0");
              return res.status(416).end();
            }
            const start = match[1] ? Number(match[1]) : Math.max(0, total - Number(match[2]));
            const end = match[1] && match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
            if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= total || end < start) {
              res.setHeader("Content-Range", `bytes */${total}`);
              return res.status(416).end();
            }
            const chunk = bodyBuf.subarray(start, end + 1);
            res.status(206);
            res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
            res.setHeader("Content-Length", String(chunk.length));
            return res.send(chunk);
          }
        }

        res.setHeader("Content-Length", String(total));
        return res.send(bodyBuf);
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

  /* ------------------------------------------------------------- 1. ADMINS, PATIENTS & AUTH */

  app.post("/api/auth/register", async (req, res) => {
    try {
      const b = req.body || {};
      const firstName = String(b.firstName || "").trim();
      const lastName = String(b.lastName || "").trim();
      const email = String(b.email || "").trim().toLowerCase();
      const phone = String(b.phone || "").trim();
      const password = String(b.password || "");

      if (!firstName || !lastName) {
        return res.status(400).json({ error: "Please enter your full name." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }
      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 13) {
        return res.status(400).json({ error: "Please enter a valid mobile number." });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters." });
      }

      const existingPatient = await d1.prepare("SELECT id FROM users WHERE LOWER(email) = ?").bind(email).first();
      const existingAdmin = await d1.prepare("SELECT id FROM admins WHERE LOWER(email) = ?").bind(email).first();
      if (existingPatient || existingAdmin) {
        return res.status(409).json({ error: "An account with this email already exists. Please sign in." });
      }

      const passwordHash = hashPassword(password);
      const info = await d1.prepare(
        "INSERT INTO users (first_name, last_name, email, phone, password_hash, role, created_at, last_login_at, login_count) VALUES (?, ?, ?, ?, ?, 'patient', datetime('now'), datetime('now'), 1)"
      ).bind(firstName, lastName, email, phone, passwordHash).run();

      const newId = Number(info.meta?.last_row_id || 0);
      const user = {
        id: newId,
        firstName,
        lastName,
        email,
        phone,
        role: "patient",
      };

      setSessionCookie(req, res, user);
      res.status(201).json({ user });
    } catch (err) {
      res.status(500).json({ error: err.message || "Could not create account." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const clientIp = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim() || "127.0.0.1";
      const now = Date.now();
      const ipRecord = loginAttempts.get(clientIp);

      if (ipRecord && ipRecord.lockedUntil && ipRecord.lockedUntil > now) {
        const remainingMins = Math.ceil((ipRecord.lockedUntil - now) / 60000);
        return res.status(429).json({
          error: `Too many failed login attempts. Account access temporarily locked. Please try again in ${remainingMins} minute(s).`
        });
      }

      const { email, password } = req.body || {};
      const cleanEmail = String(email || "").trim().toLowerCase();
      if (!cleanEmail || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const recordFailure = () => {
        let rec = loginAttempts.get(clientIp);
        if (!rec || rec.resetAt < now) {
          rec = { count: 1, resetAt: now + LOGIN_ATTEMPT_WINDOW_MS, lockedUntil: 0 };
        } else {
          rec.count += 1;
          if (rec.count >= MAX_LOGIN_ATTEMPTS) {
            rec.lockedUntil = now + LOGIN_LOCKOUT_MS;
          }
        }
        loginAttempts.set(clientIp, rec);
      };

      const admin = await d1.prepare("SELECT * FROM admins WHERE LOWER(email) = ?").bind(cleanEmail).first();
      if (admin) {
        if (!verifyPassword(password, admin.password_hash)) {
          recordFailure();
          await logAdminActivity(d1, admin.id, admin.name || cleanEmail, "LOGIN_FAILED", `Failed attempt from IP: ${clientIp}`, req);
          return res.status(401).json({ error: "Invalid email or password." });
        }
        if (admin.status === "inactive") {
          return res.status(403).json({ error: "Account is inactive. Contact the chief surgeon." });
        }

        loginAttempts.delete(clientIp);

        await d1.prepare(
          "UPDATE admins SET last_login_at = datetime('now'), login_count = COALESCE(login_count, 0) + 1 WHERE id = ?"
        ).bind(admin.id).run();

        const fullName = admin.name || "Dr. Kishore Kumar";
        const user = {
          id: admin.id,
          firstName: fullName,
          lastName: "",
          name: fullName,
          email: admin.email,
          phone: "",
          role: admin.role || "admin",
        };
        await logAdminActivity(d1, admin.id, fullName, "LOGIN_SUCCESS", `Logged in from IP: ${clientIp}`, req);
        setSessionCookie(req, res, user);
        return res.json({ user });
      }

      const patient = await d1.prepare("SELECT * FROM users WHERE LOWER(email) = ?").bind(cleanEmail).first();
      if (!patient || !verifyPassword(password, patient.password_hash)) {
        recordFailure();
        return res.status(401).json({ error: "Invalid email or password." });
      }

      loginAttempts.delete(clientIp);

      await d1.prepare(
        "UPDATE users SET last_login_at = datetime('now'), login_count = COALESCE(login_count, 0) + 1 WHERE id = ?"
      ).bind(patient.id).run();

      const user = {
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        name: `${patient.first_name} ${patient.last_name}`.trim(),
        email: patient.email,
        phone: patient.phone || "",
        role: patient.role || "patient",
      };
      setSessionCookie(req, res, user);
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: err.message || "Login failed." });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated." });
      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name || (user.firstName + (user.lastName ? " " + user.lastName : "")).trim(),
          email: user.email,
          phone: user.phone,
          role: user.role,
          picture: user.picture || null,
          authProvider: user.authProvider || "local",
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (user && user.role === "admin") {
        await logAdminActivity(d1, user.id, user.name || user.firstName, "LOGOUT", "Admin signed out", req);
      }
    } catch {}
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  /* ------------------------------------------------------------- 1.05 GOOGLE OAUTH 2.0 / OPENID CONNECT */

  const getOAuthRedirectUri = (req) => {
    if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
    const origin = String(req.headers.origin || req.headers.referer || "").toLowerCase();
    if (host.includes("localhost") || host.includes("127.0.0.1") || origin.includes("localhost:5173") || origin.includes("127.0.0.1:5173")) {
      return "http://localhost:5173/api/auth/google/callback";
    }
    return "https://drkishoredentist.com/api/auth/google/callback";
  };

  app.get("/api/auth/google/status", (_req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const isConfigured = Boolean(clientId && !clientId.includes("replace-with") && clientId !== "none");
    res.json({
      enabled: isConfigured,
      clientId: isConfigured ? clientId : null,
    });
  });

  const handleGoogleAuthInit = (req, res, isJson = false) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret || clientId.includes("replace-with") || clientSecret.includes("replace-with") || clientId === "none") {
        const errorMsg = "Google Sign-In is not currently configured on the server. Please sign in using your email and password.";
        if (isJson) {
          return res.status(400).json({ error: errorMsg });
        }
        return res.redirect(`/auth/login?error=${encodeURIComponent(errorMsg)}`);
      }

      const rawNext = String(req.query.next || "").trim();
      const safeNext = (rawNext.startsWith("/") && !rawNext.startsWith("//")) ? rawNext : "/patient-portal";

      const redirectUri = getOAuthRedirectUri(req);

      const randomState = crypto.randomBytes(24).toString("hex");
      const nonce = crypto.randomBytes(16).toString("hex");
      const statePayload = b64url(JSON.stringify({
        s: randomState,
        next: safeNext,
        exp: Date.now() + 10 * 60 * 1000,
      }));
      const stateSig = crypto.createHmac("sha256", secret).update(statePayload).digest("base64url");
      const fullState = `${statePayload}.${stateSig}`;

      res.setHeader("Set-Cookie", `clinic_oauth_state=${fullState}; HttpOnly${cookieAttrs(req)}; Path=/; Max-Age=600`);

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "openid email profile");
      authUrl.searchParams.set("state", fullState);
      authUrl.searchParams.set("nonce", nonce);
      authUrl.searchParams.set("prompt", "select_account");
      authUrl.searchParams.set("access_type", "online");

      if (isJson) {
        return res.json({ ok: true, url: authUrl.toString() });
      }

      res.redirect(authUrl.toString());
    } catch (err) {
      console.error("[Google OAuth Init Error]:", err);
      if (isJson) {
        return res.status(500).json({ error: "Could not initiate Google Sign-In. Please try again." });
      }
      res.redirect(`/auth/login?error=${encodeURIComponent("Could not initiate Google Sign-In. Please try again.")}`);
    }
  };

  app.get("/api/auth/google/url", (req, res) => handleGoogleAuthInit(req, res, true));
  app.get("/api/auth/google", (req, res) => {
    const isJson = req.query.format === "json" || req.headers.accept?.includes("application/json");
    handleGoogleAuthInit(req, res, isJson);
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state, error: googleError } = req.query || {};

      if (googleError) {
        const errorMsg = googleError === "access_denied"
          ? "Google sign-in was cancelled."
          : `Google authentication failed: ${googleError}`;
        return res.redirect(`/auth/login?error=${encodeURIComponent(errorMsg)}`);
      }

      if (!code || !state || typeof state !== "string" || !state.includes(".")) {
        return res.redirect(`/auth/login?error=${encodeURIComponent("Authorization code or security state was missing.")}`);
      }

      const cookies = parseCookies(req.headers.cookie);
      const stateCookie = cookies["clinic_oauth_state"];
      if (!stateCookie || stateCookie !== state) {
        return res.redirect(`/auth/login?error=${encodeURIComponent("Invalid or expired OAuth session state. Please try again.")}`);
      }

      const [statePayload, stateSig] = state.split(".");
      const expectedStateSig = crypto.createHmac("sha256", secret).update(statePayload).digest("base64url");
      if (stateSig !== expectedStateSig) {
        return res.redirect(`/auth/login?error=${encodeURIComponent("Security validation failed for OAuth session.")}`);
      }

      let stateData = null;
      try {
        stateData = JSON.parse(Buffer.from(statePayload, "base64url").toString());
      } catch {
        return res.redirect(`/auth/login?error=${encodeURIComponent("Corrupted OAuth session state.")}`);
      }

      if (!stateData || !stateData.exp || stateData.exp < Date.now()) {
        return res.redirect(`/auth/login?error=${encodeURIComponent("Login request expired. Please try again.")}`);
      }

      const destination = (stateData.next && stateData.next.startsWith("/") && !stateData.next.startsWith("//"))
        ? stateData.next
        : "/patient-portal";

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = getOAuthRedirectUri(req);

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text().catch(() => "");
        console.error("[Google OAuth] Token exchange error:", tokenRes.status, errBody);
        return res.redirect(`/auth/login?error=${encodeURIComponent("Failed to exchange authentication code with Google.")}`);
      }

      const tokens = await tokenRes.json();
      const { id_token, access_token } = tokens;

      if (!id_token && !access_token) {
        return res.redirect(`/auth/login?error=${encodeURIComponent("Google did not return an identity token.")}`);
      }

      const tokenInfoUrl = id_token
        ? `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`
        : `https://openidconnect.googleapis.com/v1/userinfo`;

      const verifyRes = await fetch(tokenInfoUrl, {
        headers: access_token ? { Authorization: `Bearer ${access_token}` } : {},
      });

      if (!verifyRes.ok) {
        return res.redirect(`/auth/login?error=${encodeURIComponent("Google ID token verification failed.")}`);
      }

      const googleProfile = await verifyRes.json();
      const sub = String(googleProfile.sub || "");
      const email = String(googleProfile.email || "").trim().toLowerCase();
      const emailVerified = googleProfile.email_verified === true || googleProfile.email_verified === "true";

      if (!sub || !email) {
        return res.redirect(`/auth/login?error=${encodeURIComponent("Google account identifier or email was not provided.")}`);
      }
      if (!emailVerified) {
        return res.redirect(`/auth/login?error=${encodeURIComponent("Your Google account email is not verified. Please verify your email with Google first.")}`);
      }

      // Check if this Google account belongs to a registered clinic administrator
      const existingAdmin = await d1.prepare("SELECT id, name, email, role, status FROM admins WHERE LOWER(email) = ?").bind(email).first();
      if (existingAdmin) {
        if (existingAdmin.status === "inactive") {
          return res.redirect(`/auth/login?error=${encodeURIComponent("This administrator account has been deactivated. Please contact support.")}`);
        }
        await d1.prepare("UPDATE admins SET last_login_at = datetime('now'), login_count = COALESCE(login_count, 0) + 1 WHERE id = ?").bind(existingAdmin.id).run();
        try {
          await logAdminActivity(d1, existingAdmin.id, existingAdmin.name || "Dr. Kishore Kumar", "LOGIN_GOOGLE", "Administrator authenticated via Google OAuth", req);
        } catch {}

        const adminSessionUser = {
          id: existingAdmin.id,
          firstName: existingAdmin.name || "Dr. Kishore Kumar",
          lastName: "",
          name: existingAdmin.name || "Dr. Kishore Kumar",
          email: existingAdmin.email,
          phone: "",
          role: existingAdmin.role || "admin",
          picture: googleProfile.picture || null,
          authProvider: "google",
        };

        const sessionToken = signSession(adminSessionUser, secret);
        res.setHeader("Set-Cookie", [
          `${COOKIE_NAME}=${sessionToken}; HttpOnly${cookieAttrs(req)}; Path=/; Max-Age=${SESSION_DAYS * 86400}`,
          `clinic_oauth_state=; HttpOnly${cookieAttrs(req)}; Path=/; Max-Age=0`,
          `clinic_oauth_state=; HttpOnly${cookieAttrs(req)}; Path=/api/auth/google; Max-Age=0`,
        ]);

        const adminDest = (destination === "/patient-portal" || !destination) ? "/dashboard" : destination;
        return res.redirect(adminDest);
      }

      // Check users table:
      // A. Match by permanent Google subject ID (sub)
      let patient = await d1.prepare("SELECT * FROM users WHERE google_id = ?").bind(sub).first();

      if (!patient) {
        // B. Match by verified email (existing email/password patient account)
        patient = await d1.prepare("SELECT * FROM users WHERE LOWER(email) = ?").bind(email).first();

        if (patient) {
          // Safe linking: update google_id, auth_provider, email_verified
          const pic = googleProfile.picture || patient.profile_picture || "";
          await d1.prepare(
            "UPDATE users SET google_id = ?, auth_provider = 'google', email_verified = 1, profile_picture = COALESCE(profile_picture, ?), last_login_at = datetime('now'), login_count = COALESCE(login_count, 0) + 1 WHERE id = ?"
          ).bind(sub, pic, patient.id).run();
        } else {
          // C. New patient registration via Google
          const fullName = String(googleProfile.name || "").trim();
          const givenName = String(googleProfile.given_name || "").trim();
          const familyName = String(googleProfile.family_name || "").trim();
          const firstName = givenName || (fullName ? fullName.split(" ")[0] : "Patient");
          const lastName = familyName || (fullName ? fullName.split(" ").slice(1).join(" ") : "");
          const pic = googleProfile.picture || "";

          const info = await d1.prepare(
            "INSERT INTO users (first_name, last_name, email, phone, password_hash, role, google_id, profile_picture, auth_provider, email_verified, created_at, last_login_at, login_count) VALUES (?, ?, ?, '', 'google_oauth', 'patient', ?, ?, 'google', 1, datetime('now'), datetime('now'), 1)"
          ).bind(firstName, lastName, email, sub, pic).run();

          const newId = Number(info.meta?.last_row_id || 0);
          patient = {
            id: newId,
            first_name: firstName,
            last_name: lastName,
            email,
            phone: "",
            role: "patient",
            google_id: sub,
            profile_picture: pic,
          };
        }
      } else {
        // Existing Google user login
        await d1.prepare(
          "UPDATE users SET last_login_at = datetime('now'), login_count = COALESCE(login_count, 0) + 1 WHERE id = ?"
        ).bind(patient.id).run();
      }

      const sessionUser = {
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        name: `${patient.first_name} ${patient.last_name}`.trim(),
        email: patient.email,
        phone: patient.phone || "",
        role: "patient",
        picture: patient.profile_picture || googleProfile.picture || null,
        authProvider: "google",
      };

      const sessionToken = signSession(sessionUser, secret);
      res.setHeader("Set-Cookie", [
        `${COOKIE_NAME}=${sessionToken}; HttpOnly${cookieAttrs(req)}; Path=/; Max-Age=${SESSION_DAYS * 86400}`,
        `clinic_oauth_state=; HttpOnly${cookieAttrs(req)}; Path=/; Max-Age=0`,
        `clinic_oauth_state=; HttpOnly${cookieAttrs(req)}; Path=/api/auth/google; Max-Age=0`,
      ]);

      res.redirect(destination);
    } catch (err) {
      console.error("[Google OAuth Callback Error]:", err);
      res.redirect(`/auth/login?error=${encodeURIComponent("An unexpected error occurred during Google sign-in. Please try again.")}`);
    }
  });

  /* ------------------------------------------------------------- 1.1 ADMIN PROFILE & ACTIVITY LOGS */

  app.get("/api/admin/profile", requireAdmin, async (req, res) => {
    try {
      const admin = await d1.prepare("SELECT id, name, email, role, status, created_at, last_login_at, login_count FROM admins WHERE id = ?").bind(req.admin.id).first();
      if (!admin) return res.status(404).json({ error: "Admin profile not found." });
      res.json({
        profile: {
          id: admin.id,
          name: admin.name || "Dr. Kishore Kumar",
          email: admin.email,
          role: admin.role === "admin" ? "Super Admin" : admin.role,
          status: admin.status || "active",
          createdAt: admin.created_at,
          lastLoginAt: admin.last_login_at,
          loginCount: admin.login_count || 0,
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/profile", requireAdmin, async (req, res) => {
    try {
      const { name, email } = req.body || {};
      const updates = [];
      const params = [];

      if (name !== undefined) {
        const cleanName = String(name || "").trim();
        if (!cleanName || cleanName.length < 2) {
          return res.status(400).json({ error: "Please enter a valid display name (min 2 characters)." });
        }
        updates.push("name = ?");
        params.push(cleanName);
      }

      if (email !== undefined) {
        const cleanEmail = String(email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
          return res.status(400).json({ error: "Please enter a valid email address." });
        }
        const existing = await d1.prepare("SELECT id FROM admins WHERE LOWER(email) = ? AND id != ?").bind(cleanEmail, req.admin.id).first();
        if (existing) {
          return res.status(409).json({ error: "Email address is already used by another administrator." });
        }
        updates.push("email = ?");
        params.push(cleanEmail);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update." });
      }

      params.push(req.admin.id);
      await d1.prepare(`UPDATE admins SET ${updates.join(", ")} WHERE id = ?`).bind(...params).run();

      const updated = await d1.prepare("SELECT id, name, email, role, status, created_at, last_login_at, login_count FROM admins WHERE id = ?").bind(req.admin.id).first();
      await logAdminActivity(d1, req.admin.id, updated.name, "PROFILE_UPDATED", `Updated fields: ${updates.map(u => u.split(' =')[0]).join(", ")}`, req);

      res.json({
        profile: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role === "admin" ? "Super Admin" : updated.role,
          status: updated.status,
          createdAt: updated.created_at,
          lastLoginAt: updated.last_login_at,
          loginCount: updated.login_count || 0,
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/change-password", requireAdmin, async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required." });
      }
      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({ error: "New password and confirmation do not match." });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters long." });
      }

      const admin = await d1.prepare("SELECT * FROM admins WHERE id = ?").bind(req.admin.id).first();
      if (!admin || !verifyPassword(currentPassword, admin.password_hash)) {
        await logAdminActivity(d1, req.admin.id, req.admin.name, "PASSWORD_CHANGE_FAILED", "Incorrect current password", req);
        return res.status(401).json({ error: "Incorrect current password." });
      }

      const newHash = hashPassword(newPassword);
      await d1.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").bind(newHash, req.admin.id).run();
      await logAdminActivity(d1, req.admin.id, req.admin.name, "PASSWORD_CHANGED", "Administrator changed password", req);

      res.json({ success: true, message: "Password updated successfully." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/activity-logs", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
      const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

      const rows = (await d1.prepare(
        "SELECT id, admin_id, admin_name, action, details, ip_address, created_at FROM admin_activity_logs ORDER BY id DESC LIMIT ? OFFSET ?"
      ).bind(limit, offset).all()).results || [];

      const totalRow = await d1.prepare("SELECT COUNT(*) AS total FROM admin_activity_logs").first();
      const total = totalRow ? Number(totalRow.total || 0) : rows.length;

      res.json({
        logs: rows,
        total,
        limit,
        offset,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 2. DOCTORS (with R2 Profile Photo) */

  app.get("/api/doctors", async (_req, res) => {
    try {
      const rows = (await d1.prepare("SELECT * FROM doctors WHERE status = 'active' ORDER BY display_order ASC, id ASC").all()).results || [];
      const visible = rows.filter((doc) => {
        const img = String(doc.profile_image_url || doc.profile_image_key || "").trim();
        const name = String(doc.name || "").trim();
        return Boolean(img && name && !/test\s*\d+/i.test(name));
      });
      res.json({ doctors: visible });
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
      const rows = (await d1.prepare(`
        SELECT b.*, d.name as doctor_name
        FROM blocked_dates b
        LEFT JOIN doctors d ON b.doctor_id = d.id
        ORDER BY b.block_date DESC, b.id DESC
      `).all()).results || [];
      res.json({ blockedDates: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/blocked-dates", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      if (!b.block_date) return res.status(400).json({ error: "Block date (YYYY-MM-DD) is required." });
      
      let doctorId = b.doctorId || b.doctor_id ? Number(b.doctorId || b.doctor_id) : null;
      if (!doctorId && b.dentist && b.dentist !== "All dentists") {
        const doc = await d1.prepare("SELECT id FROM doctors WHERE LOWER(name) LIKE ?").bind(`%${b.dentist.toLowerCase().trim()}%`).first();
        if (doc) doctorId = doc.id;
      }

      const blockDate = String(b.block_date).trim();
      const startTime = b.start_time ? String(b.start_time).trim() : null;

      // Duplicate prevention check
      const existing = await d1.prepare(`
        SELECT id FROM blocked_dates
        WHERE block_date = ?
          AND COALESCE(doctor_id, 0) = COALESCE(?, 0)
          AND COALESCE(start_time, '') = COALESCE(?, '')
      `).bind(blockDate, doctorId, startTime).first();

      if (existing) {
        return res.status(409).json({ error: "This date and time slot is already marked as blocked." });
      }

      const info = await d1.prepare(`
        INSERT INTO blocked_dates (block_date, start_time, end_time, reason, doctor_id, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        blockDate,
        startTime,
        b.end_time ? String(b.end_time).trim() : null,
        String(b.reason || "Doctor unavailable / Holiday").trim(),
        doctorId
      ).run();
      const created = await d1.prepare(`
        SELECT b.*, d.name as doctor_name
        FROM blocked_dates b
        LEFT JOIN doctors d ON b.doctor_id = d.id
        WHERE b.id = ?
      `).bind(info.meta.last_row_id).first();

      if (req.admin) {
        await logAdminActivity(
          d1,
          req.admin.id,
          req.admin.name || "Dr. Kishore Kumar",
          "BLOCKED_DATE_ADDED",
          `Blocked date ${blockDate}${startTime ? ` from ${startTime}` : ""} (Doctor: ${created?.doctor_name || "All"})`,
          req
        );
      }

      res.status(201).json({ blockedDate: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/blocked-dates/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await d1.prepare("DELETE FROM blocked_dates WHERE id = ?").bind(id).run();
      if (req.admin) {
        await logAdminActivity(
          d1,
          req.admin.id,
          req.admin.name || "Dr. Kishore Kumar",
          "BLOCKED_DATE_REMOVED",
          `Unblocked date record #${id}`,
          req
        );
      }
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 5. APPOINTMENTS & AVAILABILITY */

  app.get("/api/availability", async (req, res) => {
    try {
      const date = String(req.query.date || "").trim();
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Date parameter is required in YYYY-MM-DD format." });
      }

      const todayIST = getTodayISTString();
      const nowIST = getNowIST();
      const currentMinutesIST = nowIST.getHours() * 60 + nowIST.getMinutes();

      // 1. Past date check in Asia/Kolkata
      if (date < todayIST) {
        return res.json({
          date,
          closed: true,
          past: true,
          reason: "Past dates cannot be booked.",
          slots: [],
        });
      }

      const doctorId = req.query.doctorId || req.query.doctor_id ? Number(req.query.doctorId || req.query.doctor_id) : null;
      const treatmentId = req.query.treatmentId || req.query.treatment_id ? Number(req.query.treatmentId || req.query.treatment_id) : null;

      // 2. Doctor status validation if specified
      if (doctorId) {
        const targetDoctor = await d1.prepare("SELECT * FROM doctors WHERE id = ?").bind(doctorId).first();
        if (!targetDoctor || targetDoctor.status !== "active") {
          return res.status(400).json({ error: "Selected doctor is not available for new bookings." });
        }
      }

      // 3. Treatment duration if specified
      let durationMinutes = 30;
      if (treatmentId) {
        const targetTreatment = await d1.prepare("SELECT * FROM treatments WHERE id = ?").bind(treatmentId).first();
        if (!targetTreatment || targetTreatment.status !== "active") {
          return res.status(400).json({ error: "Selected treatment is not available for booking." });
        }
        if (targetTreatment.duration_minutes) {
          durationMinutes = Number(targetTreatment.duration_minutes) || 30;
        }
      }

      // 4. Closed on Sundays
      const dateObj = new Date(`${date}T00:00:00`);
      if (dateObj.getDay() === 0) {
        return res.json({
          date,
          closed: true,
          reason: "Clinic is closed on Sundays.",
          slots: [],
        });
      }

      // 5. Check full-day blocks in blocked_dates (clinic-wide or doctor-specific)
      let fullBlock = null;
      if (doctorId) {
        fullBlock = await d1.prepare(`
          SELECT * FROM blocked_dates
          WHERE block_date = ? AND start_time IS NULL AND (doctor_id IS NULL OR doctor_id = 0 OR doctor_id = ?)
        `).bind(date, doctorId).first();
      } else {
        fullBlock = await d1.prepare(`
          SELECT * FROM blocked_dates
          WHERE block_date = ? AND start_time IS NULL AND (doctor_id IS NULL OR doctor_id = 0)
        `).bind(date).first();
      }

      if (fullBlock) {
        return res.json({
          date,
          closed: true,
          reason: fullBlock.reason || "Appointments are unavailable on this date.",
          slots: [],
        });
      }

      // 6. Time-range blocks in blocked_dates
      let timeBlockRows = [];
      if (doctorId) {
        timeBlockRows = (await d1.prepare(`
          SELECT * FROM blocked_dates
          WHERE block_date = ? AND start_time IS NOT NULL AND (doctor_id IS NULL OR doctor_id = 0 OR doctor_id = ?)
        `).bind(date, doctorId).all()).results || [];
      } else {
        timeBlockRows = (await d1.prepare(`
          SELECT * FROM blocked_dates
          WHERE block_date = ? AND start_time IS NOT NULL AND (doctor_id IS NULL OR doctor_id = 0)
        `).bind(date).all()).results || [];
      }

      const isTimeRangeBlocked = (slotMin, dur = 30) => {
        const slotEndMin = slotMin + dur;
        for (const b of timeBlockRows) {
          const bStart = parseTimeToMinutes(b.start_time);
          const bEnd = parseTimeToMinutes(b.end_time);
          if (bStart !== -1 && bEnd !== -1) {
            // Overlap check
            if (slotMin < bEnd && slotEndMin > bStart) {
              return true;
            }
          }
        }
        return false;
      };

      // 7. Existing active appointments
      const existingApts = (await d1.prepare(`
        SELECT appointment_time, doctor_id, treatment_id
        FROM appointments
        WHERE appointment_date = ? AND status NOT IN ('Cancelled', 'cancelled', 'Rejected', 'rejected')
      `).bind(date).all()).results || [];

      const docBookedTimes = new Set();
      const globalCountMap = {};
      for (const apt of existingApts) {
        const t = apt.appointment_time;
        globalCountMap[t] = (globalCountMap[t] || 0) + 1;
        if (doctorId && Number(apt.doctor_id) === Number(doctorId)) {
          docBookedTimes.add(t);
        }
      }

      // 8. Calculate available slots from SLOTS
      const slotsNeeded = Math.ceil(durationMinutes / 30);
      const availableSlots = [];

      for (let i = 0; i < SLOTS.length; i++) {
        const timeStr = SLOTS[i];
        const slotMin = parseTimeToMinutes(timeStr);
        if (slotMin === -1) continue;

        // Today's past time slots are strictly hidden
        if (date === todayIST && slotMin <= currentMinutesIST) {
          continue;
        }

        // Exclude slots overlapping admin-blocked time ranges
        if (isTimeRangeBlocked(slotMin, 30)) {
          continue;
        }

        // Exclude already-booked slots
        if (doctorId) {
          if (docBookedTimes.has(timeStr)) {
            continue;
          }
        } else {
          const booked = globalCountMap[timeStr] || 0;
          if (booked >= SLOT_CAPACITY) {
            continue;
          }
        }

        // Multi-slot duration verification
        if (slotsNeeded > 1) {
          let canFit = true;
          for (let j = 1; j < slotsNeeded; j++) {
            const nextIdx = i + j;
            if (nextIdx >= SLOTS.length) {
              canFit = false;
              break;
            }
            const nextTime = SLOTS[nextIdx];
            const nextMin = parseTimeToMinutes(nextTime);
            if (nextMin !== slotMin + j * 30) {
              canFit = false;
              break;
            }
            if (isTimeRangeBlocked(nextMin, 30)) {
              canFit = false;
              break;
            }
            if (doctorId && docBookedTimes.has(nextTime)) {
              canFit = false;
              break;
            }
            if (!doctorId && (globalCountMap[nextTime] || 0) >= SLOT_CAPACITY) {
              canFit = false;
              break;
            }
          }
          if (!canFit) continue;
        }

        const bookedCount = globalCountMap[timeStr] || 0;
        availableSlots.push({
          time: timeStr,
          remaining: doctorId ? 1 : Math.max(0, SLOT_CAPACITY - bookedCount),
          available: true,
        });
      }

      res.json({
        date,
        closed: availableSlots.length === 0,
        reason: availableSlots.length === 0 ? "No available appointments for this date." : "",
        slots: availableSlots,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const handleCreateAppointment = async (req, res) => {
    try {
      const b = req.body || {};
      const sessionUser = await getSessionUser(req).catch(() => null);
      const patientName = String(b.patientName || b.patient_name || sessionUser?.name || "").trim();
      const phone = String(b.patientPhone || b.phone || sessionUser?.phone || "").trim();
      const email = String(b.patientEmail || b.email || sessionUser?.email || "").trim().toLowerCase();
      const date = String(b.date || b.appointment_date || "").trim();
      const time = String(b.time || b.appointment_time || "").trim();
      const notes = String(b.notes || b.message || "").trim();

      // 1. Basic validation
      if (!patientName || patientName.length < 2) {
        return res.status(400).json({ error: "Patient name is required (at least 2 characters)." });
      }
      if (phone.replace(/\D/g, "").length < 10) {
        return res.status(400).json({ error: "A valid 10-digit mobile number is required." });
      }
      if (!date || !time) {
        return res.status(400).json({ error: "Appointment date and time are required." });
      }

      // 2. Strict IST Date & Time validation
      const todayIST = getTodayISTString();
      const nowIST = getNowIST();
      const currentMinutesIST = nowIST.getHours() * 60 + nowIST.getMinutes();

      if (date < todayIST) {
        return res.status(400).json({ error: "Past dates cannot be booked." });
      }

      const slotMin = parseTimeToMinutes(time);
      if (slotMin === -1) {
        return res.status(400).json({ error: "Invalid appointment time slot." });
      }

      if (date === todayIST && slotMin <= currentMinutesIST) {
        return res.status(400).json({ error: "Cannot book an appointment time that has already passed." });
      }

      const dateObj = new Date(`${date}T00:00:00`);
      if (dateObj.getDay() === 0) {
        return res.status(400).json({ error: "Appointments cannot be booked on Sundays as the clinic is closed." });
      }

      // 3. Dynamic Doctor validation (Must be active doctor from database)
      let doctorId = b.doctorId || b.doctor_id ? Number(b.doctorId || b.doctor_id) : null;
      let doctor = null;

      if (doctorId) {
        doctor = await d1.prepare("SELECT * FROM doctors WHERE id = ?").bind(doctorId).first();
      } else if (b.dentist) {
        const dentistQuery = String(b.dentist).split(",")[0].trim().toLowerCase();
        doctor = await d1.prepare("SELECT * FROM doctors WHERE LOWER(name) LIKE ?").bind(`%${dentistQuery}%`).first();
      }

      if (!doctor) {
        // Fallback to first active doctor
        doctor = await d1.prepare("SELECT * FROM doctors WHERE status = 'active' ORDER BY display_order ASC, id ASC").first();
      }

      if (!doctor || doctor.status !== "active") {
        return res.status(400).json({ error: "Selected doctor is not available for new bookings." });
      }
      doctorId = doctor.id;
      const dentistName = doctor.name;

      // 4. Dynamic Treatment validation (Must be active treatment from database)
      let treatmentId = b.treatmentId || b.treatment_id ? Number(b.treatmentId || b.treatment_id) : null;
      let treatment = null;

      if (treatmentId) {
        treatment = await d1.prepare("SELECT * FROM treatments WHERE id = ?").bind(treatmentId).first();
      } else if (b.service) {
        const svc = String(b.service).trim();
        treatment = await d1.prepare("SELECT * FROM treatments WHERE slug = ? OR LOWER(treatment_name) LIKE ?").bind(svc, `%${svc.replace(/-/g, " ").toLowerCase()}%`).first();
      }

      if (!treatment) {
        treatment = await d1.prepare("SELECT * FROM treatments WHERE status = 'active' ORDER BY display_order ASC, id ASC").first();
      }

      if (!treatment || treatment.status !== "active") {
        return res.status(400).json({ error: "Selected treatment is no longer active or available for booking." });
      }
      treatmentId = treatment.id;
      const serviceLabel = treatment.treatment_name;

      // 5. Blocked Date & Time check in blocked_dates
      const fullBlock = await d1.prepare(`
        SELECT * FROM blocked_dates
        WHERE block_date = ? AND start_time IS NULL AND (doctor_id IS NULL OR doctor_id = 0 OR doctor_id = ?)
      `).bind(date, doctorId).first();

      if (fullBlock) {
        return res.status(400).json({ error: `Selected date is unavailable: ${fullBlock.reason || "Appointments are unavailable on this date."}` });
      }

      const timeBlocks = (await d1.prepare(`
        SELECT * FROM blocked_dates
        WHERE block_date = ? AND start_time IS NOT NULL AND (doctor_id IS NULL OR doctor_id = 0 OR doctor_id = ?)
      `).bind(date, doctorId).all()).results || [];

      for (const tb of timeBlocks) {
        const bStart = parseTimeToMinutes(tb.start_time);
        const bEnd = parseTimeToMinutes(tb.end_time);
        if (bStart !== -1 && bEnd !== -1 && slotMin < bEnd && (slotMin + 30) > bStart) {
          return res.status(400).json({ error: `Selected time slot is unavailable: ${tb.reason || "Time slot blocked by clinic admin."}` });
        }
      }

      // 6. Conflict Prevention & Double-Booking Check
      const existingConflict = await d1.prepare(`
        SELECT id FROM appointments
        WHERE appointment_date = ? AND appointment_time = ? AND doctor_id = ?
          AND status NOT IN ('Cancelled', 'cancelled', 'Rejected', 'rejected')
      `).bind(date, time, doctorId).first();

      if (existingConflict) {
        return res.status(409).json({ error: "This doctor already has an appointment booked for this time slot. Please choose another time." });
      }

      // Also check global slot capacity
      const globalBookings = await d1.prepare(`
        SELECT COUNT(*) as count FROM appointments
        WHERE appointment_date = ? AND appointment_time = ?
          AND status NOT IN ('Cancelled', 'cancelled', 'Rejected', 'rejected')
      `).bind(date, time).first("count");

      if (globalBookings >= SLOT_CAPACITY) {
        return res.status(409).json({ error: "Please choose an available time slot. This slot is fully booked." });
      }

      // 7. Atomic Insert into appointments
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
        `• Doctor: ${dentistName}`,
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
        service: treatment.slug || String(treatmentId),
        serviceLabel,
        date,
        dateLabel: date,
        time,
        dentist: dentistName,
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

  const formatAppointmentForUser = (r) => {
    const ref = formatRef(r.id, r.appointment_date);
    const serviceLabel = r.treatment_label || "Dental Care & Checkup";
    const normalizedStatus = String(r.status || "Pending").toLowerCase();
    const statusLabel =
      normalizedStatus === "confirmed" ? "Confirmed" :
      normalizedStatus === "checked_in" ? "Checked in" :
      normalizedStatus === "cancelled" ? "Cancelled" :
      normalizedStatus === "completed" ? "Completed" : "Pending";
    const clinicMsg = `Hello Sri Saraswathi Dental Clinic, regarding my appointment (${ref}) for ${serviceLabel} on ${r.appointment_date} at ${r.appointment_time}.`;
    return {
      id: r.id,
      ref,
      patientName: r.patient_name || "Patient",
      patientPhone: r.phone || "",
      patientEmail: r.email || "",
      service: r.treatment_slug || "general-dentistry",
      serviceLabel,
      date: r.appointment_date,
      dateLabel: r.appointment_date,
      time: r.appointment_time,
      dentist: r.doctor_name || "Dr. Kishore Kumar",
      notes: r.message || "",
      status: normalizedStatus,
      statusLabel,
      createdAt: r.created_at,
      updatedAt: r.updated_at || r.created_at,
      whatsapp: {
        clinic: formatWhatsAppLink("9345743409", clinicMsg),
      },
    };
  };

  app.get("/api/bookings/mine", requireAuth, async (req, res) => {
    try {
      const userEmail = String(req.user.email || "").trim().toLowerCase();
      const phoneDigits = String(req.user.phone || "").replace(/\D/g, "").slice(-10);

      const rows = (await d1.prepare(`
        SELECT a.*, d.name as doctor_name, t.treatment_name as treatment_label, t.slug as treatment_slug
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN treatments t ON a.treatment_id = t.id
        WHERE LOWER(COALESCE(a.email, '')) = ?
           OR (? != '' AND REPLACE(REPLACE(REPLACE(COALESCE(a.phone, ''), '+', ''), ' ', ''), '-', '') LIKE ?)
        ORDER BY a.appointment_date DESC, a.id DESC
      `).bind(userEmail, phoneDigits, `%${phoneDigits}`).all()).results || [];

      res.json({ bookings: rows.map(formatAppointmentForUser) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/bookings/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT * FROM appointments WHERE id = ?").bind(id).first();
      if (!existing) return res.status(404).json({ error: "Booking not found." });

      const userEmail = String(req.user.email || "").trim().toLowerCase();
      const userDigits = String(req.user.phone || "").replace(/\D/g, "").slice(-10);
      const rowDigits = String(existing.phone || "").replace(/\D/g, "").slice(-10);
      const owns =
        req.user.role === "admin" ||
        (userEmail && String(existing.email || "").trim().toLowerCase() === userEmail) ||
        (userDigits && rowDigits && userDigits === rowDigits);

      if (!owns) return res.status(404).json({ error: "Booking not found." });

      const curStatus = String(existing.status || "").toLowerCase();
      if (curStatus === "completed" || curStatus === "cancelled") {
        return res.status(400).json({ error: "This appointment can no longer be changed. Please book a new visit." });
      }

      const b = req.body || {};
      const nextStatusRaw = b.status ? String(b.status).toLowerCase() : null;
      if (nextStatusRaw && nextStatusRaw !== "cancelled") {
        return res.status(403).json({ error: "You can only cancel an appointment here." });
      }

      const nextDate = b.date ? String(b.date).trim() : existing.appointment_date;
      const nextTime = b.time ? String(b.time).trim() : existing.appointment_time;

      if (b.date || b.time) {
        const blocked = await d1.prepare("SELECT * FROM blocked_dates WHERE block_date = ? AND start_time IS NULL").bind(nextDate).first();
        if (blocked) {
          return res.status(400).json({ error: `Selected date is unavailable: ${blocked.reason || "Clinic closed."}` });
        }
        const bookedCount = await d1.prepare(`
          SELECT COUNT(*) as count FROM appointments
          WHERE appointment_date = ? AND appointment_time = ? AND id != ?
            AND status NOT IN ('Cancelled', 'cancelled', 'Rejected', 'rejected')
        `).bind(nextDate, nextTime, id).first("count");
        if (bookedCount >= SLOT_CAPACITY) {
          return res.status(400).json({ error: "This time slot is full. Please select another slot." });
        }
      }

      const finalStatus = nextStatusRaw === "cancelled" ? "Cancelled" : (b.date || b.time ? "Pending" : existing.status);
      await d1.prepare(`
        UPDATE appointments SET appointment_date = ?, appointment_time = ?, status = ?, updated_at = datetime('now') WHERE id = ?
      `).bind(nextDate, nextTime, finalStatus, id).run();

      const updated = await d1.prepare(`
        SELECT a.*, d.name as doctor_name, t.treatment_name as treatment_label, t.slug as treatment_slug
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN treatments t ON a.treatment_id = t.id
        WHERE a.id = ?
      `).bind(id).first();

      const booking = formatAppointmentForUser(updated);
      res.json({ booking, whatsapp: booking.whatsapp });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const handleListAppointments = async (_req, res) => {
    try {
      const rows = (await d1.prepare(`
        SELECT
          a.*,
          d.name as doctor_name,
          t.treatment_name as treatment_label
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN treatments t ON a.treatment_id = t.id
        ORDER BY a.appointment_date DESC, a.id DESC
      `).all()).results || [];

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
          statusLabel:
            normalizedStatus === "confirmed" ? "Confirmed" :
            normalizedStatus === "cancelled" ? "Cancelled" :
            normalizedStatus === "rejected" ? "Rejected" :
            normalizedStatus === "completed" ? "Completed" : "Pending",
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

      // If confirming, check for double booking on that doctor
      if (String(newStatus).toLowerCase() === "confirmed") {
        const conflict = await d1.prepare(`
          SELECT id FROM appointments
          WHERE appointment_date = ? AND appointment_time = ? AND doctor_id = ? AND id != ?
            AND status IN ('Confirmed', 'confirmed')
        `).bind(newDate, newTime, newDoctorId, id).first();
        if (conflict) {
          return res.status(409).json({ error: "This doctor already has a confirmed appointment for this time slot." });
        }
      }

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
        statusLabel:
          normalizedStatus === "confirmed" ? "Confirmed" :
          normalizedStatus === "cancelled" ? "Cancelled" :
          normalizedStatus === "rejected" ? "Rejected" :
          normalizedStatus === "completed" ? "Completed" : "Pending",
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        whatsapp: {
          patient: formatWhatsAppLink(updated.phone, statusMsg),
        },
      };

      if (req.admin) {
        await logAdminActivity(
          d1,
          req.admin.id,
          req.admin.name || "Dr. Kishore Kumar",
          "APPOINTMENT_UPDATED",
          `Appointment #${id} (${updated.patient_name || "Patient"}) status: ${existing.status} -> ${newStatus} (${updated.appointment_date} ${updated.appointment_time})`,
          req
        );
      }

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
      if (req.admin) {
        await logAdminActivity(
          d1,
          req.admin.id,
          req.admin.name || "Dr. Kishore Kumar",
          "APPOINTMENT_DELETED",
          `Appointment #${id} deleted`,
          req
        );
      }
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- UNIFIED SITE CONTENT HELPERS */

  const SITE_CONTENT_TYPES = [
    "hero",
    "blog",
    "offer",
    "gallery",
    "reel",
    "video",
    "image",
    "badge",
    "treatment",
    "doctor",
    "achievement",
    "testimonial",
    "before_after",
    "google_review",
  ];

  const getTodayIsoIST = () =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const parseBool = (val, fallback) => {
    if (val === undefined || val === null) return fallback;
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    const s = String(val).trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no" || s === "") return false;
    return fallback;
  };

  const computeReadTime = (body) => {
    const words = String(body || "")
      .replace(/<[^>]*>/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  const deleteUnreferencedR2Media = async (urls, excludeContentId = null) => {
    const keys = Array.from(new Set(urls.map(extractR2KeyFromUrl).filter(Boolean)));
    for (const key of keys) {
      const mediaPath = `/api/media/${key}`;
      const fullUrl = getR2PublicUrl(key);
      const sql = excludeContentId
        ? `SELECT id FROM site_content
           WHERE id != ?
             AND (media_url IN (?, ?) OR mobile_media_url IN (?, ?) OR logo_url IN (?, ?) OR before_image IN (?, ?) OR after_image IN (?, ?))
           LIMIT 1`
        : `SELECT id FROM site_content
           WHERE media_url IN (?, ?) OR mobile_media_url IN (?, ?) OR logo_url IN (?, ?) OR before_image IN (?, ?) OR after_image IN (?, ?)
           LIMIT 1`;
      const params = excludeContentId
        ? [excludeContentId, mediaPath, fullUrl, mediaPath, fullUrl, mediaPath, fullUrl, mediaPath, fullUrl, mediaPath, fullUrl]
        : [mediaPath, fullUrl, mediaPath, fullUrl, mediaPath, fullUrl, mediaPath, fullUrl, mediaPath, fullUrl];
      const stillUsed = await d1.prepare(sql).bind(...params).first();
      if (!stillUsed) {
        await safeDeleteR2File(r2, key);
      }
    }
  };

  const uniqueSiteContentSlug = async (type, rawSlugOrTitle, excludeId = null) => {
    const base =
      String(rawSlugOrTitle || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `${type}-${Date.now().toString(36)}`;
    let candidate = base;
    let suffix = 1;
    while (true) {
      const existing = excludeId
        ? await d1.prepare("SELECT id FROM site_content WHERE type = ? AND slug = ? AND id != ?").bind(type, candidate, excludeId).first()
        : await d1.prepare("SELECT id FROM site_content WHERE type = ? AND slug = ?").bind(type, candidate).first();
      if (!existing) return candidate;
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
  };

  const serializeSiteContent = (row) => {
    const mediaUrl = row.media_url || "";
    const mobileMediaUrl = row.mobile_media_url || "";
    const beforeImage = row.before_image || "";
    const afterImage = row.after_image || "";
    const excerpt = row.excerpt || "";
    const body = row.body || "";
    const displayOrder = Number(row.display_order || 0);
    return {
      id: Number(row.id),
      type: row.type,
      slug: row.slug || "",
      title: row.title || "",
      subtitle: row.subtitle || "",
      category: row.category || "",
      author: row.author || "",
      excerpt,
      body,
      mediaUrl,
      mobileMediaUrl,
      logoUrl: row.logo_url || "",
      beforeImage,
      afterImage,
      linkUrl: row.link_url || "",
      ctaLabel: row.cta_label || "",
      secondaryCtaLabel: row.secondary_cta_label || "",
      secondaryCtaUrl: row.secondary_cta_url || "",
      badgeText: row.badge_text || "",
      ratingScore: row.rating_score || "",
      ratingVerified: Boolean(row.rating_verified),
      reviewCount: row.review_count || "",
      trustBadgeText: row.trust_badge_text || "",
      startDate: row.start_date || "",
      endDate: row.end_date || "",
      publishedAt: row.published_at || row.created_at || "",
      seoTitle: row.seo_title || "",
      seoDescription: row.seo_description || "",
      price: Number(row.price || 0),
      sessions: row.sessions || "",
      duration: row.duration || "",
      availableForBooking: row.available_for_booking !== undefined ? Boolean(row.available_for_booking) : true,
      qualification: row.qualification || "",
      specialization: row.specialization || "",
      yearsExperience: row.years_experience || "",
      registrationNumber: row.registration_number || "",
      phone: row.phone || "",
      email: row.email || "",
      homepageHighlight: Boolean(row.homepage_highlight),
      patientConsent: Boolean(row.patient_consent),
      published: Boolean(row.published),
      displayOrder,
      description: excerpt,
      content: body,
      readTime: computeReadTime(body || excerpt),
      media_url: mediaUrl,
      coverImage: mediaUrl,
      coverImageUrl: mediaUrl,
      cover_image: mediaUrl,
      thumbnail: mobileMediaUrl || mediaUrl,
      before_image: beforeImage,
      after_image: afterImage,
      display_order: displayOrder,
      fileSize: Number(row.file_size || 0),
      mimeType: row.mime_type || "",
      featured: String(row.badge_text || "").trim().toLowerCase() === "featured",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
    };
  };

  const normalizeSiteContentInput = (b, existing = null, resolvedType = null) => {
    const pickStr = (value, existingVal = "") =>
      value !== undefined ? String(value ?? "").trim() : String(existingVal ?? "");

    const type = resolvedType || existing?.type || String(b.type || "").trim();
    const mediaRaw = b.mediaUrl ?? b.media_url ?? b.coverImage ?? b.cover_image ?? b.image_url;
    const mobileRaw = b.mobileMediaUrl ?? b.mobile_media_url ?? b.thumbnail;
    const beforeRaw = b.beforeImage ?? b.before_image ?? b.before_image_url;
    const afterRaw = b.afterImage ?? b.after_image ?? b.after_image_url;
    const excerptRaw = b.excerpt ?? b.description ?? b.short_description;
    const bodyRaw = b.body ?? b.content ?? b.full_description;
    const displayRaw = b.displayOrder ?? b.display_order;

    return {
      type,
      title: pickStr(b.title ?? b.name ?? b.treatment_name, existing?.title || ""),
      subtitle: pickStr(b.subtitle, existing?.subtitle || ""),
      category: pickStr(b.category, existing?.category || ""),
      author: pickStr(b.author, existing?.author || ""),
      excerpt: pickStr(excerptRaw, existing?.excerpt || ""),
      body: bodyRaw !== undefined ? String(bodyRaw ?? "") : String(existing?.body ?? ""),
      mediaUrl: pickStr(mediaRaw, existing?.media_url || ""),
      mobileMediaUrl: pickStr(mobileRaw, existing?.mobile_media_url || ""),
      logoUrl: pickStr(b.logoUrl ?? b.logo_url, existing?.logo_url || ""),
      beforeImage: pickStr(beforeRaw, existing?.before_image || ""),
      afterImage: pickStr(afterRaw, existing?.after_image || ""),
      linkUrl: pickStr(b.linkUrl ?? b.link_url, existing?.link_url || ""),
      ctaLabel: pickStr(b.ctaLabel ?? b.cta_label, existing?.cta_label || ""),
      secondaryCtaLabel: pickStr(b.secondaryCtaLabel ?? b.secondary_cta_label, existing?.secondary_cta_label || ""),
      secondaryCtaUrl: pickStr(b.secondaryCtaUrl ?? b.secondary_cta_url, existing?.secondary_cta_url || ""),
      badgeText: pickStr(b.badgeText ?? b.badge_text, existing?.badge_text || ""),
      ratingScore: pickStr(b.ratingScore ?? b.rating_score, existing?.rating_score || ""),
      ratingVerified: parseBool(b.ratingVerified ?? b.rating_verified, existing ? Boolean(existing.rating_verified) : false),
      reviewCount: pickStr(b.reviewCount ?? b.review_count, existing?.review_count || ""),
      trustBadgeText: pickStr(b.trustBadgeText ?? b.trust_badge_text, existing?.trust_badge_text || ""),
      startDate: pickStr(b.startDate ?? b.start_date, existing?.start_date || ""),
      endDate: pickStr(b.endDate ?? b.end_date, existing?.end_date || ""),
      publishedAt: pickStr(b.publishedAt ?? b.published_at, existing?.published_at || ""),
      seoTitle: pickStr(b.seoTitle ?? b.seo_title, existing?.seo_title || ""),
      seoDescription: pickStr(b.seoDescription ?? b.seo_description, existing?.seo_description || ""),
      price: b.price !== undefined ? Math.max(0, Number(b.price) || 0) : Number(existing?.price || 0),
      sessions: pickStr(b.sessions, existing?.sessions || ""),
      duration: pickStr(b.duration, existing?.duration || ""),
      availableForBooking: parseBool(
        b.availableForBooking ?? b.available_for_booking,
        existing ? Boolean(existing.available_for_booking) : true
      ),
      qualification: pickStr(b.qualification, existing?.qualification || ""),
      specialization: pickStr(b.specialization, existing?.specialization || ""),
      yearsExperience: pickStr(b.yearsExperience ?? b.years_experience ?? b.experience, existing?.years_experience || ""),
      registrationNumber: pickStr(b.registrationNumber ?? b.registration_number, existing?.registration_number || ""),
      phone: pickStr(b.phone, existing?.phone || ""),
      email: pickStr(b.email, existing?.email || ""),
      homepageHighlight: parseBool(
        b.homepageHighlight ?? b.homepage_highlight,
        existing ? Boolean(existing.homepage_highlight) : (type === "hero" || type === "reel" || type === "video")
      ),
      patientConsent: parseBool(
        b.patientConsent ?? b.patient_consent,
        existing ? Boolean(existing.patient_consent) : false
      ),
      published: parseBool(
        b.published,
        existing ? Boolean(existing.published) : true
      ),
      displayOrder: displayRaw !== undefined ? Number(displayRaw) || 0 : Number(existing?.display_order || 0),
      fileSize:
        b.fileSize !== undefined || b.file_size !== undefined
          ? Math.max(0, Number(b.fileSize ?? b.file_size) || 0)
          : Math.max(0, Number(existing?.file_size || 0)),
      mimeType: pickStr(b.mimeType ?? b.mime_type, existing?.mime_type || ""),
    };
  };

  const syncSiteContentToLegacyTables = async (row) => {
    try {
      const legacyTable = row.legacy_table || "";
      const legacyId = row.legacy_id ? Number(row.legacy_id) : null;
      const setLegacyRef = async (tbl, id) => {
        if (row.legacy_table !== tbl || Number(row.legacy_id) !== Number(id)) {
          await d1
            .prepare("UPDATE site_content SET legacy_table = ?, legacy_id = ? WHERE id = ?")
            .bind(tbl, id, row.id)
            .run();
        }
      };

      if (row.type === "doctor") {
        const status = row.published ? "active" : "inactive";
        const key = extractR2KeyFromUrl(row.media_url) || null;
        if (legacyTable === "doctors" && legacyId) {
          await d1.prepare(`
            UPDATE doctors SET
              name = ?, qualification = ?, specialization = ?, experience = ?, biography = ?,
              profile_image_key = ?, profile_image_url = ?, status = ?, display_order = ?, updated_at = datetime('now')
            WHERE id = ?
          `).bind(
            row.title || "Doctor",
            row.qualification || "",
            row.specialization || row.subtitle || "",
            row.years_experience || "",
            row.body || row.excerpt || "",
            key,
            row.media_url || "",
            status,
            Number(row.display_order || 0),
            legacyId
          ).run();
        } else {
          const info = await d1.prepare(`
            INSERT INTO doctors (name, qualification, specialization, experience, biography, profile_image_key, profile_image_url, status, display_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(
            row.title || "Doctor",
            row.qualification || "",
            row.specialization || row.subtitle || "",
            row.years_experience || "",
            row.body || row.excerpt || "",
            key,
            row.media_url || "",
            status,
            Number(row.display_order || 0)
          ).run();
          await setLegacyRef("doctors", info.meta.last_row_id);
        }
      } else if (row.type === "treatment") {
        const status = row.published ? "active" : "inactive";
        const key = extractR2KeyFromUrl(row.media_url) || null;
        if (legacyTable === "treatments" && legacyId) {
          await d1.prepare(`
            UPDATE treatments SET
              treatment_name = ?, slug = ?, short_description = ?, full_description = ?,
              treatment_image_key = ?, treatment_image_url = ?, status = ?, display_order = ?, updated_at = datetime('now')
            WHERE id = ?
          `).bind(
            row.title || "Treatment",
            row.slug,
            row.excerpt || "",
            row.body || "",
            key,
            row.media_url || "",
            status,
            Number(row.display_order || 0),
            legacyId
          ).run();
        } else {
          let treatmentSlug = row.slug;
          const dup = await d1.prepare("SELECT id FROM treatments WHERE slug = ?").bind(treatmentSlug).first();
          if (dup) treatmentSlug = `${row.slug}-${row.id}`;
          const info = await d1.prepare(`
            INSERT INTO treatments (treatment_name, slug, short_description, full_description, benefits, treatment_image_key, treatment_image_url, status, display_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, '[]', ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(
            row.title || "Treatment",
            treatmentSlug,
            row.excerpt || "",
            row.body || "",
            key,
            row.media_url || "",
            status,
            Number(row.display_order || 0)
          ).run();
          await setLegacyRef("treatments", info.meta.last_row_id);
        }
      } else if (row.type === "blog") {
        const status = row.published ? "published" : "draft";
        const key = extractR2KeyFromUrl(row.media_url) || null;
        if (legacyTable === "blogs" && legacyId) {
          await d1.prepare(`
            UPDATE blogs SET
              title = ?, slug = ?, category = ?, description = ?, content = ?,
              cover_image_key = ?, cover_image_url = ?, status = ?, published_at = ?, updated_at = datetime('now')
            WHERE id = ?
          `).bind(
            row.title || "Article",
            row.slug,
            row.category || "Dental Health",
            row.excerpt || "",
            row.body || "",
            key,
            row.media_url || "",
            status,
            row.published_at || row.created_at || new Date().toISOString(),
            legacyId
          ).run();
        } else {
          let blogSlug = row.slug;
          const dup = await d1.prepare("SELECT id FROM blogs WHERE slug = ?").bind(blogSlug).first();
          if (dup) blogSlug = `${row.slug}-${row.id}`;
          const info = await d1.prepare(`
            INSERT INTO blogs (title, slug, category, description, content, cover_image_key, cover_image_url, status, published_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(
            row.title || "Article",
            blogSlug,
            row.category || "Dental Health",
            row.excerpt || "",
            row.body || "",
            key,
            row.media_url || "",
            status,
            row.published_at || new Date().toISOString()
          ).run();
          await setLegacyRef("blogs", info.meta.last_row_id);
        }
      } else if (row.type === "image") {
        const status = row.published ? "active" : "inactive";
        const key = extractR2KeyFromUrl(row.media_url) || null;
        if (legacyTable === "gallery" && legacyId) {
          await d1.prepare(`
            UPDATE gallery SET
              title = ?, description = ?, image_key = ?, image_url = ?, category = ?, status = ?, display_order = ?
            WHERE id = ?
          `).bind(
            row.title || "Clinic Photo",
            row.excerpt || "",
            key,
            row.media_url || "",
            row.category || "Clinic",
            status,
            Number(row.display_order || 0),
            legacyId
          ).run();
        } else {
          const info = await d1.prepare(`
            INSERT INTO gallery (title, description, image_key, image_url, category, status, display_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            row.title || "Clinic Photo",
            row.excerpt || "",
            key,
            row.media_url || "",
            row.category || "Clinic",
            status,
            Number(row.display_order || 0)
          ).run();
          await setLegacyRef("gallery", info.meta.last_row_id);
        }
      } else if (row.type === "gallery") {
        const status = row.published && row.patient_consent ? "active" : "inactive";
        const bKey = extractR2KeyFromUrl(row.before_image) || null;
        const aKey = extractR2KeyFromUrl(row.after_image) || null;
        if (legacyTable === "before_after" && legacyId) {
          await d1.prepare(`
            UPDATE before_after SET
              title = ?, description = ?, before_image_key = ?, before_image_url = ?, after_image_key = ?, after_image_url = ?, status = ?
            WHERE id = ?
          `).bind(
            row.title || "Smile Transformation",
            row.excerpt || "",
            bKey,
            row.before_image || "",
            aKey,
            row.after_image || "",
            status,
            legacyId
          ).run();
        } else {
          const info = await d1.prepare(`
            INSERT INTO before_after (title, description, before_image_key, before_image_url, after_image_key, after_image_url, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            row.title || "Smile Transformation",
            row.excerpt || "",
            bKey,
            row.before_image || "",
            aKey,
            row.after_image || "",
            status
          ).run();
          await setLegacyRef("before_after", info.meta.last_row_id);
        }
      } else if (row.type === "reel" || row.type === "video") {
        const status = row.published ? "active" : "inactive";
        const vKey = extractR2KeyFromUrl(row.media_url) || null;
        const tKey = extractR2KeyFromUrl(row.mobile_media_url) || null;
        const fileSize = Math.max(0, Number(row.file_size || 0));
        if (legacyTable === "reels" && legacyId) {
          await d1.prepare(`
            UPDATE reels SET
              title = ?, description = ?, video_key = ?, video_url = ?, thumbnail_key = ?, thumbnail_url = ?,
              homepage_visibility = ?, status = ?, display_order = ?, file_size = ?
            WHERE id = ?
          `).bind(
            row.title || "Dental Reel",
            row.excerpt || "",
            vKey,
            row.media_url || "",
            tKey,
            row.mobile_media_url || "",
            row.homepage_highlight ? 1 : 0,
            status,
            Number(row.display_order || 0),
            fileSize,
            legacyId
          ).run();
        } else {
          const info = await d1.prepare(`
            INSERT INTO reels (title, description, video_key, video_url, thumbnail_key, thumbnail_url, homepage_visibility, status, display_order, file_size, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            row.title || "Dental Reel",
            row.excerpt || "",
            vKey,
            row.media_url || "",
            tKey,
            row.mobile_media_url || "",
            row.homepage_highlight ? 1 : 0,
            status,
            Number(row.display_order || 0),
            fileSize
          ).run();
          await setLegacyRef("reels", info.meta.last_row_id);
        }
      } else if (row.type === "offer") {
        const status = row.published ? "active" : "inactive";
        const imgKey = extractR2KeyFromUrl(row.media_url) || null;
        if (legacyTable === "offers" && legacyId) {
          await d1.prepare(`
            UPDATE offers SET
              title = ?, description = ?, image_key = ?, image_url = ?, start_date = ?, end_date = ?, homepage_visibility = ?, status = ?
            WHERE id = ?
          `).bind(
            row.title || "Offer",
            row.excerpt || "",
            imgKey,
            row.media_url || "",
            row.start_date || null,
            row.end_date || null,
            row.homepage_highlight ? 1 : 0,
            status,
            legacyId
          ).run();
        } else {
          const info = await d1.prepare(`
            INSERT INTO offers (title, description, image_key, image_url, start_date, end_date, homepage_visibility, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            row.title || "Offer",
            row.excerpt || "",
            imgKey,
            row.media_url || "",
            row.start_date || null,
            row.end_date || null,
            row.homepage_highlight ? 1 : 0,
            status
          ).run();
          await setLegacyRef("offers", info.meta.last_row_id);
        }
      }
    } catch (syncErr) {
      console.warn("Legacy table sync notice:", syncErr?.message || syncErr);
    }
  };

  const syncLegacyDeletion = async (row) => {
    const allowedTables = new Set(["doctors", "treatments", "blogs", "gallery", "before_after", "reels", "offers"]);
    const table = row.legacy_table;
    const legacyId = Number(row.legacy_id);
    if (!table || !legacyId || !allowedTables.has(table)) return;
    try {
      await d1.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(legacyId).run();
    } catch (err) {
      // Preserve referential integrity if existing appointments reference this doctor or treatment
      if (table === "doctors" || table === "treatments") {
        await d1.prepare(`UPDATE ${table} SET status = 'inactive' WHERE id = ?`).bind(legacyId).run().catch(() => null);
      } else {
        console.warn("Legacy delete notice:", err?.message || err);
      }
    }
  };

  /* ------------------------------------------------------------- 6. BLOGS (with R2 Cover Image) */

  const handleGetBlogs = async (_req, res) => {
    try {
      const rows = (
        await d1
          .prepare(
            "SELECT * FROM site_content WHERE type = 'blog' AND published = 1 ORDER BY CASE WHEN published_at != '' THEN published_at ELSE created_at END DESC, id DESC"
          )
          .all()
      ).results || [];
      const formatted = rows.map(serializeSiteContent);
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
      const row = await d1
        .prepare("SELECT * FROM site_content WHERE type = 'blog' AND slug = ? AND published = 1")
        .bind(slug)
        .first();
      if (!row) return res.status(404).json({ error: "Blog not found." });
      const formatted = serializeSiteContent(row);
      const relatedRows =
        (
          await d1
            .prepare("SELECT * FROM site_content WHERE type = 'blog' AND published = 1 AND id != ? ORDER BY id DESC LIMIT 3")
            .bind(row.id)
            .all()
        ).results || [];
      res.json({ blog: formatted, item: formatted, related: relatedRows.map(serializeSiteContent) });
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

      const title = String(b.title || "").trim();
      const description = String(b.description || "").trim();
      const category = String(b.category || "clinic").trim();
      const status = b.status === "inactive" ? "inactive" : "active";
      const displayOrder = Number(b.display_order || 0);

      const info = await d1.prepare(`
        INSERT INTO gallery (title, description, image_key, image_url, category, status, display_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(title, description, imageKey, imageUrl, category, status, displayOrder).run();
      const created = await d1.prepare("SELECT * FROM gallery WHERE id = ?").bind(info.meta.last_row_id).first();

      const slug = await uniqueSiteContentSlug("image", title || `image-${info.meta.last_row_id}`);
      await d1.prepare(`
        INSERT INTO site_content (
          type, slug, title, category, excerpt, media_url,
          homepage_highlight, published, display_order, legacy_table, legacy_id, created_at, updated_at
        ) VALUES ('image', ?, ?, ?, ?, ?, 1, ?, ?, 'gallery', ?, datetime('now'), datetime('now'))
      `).bind(
        slug,
        title || "Clinic Photo",
        category,
        description,
        imageUrl,
        status === "inactive" ? 0 : 1,
        displayOrder,
        info.meta.last_row_id
      ).run().catch(() => null);

      res.status(201).json({ gallery: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/gallery/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT image_key, image_url FROM gallery WHERE id = ?").bind(id).first();
      await d1.prepare("DELETE FROM site_content WHERE legacy_table = 'gallery' AND legacy_id = ?").bind(id).run();
      await d1.prepare("DELETE FROM gallery WHERE id = ?").bind(id).run();
      const urls = [];
      if (existing?.image_url) urls.push(existing.image_url);
      if (existing?.image_key) urls.push(getR2PublicUrl(existing.image_key));
      if (urls.length) await deleteUnreferencedR2Media(urls);
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 8. BEFORE & AFTER (with R2 Before/After Images) */

  app.get("/api/before-after", async (_req, res) => {
    try {
      const rows = (await d1.prepare(`
        SELECT
          a.*,
          d.name as doctor_name,
          t.treatment_name as treatment_label
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN treatments t ON a.treatment_id = t.id
        ORDER BY a.appointment_date DESC, a.id DESC
      `).all()).results || [];
      res.json({ showcases: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/before-after", requireAdmin, async (_req, res) => {
    try {
      const rows = (await d1.prepare(`
        SELECT
          a.*,
          d.name as doctor_name,
          t.treatment_name as treatment_label
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN treatments t ON a.treatment_id = t.id
        ORDER BY a.appointment_date DESC, a.id DESC
      `).all()).results || [];
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

  app.get("/api/before-after/settings", async (_req, res) => {
    try {
      res.json({ settings: await getBeforeAfterSectionSettings() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/before-after/settings", requireAdmin, async (_req, res) => {
    try {
      res.json({ settings: await getBeforeAfterSectionSettings() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/before-after/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await saveBeforeAfterSectionSettings(req.body || {});
      res.json({ ok: true, settings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 9. REELS (with R2 Video & Thumbnail) */

  app.get("/api/reels/settings", async (_req, res) => {
    try {
      res.json({ settings: await getReelsSectionSettings() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/reels/storage", requireAdmin, async (_req, res) => {
    try {
      const [storage, settings] = await Promise.all([
        getReelsStorageUsage(),
        getReelsSectionSettings(),
      ]);
      res.json({ storage, settings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/reels/settings", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const settings = await saveReelsSectionSettings({
        enabled: b.enabled,
        heading: b.heading,
        subtitle: b.subtitle,
      });
      res.json({ settings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/reels/reorder", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const orders = Array.isArray(b.orders)
        ? b.orders
            .map((entry) => ({
              id: Number(entry?.id),
              displayOrder: Number(entry?.displayOrder ?? entry?.display_order ?? 0),
            }))
            .filter((entry) => Number.isFinite(entry.id) && entry.id > 0)
        : Array.isArray(b.orderedIds)
          ? b.orderedIds
              .map((rawId, idx) => ({ id: Number(rawId), displayOrder: idx }))
              .filter((entry) => Number.isFinite(entry.id) && entry.id > 0)
          : [];

      if (orders.length === 0) {
        return res.status(400).json({ error: "Provide at least one item order to update." });
      }

      for (const entry of orders) {
        await d1
          .prepare("UPDATE site_content SET display_order = ?, updated_at = datetime('now') WHERE id = ? AND type IN ('reel', 'video')")
          .bind(entry.displayOrder, entry.id)
          .run();
        const row = await d1
          .prepare("SELECT legacy_table, legacy_id FROM site_content WHERE id = ?")
          .bind(entry.id)
          .first();
        if (row?.legacy_table === "reels" && row?.legacy_id) {
          await d1
            .prepare("UPDATE reels SET display_order = ? WHERE id = ?")
            .bind(entry.displayOrder, Number(row.legacy_id))
            .run();
        }
      }

      const rows =
        (
          await d1
            .prepare("SELECT * FROM site_content WHERE type IN ('reel', 'video') ORDER BY display_order ASC, id DESC")
            .all()
        ).results || [];
      res.json({ ok: true, items: rows.map(serializeSiteContent) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/reels", async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
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

  /* ------------------------------------------------------------- 11b. THEME COLOUR SETTINGS */

  app.get("/api/theme-colors", async (_req, res) => {
    try {
      res.json({ colors: await getThemeColors() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/theme-colors", requireAdmin, async (_req, res) => {
    try {
      res.json({ colors: await getThemeColors() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/theme-colors", requireAdmin, async (req, res) => {
    try {
      const colors = await saveThemeColors(req.body || {});
      res.json({ ok: true, colors });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/theme-colors/reset", requireAdmin, async (_req, res) => {
    try {
      await d1
        .prepare(
          `INSERT INTO d1_meta (key, value, updated_at)
           VALUES ('theme_colors', ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
        )
        .bind(JSON.stringify(DEFAULT_THEME_COLORS))
        .run();
      res.json({ ok: true, colors: { ...DEFAULT_THEME_COLORS } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- UNIFIED CMS CONTENT API (/api/admin/content & /api/content) */

  app.get("/api/admin/content", requireAdmin, async (req, res) => {
    try {
      const type = req.query.type ? String(req.query.type).trim() : "";
      if (type && !SITE_CONTENT_TYPES.includes(type)) {
        return res.status(400).json({ error: "Invalid content type." });
      }

      if (type === "reel" || type === "video") {
        const storage = await getReelsStorageUsage();
        const [rowsRes, settings] = await Promise.all([
          d1.prepare("SELECT * FROM site_content WHERE type IN ('reel', 'video') ORDER BY display_order ASC, id DESC").all(),
          getReelsSectionSettings(),
        ]);
        const rows = rowsRes.results || [];
        return res.json({
          items: rows.map(serializeSiteContent),
          storage,
          reelsSettings: settings,
        });
      }

      const rows = type
        ? (await d1.prepare("SELECT * FROM site_content WHERE type = ? ORDER BY display_order ASC, id DESC").bind(type).all()).results || []
        : (await d1.prepare("SELECT * FROM site_content ORDER BY display_order ASC, id DESC").all()).results || [];
      res.json({ items: rows.map(serializeSiteContent) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/content", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const type = String(b.type || "").trim();
      if (!type || !SITE_CONTENT_TYPES.includes(type)) {
        return res.status(400).json({ error: "Valid content type is required." });
      }

      const data = normalizeSiteContentInput(b, null, type);
      if (b.featured !== undefined && b.badgeText === undefined && b.badge_text === undefined) {
        data.badgeText = parseBool(b.featured) ? "Featured" : "";
      }

      if (!data.title && !data.mediaUrl && !data.beforeImage && !data.afterImage) {
        return res.status(400).json({ error: "Please enter a title or upload media." });
      }
      if (data.published && (type === "gallery" || type === "testimonial") && !data.patientConsent) {
        return res.status(400).json({ error: "Patient consent is required before publishing this entry." });
      }

      const isReelType = type === "reel" || type === "video";
      if (isReelType) {
        if (!data.mediaUrl) {
          return res.status(400).json({ error: "Please upload a video file." });
        }
        const resolved = await resolveVideoObjectMeta(data.mediaUrl, data.fileSize, data.mimeType);
        data.fileSize = resolved.fileSize;
        data.mimeType = resolved.mimeType;

        const quota = await checkReelsQuota(data.fileSize);
        if (!quota.ok) {
          if (data.mediaUrl) {
            await deleteUnreferencedR2Media([data.mediaUrl], null).catch(() => {});
          }
          return res.status(413).json({
            error: quota.error,
            code: "STORAGE_QUOTA_EXCEEDED",
            storage: quota.storage,
          });
        }
      }

      const slug = await uniqueSiteContentSlug(type, b.slug || data.title || type);
      const publishedAt = data.publishedAt || (data.published ? new Date().toISOString() : "");

      const info = await d1.prepare(`
        INSERT INTO site_content (
          type, slug, title, subtitle, category, author, excerpt, body,
          media_url, mobile_media_url, logo_url, before_image, after_image,
          link_url, cta_label, secondary_cta_label, secondary_cta_url,
          badge_text, rating_score, rating_verified, review_count, trust_badge_text,
          start_date, end_date, published_at, seo_title, seo_description,
          price, sessions, duration, available_for_booking,
          qualification, specialization, years_experience, registration_number,
          phone, email, homepage_highlight, patient_consent, published, display_order,
          file_size, mime_type,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?,
          datetime('now'), datetime('now')
        )
      `).bind(
        type,
        slug,
        data.title,
        data.subtitle,
        data.category,
        data.author,
        data.excerpt,
        data.body,
        data.mediaUrl,
        data.mobileMediaUrl,
        data.logoUrl,
        data.beforeImage,
        data.afterImage,
        data.linkUrl,
        data.ctaLabel,
        data.secondaryCtaLabel,
        data.secondaryCtaUrl,
        data.badgeText,
        data.ratingScore,
        data.ratingVerified ? 1 : 0,
        data.reviewCount,
        data.trustBadgeText,
        data.startDate,
        data.endDate,
        publishedAt,
        data.seoTitle,
        data.seoDescription,
        data.price,
        data.sessions,
        data.duration,
        data.availableForBooking ? 1 : 0,
        data.qualification,
        data.specialization,
        data.yearsExperience,
        data.registrationNumber,
        data.phone,
        data.email,
        data.homepageHighlight ? 1 : 0,
        data.patientConsent ? 1 : 0,
        data.published ? 1 : 0,
        data.displayOrder,
        data.fileSize,
        data.mimeType
      ).run();

      const created = await d1.prepare("SELECT * FROM site_content WHERE id = ?").bind(info.meta.last_row_id).first();
      await syncSiteContentToLegacyTables(created);
      const finalRow = await d1.prepare("SELECT * FROM site_content WHERE id = ?").bind(info.meta.last_row_id).first();
      const storage = isReelType ? await getReelsStorageUsage() : undefined;
      res.status(201).json({ item: serializeSiteContent(finalRow || created), ...(storage ? { storage } : {}) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/content/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid content ID." });
      }
      const existing = await d1.prepare("SELECT * FROM site_content WHERE id = ?").bind(id).first();
      if (!existing) {
        return res.status(404).json({ error: "Content entry not found." });
      }

      const b = req.body || {};
      const type =
        b.type && SITE_CONTENT_TYPES.includes(String(b.type).trim())
          ? String(b.type).trim()
          : existing.type;
      const data = normalizeSiteContentInput(b, existing, type);
      if (b.featured !== undefined && b.badgeText === undefined && b.badge_text === undefined) {
        data.badgeText = parseBool(b.featured)
          ? "Featured"
          : String(existing.badge_text || "").toLowerCase() === "featured"
            ? ""
            : existing.badge_text || "";
      }

      if (!data.title && !data.mediaUrl && !data.beforeImage && !data.afterImage) {
        return res.status(400).json({ error: "Please enter a title or upload media." });
      }
      if (data.published && (type === "gallery" || type === "testimonial") && !data.patientConsent) {
        return res.status(400).json({ error: "Patient consent is required before publishing this entry." });
      }

      const isReelType = type === "reel" || type === "video";
      if (isReelType) {
        if (!data.mediaUrl) {
          return res.status(400).json({ error: "Please upload a video file." });
        }
        const mediaChanged = data.mediaUrl !== existing.media_url;
        if (mediaChanged || !existing.file_size || b.fileSize !== undefined || b.file_size !== undefined) {
          const resolved = await resolveVideoObjectMeta(data.mediaUrl, data.fileSize, data.mimeType);
          data.fileSize = resolved.fileSize;
          if (resolved.mimeType) data.mimeType = resolved.mimeType;
        }
        const quota = await checkReelsQuota(data.fileSize, { excludeContentId: id });
        if (!quota.ok) {
          if (mediaChanged && data.mediaUrl) {
            await deleteUnreferencedR2Media([data.mediaUrl], id).catch(() => {});
          }
          return res.status(413).json({
            error: quota.error,
            code: "STORAGE_QUOTA_EXCEEDED",
            storage: quota.storage,
          });
        }
      }

      const rawSlug = b.slug !== undefined ? String(b.slug).trim() : "";
      const slug =
        (rawSlug && rawSlug !== existing.slug) || type !== existing.type
          ? await uniqueSiteContentSlug(type, rawSlug || data.title || type, id)
          : existing.slug;
      const publishedAt = data.publishedAt || (data.published ? new Date().toISOString() : "");

      const replacedUrls = [];
      if (existing.media_url && existing.media_url !== data.mediaUrl) replacedUrls.push(existing.media_url);
      if (existing.mobile_media_url && existing.mobile_media_url !== data.mobileMediaUrl) replacedUrls.push(existing.mobile_media_url);
      if (existing.logo_url && existing.logo_url !== data.logoUrl) replacedUrls.push(existing.logo_url);
      if (existing.before_image && existing.before_image !== data.beforeImage) replacedUrls.push(existing.before_image);
      if (existing.after_image && existing.after_image !== data.afterImage) replacedUrls.push(existing.after_image);

      await d1.prepare(`
        UPDATE site_content SET
          type = ?, slug = ?, title = ?, subtitle = ?, category = ?, author = ?, excerpt = ?, body = ?,
          media_url = ?, mobile_media_url = ?, logo_url = ?, before_image = ?, after_image = ?,
          link_url = ?, cta_label = ?, secondary_cta_label = ?, secondary_cta_url = ?,
          badge_text = ?, rating_score = ?, rating_verified = ?, review_count = ?, trust_badge_text = ?,
          start_date = ?, end_date = ?, published_at = ?, seo_title = ?, seo_description = ?,
          price = ?, sessions = ?, duration = ?, available_for_booking = ?,
          qualification = ?, specialization = ?, years_experience = ?, registration_number = ?,
          phone = ?, email = ?, homepage_highlight = ?, patient_consent = ?, published = ?, display_order = ?,
          file_size = ?, mime_type = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        type,
        slug,
        data.title,
        data.subtitle,
        data.category,
        data.author,
        data.excerpt,
        data.body,
        data.mediaUrl,
        data.mobileMediaUrl,
        data.logoUrl,
        data.beforeImage,
        data.afterImage,
        data.linkUrl,
        data.ctaLabel,
        data.secondaryCtaLabel,
        data.secondaryCtaUrl,
        data.badgeText,
        data.ratingScore,
        data.ratingVerified ? 1 : 0,
        data.reviewCount,
        data.trustBadgeText,
        data.startDate,
        data.endDate,
        publishedAt,
        data.seoTitle,
        data.seoDescription,
        data.price,
        data.sessions,
        data.duration,
        data.availableForBooking ? 1 : 0,
        data.qualification,
        data.specialization,
        data.yearsExperience,
        data.registrationNumber,
        data.phone,
        data.email,
        data.homepageHighlight ? 1 : 0,
        data.patientConsent ? 1 : 0,
        data.published ? 1 : 0,
        data.displayOrder,
        data.fileSize,
        data.mimeType,
        id
      ).run();

      if (replacedUrls.length) {
        await deleteUnreferencedR2Media(replacedUrls, id);
      }

      const updated = await d1.prepare("SELECT * FROM site_content WHERE id = ?").bind(id).first();
      await syncSiteContentToLegacyTables(updated);
      const finalRow = await d1.prepare("SELECT * FROM site_content WHERE id = ?").bind(id).first();
      const storage = isReelType ? await getReelsStorageUsage() : undefined;
      res.json({ item: serializeSiteContent(finalRow || updated), ...(storage ? { storage } : {}) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/content/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid content ID." });
      }
      const existing = await d1.prepare("SELECT * FROM site_content WHERE id = ?").bind(id).first();
      if (!existing) {
        return res.status(404).json({ error: "Content entry not found." });
      }

      await d1.prepare("DELETE FROM site_content WHERE id = ?").bind(id).run();
      await syncLegacyDeletion(existing);
      await deleteUnreferencedR2Media(
        [existing.media_url, existing.mobile_media_url, existing.logo_url, existing.before_image, existing.after_image],
        id
      );

      const isReelType = existing.type === "reel" || existing.type === "video";
      const storage = isReelType ? await getReelsStorageUsage() : undefined;
      res.json({ ok: true, id, ...(storage ? { storage } : {}) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/content", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      const rawType = req.query.type ? String(req.query.type).trim() : "";
      let rows = [];

      if (!rawType) {
        rows = (await d1.prepare("SELECT * FROM site_content WHERE published = 1 ORDER BY display_order ASC, id DESC").all()).results || [];
      } else if (rawType === "before_after" || rawType === "before-after" || rawType === "transformation") {
        rows = (await d1.prepare("SELECT * FROM site_content WHERE type IN ('gallery', 'before_after') AND published = 1 ORDER BY display_order ASC, id DESC").all()).results || [];
      } else if (rawType === "reel" || rawType === "video") {
        rows = (await d1.prepare("SELECT * FROM site_content WHERE type IN ('reel', 'video') AND published = 1 ORDER BY display_order ASC, id DESC").all()).results || [];
      } else if (SITE_CONTENT_TYPES.includes(rawType)) {
        rows = (await d1.prepare("SELECT * FROM site_content WHERE type = ? AND published = 1 ORDER BY display_order ASC, id DESC").bind(rawType).all()).results || [];
      }

      const today = getTodayIsoIST();
      const visible = rows.filter((row) => {
        if ((row.type === "gallery" || row.type === "testimonial") && !row.patient_consent) {
          return false;
        }
        if (row.type === "offer") {
          const start = String(row.start_date || "").slice(0, 10);
          const end = String(row.end_date || "").slice(0, 10);
          if (/^\d{4}-\d{2}-\d{2}$/.test(start) && start > today) return false;
          if (/^\d{4}-\d{2}-\d{2}$/.test(end) && end < today) return false;
        }
        if (row.type === "doctor") {
          const media = String(row.media_url || "").trim();
          const title = String(row.title || "").trim();
          if (!media || !title || /test\s*\d+/i.test(title)) return false;
        }
        return true;
      });

      const reelsSettings = !rawType || rawType === "reel" || rawType === "video"
        ? await getReelsSectionSettings()
        : undefined;
      const beforeAfterSettings = !rawType || rawType === "before_after" || rawType === "before-after" || rawType === "gallery" || rawType === "hero"
        ? await getBeforeAfterSectionSettings()
        : undefined;

      res.json({
        items: visible.map(serializeSiteContent),
        ...(reelsSettings ? { reelsSettings } : {}),
        ...(beforeAfterSettings ? { beforeAfterSettings } : {}),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- COMPATIBILITY BRIDGE: /api/meta */
  app.get("/api/meta", async (_req, res) => {
    try {
      let treatments = (
        await d1
          .prepare("SELECT id, slug, treatment_name, short_description, treatment_image_url, duration_minutes FROM treatments WHERE status = 'active' ORDER BY display_order ASC, id ASC")
          .all()
      ).results || [];

      if (!treatments.length) {
        const scTreatments = (
          await d1
            .prepare("SELECT id, slug, title as treatment_name, excerpt as short_description, media_url as treatment_image_url, duration FROM site_content WHERE type = 'treatment' AND published = 1 AND available_for_booking = 1 ORDER BY display_order ASC, id ASC")
            .all()
        ).results || [];
        treatments = scTreatments;
      }

      let doctors = (
        await d1
          .prepare("SELECT id, name, qualification, specialization, experience, profile_image_url, profile_image_key FROM doctors WHERE status = 'active' ORDER BY display_order ASC, id ASC")
          .all()
      ).results || [];

      if (!doctors.length) {
        const scDoctors = (
          await d1
            .prepare("SELECT id, title as name, qualification, specialization, years_experience as experience, media_url as profile_image_url FROM site_content WHERE type = 'doctor' AND published = 1 ORDER BY display_order ASC, id ASC")
            .all()
        ).results || [];
        doctors = scDoctors;
      }

      // Filter out dummy/empty doctors
      const visibleDoctors = doctors.filter((doc) => {
        const name = String(doc.name || "").trim();
        const img = String(doc.profile_image_url || doc.profile_image_key || "").trim();
        return Boolean(name && img && !/test\s*\d+/i.test(name));
      });

      const services = treatments.map((t) => ({
        value: t.slug || String(t.id),
        label: t.treatment_name,
        id: t.id,
        duration: Number(t.duration_minutes || 30),
      }));

      const dentists = visibleDoctors.map((d) => d.name);

      res.json({
        services,
        dentists,
        doctors: visibleDoctors,
        treatments,
        slots: SLOTS,
        clinicWhatsapp: "+919345743409",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- CONTACT ENQUIRIES */
  app.post("/api/contact-enquiries", async (req, res) => {
    try {
      const name = String(req.body?.name ?? "").trim();
      const phone = String(req.body?.phone ?? "").trim();
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      const message = String(req.body?.message ?? "").trim();

      if (name.length < 2 || name.length > 120) return res.status(400).json({ error: "Enter your name (2-120 characters)." });
      if (!phone && !email) return res.status(400).json({ error: "Add a phone number or email address so the clinic can reply." });
      if (message.length < 5 || message.length > 4000) return res.status(400).json({ error: "Enter a message between 5 and 4,000 characters." });

      await d1.prepare(
        "INSERT INTO contact_enquiries (name, phone, email, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'new', datetime('now'), datetime('now'))"
      ).bind(name, phone, email, message).run();

      res.status(201).json({ ok: true, message: "Your enquiry has been sent. The clinic team will get back to you." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/contact-enquiries", requireAdmin, async (_req, res) => {
    try {
      const items = (await d1.prepare("SELECT * FROM contact_enquiries ORDER BY id DESC LIMIT 200").all()).results || [];
      res.json({ items: items.map((item) => ({ ...item, createdAt: item.created_at, updatedAt: item.updated_at })) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/contact-enquiries/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status ?? "");
      if (!["new", "in_progress", "resolved"].includes(status)) {
        return res.status(400).json({ error: "Choose a valid enquiry status." });
      }
      await d1.prepare("UPDATE contact_enquiries SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(status, id).run();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/contact-enquiries/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await d1.prepare("DELETE FROM contact_enquiries WHERE id = ?").bind(id).run();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- COMPATIBILITY BRIDGE: /api/admin/summary */
  app.get("/api/admin/summary", requireAdmin, async (_req, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const rows = (await d1.prepare(`
        SELECT
          a.*,
          d.name as doctor_name,
          t.treatment_name as treatment_label
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN treatments t ON a.treatment_id = t.id
        ORDER BY a.appointment_date DESC, a.id DESC
      `).all()).results || [];

      const registeredUsers = (await d1.prepare("SELECT id, first_name, last_name, email, phone, role, created_at, last_login_at, login_count FROM users ORDER BY id DESC").all()).results || [];

      const formatted = rows.map((r) => {
        const ref = formatRef(r.id, r.appointment_date);
        const first = (r.patient_name || "").split(" ")[0] || "there";
        const serviceLabel = r.treatment_label || "Dental Care & Checkup";
        const confirmMsg = `✅ APPOINTMENT CONFIRMED!\n\nDear ${first},\nYour appointment at Sri Saraswathi Dental Clinic is confirmed.\n\n• Token Ref: ${ref}\n• Treatment: ${serviceLabel}\n• Date: ${r.appointment_date}\n• Time: ${r.appointment_time}\n• Doctor: ${r.doctor_name || "Dr. Kishore Kumar"}\n• Address: 866, Soli Complex, Surampatti Four Rd, Erode - 638009\n• Map: https://maps.google.com/?q=Sri+Saraswathi+Dental+Clinic+Erode\n\nContact: 0424 427 2494 / 9345743409.`;
        const normalizedStatus = String(r.status || "Pending").toLowerCase();

        return {
          id: r.id,
          ref,
          patientName: r.patient_name || "Patient",
          patientPhone: r.phone || "",
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

      const todaySchedule = formatted.filter((f) => f.date === today && f.status !== "cancelled");
      const queue = todaySchedule.filter((f) => f.status === "pending" || f.status === "confirmed");
      const recent = formatted.slice(0, 5);

      const pending = formatted.filter((f) => f.status === "pending").length;
      const confirmed = formatted.filter((f) => f.status === "confirmed").length;
      const checkedIn = formatted.filter((f) => f.status === "checked_in").length;
      const completed = formatted.filter((f) => f.status === "completed").length;
      const cancelled = formatted.filter((f) => f.status === "cancelled").length;

      const week = [];
      for (let offset = 6; offset >= 0; offset -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - offset);
        const iso = d.toISOString().slice(0, 10);
        const count = formatted.filter((f) => f.date === iso).length;
        week.push({ date: iso, label: d.toLocaleDateString("en-IN", { weekday: "short" }), count });
      }

      const patientMap = new Map();
      registeredUsers.forEach((u) => {
        const key = String(u.email || u.phone || u.id).toLowerCase();
        patientMap.set(key, {
          id: u.id,
          name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Patient",
          email: u.email || "",
          phone: u.phone || "",
          role: "patient",
          joinedAt: u.created_at,
          lastLoginAt: u.last_login_at || u.created_at,
          loginCount: u.login_count || 1,
        });
      });

      formatted.forEach((f) => {
        const key = String(f.patientEmail || f.patientPhone || f.patientName).toLowerCase();
        if (key && !patientMap.has(key)) {
          patientMap.set(key, {
            id: f.id,
            name: f.patientName,
            email: f.patientEmail,
            phone: f.patientPhone,
            role: "patient",
            joinedAt: f.createdAt,
            lastLoginAt: f.createdAt,
            loginCount: 1,
          });
        }
      });
      const recentPatients = Array.from(patientMap.values()).slice(0, 4);

      res.json({
        today,
        counts: {
          today: todaySchedule.length,
          pending,
          confirmed,
          checkedIn,
          completed,
          cancelled,
          patients: patientMap.size,
          totalBookings: formatted.length,
        },
        week,
        todaySchedule,
        queue,
        recent,
        recentPatients,
        recentLogins: recentPatients.slice(0, 3),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- COMPATIBILITY BRIDGE: /api/admin/patients */
  app.get("/api/admin/patients", requireAdmin, async (_req, res) => {
    try {
      const registeredUsers = (await d1.prepare("SELECT id, first_name, last_name, email, phone, role, created_at, last_login_at, login_count FROM users ORDER BY id DESC").all()).results || [];
      const rows = (await d1.prepare(`
        SELECT a.*, d.name as doctor_name, t.treatment_name as treatment_label
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN treatments t ON a.treatment_id = t.id
        ORDER BY a.appointment_date DESC, a.id DESC
      `).all()).results || [];

      const byKey = new Map();
      for (const u of registeredUsers) {
        const emailKey = String(u.email || "").trim().toLowerCase();
        const phoneDigits = String(u.phone || "").replace(/\D/g, "").slice(-10);
        const key = emailKey || phoneDigits || `user-${u.id}`;
        byKey.set(key, {
          id: u.id,
          name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Patient",
          email: u.email || "",
          phone: u.phone || "",
          role: "patient",
          visits: 0,
          lastVisit: null,
          joinedAt: u.created_at,
          lastLoginAt: u.last_login_at || null,
          loginCount: u.login_count || 0,
        });
      }

      for (const r of rows) {
        const emailKey = String(r.email || "").trim().toLowerCase();
        const phoneDigits = String(r.phone || "").replace(/\D/g, "").slice(-10);
        let entry = (emailKey && byKey.get(emailKey)) || (phoneDigits && Array.from(byKey.values()).find((p) => String(p.phone || "").replace(/\D/g, "").slice(-10) === phoneDigits));
        if (!entry) {
          const key = emailKey || phoneDigits || r.patient_name || String(r.id);
          entry = byKey.get(key) || {
            id: r.id,
            name: r.patient_name || "Patient",
            email: r.email || "",
            phone: r.phone || "",
            role: "patient",
            visits: 0,
            lastVisit: null,
            joinedAt: r.created_at,
            lastLoginAt: null,
            loginCount: 0,
          };
          byKey.set(key, entry);
        }
        entry.visits += 1;
        if (!entry.lastVisit || (r.appointment_date && r.appointment_date > entry.lastVisit)) {
          entry.lastVisit = r.appointment_date;
        }
      }

      res.json({ patients: Array.from(byKey.values()) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- GOOGLE BUSINESS PROFILE REVIEWS API */
  const handleGetPublicGoogleReviews = async (_req, res) => {
    try {
      const apiKey = getServerGoogleApiKey();
      const apiConfigured = Boolean(apiKey);
      const config = await getGoogleReviewsConfig();

      if (config.enabled === false) {
        return res.json({
          status: "disabled",
          enabled: false,
          apiConfigured,
          cached: false,
          config,
          reviews: [],
        });
      }

      if (googleReviewsMemoryCache && googleReviewsMemoryCache.expiresAt > Date.now()) {
        res.setHeader("Cache-Control", "public, max-age=180");
        return res.json({
          ...googleReviewsMemoryCache.payload,
          cached: true,
        });
      }

      if (apiConfigured) {
        const syncIntervalMs = getGoogleReviewsSyncIntervalMs();
        const apiRows = (
          await d1
            .prepare(
              "SELECT COUNT(*) as cnt FROM site_content WHERE type = 'google_review' AND seo_description LIKE '%\"google_api\"%'"
            )
            .first("cnt")
        ) || 0;

        const isStale =
          !config.lastSyncedAt ||
          !Number.isFinite(Date.parse(config.lastSyncedAt)) ||
          Date.now() - Date.parse(config.lastSyncedAt) > syncIntervalMs ||
          Number(apiRows) === 0;

        if (isStale) {
          try {
            await syncGoogleReviewsFromApi();
          } catch (syncErr) {
            console.warn("[Google Reviews Sync Notice]:", syncErr?.message || syncErr);
          }
        }
      }

      // Query all published Google reviews (both manual and API-synced)
      const existingRows =
        (
          await d1
            .prepare(
              "SELECT * FROM site_content WHERE type = 'google_review' AND published = 1 ORDER BY display_order ASC, id DESC"
            )
            .all()
        ).results || [];

      let serialized = existingRows.map(serializeGoogleReviewRow);
      if (config.maxDisplayCount && config.maxDisplayCount > 0 && serialized.length > config.maxDisplayCount) {
        serialized = serialized.slice(0, config.maxDisplayCount);
      }

      const status =
        serialized.length > 0
          ? apiConfigured
            ? "synced"
            : "manual_verified"
          : apiConfigured
            ? config.lastSyncError
              ? "sync_error"
              : "empty"
            : "empty";

      const payload = {
        status,
        enabled: true,
        apiConfigured,
        cached: false,
        sourceMode: apiConfigured ? "google_api" : "manual",
        config,
        reviews: serialized,
      };

      if (serialized.length > 0) {
        googleReviewsMemoryCache = {
          expiresAt: Date.now() + 5 * 60 * 1000,
          payload,
        };
      }

      res.setHeader("Cache-Control", serialized.length > 0 ? "public, max-age=180" : "no-store");
      return res.json(payload);
    } catch (err) {
      console.error("[GET /api/google-reviews] Error:", err);
      res.status(500).json({ error: err.message });
    }
  };

  app.get("/api/google-reviews", handleGetPublicGoogleReviews);
  app.get("/api/google-place-details", handleGetPublicGoogleReviews);

  app.get("/api/admin/google-reviews", requireAdmin, async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      const config = await getGoogleReviewsConfig();
      const apiConfigured = Boolean(getServerGoogleApiKey());
      const rows =
        (
          await d1
            .prepare(
              "SELECT * FROM site_content WHERE type = 'google_review' ORDER BY display_order ASC, id DESC"
            )
            .all()
        ).results || [];

      res.json({
        status: !apiConfigured
          ? rows.length > 0
            ? "manual_verified"
            : "empty"
          : rows.length > 0
            ? "synced"
            : config.lastSyncError
              ? "sync_error"
              : "empty",
        config,
        reviews: rows.map(serializeGoogleReviewRow),
        apiConfigured,
        envPlaceIdConfigured: Boolean(String(process.env.GOOGLE_PLACE_ID || "").trim()),
        cacheMinutes: Math.round(getGoogleReviewsSyncIntervalMs() / 60000),
      });
    } catch (err) {
      console.error("[GET /api/admin/google-reviews] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/google-reviews/config", requireAdmin, async (req, res) => {
    try {
      const body = req.body || {};

      if (body.googleReviewsUrl !== undefined && String(body.googleReviewsUrl).trim() !== "") {
        if (!isValidHttpUrl(body.googleReviewsUrl)) {
          return res.status(400).json({ error: "Enter a valid http/https Google Reviews URL." });
        }
      }
      if (body.writeReviewUrl !== undefined && String(body.writeReviewUrl).trim() !== "") {
        if (!isValidHttpUrl(body.writeReviewUrl)) {
          return res.status(400).json({ error: "Enter a valid http/https Write-a-Review URL." });
        }
      }

      const updated = await saveGoogleReviewsConfig({
        enabled: body.enabled,
        googleReviewsUrl: body.googleReviewsUrl,
        writeReviewUrl: body.writeReviewUrl,
        placeId: body.placeId,
        businessName: body.businessName,
        overallRating: body.overallRating,
        totalReviews: body.totalReviews,
        maxDisplayCount: body.maxDisplayCount,
        displayMode: body.displayMode,
      });

      res.json({
        config: updated,
        apiConfigured: Boolean(getServerGoogleApiKey()),
      });
    } catch (err) {
      console.error("[PATCH /api/admin/google-reviews/config] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/google-reviews/entry", requireAdmin, async (req, res) => {
    try {
      const {
        author,
        rating,
        comment,
        reviewDate,
        relativeTime,
        reviewUrl,
        authorPhotoUrl,
        displayOrder,
        published,
        isVerified,
      } = req.body || {};

      if (!author || !String(author).trim()) {
        return res.status(400).json({ error: "Reviewer name is required." });
      }
      if (!comment || !String(comment).trim()) {
        return res.status(400).json({ error: "Review comment text is required." });
      }

      const numRating = Number(rating);
      const cleanRating = Number.isFinite(numRating) && numRating >= 1 && numRating <= 5 ? Math.round(numRating) : 5;
      const slug = `google-review-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const cleanPublished = published !== false ? 1 : 0;
      const cleanVerified = isVerified !== false ? 1 : 0;
      const order = Number.isFinite(Number(displayOrder)) ? Number(displayOrder) : 0;
      const date = String(reviewDate || new Date().toISOString().slice(0, 10)).trim();
      const rel = String(relativeTime || "").trim();
      const link = isValidHttpUrl(reviewUrl) ? String(reviewUrl).trim() : DEFAULT_GOOGLE_REVIEWS_URL;
      const photo = String(authorPhotoUrl || "").trim();
      const meta = JSON.stringify({
        source: "manual",
        isVerified: Boolean(cleanVerified),
        relativeTime: rel,
        authorPhotoUrl: photo,
      });

      const insertRes = await d1
        .prepare(
          `INSERT INTO site_content (
            type, slug, title, subtitle, author, excerpt, body,
            rating_score, rating_verified, media_url, link_url,
            published, display_order, published_at, seo_description,
            created_at, updated_at
          ) VALUES (
            'google_review', ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            datetime('now'), datetime('now')
          )`
        )
        .bind(
          slug,
          author.trim(),
          rel,
          author.trim(),
          comment.trim().slice(0, 180),
          comment.trim(),
          String(cleanRating),
          cleanVerified,
          photo,
          link,
          cleanPublished,
          order,
          date,
          meta
        )
        .run();

      googleReviewsMemoryCache = null;
      const newId = insertRes?.meta?.last_row_id;
      const row = await d1.prepare("SELECT * FROM site_content WHERE id = ?").bind(newId).first();
      return res.status(201).json({
        ok: true,
        review: serializeGoogleReviewRow(row),
      });
    } catch (err) {
      console.error("[POST /api/admin/google-reviews/entry] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/google-reviews/entry/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await d1.prepare("SELECT * FROM site_content WHERE id = ? AND type = 'google_review'").bind(id).first();
      if (!existing) {
        return res.status(404).json({ error: "Review entry not found." });
      }

      const body = req.body || {};
      let meta = {};
      try {
        meta = existing.seo_description ? JSON.parse(existing.seo_description) : {};
      } catch {
        meta = {};
      }

      const author = body.author !== undefined ? String(body.author).trim() : existing.author || existing.title;
      const comment = body.comment !== undefined ? String(body.comment).trim() : existing.body || existing.excerpt;
      const rating = body.rating !== undefined ? String(Math.max(1, Math.min(5, Math.round(Number(body.rating) || 5)))) : existing.rating_score;
      const published = body.published !== undefined ? (body.published ? 1 : 0) : existing.published;
      const isVerified = body.isVerified !== undefined ? (body.isVerified ? 1 : 0) : existing.rating_verified;
      const displayOrder = body.displayOrder !== undefined ? Number(body.displayOrder) : existing.display_order;
      const reviewDate = body.reviewDate !== undefined ? String(body.reviewDate).trim() : existing.published_at;
      const relativeTime = body.relativeTime !== undefined ? String(body.relativeTime).trim() : (meta.relativeTime || existing.subtitle);
      const reviewUrl = body.reviewUrl !== undefined ? String(body.reviewUrl).trim() : existing.link_url;
      const authorPhotoUrl = body.authorPhotoUrl !== undefined ? String(body.authorPhotoUrl).trim() : existing.media_url;

      const updatedMeta = JSON.stringify({
        ...meta,
        source: meta.source || "manual",
        isVerified: Boolean(isVerified),
        relativeTime,
        authorPhotoUrl,
      });

      await d1
        .prepare(
          `UPDATE site_content SET
            author = ?, title = ?, subtitle = ?, excerpt = ?, body = ?,
            rating_score = ?, rating_verified = ?, media_url = ?, link_url = ?,
            published = ?, display_order = ?, published_at = ?, seo_description = ?,
            updated_at = datetime('now')
          WHERE id = ?`
        )
        .bind(
          author,
          author,
          relativeTime,
          comment.slice(0, 180),
          comment,
          rating,
          isVerified,
          authorPhotoUrl,
          reviewUrl,
          published,
          displayOrder,
          reviewDate,
          updatedMeta,
          id
        )
        .run();

      googleReviewsMemoryCache = null;
      const updatedRow = await d1.prepare("SELECT * FROM site_content WHERE id = ?").bind(id).first();
      return res.json({
        ok: true,
        review: serializeGoogleReviewRow(updatedRow),
      });
    } catch (err) {
      console.error("[PATCH /api/admin/google-reviews/entry/:id] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/google-reviews/entry/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await d1.prepare("DELETE FROM site_content WHERE id = ? AND type = 'google_review'").bind(id).run();
      googleReviewsMemoryCache = null;
      return res.json({ ok: true, id });
    } catch (err) {
      console.error("[DELETE /api/admin/google-reviews/entry/:id] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/google-reviews/reorder", requireAdmin, async (req, res) => {
    try {
      const { order } = req.body || {};
      if (Array.isArray(order)) {
        for (let i = 0; i < order.length; i++) {
          const id = Number(order[i]);
          if (Number.isFinite(id)) {
            await d1.prepare("UPDATE site_content SET display_order = ? WHERE id = ? AND type = 'google_review'").bind(i, id).run();
          }
        }
      }
      googleReviewsMemoryCache = null;
      return res.json({ ok: true });
    } catch (err) {
      console.error("[POST /api/admin/google-reviews/reorder] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/google-reviews/sync", requireAdmin, async (req, res) => {
    try {
      const result = await syncGoogleReviewsFromApi(req.body?.placeId);
      res.json({
        status: result.reviews.length > 0 ? "synced" : "empty",
        ...result,
        apiConfigured: Boolean(getServerGoogleApiKey()),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sync Google reviews";
      const status =
        message.includes("not configured") || message.includes("Place ID") || message.includes("required")
          ? 400
          : 502;
      res.status(status).json({ error: message });
    }
  });

  /* ------------------------------------------------------------- COMPATIBILITY BRIDGE: /api/admin/availability-settings */
  app.get("/api/admin/availability-settings", requireAdmin, async (_req, res) => {
    try {
      const metaRow = await d1.prepare("SELECT value FROM d1_meta WHERE key = 'availability_settings'").first();
      let settings = metaRow?.value ? JSON.parse(metaRow.value) : null;

      if (!settings) {
        settings = {
          weeklyHours: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({
            day,
            enabled: day !== "Sunday",
            start: day === "Saturday" ? "09:00" : "09:30",
            end: day === "Saturday" ? "14:00" : "18:30",
            breaks: [],
          })),
          appointmentDuration: 30,
          maxPatientsPerSlot: 1,
        };
      }

      const blockedRows = (await d1.prepare(`
        SELECT b.*, d.name as doctor_name
        FROM blocked_dates b
        LEFT JOIN doctors d ON b.doctor_id = d.id
        ORDER BY b.block_date ASC, b.id ASC
      `).all()).results || [];

      const blockedDates = blockedRows.map((r) => ({
        id: String(r.id),
        date: r.block_date,
        type: r.start_time ? "range" : "full",
        start: r.start_time || "09:30",
        end: r.end_time || "18:30",
        reason: r.reason || "Clinic closed",
        notes: r.notes || "",
        dentist: r.doctor_name || "All dentists",
      }));

      res.json({
        ...settings,
        blockedDates,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/availability-settings", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const { blockedDates, ...generalSettings } = b;

      // 1. Persist generalSettings into d1_meta
      await d1.prepare(`
        INSERT INTO d1_meta (key, value, updated_at)
        VALUES ('availability_settings', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `).bind(JSON.stringify(generalSettings)).run();

      // 2. Sync blockedDates with blocked_dates table if provided
      if (Array.isArray(blockedDates)) {
        const existingBlocked = (await d1.prepare("SELECT id FROM blocked_dates").all()).results || [];
        const existingIds = new Set(existingBlocked.map((r) => Number(r.id)));
        const retainedIds = new Set();

        for (const item of blockedDates) {
          const numId = Number(item.id);
          if (Number.isFinite(numId) && existingIds.has(numId)) {
            retainedIds.add(numId);
            // Optionally update existing
            let doctorId = null;
            if (item.dentist && item.dentist !== "All dentists") {
              const doc = await d1.prepare("SELECT id FROM doctors WHERE LOWER(name) LIKE ?").bind(`%${String(item.dentist).split(",")[0].trim().toLowerCase()}%`).first();
              if (doc) doctorId = doc.id;
            }
            await d1.prepare(`
              UPDATE blocked_dates SET
                block_date = ?, start_time = ?, end_time = ?, reason = ?, doctor_id = ?
              WHERE id = ?
            `).bind(
              String(item.date).trim(),
              item.type === "range" && item.start ? String(item.start).trim() : null,
              item.type === "range" && item.end ? String(item.end).trim() : null,
              String(item.reason || "Clinic closed").trim(),
              doctorId,
              numId
            ).run();
          } else {
            // New blocked date
            let doctorId = null;
            if (item.dentist && item.dentist !== "All dentists") {
              const doc = await d1.prepare("SELECT id FROM doctors WHERE LOWER(name) LIKE ?").bind(`%${String(item.dentist).split(",")[0].trim().toLowerCase()}%`).first();
              if (doc) doctorId = doc.id;
            }
            const info = await d1.prepare(`
              INSERT INTO blocked_dates (block_date, start_time, end_time, reason, doctor_id, created_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
            `).bind(
              String(item.date).trim(),
              item.type === "range" && item.start ? String(item.start).trim() : null,
              item.type === "range" && item.end ? String(item.end).trim() : null,
              String(item.reason || "Clinic closed").trim(),
              doctorId
            ).run();
            retainedIds.add(info.meta.last_row_id);
          }
        }

        // Delete any blocked dates removed by admin
        for (const oldId of existingIds) {
          if (!retainedIds.has(oldId)) {
            await d1.prepare("DELETE FROM blocked_dates WHERE id = ?").bind(oldId).run();
          }
        }
      }

      // 3. Return fresh settings
      const blockedRows = (await d1.prepare(`
        SELECT b.*, d.name as doctor_name
        FROM blocked_dates b
        LEFT JOIN doctors d ON b.doctor_id = d.id
        ORDER BY b.block_date ASC, b.id ASC
      `).all()).results || [];

      const currentBlocked = blockedRows.map((r) => ({
        id: String(r.id),
        date: r.block_date,
        type: r.start_time ? "range" : "full",
        start: r.start_time || "09:30",
        end: r.end_time || "18:30",
        reason: r.reason || "Clinic closed",
        notes: r.notes || "",
        dentist: r.doctor_name || "All dentists",
      }));

      res.json({
        ...generalSettings,
        blockedDates: currentBlocked,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- 8. OPENAI AI DENTAL CARE ASSISTANT */
  registerChatbotRoutes(app, d1, requireAdmin);

  /* ------------------------------------------------------------- 9. SEO & SITEMAP / ROBOTS */
  registerSeoRoutes(app, d1, requireAdmin);

}
