// server/seo-routes.mjs
// Sreesaraswathi Dental Clinic – SEO & Technical Sitemap / Robots.txt Engine
// Primary Domain: https://drkishoredentist.com
// Physical Location: 866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009

export function registerSeoRoutes(app, d1, requireAdmin) {
  const BASE_URL = "https://drkishoredentist.com";

  // 1. Dynamic XML Sitemap
  app.get(["/sitemap.xml", "/api/sitemap.xml"], async (_req, res) => {
    try {
      const todayISO = new Date().toISOString().split("T")[0];

      // Static indexable public routes
      const staticUrls = [
        { loc: `${BASE_URL}/`, priority: "1.0", changefreq: "daily" },
        { loc: `${BASE_URL}/treatments`, priority: "0.9", changefreq: "weekly" },
        { loc: `${BASE_URL}/our-dentists`, priority: "0.8", changefreq: "weekly" },
        { loc: `${BASE_URL}/our-dentists/achievements`, priority: "0.7", changefreq: "monthly" },
        { loc: `${BASE_URL}/contact`, priority: "0.8", changefreq: "monthly" },
        { loc: `${BASE_URL}/booking`, priority: "0.8", changefreq: "monthly" },
        { loc: `${BASE_URL}/emergency`, priority: "0.8", changefreq: "monthly" },
        { loc: `${BASE_URL}/reviews`, priority: "0.7", changefreq: "weekly" },
        { loc: `${BASE_URL}/faq`, priority: "0.7", changefreq: "monthly" },
        { loc: `${BASE_URL}/clinic-gallery`, priority: "0.6", changefreq: "monthly" },
        { loc: `${BASE_URL}/gallery/before-after`, priority: "0.7", changefreq: "monthly" },
        { loc: `${BASE_URL}/blogs`, priority: "0.8", changefreq: "weekly" },
        { loc: `${BASE_URL}/tele-dentistry`, priority: "0.6", changefreq: "monthly" },
        { loc: `${BASE_URL}/ai-features`, priority: "0.6", changefreq: "monthly" },
      ];

      // Fetch dynamic active treatments
      let treatmentUrls = [];
      try {
        const treatments = await d1.prepare(`
          SELECT slug, updated_at FROM site_content WHERE type = 'treatment' AND published = 1
          UNION
          SELECT slug, updated_at FROM treatments WHERE status = 'active'
        `).all();
        
        const seenSlugs = new Set();
        for (const t of treatments.results || []) {
          const slug = String(t.slug || "").trim();
          if (slug && !seenSlugs.has(slug)) {
            seenSlugs.add(slug);
            const modDate = t.updated_at ? String(t.updated_at).split(" ")[0] : todayISO;
            treatmentUrls.push({
              loc: `${BASE_URL}/treatments/${encodeURIComponent(slug)}`,
              priority: "0.8",
              changefreq: "weekly",
              lastmod: modDate,
            });
          }
        }
      } catch (err) {
        console.warn("Sitemap treatments notice:", err?.message || err);
      }

      // Fetch dynamic published blogs
      let blogUrls = [];
      try {
        const blogs = await d1.prepare(`
          SELECT slug, updated_at FROM site_content WHERE type = 'blog' AND published = 1
        `).all();

        const seenBlogSlugs = new Set();
        for (const b of blogs.results || []) {
          const slug = String(b.slug || "").trim();
          if (slug && !seenBlogSlugs.has(slug)) {
            seenBlogSlugs.add(slug);
            const modDate = b.updated_at ? String(b.updated_at).split(" ")[0] : todayISO;
            blogUrls.push({
              loc: `${BASE_URL}/blog/${encodeURIComponent(slug)}`,
              priority: "0.7",
              changefreq: "monthly",
              lastmod: modDate,
            });
          }
        }
      } catch (err) {
        console.warn("Sitemap blogs notice:", err?.message || err);
      }

      // Fetch dynamic doctor profiles
      let doctorUrls = [];
      try {
        const docs = await d1.prepare(`
          SELECT slug, updated_at FROM site_content WHERE type = 'doctor' AND published = 1
        `).all();
        for (const d of docs.results || []) {
          const slug = String(d.slug || "").trim();
          if (slug) {
            const modDate = d.updated_at ? String(d.updated_at).split(" ")[0] : todayISO;
            doctorUrls.push({
              loc: `${BASE_URL}/our-dentists/${encodeURIComponent(slug)}`,
              priority: "0.7",
              changefreq: "monthly",
              lastmod: modDate,
            });
          }
        }
      } catch {
        // ignore
      }

      const allUrls = [...staticUrls, ...treatmentUrls, ...blogUrls, ...doctorUrls];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || todayISO}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
      res.send(xml);
    } catch (err) {
      res.status(500).send("Error generating sitemap.");
    }
  });

  // 2. Dynamic Robots.txt
  app.get(["/robots.txt", "/api/robots.txt"], (_req, res) => {
    const robots = `# Robots.txt for Sreesaraswathi Dental Clinic
# Official Website: ${BASE_URL}
# Physical Location: Surampatti, Erode, Tamil Nadu 638009

User-agent: *
Allow: /
Allow: /treatments/
Allow: /our-dentists/
Allow: /blogs/
Allow: /blog/
Allow: /contact
Allow: /booking
Allow: /emergency
Allow: /reviews
Allow: /faq
Allow: /clinic-gallery

# Disallow private dashboards, authentication, and patient portal
Disallow: /admin
Disallow: /admin/
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /auth/
Disallow: /patient/
Disallow: /patient-portal/
Disallow: /api/

# Official XML Sitemap
Sitemap: ${BASE_URL}/sitemap.xml
`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(robots);
  });

  // 3. Public SEO Settings API
  app.get("/api/seo/settings", async (_req, res) => {
    try {
      const row = (await d1.prepare("SELECT * FROM seo_settings WHERE id = 1").first()) || {};
      let pageOverrides = {};
      try {
        pageOverrides = typeof row.page_overrides === "string" ? JSON.parse(row.page_overrides) : row.page_overrides || {};
      } catch {
        pageOverrides = {};
      }

      res.json({
        ok: true,
        siteTitle: row.site_title || "Sreesaraswathi Dental Clinic | Dentist & Dental Care in Erode",
        defaultDescription:
          row.default_description ||
          "Looking for professional dental care? Explore dental treatments, meet our doctors and book your appointment at Sreesaraswathi Dental Clinic in Erode.",
        canonicalDomain: row.canonical_domain || BASE_URL,
        googleSiteVerification: row.google_site_verification || "",
        googleAnalyticsId: row.google_analytics_id || "",
        defaultOgImage: row.default_og_image || "/images/clinic/clinic-exterior.webp",
        indexingEnabled: Boolean(row.indexing_enabled !== 0),
        pageOverrides,
        updatedAt: row.updated_at,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to load SEO settings." });
    }
  });

  // 4. Admin SEO Settings Endpoints
  app.get("/api/admin/seo/settings", requireAdmin, async (_req, res) => {
    try {
      const row = (await d1.prepare("SELECT * FROM seo_settings WHERE id = 1").first()) || {};
      let pageOverrides = {};
      try {
        pageOverrides = typeof row.page_overrides === "string" ? JSON.parse(row.page_overrides) : row.page_overrides || {};
      } catch {
        pageOverrides = {};
      }

      // Gather audit statistics
      const [treatmentCount, blogCount, doctorCount] = await Promise.all([
        d1.prepare("SELECT COUNT(*) as count FROM treatments WHERE status = 'active'").first("count").catch(() => 0),
        d1.prepare("SELECT COUNT(*) as count FROM site_content WHERE type = 'blog' AND published = 1").first("count").catch(() => 0),
        d1.prepare("SELECT COUNT(*) as count FROM doctors WHERE status = 'active'").first("count").catch(() => 0),
      ]);

      res.json({
        ok: true,
        settings: {
          siteTitle: row.site_title || "Sreesaraswathi Dental Clinic | Dentist & Dental Care in Erode",
          defaultDescription:
            row.default_description ||
            "Looking for professional dental care? Explore dental treatments, meet our doctors and book your appointment at Sreesaraswathi Dental Clinic in Erode.",
          canonicalDomain: row.canonical_domain || BASE_URL,
          googleSiteVerification: row.google_site_verification || "",
          googleAnalyticsId: row.google_analytics_id || "",
          defaultOgImage: row.default_og_image || "/images/clinic/clinic-exterior.webp",
          indexingEnabled: Boolean(row.indexing_enabled !== 0),
          pageOverrides,
          updatedAt: row.updated_at,
        },
        audit: {
          sitemapUrl: `${row.canonical_domain || BASE_URL}/sitemap.xml`,
          robotsUrl: `${row.canonical_domain || BASE_URL}/robots.txt`,
          activeTreatments: Number(treatmentCount || 0),
          publishedBlogs: Number(blogCount || 0),
          activeDoctors: Number(doctorCount || 0),
          canonicalConfigured: true,
          googleBusinessProfileLinked: true,
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch admin SEO settings." });
    }
  });

  // Update Admin SEO Settings
  app.put("/api/admin/seo/settings", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const siteTitle = String(b.siteTitle || "Sreesaraswathi Dental Clinic | Dentist & Dental Care in Erode").trim();
      const defaultDescription = String(b.defaultDescription || "").trim();
      const canonicalDomain = String(b.canonicalDomain || BASE_URL).trim().replace(/\/+$/, "");
      const googleSiteVerification = String(b.googleSiteVerification || "").trim();
      const googleAnalyticsId = String(b.googleAnalyticsId || "").trim();
      const defaultOgImage = String(b.defaultOgImage || "/images/clinic/clinic-exterior.webp").trim();
      const indexingEnabled = b.indexingEnabled === false ? 0 : 1;
      
      let pageOverrides = b.pageOverrides;
      if (typeof pageOverrides === "object") {
        pageOverrides = JSON.stringify(pageOverrides);
      } else if (typeof pageOverrides !== "string") {
        pageOverrides = "{}";
      }

      await d1.prepare(`
        INSERT INTO seo_settings (
          id, site_title, default_description, canonical_domain, google_site_verification,
          google_analytics_id, default_og_image, indexing_enabled, page_overrides, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          site_title = excluded.site_title,
          default_description = excluded.default_description,
          canonical_domain = excluded.canonical_domain,
          google_site_verification = excluded.google_site_verification,
          google_analytics_id = excluded.google_analytics_id,
          default_og_image = excluded.default_og_image,
          indexing_enabled = excluded.indexing_enabled,
          page_overrides = excluded.page_overrides,
          updated_at = datetime('now')
      `).bind(
        siteTitle,
        defaultDescription,
        canonicalDomain,
        googleSiteVerification,
        googleAnalyticsId,
        defaultOgImage,
        indexingEnabled,
        pageOverrides
      ).run();

      res.json({ ok: true, message: "SEO settings saved successfully." });
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to update SEO settings." });
    }
  });
}
