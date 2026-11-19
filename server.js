// server.js - Hostinger Node.js Entry File
// Sreesaraswathi Dental Clinic (drkishoredentist.com)
// Express Application on Node.js 22

import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getD1Database, initD1Schema } from "./server/d1.mjs";
import { registerD1Routes } from "./server/d1-routes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load environment variables from .env files if present
for (const envName of [".env", ".env.local", ".env.api", ".env.production"]) {
  const envPath = path.join(__dirname, envName);
  if (!fs.existsSync(envPath)) continue;
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIndex = line.indexOf("=");
      if (eqIndex <= 0) continue;
      const key = line.slice(0, eqIndex).trim();
      let val = line.slice(eqIndex + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    console.warn(`Notice loading ${envName}:`, err?.message);
  }
}

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || "clinic-d1-secure-secret-key-2026";

// 2. Middleware
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://drkishoredentist.com",
    "https://www.drkishoredentist.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4102",
  ];
  if (process.env.SITE_ORIGIN) {
    allowedOrigins.push(process.env.SITE_ORIGIN.replace(/\/+$/, ""));
  }

  if (origin && (allowedOrigins.includes(origin) || origin.endsWith("drkishoredentist.com") || origin.includes("netlify.app"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// 3. Cloudflare D1 Database & Schema Initialization
const d1 = getD1Database();
let isD1Ready = false;

initD1Schema(d1)
  .then(() => {
    isD1Ready = true;
    console.log("Cloudflare D1 Database schema verified & ready.");
  })
  .catch((err) => {
    console.warn("Cloudflare D1 initialization note:", err?.message || err);
    isD1Ready = true;
  });

// 4. Health Check Endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    platform: "Hostinger Node.js 22",
    entry: "server.js",
    database: "Cloudflare D1",
    storage: "Cloudflare R2",
    d1Ready: isD1Ready,
    timestamp: new Date().toISOString(),
  });
});

// 5. Register All Clinic API Routes
registerD1Routes(app, d1, SESSION_SECRET);

// 6. Serve Production Frontend (Vite Build)
const distDir = path.resolve(__dirname, "dist");

if (fs.existsSync(distDir)) {
  // Static assets with caching
  app.use(express.static(distDir, { maxAge: "1h", index: false }));

  // SPA fallback for all frontend GET routes (excluding /api)
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      const indexPath = path.join(distDir, "index.html");
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    return next();
  });
} else {
  // Fallback if dist folder is not yet built
  app.get("/", (_req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Sreesaraswathi Dental Clinic</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;">
          <h1>Sreesaraswathi Dental Clinic</h1>
          <p>Backend API is active on Hostinger Node.js.</p>
          <p><a href="/api/health">Check API Health</a></p>
        </body>
      </html>
    `);
  });
}

// 7. API 404 Handler
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

// 8. Global Error Handler
app.use((err, _req, res, _next) => {
  const status = Number(err?.status || err?.statusCode || 500);
  if (status >= 500) {
    console.error("Server error:", err);
  }
  res.status(status).json({ error: err?.message || "Internal server error." });
});

// 9. Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Sreesaraswathi Dental Clinic server running on port ${PORT}`);
  console.log(`🌐 Website entry: http://localhost:${PORT}`);
});

export default app;
