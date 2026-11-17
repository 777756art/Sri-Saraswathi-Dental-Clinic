// scripts/test_theme_colors.mjs
// Automated Verification Suite for Minimal Website Colour Customization
// Sri Saraswathi Dental Clinic

import http from "node:http";
import https from "node:https";

const BASE_URL = process.env.TEST_URL || "https://sreesaraswathi.netlify.app";

function request(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const client = url.protocol === "https:" ? https : http;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const req = client.request(
      url,
      {
        method: options.method || "GET",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        });
      }
    );

    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

const DEFAULT_EXPECTED = {
  primary: "#1F6878",
  secondary: "#E4F0F2",
  accent: "#E95A35",
  background: "#F5F2EB",
  text: "#15191B",
  header: "#FFFFFF",
  footer: "#1F6878",
};

function hexToHsl(hex) {
  const clean = hex.replace("#", "").trim();
  let r = 0, g = 0, b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  } else {
    return null;
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  return `${hDeg} ${sPct}% ${lPct}%`;
}

async function run() {
  console.log("====================================================");
  console.log("THEME COLOUR CUSTOMIZATION - VERIFICATION TEST SUITE");
  console.log("Target:", BASE_URL);
  console.log("====================================================\n");

  let passes = 0;
  let fails = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passes++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      fails++;
    }
  }

  // 1. Math & Token Conversion Check
  console.log("--- 1. HSL TOKEN CONVERSION & DESIGN SYSTEM MATCH ---");
  assert(hexToHsl(DEFAULT_EXPECTED.primary) === "191 59% 30%", "Primary #1F6878 maps exactly to 191 59% 30%");
  assert(hexToHsl(DEFAULT_EXPECTED.secondary) === "189 35% 92%", "Secondary #E4F0F2 maps exactly to 189 35% 92%");
  assert(hexToHsl(DEFAULT_EXPECTED.accent) === "12 80% 56%", "Accent #E95A35 maps exactly to 12 80% 56%");
  assert(hexToHsl(DEFAULT_EXPECTED.background) === "42 33% 94%", "Background #F5F2EB maps exactly to 42 33% 94%");
  assert(hexToHsl(DEFAULT_EXPECTED.text) === "200 13% 9%", "Text #15191B maps exactly to 200 13% 9%");

  // 2. Public API endpoint
  console.log("\n--- 2. PUBLIC THEME COLORS API ---");
  const publicRes = await request("/api/theme-colors");
  assert(publicRes.status === 200, `Public endpoint /api/theme-colors returns 200 OK (got ${publicRes.status})`);
  const publicColors = publicRes.data?.colors || {};
  assert(Boolean(publicColors.primary), `Primary colour returned: ${publicColors.primary}`);
  assert(Boolean(publicColors.secondary), `Secondary colour returned: ${publicColors.secondary}`);
  assert(Boolean(publicColors.accent), `Accent colour returned: ${publicColors.accent}`);
  assert(Boolean(publicColors.background), `Background colour returned: ${publicColors.background}`);
  assert(Boolean(publicColors.text), `Text colour returned: ${publicColors.text}`);
  assert(Boolean(publicColors.header), `Header colour returned: ${publicColors.header}`);
  assert(Boolean(publicColors.footer), `Footer colour returned: ${publicColors.footer}`);

  // 3. Security & Access Control
  console.log("\n--- 3. SECURITY & ACCESS CONTROL ---");
  const unauthPatch = await request("/api/admin/theme-colors", {
    method: "PATCH",
    body: { primary: "#000000" },
  });
  assert(unauthPatch.status === 401, `Unauthenticated PATCH /api/admin/theme-colors blocked with 401 (got ${unauthPatch.status})`);

  const unauthReset = await request("/api/admin/theme-colors/reset", {
    method: "POST",
  });
  assert(unauthReset.status === 401, `Unauthenticated POST /api/admin/theme-colors/reset blocked with 401 (got ${unauthReset.status})`);

  console.log("\n====================================================");
  console.log(`TEST SUITE SUMMARY: ${passes} PASSED, ${fails} FAILED`);
  console.log("====================================================");

  if (fails > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
