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
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetBucketCorsCommand,
  PutBucketCorsCommand,
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
  ["application/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/quicktime", ".mov"],
  ["video/x-m4v", ".m4v"],
  ["video/m4v", ".m4v"],
  ["video/ogg", ".ogv"],
  ["video/3gpp", ".3gp"],
  ["video/x-matroska", ".mkv"],
  ["video/matroska", ".mkv"],
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
  ".m4v": "video/x-m4v",
  ".ogv": "video/ogg",
  ".3gp": "video/3gpp",
  ".mkv": "video/x-matroska",
};

/** Resolve a supported MIME type from an explicit Content-Type or filename extension fallback. */
export function resolveMediaMimeType(rawMime, originalName = "") {
  const normalized = String(rawMime || "").toLowerCase().split(";")[0].trim();
  const ext = path.extname(String(originalName || "")).toLowerCase();
  const fromExt = MIME_FROM_EXT[ext] || "";

  if (!normalized || normalized === "application/octet-stream" || normalized === "binary/octet-stream") {
    return fromExt || "application/octet-stream";
  }
  if (ALLOWED_MIME_TYPES.has(normalized)) {
    return normalized;
  }
  return fromExt || normalized;
}

function sanitizeMetadataValue(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 256);
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function hmacSha256(key, data) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data) {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

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

  async head(key) {
    const filePath = this._resolvePath(key);
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return null;
    const metaPath = filePath + ".meta.json";
    let meta = {};
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      } catch {}
    }
    const ext = path.extname(key).toLowerCase();
    return {
      key,
      size: stat.size,
      contentType: meta.contentType || MIME_FROM_EXT[ext] || "application/octet-stream",
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
    this.accountId = accountId;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.bucketName = bucketName;
    this.corsReady = false;
    this.corsPromise = null;
    this.s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /** Ensure Cloudflare R2 bucket CORS allows browser PUT/GET/HEAD for direct media uploads & playback. */
  async ensureCors() {
    if (this.corsReady) return true;
    if (this.corsPromise) return this.corsPromise;

    const desiredRule = {
      AllowedOrigins: ["*"],
      AllowedMethods: ["GET", "HEAD", "PUT"],
      AllowedHeaders: ["content-type", "content-length", "x-amz-*"],
      ExposeHeaders: ["ETag", "Content-Length", "Content-Type", "Content-Range", "Accept-Ranges"],
      MaxAgeSeconds: 3600,
    };

    this.corsPromise = (async () => {
      try {
        try {
          const existing = await this.s3.send(new GetBucketCorsCommand({ Bucket: this.bucketName }));
          const hasPutRule = (existing?.CORSRules || []).some(
            (rule) =>
              (rule.AllowedMethods || []).includes("PUT") &&
              ((rule.AllowedOrigins || []).includes("*") || (rule.AllowedOrigins || []).length > 0),
          );
          if (hasPutRule) {
            this.corsReady = true;
            return true;
          }
        } catch (err) {
          if (err?.name !== "NoSuchCORSConfiguration" && err?.$metadata?.httpStatusCode !== 404) {
            // Continue and attempt PutBucketCors / REST API
          }
        }

        try {
          await this.s3.send(
            new PutBucketCorsCommand({
              Bucket: this.bucketName,
              CORSConfiguration: { CORSRules: [desiredRule] },
            }),
          );
          this.corsReady = true;
          return true;
        } catch {
          // Fallback to Cloudflare REST API if S3 token lacks bucket-admin permission
          const cfToken = process.env.CLOUDFLARE_API_TOKEN;
          if (!cfToken) return false;
          const restRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/r2/buckets/${this.bucketName}/cors`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${cfToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                rules: [
                  {
                    allowed: {
                      origins: ["*"],
                      methods: ["GET", "HEAD", "PUT"],
                      headers: ["content-type", "content-length", "x-amz-date", "x-amz-content-sha256"],
                    },
                    exposeHeaders: ["ETag", "Content-Length", "Content-Type", "Content-Range", "Accept-Ranges"],
                    maxAgeSeconds: 3600,
                  },
                ],
              }),
            },
          );
          if (restRes.ok) {
            this.corsReady = true;
            return true;
          }
          return false;
        }
      } catch {
        return false;
      } finally {
        if (!this.corsReady) this.corsPromise = null;
      }
    })();

    return this.corsPromise;
  }

  /** Generate an AWS SigV4 presigned URL for direct browser R2 PUT/GET without extra SDK packages. */
  createPresignedUrl(method, key, { expiresInSeconds = 900, contentType = "" } = {}) {
    const cleanKey = String(key || "").replace(/^\/+/, "");
    const host = `${this.accountId}.r2.cloudflarestorage.com`;
    const canonicalUri = `/${[this.bucketName, ...cleanKey.split("/")].map(encodeRfc3986).join("/")}`;
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/auto/s3/aws4_request`;

    const signContentType = Boolean(contentType && method.toUpperCase() === "PUT");
    const signedHeaders = signContentType ? "content-type;host" : "host";
    const canonicalHeaders = signContentType
      ? `content-type:${contentType}\nhost:${host}\n`
      : `host:${host}\n`;

    const queryParams = [
      ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
      ["X-Amz-Credential", `${this.accessKeyId}/${scope}`],
      ["X-Amz-Date", amzDate],
      ["X-Amz-Expires", String(expiresInSeconds)],
      ["X-Amz-SignedHeaders", signedHeaders],
    ].sort((a, b) => a[0].localeCompare(b[0]));

    const canonicalQueryString = queryParams
      .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
      .join("&");

    const canonicalRequest = [
      method.toUpperCase(),
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      sha256Hex(canonicalRequest),
    ].join("\n");

    const kDate = hmacSha256(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = hmacSha256(kDate, "auto");
    const kService = hmacSha256(kRegion, "s3");
    const kSigning = hmacSha256(kService, "aws4_request");
    const signature = hmacSha256(kSigning, stringToSign).toString("hex");

    return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }

  async head(key) {
    try {
      const res = await this.s3.send(new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));
      const ext = path.extname(key).toLowerCase();
      return {
        key,
        size: Number(res.ContentLength || 0),
        contentType: res.ContentType || MIME_FROM_EXT[ext] || "application/octet-stream",
        etag: res.ETag ? res.ETag.replace(/"/g, "") : "",
      };
    } catch (err) {
      if (err.name === "NotFound" || err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) return null;
      throw err;
    }
  }

  async put(key, buffer, options = {}) {
    const ext = path.extname(key).toLowerCase();
    const contentType = options.httpMetadata?.contentType || MIME_FROM_EXT[ext] || "application/octet-stream";
    const customMetadata = options.customMetadata || {};
    const sanitizedMetadata = Object.fromEntries(
      Object.entries(customMetadata)
        .map(([k, v]) => [String(k).toLowerCase().replace(/[^a-z0-9_-]/g, ""), sanitizeMetadataValue(v)])
        .filter(([k, v]) => Boolean(k) && Boolean(v)),
    );

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ...(Object.keys(sanitizedMetadata).length ? { Metadata: sanitizedMetadata } : {}),
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
  const resolvedMime = resolveMediaMimeType(mimeType, originalName);
  const ext = ALLOWED_MIME_TYPES.get(resolvedMime) || path.extname(originalName).toLowerCase() || ".jpg";
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
