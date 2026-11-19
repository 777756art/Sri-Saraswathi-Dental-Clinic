export interface HeroVisibilitySettings {
  showBadge: boolean;
  showClinicName: boolean;
  showTagline: boolean;
  showHeading: boolean;
  showDescription: boolean;
  showRatings: boolean;
  showStats: boolean;
  showPrimaryCta: boolean;
  showSecondaryCta: boolean;
  showHeroImage: boolean;
  showShowcase: boolean;
}

export interface HeroSectionSettings {
  // 1. Basic Information & Status
  published: boolean;
  badgeText: string;

  // 2. Clinic Branding
  clinicName: string;
  clinicTagline: string;

  // 3. Hero Heading & Description
  heading: string;
  description: string;

  // 4. Buttons & Links
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  btnColor: string;
  btnOpacity: number;

  // 5. Statistics & Ratings
  statExperienceValue: string;
  statExperienceLabel: string;
  statPatientsValue: string;
  statPatientsLabel: string;
  statSpecialistsValue: string;
  statSpecialistsLabel: string;
  ratingScore: string;
  reviewCount: string;
  subCaption: string;

  // 6. Right-Side Hero Visual & Background
  heroImage: string;
  heroImageAlt: string;
  backgroundImage: string;
  overlayColor: string;
  overlayOpacity: number;
  badgeExperience: string;
  badgeExperienceLabel: string;
  cardRatingScore: string;
  cardReviewText: string;

  // 7. Transformation Showcase
  showcaseHeading: string;
  showcaseSubtitle: string;
  showcaseBeforeImg: string;
  showcaseAfterImg: string;
  showcaseBeforeLabel: string;
  showcaseAfterLabel: string;
  showcaseTreatment: string;
  showcaseLink: string;

  // 8. Visibility Settings
  visibility: HeroVisibilitySettings;
}

export const DEFAULT_HERO_VISIBILITY: HeroVisibilitySettings = {
  showBadge: true,
  showClinicName: true,
  showTagline: true,
  showHeading: true,
  showDescription: true,
  showRatings: true,
  showStats: true,
  showPrimaryCta: true,
  showSecondaryCta: true,
  showHeroImage: true,
  showShowcase: true,
};

export const DEFAULT_HERO_SETTINGS: HeroSectionSettings = {
  published: true,
  badgeText: "Complete Dental Care for Every Generation",
  clinicName: "Sri Saraswathi Dental Clinic",
  clinicTagline: "Creating Healthy Smiles, Changing Lives.",
  heading: "Your Smile Deserves Expert Care. A Lifetime of Confidence",
  description:
    "From your child's first dental visit to advanced smile transformations, our team brings compassionate care, modern treatments, and personalized attention together under one roof. Discover a dental experience where comfort comes first, every concern is heard, and every smile matters.",
  primaryCtaLabel: "Book a Visit",
  primaryCtaUrl: "/booking",
  secondaryCtaLabel: "Explore Treatments",
  secondaryCtaUrl: "/treatments",
  btnColor: "#E95A35",
  btnOpacity: 100,
  statExperienceValue: "8+ yrs",
  statExperienceLabel: "experience",
  statPatientsValue: "18,000+",
  statPatientsLabel: "patients",
  statSpecialistsValue: "15+",
  statSpecialistsLabel: "specialists",
  ratingScore: "4.8",
  reviewCount: "1.1k",
  subCaption: "Caring for Coimbatore & Erode smiles since 2017 · Sri Saraswathi Dental Clinic",
  heroImage: "/images/clinic/hero-promotional-default.jpg",
  heroImageAlt: "Sri Saraswathi Dental Clinic - 12+ Years of Excellence",
  backgroundImage: "/images/clinic/hero-clinic-interior.jpg",
  overlayColor: "#ffffff",
  overlayOpacity: 75,
  badgeExperience: "12 +",
  badgeExperienceLabel: "Years of Excellence",
  cardRatingScore: "4.8 Rating",
  cardReviewText: "Verified Patient Reviews",
  showcaseHeading: "REAL SMILES. CONFIDENT RESULTS.",
  showcaseSubtitle: "Your Smile Transformation Starts Here.",
  showcaseBeforeImg: "/images/clinic/hero-patient-before.jpg",
  showcaseAfterImg: "/images/clinic/hero-patient-after.jpg",
  showcaseBeforeLabel: "BEFORE",
  showcaseAfterLabel: "AFTER",
  showcaseTreatment: "Smile Makeover",
  showcaseLink: "/smile-gallery",
  visibility: { ...DEFAULT_HERO_VISIBILITY },
};

