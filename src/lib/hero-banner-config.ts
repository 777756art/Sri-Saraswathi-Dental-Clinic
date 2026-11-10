export interface HeroBannerConfig {
  overlayColor: string;
  overlayOpacity: number;
  btnColor: string;
  btnOpacity: number;
}

export const DEFAULT_HERO_CONFIG: HeroBannerConfig = {
  overlayColor: "#ffffff",
  overlayOpacity: 85,
  btnColor: "#ed2f79",
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

export function parseHeroStyleConfig(raw?: string): HeroBannerConfig {
  if (!raw) return { ...DEFAULT_HERO_CONFIG };
  try {
    const data = JSON.parse(raw);
    return {
      overlayColor:
        typeof data.overlayColor === "string" && data.overlayColor
          ? data.overlayColor
          : DEFAULT_HERO_CONFIG.overlayColor,
      overlayOpacity:
        typeof data.overlayOpacity === "number"
          ? Math.max(0, Math.min(100, data.overlayOpacity))
          : DEFAULT_HERO_CONFIG.overlayOpacity,
      btnColor:
        typeof data.btnColor === "string" && data.btnColor
          ? data.btnColor
          : DEFAULT_HERO_CONFIG.btnColor,
      btnOpacity:
        typeof data.btnOpacity === "number"
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
  let cleanHex = (hex || "#ed2f79").trim().replace("#", "");
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
