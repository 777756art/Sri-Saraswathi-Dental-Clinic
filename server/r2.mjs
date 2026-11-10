// server/r2.mjs
// Cloudflare R2 Object Storage Architect & Adapter
// Bucket: sri-saraswathi-dental-media

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const ROOT_DIR = process.cwd();
const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
const WRANGLER_R2_DIR = isServerless ? "/tmp/r2/sri-saraswathi-dental-media" : path.join(ROOT_DIR, ".wrangler", "state", "v3", "r2", "sri-saraswathi-dental-media");

export const R2_FOLDERS = [
  "doctors",
  "treatments",
  "banners",
  "gallery",
  "before-after",
  "blogs",
  "reels",
  "offers",
  "clinic",
];

// Ensure local wrangler R2 folder hierarchy exists when not in serverless
if (!isServerless && fs.existsSync(ROOT_DIR)) {
  for (const folder of R2_FOLDERS) {
    const dir = path.join(WRANGLER_R2_DIR, folder);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
  }
}

export const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/jpg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
  ["image/avif", ".avif"],
  ["image/gif", ".gif"],
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/quicktime", ".mov"],
]);

const MIME_FROM_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

class LocalR2Bucket {
  constructor(baseDir) {
    this.baseDir = baseDir;
  }

  _resolvePath(key) {
    const cleanKey = String(key || "").replace(/^\/+/, "").replace(/\.\./g, "");
    return path.join(this.baseDir, cleanKey);
  }

  async put(key, buffer, options = {}) {
    const filePath = this._resolvePath(key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);

    const ext = path.extname(key).toLowerCase();
    const contentType = options.httpMetadata?.contentType || MIME_FROM_EXT[ext] || "application/octet-stream";

    // Save metadata
    const metaPath = filePath + ".meta.json";
    fs.writeFileSync(metaPath, JSON.stringify({
      key,
      size: buffer.length,
      contentType,
      uploadedAt: new Date().toISOString(),
      customMetadata: options.customMetadata || {},
    }), "utf8");

    return {
      key,
      size: buffer.length,
      etag: crypto.createHash("md5").update(buffer).digest("hex"),
      uploaded: new Date(),
      httpMetadata: { contentType },
    };
  }

  async get(key) {
    const filePath = this._resolvePath(key);
    if (!fs.existsSync(filePath)) return null;

    const buffer = fs.readFileSync(filePath);
    const metaPath = filePath + ".meta.json";
    let meta = {};
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      } catch {}
    }

    const ext = path.extname(key).toLowerCase();
    const contentType = meta.contentType || MIME_FROM_EXT[ext] || "application/octet-stream";

    return {
      key,
      size: buffer.length,
      body: buffer,
      contentType,
      etag: crypto.createHash("md5").update(buffer).digest("hex"),
    };
  }

  async delete(key) {
    if (!key) return;
    const filePath = this._resolvePath(key);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        const metaPath = filePath + ".meta.json";
        if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
      } catch (err) {
        console.warn(`Failed to delete local R2 object ${key}:`, err.message);
      }
    }
  }

  async list(options = {}) {
    const prefix = options.prefix || "";
    const targetDir = path.join(this.baseDir, prefix);
    if (!fs.existsSync(targetDir)) return { objects: [], truncated: false };

    const files = fs.readdirSync(targetDir, { recursive: true });
    const objects = [];
    for (const f of files) {
      if (f.endsWith(".meta.json")) continue;
      const fullPath = path.join(targetDir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        const objectKey = path.posix.join(prefix, f.replace(/\\/g, "/"));
        objects.push({
          key: objectKey,
          size: stat.size,
          uploaded: stat.mtime,
        });
      }
    }
    return { objects, truncated: false };
  }
}

class LiveR2Bucket {
  constructor({ accountId, accessKeyId, secretAccessKey, bucketName = "sri-saraswathi-dental-media" }) {
    this.bucketName = bucketName;
    this.s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async put(key, buffer, options = {}) {
    const ext = path.extname(key).toLowerCase();
    const contentType = options.httpMetadata?.contentType || MIME_FROM_EXT[ext] || "application/octet-stream";
    const customMetadata = options.customMetadata || {};

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: Object.fromEntries(Object.entries(customMetadata).map(([k, v]) => [k, String(v)])),
    }));

    return {
      key,
      size: buffer.length,
      etag: crypto.createHash("md5").update(buffer).digest("hex"),
      uploaded: new Date(),
      httpMetadata: { contentType },
    };
  }

  async get(key) {
    try {
      const res = await this.s3.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));
      const bytes = await res.Body.transformToByteArray();
      const buffer = Buffer.from(bytes);
      const ext = path.extname(key).toLowerCase();
      const contentType = res.ContentType || MIME_FROM_EXT[ext] || "application/octet-stream";
      return {
        key,
        size: buffer.length,
        body: buffer,
        contentType,
        etag: res.ETag ? res.ETag.replace(/"/g, "") : crypto.createHash("md5").update(buffer).digest("hex"),
      };
    } catch (err) {
      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) return null;
      throw err;
    }
  }

  async delete(key) {
    if (!key) return;
    try {
      await this.s3.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));
    } catch (err) {
      console.warn(`Live R2 delete warning for ${key}:`, err.message);
    }
  }

  async list(options = {}) {
    const prefix = options.prefix || "";
    const res = await this.s3.send(new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
    }));
    return {
      objects: (res.Contents || []).map((o) => ({
        key: o.Key,
        size: o.Size,
        uploaded: o.LastModified,
      })),
      truncated: Boolean(res.IsTruncated),
    };
  }
}

// Global R2 Bucket instance
let r2Instance = null;

export function getR2Bucket(env = {}) {
  if (env && env.MEDIA_BUCKET) {
    return env.MEDIA_BUCKET;
  }
  if (r2Instance) return r2Instance;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET || "sri-saraswathi-dental-media";

  if (accountId && accessKeyId && secretAccessKey) {
    console.log(`Connected to Live Cloudflare R2 Bucket: ${bucketName} (Account: ${accountId})`);
    r2Instance = new LiveR2Bucket({ accountId, accessKeyId, secretAccessKey, bucketName });
    return r2Instance;
  }

  r2Instance = new LocalR2Bucket(WRANGLER_R2_DIR);
  return r2Instance;
}

export function generateR2Key(folder, originalName = "media.jpg", mimeType = "image/jpeg") {
  const cleanFolder = R2_FOLDERS.includes(folder) ? folder : "gallery";
  const ext = ALLOWED_MIME_TYPES.get(mimeType) || path.extname(originalName) || ".jpg";
  const base = path.basename(originalName, path.extname(originalName)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const uid = crypto.randomBytes(4).toString("hex");
  const filename = `${base || "asset"}-${Date.now()}-${uid}${ext}`;
  return `${cleanFolder}/${filename}`;
}

export function getR2PublicUrl(key) {
  if (!key) return "";
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;
  if (publicDomain) {
    return `https://${publicDomain.replace(/\/$/, "")}/${key.replace(/^\/+/, "")}`;
  }
  return `/api/media/${key.replace(/^\/+/, "")}`;
}

export async function safeDeleteR2File(r2, key) {
  if (!key) return;
  // Only delete files belonging to our managed R2 prefixes
  const isManaged = R2_FOLDERS.some((f) => key.startsWith(`${f}/`));
  if (isManaged) {
    try {
      await r2.delete(key);
      console.log(`Deleted replaced/removed R2 media object: ${key}`);
    } catch (err) {
      console.warn(`Could not delete R2 object ${key}:`, err.message);
    }
  }
}
