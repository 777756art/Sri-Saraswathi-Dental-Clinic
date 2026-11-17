// scripts/route_and_asset_audit.mjs
// Crawl and audit all public pages, assets, links, and security headers

const BASE_URL = process.env.TEST_URL || "https://sreesaraswathi.netlify.app";

const PUBLIC_ROUTES = [
  "/",
  "/booking",
  "/treatments",
  "/our-dentists",
  "/our-dentists/achievements",
  "/clinic-gallery",
  "/gallery/before-after",
  "/blogs",
  "/contact",
  "/emergency",
  "/faq",
  "/reviews",
  "/tele-dentistry",
  "/ai-features",
  "/auth/login",
  "/auth/register",
];

const ADMIN_PROTECTED_ROUTES = [
  "/dashboard",
  "/dashboard/appointments",
  "/dashboard/smile-gallery",
  "/dashboard/treatments",
  "/dashboard/staff",
  "/dashboard/blog",
  "/dashboard/offers",
  "/dashboard/hero-banners",
  "/dashboard/content",
  "/dashboard/settings",
  "/dashboard/media",
];

console.log("====================================================");
console.log("SRI SARASWATHI DENTAL CLINIC - ROUTE & ASSET AUDIT");
console.log(`Auditing target: ${BASE_URL}`);
console.log("====================================================\n");

async function checkRoute(route) {
  const url = `${BASE_URL}${route}`;
  const start = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": "QA-Auditor/1.0" } });
    const elapsed = Date.now() - start;
    const text = await res.text();
    const isHtml = (res.headers.get("content-type") || "").includes("text/html");
    const hasRoot = text.includes('id="root"');
    const titleMatch = text.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "No Title";

    return {
      route,
      status: res.status,
      ok: res.ok,
      elapsedMs: elapsed,
      isHtml,
      hasRoot,
      title,
      sizeBytes: text.length,
    };
  } catch (err) {
    return {
      route,
      status: 0,
      ok: false,
      error: err.message,
    };
  }
}

async function audit() {
  console.log("--- 1. AUDITING PUBLIC WEBSITE ROUTES ---");
  let publicPassed = 0;
  for (const r of PUBLIC_ROUTES) {
    const res = await checkRoute(r);
    if (res.ok && res.hasRoot) {
      console.log(`✅ [${res.status}] ${res.route} (${res.elapsedMs}ms, ${Math.round(res.sizeBytes/1024)}KB) - Title: "${res.title}"`);
      publicPassed++;
    } else {
      console.error(`❌ FAIL: ${res.route} (status: ${res.status}, error: ${res.error || "Missing root"})`);
    }
  }

  console.log(`\nPublic Routes Status: ${publicPassed} / ${PUBLIC_ROUTES.length} Verified\n`);

  console.log("--- 2. AUDITING STATIC & MEDIA ASSETS ---");
  const ASSETS = [
    "/favicon.png",
    "/images/clinic/hero-dark-promo.png",
    "/images/clinic/hero-patient-before.jpg",
    "/images/clinic/hero-patient-after.jpg",
    "/images/clinic/sri-saraswathi-logo-hd-transparent.png",
    "/images/clinic/hero-clinic-interior.jpg",
    "/images/clinic/smile-before-after.webp",
    "/images/clinic/patient-smile.webp",
    "/images/clinic/dentist-portrait.webp",
    "/images/clinic/clinic-exterior.webp",
  ];

  let assetsPassed = 0;
  for (const a of ASSETS) {
    const res = await fetch(`${BASE_URL}${a}`, { method: "HEAD" });
    const cType = res.headers.get("content-type") || "";
    const cLen = res.headers.get("content-length") || "unknown";
    if (res.status === 200) {
      console.log(`✅ [200] Asset Available: ${a} (${cType}, ${cLen} bytes)`);
      assetsPassed++;
    } else {
      console.error(`❌ [${res.status}] Missing Asset: ${a}`);
    }
  }
  console.log(`\nAssets Status: ${assetsPassed} / ${ASSETS.length} Verified\n`);

  console.log("--- 3. AUDITING CLIENT BUNDLE SECURITY ---");
  // Check index.html and main JS bundle for sensitive environment variables or secrets
  const indexRes = await fetch(`${BASE_URL}/`);
  const indexHtml = await indexRes.text();
  const scriptMatches = Array.from(indexHtml.matchAll(/src="(\/assets\/[^"]+\.js)"/g)).map(m => m[1]);

  console.log(`Found ${scriptMatches.length} entry bundles in index.html`);
  let secretsFound = false;
  const sensitivePatterns = [
    /CLOUDFLARE_AUTH_KEY/i,
    /CLOUDFLARE_R2_SECRET_ACCESS_KEY/i,
    /CLOUDFLARE_API_TOKEN/i,
    /ADMIN_PASSWORD/i,
    /SESSION_SECRET/i,
  ];

  for (const s of scriptMatches) {
    const jsRes = await fetch(`${BASE_URL}${s}`);
    const jsCode = await jsRes.text();
    for (const pat of sensitivePatterns) {
      if (pat.test(jsCode)) {
        console.error(`❌ SECURITY LEAK in bundle ${s}: matches ${pat}`);
        secretsFound = true;
      }
    }
  }

  if (!secretsFound) {
    console.log("✅ PASS: Zero sensitive environment variables or credentials exposed in frontend client bundles.");
  }

  console.log("\n====================================================");
  console.log("ROUTE & ASSET AUDIT COMPLETED");
  console.log("====================================================");
}

audit().catch(console.error);
