import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ShieldCheck, Star, Users } from "lucide-react";
import { useBeforeAfterSettings, useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";
import { HeroBeforeAfter, type HeroTransformationCase } from "@/components/home/HeroBeforeAfter";
import { cn } from "@/lib/utils";
import {
  DEFAULT_HERO_SETTINGS,
  hexToRgba,
  parseHeroSectionSettings,
} from "@/lib/hero-banner-config";

function renderHeroHeading(title?: string) {
  const headingText = (title || DEFAULT_HERO_SETTINGS.heading).trim();

  if (headingText === DEFAULT_HERO_SETTINGS.heading) {
    return (
      <>
        Your Smile Deserves
        <br className="hidden sm:inline" /> Expert Care. A Lifetime
        <br className="hidden sm:inline" /> of Confidence.
      </>
    );
  }

  return headingText;
}

export function Hero() {
  const { items } = useSiteContent("hero");
  const { items: galleryItems } = useSiteContent("gallery");
  const { items: baItems } = useSiteContent("before_after");
  const { beforeAfterSettings } = useBeforeAfterSettings();

  const publishedBanners = items.filter((item) => item.published);
  const banner = publishedBanners[0] || null;

  // Fully dynamic Hero Section settings with safe defaults
  const settings = parseHeroSectionSettings(banner);
  const { visibility } = settings;

  // Full-width background: Admin uploaded or default dental clinic interior
  const backgroundImage = resolveApiAsset(settings.backgroundImage);

  // Right-side promotional image: Admin uploaded or default
  const promotionalImage = resolveApiAsset(settings.heroImage);

  // Check whether to display the photo edge-to-edge (no border) vs transparent logo
  const isLogoOnly = Boolean(
    promotionalImage.includes("logo") && !promotionalImage.includes("promo")
  );

  // Button background color with targeted alpha
  const btnBackgroundColor =
    settings.btnColor === DEFAULT_HERO_SETTINGS.btnColor
      ? "var(--theme-accent, #E95A35)"
      : hexToRgba(settings.btnColor, settings.btnOpacity / 100);

  // Prepare dynamic transformation cases for the Hero Before & After section
  const customCase: HeroTransformationCase | null =
    settings.showcaseBeforeImg && settings.showcaseAfterImg
      ? {
          id: "custom-featured-showcase",
          title: settings.showcaseHeading || "Smile Transformation",
          treatment: settings.showcaseTreatment || "Smile Makeover",
          beforeImg: resolveApiAsset(settings.showcaseBeforeImg),
          afterImg: resolveApiAsset(settings.showcaseAfterImg),
        }
      : null;

  const allCases = [...baItems, ...galleryItems];
  const dynamicCases: HeroTransformationCase[] = allCases
    .filter(
      (item) =>
        (item.beforeImage || item.before_image) &&
        (item.afterImage || item.after_image) &&
        item.published !== false &&
        item.patientConsent !== false
    )
    .map((item) => ({
      id: item.id,
      title: item.title || "Smile Transformation",
      treatment: item.badgeText || item.category || "Clinical Restoration",
      beforeImg: resolveApiAsset(item.beforeImage || item.before_image || ""),
      afterImg: resolveApiAsset(item.afterImage || item.after_image || item.mediaUrl || ""),
    }));

  const heroCases: HeroTransformationCase[] = customCase
    ? [customCase, ...dynamicCases.filter((c) => c.beforeImg !== customCase.beforeImg)]
    : dynamicCases.length > 0
    ? dynamicCases.slice(0, 6)
    : [
        {
          id: "default-smile-1",
          title: "Smile Transformation",
          treatment: "Smile Makeover",
          beforeImg: "/images/clinic/hero-patient-before.jpg",
          afterImg: "/images/clinic/hero-patient-after.jpg",
        },
      ];

  if (!settings.published) {
    return null;
  }

  return (
    <section
      className="relative isolate w-full min-h-[660px] lg:min-h-[720px] overflow-hidden border-b border-[#dce4e5] bg-[#F5F2EB] pt-[124px] pb-12 sm:pt-[134px] sm:pb-14 lg:pt-[140px] lg:pb-14 flex items-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-label="Hero Banner"
    >
      {/* Background Overlay Layer with admin-controlled color and opacity */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none transition-all duration-300"
        style={{
          backgroundColor: settings.overlayColor,
          opacity: settings.overlayOpacity / 100,
        }}
      />

      <div className="container-x relative z-10 grid w-full items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 xl:gap-12">
        {/* Left Side – Hero Content with Staggered Entrance Animations */}
        <div className="max-w-[600px] pt-1 flex flex-col items-start">
          {/* 1. Small introductory badge */}
          {visibility.showBadge && settings.badgeText && (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)] animate-hero-fade-in select-none">
              <span className="h-2 w-2 rounded-full bg-white" />
              {settings.badgeText}
            </span>
          )}

          {/* 2. Clinic Name and Tagline – Positioned cleanly ABOVE the main hero headline.
              Clean typography, NO orange border, NO rectangular container, NO background card */}
          {(visibility.showClinicName || visibility.showTagline) && (
            <div className="mt-3 sm:mt-3.5 text-left animate-hero-fade-in">
              {visibility.showClinicName && (
                <p className="font-sans text-[20px] sm:text-[23px] lg:text-[25px] font-bold tracking-tight text-[#073B43] leading-snug">
                  {settings.clinicName || "Sri Saraswathi Dental Clinic"}
                </p>
              )}
              {visibility.showTagline && (
                <p className="mt-0.5 font-sans text-[12px] sm:text-[13.5px] font-medium tracking-wide text-[#087E8B]">
                  {settings.clinicTagline || "Creating Healthy Smiles, Changing Lives."}
                </p>
              )}
            </div>
          )}

          {/* 3. Main Hero Headline */}
          {visibility.showHeading && (
            <h1 className="mt-3 sm:mt-3.5 font-sans text-[30px] sm:text-[46px] lg:text-[50px] font-extrabold leading-[1.12] tracking-[-0.04em] text-[#1F6878] animate-hero-fade-up">
              {renderHeroHeading(settings.heading)}
            </h1>
          )}

          {/* 4. Supporting description */}
          {visibility.showDescription && (
            <p className="mt-3.5 sm:mt-4 max-w-[540px] text-[13.5px] leading-[1.75] text-[#707574] sm:text-[14px] animate-hero-fade-in">
              {settings.description}
            </p>
          )}

          {/* 5. Google review rating */}
          {visibility.showRatings && (
            <div className="mt-4 flex items-center gap-2.5 text-[13px] animate-hero-fade-up">
              <span className="flex items-center gap-0.5 text-[#FB8500]" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </span>
              <span className="font-bold text-[#1F6878]">
                {settings.ratingScore || "4.8"}
              </span>
              <span className="text-[#707574]">
                · {settings.reviewCount ? `${settings.reviewCount} Google reviews` : "1.1k Google reviews"}
              </span>
            </div>
          )}

          {/* 6. Clinic experience and patient statistics cards */}
          {visibility.showStats && (
            <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:gap-3 animate-hero-fade-up">
              {/* Experience */}
              <div className="flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/95 px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5">
                <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#E4F0F2] text-[#073B43]">
                  <ShieldCheck className="h-4 w-4 text-[#073B43]" />
                </div>
                <div className="text-left leading-tight">
                  <span className="block font-sans text-[12px] font-bold text-[#073B43]">
                    {settings.statExperienceValue || "8+ yrs"}
                  </span>
                  <span className="block text-[10px] font-medium text-[#707574]">
                    {settings.statExperienceLabel || "experience"}
                  </span>
                </div>
              </div>

              {/* Patients */}
              <div className="flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/95 px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5">
                <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#E4F0F2] text-[#073B43]">
                  <Users className="h-4 w-4 text-[#073B43]" />
                </div>
                <div className="text-left leading-tight">
                  <span className="block font-sans text-[12px] font-bold text-[#073B43]">
                    {settings.statPatientsValue || "18,000+"}
                  </span>
                  <span className="block text-[10px] font-medium text-[#707574]">
                    {settings.statPatientsLabel || "patients"}
                  </span>
                </div>
              </div>

              {/* Specialists */}
              <div className="flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/95 px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5">
                <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#E4F0F2] text-[#073B43]">
                  <svg className="h-4 w-4 text-[#073B43] fill-current" viewBox="0 0 24 24">
                    <path d="M18.8 4c-1.6 0-3 1.1-3.6 2.6-.4.9-1.2 1.4-2.2 1.4s-1.8-.5-2.2-1.4C10.2 5.1 8.8 4 7.2 4 4.9 4 3 5.9 3 8.2c0 2.8.9 5.8 2 8.4 1 2.3 2.1 4.5 3.3 6.4.3.4.8.7 1.3.7.7 0 1.3-.5 1.5-1.2.6-2.5 1.3-5 1.9-7.5.1-.4.5-.7.9-.7s.8.3.9.7c.6 2.5 1.3 5 1.9 7.5.2.7.8 1.2 1.5 1.2.5 0 1-.3 1.3-.7 1.2-1.9 2.3-4.1 3.3-6.4 1.1-2.6 2-5.6 2-8.4C23 5.9 21.1 4 18.8 4z" />
                  </svg>
                </div>
                <div className="text-left leading-tight">
                  <span className="block font-sans text-[12px] font-bold text-[#073B43]">
                    {settings.statSpecialistsValue || "15+"}
                  </span>
                  <span className="block text-[10px] font-medium text-[#707574]">
                    {settings.statSpecialistsLabel || "specialists"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sub-caption */}
          {settings.subCaption && (
            <p className="mt-2.5 text-[11px] text-[#707574] animate-hero-fade-in">
              {settings.subCaption}
            </p>
          )}

          {/* 7. Action Buttons – Primary & Secondary CTAs */}
          {(visibility.showPrimaryCta || visibility.showSecondaryCta) && (
            <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-3.5 w-full sm:w-auto">
              {visibility.showPrimaryCta && (
                <Link
                  to={settings.primaryCtaUrl || "/booking"}
                  className="inline-flex h-[50px] w-full sm:w-auto justify-center items-center gap-2.5 rounded-full px-7 text-[14px] font-bold text-white shadow-[0_12px_28px_-8px_rgba(233,90,53,0.55)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-6px_rgba(233,90,53,0.65)] hover:brightness-105 active:translate-y-0 active:brightness-95 focus-visible:outline-none"
                  style={{
                    backgroundColor: btnBackgroundColor,
                  }}
                >
                  <CalendarDays className="h-4 w-4" />
                  {settings.primaryCtaLabel || "Book a Visit"}
                </Link>
              )}

              {visibility.showSecondaryCta && (
                <Link
                  to={settings.secondaryCtaUrl || "/treatments"}
                  className="inline-flex h-[50px] w-full sm:w-auto justify-center items-center gap-2 rounded-full border-2 border-[#073B43] bg-transparent px-6 text-[14px] font-bold text-[#073B43] transition duration-300 hover:bg-[#073B43] hover:text-white hover:-translate-y-0.5"
                >
                  {settings.secondaryCtaLabel || "Explore Treatments"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right Side Column – Promotional Container + Transformation Showcase */}
        <div className="relative mx-auto w-full max-w-[460px] sm:max-w-[480px] lg:max-w-[500px] lg:mr-0 flex flex-col items-center">
          {/* Subtle mint green ambient glow behind the container */}
          <div className="absolute -inset-3 sm:-inset-4 rounded-[30px] bg-[#E4F0F2] blur-2xl pointer-events-none" />

          {/* Top Promotional Container with Smooth Floating Animation and Shimmer */}
          {visibility.showHeroImage && (
            <div
              className={cn(
                "hero-visual relative aspect-[1.58/1] w-full overflow-hidden shadow-[0_20px_50px_-16px_rgba(7,59,67,0.38)] animate-float-subtle border border-white/20",
                isLogoOnly ? "bg-[#0C2127]" : "bg-transparent"
              )}
              style={{ borderRadius: "24px" }}
            >
              {/* Subtle Light Shimmer Sweep */}
              <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[24px]">
                <div className="h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer-sweep" />
              </div>

              {/* Central Crisp HD Logo or Promotional Photo */}
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center select-none",
                  isLogoOnly ? "p-6 sm:p-8" : "p-0"
                )}
              >
                <img
                  src={promotionalImage}
                  alt={settings.heroImageAlt || "Sri Saraswathi Dental Clinic - 12+ Years of Excellence"}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  className={
                    isLogoOnly
                      ? "max-h-[105px] sm:max-h-[120px] w-auto max-w-[68%] object-contain block select-none filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
                      : "h-full w-full object-cover object-center block select-none"
                  }
                />
              </div>

              {/* Top-Right Experience Badge with Soft Pulse Animation */}
              <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-[#1F6878] px-3.5 py-1.5 sm:px-4 sm:py-2 text-white shadow-md backdrop-blur-md animate-badge-pulse-soft">
                <span className="font-sans text-[17px] sm:text-[19px] font-extrabold leading-none text-white tracking-tight">
                  {settings.badgeExperience || "12 +"}
                </span>
                <div className="text-left leading-none">
                  <span className="block text-[7px] sm:text-[7.5px] font-bold uppercase tracking-wider text-[#99E3EC]">
                    Years of
                  </span>
                  <span className="block mt-0.5 text-[9px] sm:text-[10px] font-bold leading-tight text-white">
                    {settings.badgeExperienceLabel || "Excellence"}
                  </span>
                </div>
              </div>

              {/* Bottom-Left Google Review Card with Smooth Fade-in */}
              <div className="absolute bottom-3.5 left-3.5 sm:bottom-4 sm:left-4 z-20 flex items-center gap-2.5 rounded-full border border-white/90 bg-white px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.22)] backdrop-blur-md animate-hero-fade-in">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#FFF7E8] text-[#FB8500]">
                  <Star className="h-4 w-4 fill-[#FB8500] text-[#FB8500]" />
                </div>
                <div className="text-left leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11.5px] sm:text-[12px] font-bold text-[#073B43]">
                      {settings.cardRatingScore || `${settings.ratingScore || "4.8"} Rating`}
                    </span>
                    <span className="flex text-[#FB8500] text-[9px] tracking-tight">★★★★★</span>
                  </div>
                  <span className="block mt-0.5 text-[8.5px] sm:text-[9px] font-medium text-[#707574]">
                    {settings.cardReviewText || `${settings.reviewCount || "1.1k"} Verified Patient Reviews`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Transformation Showcase Component directly below promotional container */}
          {visibility.showShowcase && (
            <HeroBeforeAfter
              settings={beforeAfterSettings}
              cases={heroCases}
              heading={settings.showcaseHeading}
              subtitle={settings.showcaseSubtitle}
              beforeLabel={settings.showcaseBeforeLabel}
              afterLabel={settings.showcaseAfterLabel}
              linkUrl={settings.showcaseLink}
            />
          )}
        </div>
      </div>
    </section>
  );
}
