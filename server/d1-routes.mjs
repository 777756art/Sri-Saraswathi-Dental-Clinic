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

  const cookieAttrs = (req) => {
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
    return isHttps ? "; Secure; SameSite=Lax" : "; SameSite=Lax";
  };

  const setSessionCookie = (req, res, user) => {
    const token = signSession(user, sessionSecret);
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; HttpOnly${cookieAttrs(req)}; Path=/; Max-Age=${SESSION_DAYS * 86400}`);
  };

  const clearSessionCookie = (req, res) => {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly${cookieAttrs(req)}; Path=/; Max-Age=0`);
  };

  const getSessionUser = async (req) => {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    const session = verifySession(token, sessionSecret);
    if (!session) return null;

    if (session.role === "admin") {
      const admin = await d1.prepare("SELECT id, name, email, role, status FROM admins WHERE id = ?").bind(session.uid).first();
      if (!admin || admin.status === "inactive") return null;
      const [firstName, ...rest] = String(admin.name || "").trim().split(" ");
      return {
        id: admin.id,
        firstName: firstName || "Admin",
        lastName: rest.join(" ") || "",
        name: admin.name || "Admin",
        email: admin.email,
        phone: "",
        role: admin.role || "admin",
      };
    }

    const patient = await d1.prepare("SELECT id, first_name, last_name, email, phone, role FROM users WHERE id = ?").bind(session.uid).first();
    if (!patient) return null;
    return {
      id: patient.id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      name: `${patient.first_name} ${patient.last_name}`.trim(),
      email: patient.email,
      phone: patient.phone || "",
      role: patient.role || "patient",
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

  const getReelsSectionSettings = async () => {
    try {
      const row = await d1.prepare("SELECT value FROM d1_meta WHERE key = 'reels_section_settings'").first();
      if (!row?.value) return { ...DEFAULT_REELS_SECTION_SETTINGS };
      const parsed = JSON.parse(row.value);
      return {
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
    } catch {
      return { ...DEFAULT_REELS_SECTION_SETTINGS };
    }
  };

  const saveReelsSectionSettings = async (patch = {}) => {
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
      const { email, password } = req.body || {};
      const cleanEmail = String(email || "").trim().toLowerCase();
      if (!cleanEmail || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const admin = await d1.prepare("SELECT * FROM admins WHERE LOWER(email) = ?").bind(cleanEmail).first();
      if (admin) {
        if (!verifyPassword(password, admin.password_hash)) {
          return res.status(401).json({ error: "Invalid email or password." });
        }
        if (admin.status === "inactive") {
          return res.status(403).json({ error: "Account is inactive. Contact the chief surgeon." });
        }
        const [firstName, ...rest] = String(admin.name || "").trim().split(" ");
        const user = {
          id: admin.id,
          firstName: firstName || "Admin",
          lastName: rest.join(" ") || "",
          email: admin.email,
          phone: "",
          role: admin.role || "admin",
        };
        setSessionCookie(req, res, user);
        return res.json({ user });
      }

      const patient = await d1.prepare("SELECT * FROM users WHERE LOWER(email) = ?").bind(cleanEmail).first();
      if (!patient || !verifyPassword(password, patient.password_hash)) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      await d1.prepare(
        "UPDATE users SET last_login_at = datetime('now'), login_count = COALESCE(login_count, 0) + 1 WHERE id = ?"
      ).bind(patient.id).run();

      const user = {
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
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
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    clearSessionCookie(req, res);
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

      const counts = (await d1.prepare(`
        SELECT appointment_time, COUNT(*) as count
        FROM appointments
        WHERE appointment_date = ? AND status NOT IN ('Cancelled', 'cancelled', 'Rejected', 'rejected')
        GROUP BY appointment_time
      `).bind(date).all()).results || [];

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
      const sessionUser = await getSessionUser(req).catch(() => null);
      const patientName = String(b.patientName || b.patient_name || sessionUser?.name || "").trim();
      const phone = String(b.patientPhone || b.phone || sessionUser?.phone || "").trim();
      const email = String(b.patientEmail || b.email || sessionUser?.email || "").trim().toLowerCase();
      const date = String(b.date || b.appointment_date || "").trim();
      const time = String(b.time || b.appointment_time || "").trim();
      const notes = String(b.notes || b.message || "").trim();

      let doctorId = b.doctorId || b.doctor_id ? Number(b.doctorId || b.doctor_id) : null;
      let dentistName = String(b.dentist || "").trim() || "Dr. Kishore Kumar";
      if (!doctorId && b.dentist) {
        const doc = await d1.prepare("SELECT id, name FROM doctors WHERE LOWER(name) LIKE ?").bind(`%${dentistName.split(",")[0].toLowerCase()}%`).first();
        if (doc) {
          doctorId = doc.id;
          dentistName = doc.name;
        }
      }
      if (!doctorId) doctorId = 1;

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
        const svc = String(b.service).trim();
        const found = await d1.prepare("SELECT id, treatment_name FROM treatments WHERE slug = ? OR LOWER(treatment_name) LIKE ?").bind(svc, `%${svc.replace(/-/g, " ").toLowerCase()}%`).first();
        if (found) {
          treatmentId = found.id;
          serviceLabel = found.treatment_name;
        } else {
          serviceLabel = svc.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
        return true;
      });

      const reelsSettings = !rawType || rawType === "reel" || rawType === "video"
        ? await getReelsSectionSettings()
        : undefined;

      res.json({
        items: visible.map(serializeSiteContent),
        ...(reelsSettings ? { reelsSettings } : {}),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ------------------------------------------------------------- COMPATIBILITY BRIDGE: /api/meta */
  app.get("/api/meta", async (_req, res) => {
    try {
      const treatments = (
        await d1
          .prepare("SELECT id, slug, title FROM site_content WHERE type = 'treatment' AND published = 1 AND available_for_booking = 1 ORDER BY display_order ASC, id ASC")
          .all()
      ).results || [];
      const doctors = (
        await d1
          .prepare("SELECT id, title FROM site_content WHERE type = 'doctor' AND published = 1 ORDER BY display_order ASC, id ASC")
          .all()
      ).results || [];

      const services = treatments.map((t) => ({ value: t.slug || String(t.id), label: t.title }));
      const dentists = doctors.map((d) => d.title).filter(Boolean);

      const defaultServices = [
        { value: "general-dentistry", label: "General Dentistry & Consultation" },
        { value: "root-canal-treatment", label: "Root Canal Treatment (Single-Sitting)" },
        { value: "orthodontics-aligners", label: "Invisalign & Clear Aligners" },
        { value: "dental-implants", label: "Dental Implants (Titanium & Ceramic)" },
        { value: "teeth-whitening", label: "Laser Teeth Whitening" },
        { value: "cosmetic-dentistry", label: "Cosmetic Smile Designing & Veneers" },
        { value: "pediatric-dentistry", label: "Pediatric Dental Care" },
        { value: "periodontics-gum-care", label: "Laser Periodontics & Gum Surgery" },
      ];

      const mergedServices = new Map();
      defaultServices.forEach((s) => mergedServices.set(s.value, s.label));
      services.forEach((s) => mergedServices.set(s.value, s.label));

      const defaultDentists = ["Dr. Kishore Kumar, B.D.S., M.D.S.", "Dr. Priyadharshini K, B.D.S."];
      const mergedDentists = Array.from(new Set([...defaultDentists, ...dentists]));

      res.json({
        services: Array.from(mergedServices.entries()).map(([value, label]) => ({ value, label })),
        dentists: mergedDentists,
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

  /* ------------------------------------------------------------- COMPATIBILITY BRIDGE: /api/admin/availability-settings */
  app.get("/api/admin/availability-settings", requireAdmin, async (_req, res) => {
    res.json({
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      slotDuration: 30,
      breakStart: "13:00",
      breakEnd: "17:00",
      dayStart: "10:00",
      dayEnd: "20:30",
    });
  });

  app.patch("/api/admin/availability-settings", requireAdmin, async (req, res) => {
    res.json(req.body);
  });

}
