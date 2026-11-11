export interface HeroBannerConfig {
  overlayColor: string;
  overlayOpacity: number;
  btnColor: string;
  btnOpacity: number;
}

export const DEFAULT_HERO_CONFIG: HeroBannerConfig = {
  overlayColor: "#F5F2EB",
  overlayOpacity: 85,
  btnColor: "#E95A35",
  btnOpacity: 100,
};

export const DEFAULT_HERO_CONTENT = {
  title: "Your Smile Deserves Expert Care. A Lifetime of Confidence",
  description:
    "From your child's first dental visit to advanced smile transformations, our team brings compassionate care, modern treatments, and personalized attention together under one roof. Discover a dental experience where comfort comes first, every concern is heard, and every smile matters.",
  heroImage: "/images/clinic/hero-glass-clinic.jpg",
  backgroundImage: "/images/clinic/hero-clinic-interior.jpg",
  btnText: "Book an appointment",
  btnLink: "/booking",
};

const LEGACY_HEX_MAP: Record<string, string> = {
  "#f02d7a": "#E95A35",
  "#d61f69": "#D14824",
  "#d94383": "#E95A35",
  "#ed2f79": "#E95A35",
  "#e83e8c": "#E95A35",
  "#c92367": "#E95A35",
  "#be326e": "#D14824",
  "#087f5b": "#1F6878",
  "#0e8a5e": "#1F6878",
  "#073b43": "#1F6878",
  "#176b55": "#1F6878",
  "#123d46": "#1F6878",
  "#faf8f4": "#F5F2EB",
  "#fbf8f2": "#F5F2EB",
  "#e6f4ec": "#E4F0F2",
  "#e9f2eb": "#E4F0F2",
  "#fce8f0": "#E4F0F2",
  "#f8e8ef": "#E4F0F2",
};

function isLegacyHex(value: unknown): boolean {
  return typeof value === "string" && Boolean(LEGACY_HEX_MAP[value.trim().toLowerCase()]);
}

function normalizeBrandHex(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const trimmed = value.trim();
  return LEGACY_HEX_MAP[trimmed.toLowerCase()] || trimmed;
}

export function parseHeroStyleConfig(raw?: string): HeroBannerConfig {
  if (!raw) return { ...DEFAULT_HERO_CONFIG };
  try {
    const data = JSON.parse(raw);
    const migratedLegacyBtn = isLegacyHex(data.btnColor);
    return {
      overlayColor: normalizeBrandHex(data.overlayColor, DEFAULT_HERO_CONFIG.overlayColor),
      overlayOpacity:
        typeof data.overlayOpacity === "number"
          ? Math.max(0, Math.min(100, data.overlayOpacity))
          : DEFAULT_HERO_CONFIG.overlayOpacity,
      btnColor: normalizeBrandHex(data.btnColor, DEFAULT_HERO_CONFIG.btnColor),
      btnOpacity: migratedLegacyBtn
        ? DEFAULT_HERO_CONFIG.btnOpacity
        : typeof data.btnOpacity === "number"
          ? Math.max(0, Math.min(100, data.btnOpacity))
          : DEFAULT_HERO_CONFIG.btnOpacity,
    };
  } catch {
    return { ...DEFAULT_HERO_CONFIG };
  }
}

export function serializeHeroStyleConfig(config: HeroBannerConfig): string {
  return JSON.stringify({
    overlayColor: config.overlayColor,
    overlayOpacity: config.overlayOpacity,
    btnColor: config.btnColor,
    btnOpacity: config.btnOpacity,
  });
}

export function hexToRgba(hex: string, alpha: number): string {
  let cleanHex = (hex || "#E95A35").trim().replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (cleanHex.length !== 6) return hex;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}
