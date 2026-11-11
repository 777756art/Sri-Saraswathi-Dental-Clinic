// netlify/functions/api.mjs
// Sri Saraswathi Dental Clinic - Serverless API on Netlify
// Powered by Cloudflare D1 Database & Cloudflare R2 Media Storage

import serverless from "serverless-http";
import express from "express";
import { getD1Database, initD1Schema } from "../../server/d1.mjs";
import { registerD1Routes } from "../../server/d1-routes.mjs";

const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Normalize URL path across Netlify rewrite scenarios
app.use((req, _res, next) => {
  if (req.url.startsWith("/.netlify/functions/api")) {
    req.url = req.url.replace("/.netlify/functions/api", "/api");
  }
  if (!req.url.startsWith("/api")) {
    req.url = "/api" + req.url;
  }
  next();
});

// Lazy initialize Cloudflare D1
const d1 = getD1Database();
let initialized = false;
let initPromise = null;

function ensureD1Ready() {
  if (initialized) return Promise.resolve();
  if (!initPromise) {
    initPromise = initD1Schema(d1)
      .then(() => {
        initialized = true;
      })
      .catch((err) => {
        console.warn("Netlify function D1 init notice:", err?.message || err);
        initialized = true;
      });
  }
  return initPromise;
}

app.use(async (_req, _res, next) => {
  try {
    await ensureD1Ready();
  } catch (err) {
    console.warn("D1 initialization warning:", err?.message || err);
  }
  next();
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    platform: "Netlify Serverless",
    database: "Cloudflare D1",
    storage: "Cloudflare R2",
    timestamp: new Date().toISOString(),
  });
});

const SESSION_SECRET = process.env.SESSION_SECRET || "clinic-d1-secure-secret-key-2026";
registerD1Routes(app, d1, SESSION_SECRET);

// Ensure API routes always return JSON on 404 or unexpected errors
app.use((_req, res) => {
  res.status(404).json({ error: "API route not found." });
});

app.use((err, _req, res, _next) => {
  const status = Number(err?.status || err?.statusCode || 500);
  res.status(status).json({ error: err?.message || "Unexpected server error." });
});

export const handler = serverless(app, {
  binary: ["image/*", "video/*", "application/octet-stream"],
});
export default handler;
