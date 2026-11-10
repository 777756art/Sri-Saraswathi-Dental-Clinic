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
app.use((req, res, next) => {
  if (req.url.startsWith("/.netlify/functions/api")) {
    req.url = req.url.replace("/.netlify/functions/api", "/api");
  }
  if (!req.url.startsWith("/api")) {
    req.url = "/api" + req.url;
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
    timestamp: new Date().toISOString()
  });
});

// Initialize Cloudflare D1
const d1 = getD1Database();
try {
  await initD1Schema(d1);
} catch (err) {
  console.warn("Netlify function D1 init notice:", err.message);
}

const SESSION_SECRET = process.env.SESSION_SECRET || "clinic-d1-secure-secret-key-2026";
registerD1Routes(app, d1, SESSION_SECRET);

export const handler = serverless(app);