// Backward-compatible interface
export interface HeroBannerConfig {
  overlayColor: string;
  overlayOpacity: number;
  btnColor: string;
  btnOpacity: number;
}

export const DEFAULT_HERO_CONFIG: HeroBannerConfig = {
  overlayColor: DEFAULT_HERO_SETTINGS.overlayColor,
  overlayOpacity: DEFAULT_HERO_SETTINGS.overlayOpacity,
  btnColor: DEFAULT_HERO_SETTINGS.btnColor,
  btnOpacity: DEFAULT_HERO_SETTINGS.btnOpacity,
};

export const DEFAULT_HERO_CONTENT = {
  title: DEFAULT_HERO_SETTINGS.heading,
  description: DEFAULT_HERO_SETTINGS.description,
  heroImage: DEFAULT_HERO_SETTINGS.heroImage,
  backgroundImage: DEFAULT_HERO_SETTINGS.backgroundImage,
  btnText: DEFAULT_HERO_SETTINGS.primaryCtaLabel,
  btnLink: DEFAULT_HERO_SETTINGS.primaryCtaUrl,
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

function normalizeBrandHex(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const trimmed = value.trim();
  return LEGACY_HEX_MAP[trimmed.toLowerCase()] || trimmed;
}

export function parseHeroStyleConfig(raw?: string): HeroBannerConfig {
  if (!raw) return { ...DEFAULT_HERO_CONFIG };
  try {
    const data = JSON.parse(raw);
    return {
      overlayColor: normalizeBrandHex(data.overlayColor, DEFAULT_HERO_CONFIG.overlayColor),
      overlayOpacity:
        typeof data.overlayOpacity === "number"
          ? Math.max(0, Math.min(100, data.overlayOpacity))
          : DEFAULT_HERO_CONFIG.overlayOpacity,
      btnColor: normalizeBrandHex(data.btnColor, DEFAULT_HERO_CONFIG.btnColor),
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

/**
 * Parses full dynamic Hero Section settings from site_content row
 */
export function parseHeroSectionSettings(banner?: any): HeroSectionSettings {
  if (!banner) return { ...DEFAULT_HERO_SETTINGS };

  let extraData: any = {};
  if (banner.seoDescription) {
    try {
      extraData = JSON.parse(banner.seoDescription);
    } catch {
      extraData = {};
    }
  }

  const visibility: HeroVisibilitySettings = {
    showBadge: extraData.visibility?.showBadge ?? DEFAULT_HERO_VISIBILITY.showBadge,
    showClinicName: extraData.visibility?.showClinicName ?? DEFAULT_HERO_VISIBILITY.showClinicName,
    showTagline: extraData.visibility?.showTagline ?? DEFAULT_HERO_VISIBILITY.showTagline,
    showHeading: extraData.visibility?.showHeading ?? DEFAULT_HERO_VISIBILITY.showHeading,
    showDescription: extraData.visibility?.showDescription ?? DEFAULT_HERO_VISIBILITY.showDescription,
    showRatings: extraData.visibility?.showRatings ?? DEFAULT_HERO_VISIBILITY.showRatings,
    showStats: extraData.visibility?.showStats ?? DEFAULT_HERO_VISIBILITY.showStats,
    showPrimaryCta: extraData.visibility?.showPrimaryCta ?? DEFAULT_HERO_VISIBILITY.showPrimaryCta,
    showSecondaryCta: extraData.visibility?.showSecondaryCta ?? DEFAULT_HERO_VISIBILITY.showSecondaryCta,
    showHeroImage: extraData.visibility?.showHeroImage ?? DEFAULT_HERO_VISIBILITY.showHeroImage,
    showShowcase: extraData.visibility?.showShowcase ?? DEFAULT_HERO_VISIBILITY.showShowcase,
  };

  return {
    published: banner.published !== false,
    badgeText: banner.badgeText || extraData.badgeText || DEFAULT_HERO_SETTINGS.badgeText,
    clinicName: extraData.clinicName || banner.subtitle || DEFAULT_HERO_SETTINGS.clinicName,
    clinicTagline: extraData.clinicTagline || DEFAULT_HERO_SETTINGS.clinicTagline,
    heading: banner.title || extraData.heading || DEFAULT_HERO_SETTINGS.heading,
    description: banner.body || extraData.description || DEFAULT_HERO_SETTINGS.description,
    primaryCtaLabel: banner.ctaLabel || extraData.primaryCtaLabel || DEFAULT_HERO_SETTINGS.primaryCtaLabel,
    primaryCtaUrl: banner.linkUrl || extraData.primaryCtaUrl || DEFAULT_HERO_SETTINGS.primaryCtaUrl,
    secondaryCtaLabel: banner.secondaryCtaLabel || extraData.secondaryCtaLabel || DEFAULT_HERO_SETTINGS.secondaryCtaLabel,
    secondaryCtaUrl: banner.secondaryCtaUrl || extraData.secondaryCtaUrl || DEFAULT_HERO_SETTINGS.secondaryCtaUrl,
    btnColor: normalizeBrandHex(extraData.btnColor, DEFAULT_HERO_SETTINGS.btnColor),
    btnOpacity: typeof extraData.btnOpacity === "number" ? extraData.btnOpacity : DEFAULT_HERO_SETTINGS.btnOpacity,
    statExperienceValue: extraData.statExperienceValue || DEFAULT_HERO_SETTINGS.statExperienceValue,
    statExperienceLabel: extraData.statExperienceLabel || DEFAULT_HERO_SETTINGS.statExperienceLabel,
    statPatientsValue: extraData.statPatientsValue || DEFAULT_HERO_SETTINGS.statPatientsValue,
    statPatientsLabel: extraData.statPatientsLabel || DEFAULT_HERO_SETTINGS.statPatientsLabel,
    statSpecialistsValue: extraData.statSpecialistsValue || DEFAULT_HERO_SETTINGS.statSpecialistsValue,
    statSpecialistsLabel: extraData.statSpecialistsLabel || DEFAULT_HERO_SETTINGS.statSpecialistsLabel,
    ratingScore: banner.ratingScore || extraData.ratingScore || DEFAULT_HERO_SETTINGS.ratingScore,
    reviewCount: banner.reviewCount || extraData.reviewCount || DEFAULT_HERO_SETTINGS.reviewCount,
    subCaption: extraData.subCaption || DEFAULT_HERO_SETTINGS.subCaption,
    heroImage: banner.mediaUrl || extraData.heroImage || DEFAULT_HERO_SETTINGS.heroImage,
    heroImageAlt: extraData.heroImageAlt || DEFAULT_HERO_SETTINGS.heroImageAlt,
    backgroundImage: banner.mobileMediaUrl || extraData.backgroundImage || DEFAULT_HERO_SETTINGS.backgroundImage,
    overlayColor: normalizeBrandHex(extraData.overlayColor, DEFAULT_HERO_SETTINGS.overlayColor),
    overlayOpacity: typeof extraData.overlayOpacity === "number" ? extraData.overlayOpacity : DEFAULT_HERO_SETTINGS.overlayOpacity,
    badgeExperience: banner.trustBadgeText || extraData.badgeExperience || DEFAULT_HERO_SETTINGS.badgeExperience,
    badgeExperienceLabel: extraData.badgeExperienceLabel || DEFAULT_HERO_SETTINGS.badgeExperienceLabel,
    cardRatingScore: extraData.cardRatingScore || DEFAULT_HERO_SETTINGS.cardRatingScore,
    cardReviewText: extraData.cardReviewText || DEFAULT_HERO_SETTINGS.cardReviewText,
    showcaseHeading: extraData.showcaseHeading || DEFAULT_HERO_SETTINGS.showcaseHeading,
    showcaseSubtitle: extraData.showcaseSubtitle || DEFAULT_HERO_SETTINGS.showcaseSubtitle,
    showcaseBeforeImg: banner.beforeImage || extraData.showcaseBeforeImg || DEFAULT_HERO_SETTINGS.showcaseBeforeImg,
    showcaseAfterImg: banner.afterImage || extraData.showcaseAfterImg || DEFAULT_HERO_SETTINGS.showcaseAfterImg,
    showcaseBeforeLabel: extraData.showcaseBeforeLabel || DEFAULT_HERO_SETTINGS.showcaseBeforeLabel,
    showcaseAfterLabel: extraData.showcaseAfterLabel || DEFAULT_HERO_SETTINGS.showcaseAfterLabel,
    showcaseTreatment: extraData.showcaseTreatment || DEFAULT_HERO_SETTINGS.showcaseTreatment,
    showcaseLink: extraData.showcaseLink || DEFAULT_HERO_SETTINGS.showcaseLink,
    visibility,
  };
}

/**
 * Serializes dynamic Hero Section settings into a JSON string to store in seo_description
 */
export function serializeHeroSectionSettings(settings: HeroSectionSettings): string {
  return JSON.stringify({
    overlayColor: settings.overlayColor,
    overlayOpacity: settings.overlayOpacity,
    btnColor: settings.btnColor,
    btnOpacity: settings.btnOpacity,
    clinicName: settings.clinicName,
    clinicTagline: settings.clinicTagline,
    badgeText: settings.badgeText,
    heading: settings.heading,
    description: settings.description,
    primaryCtaLabel: settings.primaryCtaLabel,
    primaryCtaUrl: settings.primaryCtaUrl,
    secondaryCtaLabel: settings.secondaryCtaLabel,
    secondaryCtaUrl: settings.secondaryCtaUrl,
    statExperienceValue: settings.statExperienceValue,
    statExperienceLabel: settings.statExperienceLabel,
    statPatientsValue: settings.statPatientsValue,
    statPatientsLabel: settings.statPatientsLabel,
    statSpecialistsValue: settings.statSpecialistsValue,
    statSpecialistsLabel: settings.statSpecialistsLabel,
    ratingScore: settings.ratingScore,
    reviewCount: settings.reviewCount,
    subCaption: settings.subCaption,
    heroImage: settings.heroImage,
    heroImageAlt: settings.heroImageAlt,
    backgroundImage: settings.backgroundImage,
    badgeExperience: settings.badgeExperience,
    badgeExperienceLabel: settings.badgeExperienceLabel,
    cardRatingScore: settings.cardRatingScore,
    cardReviewText: settings.cardReviewText,
    showcaseHeading: settings.showcaseHeading,
    showcaseSubtitle: settings.showcaseSubtitle,
    showcaseBeforeImg: settings.showcaseBeforeImg,
    showcaseAfterImg: settings.showcaseAfterImg,
    showcaseBeforeLabel: settings.showcaseBeforeLabel,
    showcaseAfterLabel: settings.showcaseAfterLabel,
    showcaseTreatment: settings.showcaseTreatment,
    showcaseLink: settings.showcaseLink,
    visibility: settings.visibility,
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
