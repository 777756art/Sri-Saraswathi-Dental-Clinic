// src/components/seo/SEOHead.tsx
// Production-ready dynamic SEO Head component
// Manages document title, meta tags, Open Graph, Twitter cards, canonical links, and JSON-LD schemas

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { CLINIC_BASE_URL, CLINIC_NAP } from "./schemas";

export type SEOHeadProps = {
  title?: string;
  description?: string;
  keywords?: string | string[];
  canonical?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
  noindex?: boolean;
  schema?: object | object[];
  article?: {
    datePublished?: string;
    dateModified?: string;
    author?: string;
  };
};

const DEFAULT_TITLE = "Sreesaraswathi Dental Clinic | Dentist & Dental Care in Erode";
const DEFAULT_DESCRIPTION =
  "Looking for professional dental care? Explore dental treatments, meet our doctors and book your appointment at Sreesaraswathi Dental Clinic in Erode.";
const DEFAULT_KEYWORDS = [
  "Dentist in Erode",
  "Dental Clinic in Erode",
  "Best Dentist in Erode",
  "Dental Hospital in Erode",
  "Root Canal Treatment in Erode",
  "Teeth Cleaning in Erode",
  "Dental Implants in Erode",
  "Teeth Whitening in Erode",
  "Braces Treatment in Erode",
  "Dr Kishore Kumar Dentist",
  "Surampatti Dental Clinic",
];

export function SEOHead({
  title,
  description,
  keywords,
  canonical,
  canonicalPath,
  ogImage,
  ogType = "website",
  noindex = false,
  schema,
  article,
}: SEOHeadProps) {
  const location = useLocation();

  useEffect(() => {
    const finalTitle = title ? `${title}` : DEFAULT_TITLE;
    const finalDesc = description || DEFAULT_DESCRIPTION;
    const rawPath = canonicalPath ?? canonical ?? location.pathname;
    const canonicalUrl = rawPath.startsWith("http")
      ? rawPath
      : `${CLINIC_BASE_URL}${rawPath.startsWith("/") ? rawPath : `/${rawPath}`}`.replace(/\/+$/, "") || CLINIC_BASE_URL;
    const finalImage = ogImage
      ? ogImage.startsWith("http")
        ? ogImage
        : `${CLINIC_BASE_URL}${ogImage.startsWith("/") ? ogImage : `/${ogImage}`}`
      : `${CLINIC_BASE_URL}/images/clinic/clinic-exterior.webp`;

    const finalKeywords = Array.isArray(keywords)
      ? keywords.join(", ")
      : keywords || DEFAULT_KEYWORDS.join(", ");

    // 1. Update Title
    document.title = finalTitle;

    // Helper function to update or create meta tags
    const setMeta = (nameOrProperty: string, value: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${nameOrProperty}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, nameOrProperty);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    };

    // 2. Standard Meta Tags
    setMeta("description", finalDesc);
    setMeta("keywords", finalKeywords);
    setMeta(
      "robots",
      noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    );

    // 3. Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonicalUrl);

    // 4. Open Graph Tags
    setMeta("og:site_name", CLINIC_NAP.name, true);
    setMeta("og:title", finalTitle, true);
    setMeta("og:description", finalDesc, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:image", finalImage, true);
    setMeta("og:type", ogType, true);
    setMeta("og:locale", "en_IN", true);

    if (article) {
      if (article.datePublished) setMeta("article:published_time", article.datePublished, true);
      if (article.dateModified) setMeta("article:modified_time", article.dateModified, true);
      if (article.author) setMeta("article:author", article.author, true);
    }

    // 5. Twitter Card Tags
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", finalTitle);
    setMeta("twitter:description", finalDesc);
    setMeta("twitter:image", finalImage);

    // 6. JSON-LD Schemas injection
    const scriptElements: HTMLScriptElement[] = [];
    if (schema) {
      const schemaList = Array.isArray(schema) ? schema : [schema];
      schemaList.forEach((s, idx) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = `dynamic-jsonld-${idx}`;
        script.text = JSON.stringify(s);
        document.head.appendChild(script);
        scriptElements.push(script);
      });
    }

    // Cleanup on unmount or route change
    return () => {
      scriptElements.forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, [
    title,
    description,
    keywords,
    canonical,
    canonicalPath,
    ogImage,
    ogType,
    noindex,
    schema,
    article,
    location.pathname,
  ]);

  return null;
}
