import { Link } from "react-router-dom";
import { CalendarDays, ShieldCheck, Star, Users } from "lucide-react";
import { useBeforeAfterSettings, useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";
import { HeroBeforeAfter, type HeroTransformationCase } from "@/components/home/HeroBeforeAfter";
import {
  DEFAULT_HERO_CONFIG,
  DEFAULT_HERO_CONTENT,
  hexToRgba,
  parseHeroStyleConfig,
} from "@/lib/hero-banner-config";

function renderHeroHeading(title?: string) {
  const headingText = (title || DEFAULT_HERO_CONTENT.title).trim();

  if (headingText === DEFAULT_HERO_CONTENT.title) {
    return (
      <>
        Your Smile Deserves
        <br className="hidden sm:inline" />{" "}
        <span className="text-[#1F6878]">Expert Care</span>. A Lifetime
        <br className="hidden sm:inline" /> of Confidence
      </>
    );
  }

  // Highlight "Expert Care" if present in the main heading
  if (headingText.includes("Expert Care")) {
    const parts = headingText.split("Expert Care");
    return (
      <>
        {parts[0]}
        <span className="text-[#1F6878]">Expert Care</span>
        {parts.slice(1).join("Expert Care")}
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

  // Style configurations (Overlay color & opacity, CTA button color & opacity)
  const styleConfig = banner?.seoDescription
    ? parseHeroStyleConfig(banner.seoDescription)
    : DEFAULT_HERO_CONFIG;

  // Full-width background: Admin uploaded (banner.mobileMediaUrl) or default dental clinic interior
  const backgroundImage = banner?.mobileMediaUrl
    ? resolveApiAsset(banner.mobileMediaUrl)
    : DEFAULT_HERO_CONTENT.backgroundImage;

  // Right-side promotional image: Admin uploaded (banner.mediaUrl) or default dental clinic photo
  const promotionalImage = banner?.mediaUrl
    ? resolveApiAsset(banner.mediaUrl)
    : DEFAULT_HERO_CONTENT.heroImage;

  // Button background color with targeted alpha (adapts to global theme accent if using default)
  const btnBackgroundColor =
    styleConfig.btnColor === DEFAULT_HERO_CONFIG.btnColor
      ? "var(--theme-accent, #E95A35)"
      : hexToRgba(styleConfig.btnColor, styleConfig.btnOpacity / 100);

  // Description: use saved body or fallback
  const heroDescription =
    banner?.body && banner.body.trim().length > 10
      ? banner.body
      : DEFAULT_HERO_CONTENT.description;

  // Prepare dynamic transformation cases for the Hero Before & After section
  const allCases = [...baItems, ...galleryItems];
  const validDynamicCases: HeroTransformationCase[] = allCases
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
      homepageHighlight: Boolean(item.homepageHighlight),
    }));

  const highlighted = validDynamicCases.filter((c: any) => c.homepageHighlight);
  const heroCases: HeroTransformationCase[] =
    highlighted.length > 0
      ? highlighted
      : validDynamicCases.length > 0
      ? validDynamicCases.slice(0, 6)
      : [
          {
            id: "default-smile-1",
            title: "Smile Transformation",
            treatment: "Smile Makeover",
            beforeImg: "/images/clinic/hero-patient-before.jpg",
            afterImg: "/images/clinic/hero-patient-after.jpg",
          },
        ];

  return (
    <section
      className="relative isolate w-full min-h-[700px] lg:min-h-[760px] overflow-hidden border-b border-[#dce4e5] bg-[#F5F2EB] pt-[132px] pb-14 sm:pt-[142px] sm:pb-16 lg:pt-[150px] lg:pb-18 flex items-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-label="Hero Banner"
    >
      {/* Background Overlay Layer with admin-controlled color and opacity.
          NOTE: Opacity applies strictly to this background overlay, keeping
          the hero text, CTA button, and right-side image 100% crisp and readable. */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none transition-all duration-300"
        style={{
          backgroundColor: styleConfig.overlayColor,
          opacity: styleConfig.overlayOpacity / 100,
        }}
      />

      <div className="container-x relative z-10 grid w-full items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        {/* Left Side – Hero Content with Staggered Entrance Animations */}
        <div className="max-w-[620px] pt-2">
          {/* Small introductory badge */}
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)] animate-hero-fade-in">
            <span className="h-2 w-2 rounded-full bg-white" />
            {banner?.badgeText || "Complete Dental Care for Every Generation"}
          </span>

          {/* Main Headline */}
          <h1 className="mt-5 font-sans text-[38px] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#1F6878] sm:text-[48px] lg:text-[54px] animate-hero-fade-up">
            {renderHeroHeading(banner?.title)}
          </h1>

          {/* Supporting description */}
          <p className="mt-4 max-w-[560px] text-[13.5px] leading-[1.8] text-[#707574] sm:text-[14.5px] animate-hero-fade-in">
            {heroDescription}
          </p>

          {/* Google review rating */}
          <div className="mt-5 flex items-center gap-2.5 text-[13px] animate-hero-fade-up">
            <span className="flex items-center gap-0.5 text-[#f5a623]" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </span>
            <span className="font-bold text-[#1F6878]">
              {banner?.ratingScore || "4.8"}
            </span>
            <span className="text-[#707574]">
              · {banner?.reviewCount ? `${banner.reviewCount} Google reviews` : "1.1k Google reviews"}
            </span>
          </div>

          {/* Clinic experience and patient statistics cards */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3 animate-hero-fade-up">
            {/* 8+ yrs experience */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/95 px-3.5 py-2 shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5">
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#E4F0F2] text-[#073B43]">
                <ShieldCheck className="h-4 w-4 text-[#073B43]" />
              </div>
              <div className="text-left leading-tight">
                <span className="block font-sans text-[12px] font-bold text-[#073B43]">8+ yrs</span>
                <span className="block text-[10px] font-medium text-[#707574]">experience</span>
              </div>
            </div>

            {/* 18,000+ patients */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/95 px-3.5 py-2 shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5">
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#E4F0F2] text-[#073B43]">
                <Users className="h-4 w-4 text-[#073B43]" />
              </div>
              <div className="text-left leading-tight">
                <span className="block font-sans text-[12px] font-bold text-[#073B43]">18,000+</span>
                <span className="block text-[10px] font-medium text-[#707574]">patients</span>
              </div>
            </div>

            {/* 15+ specialists */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/95 px-3.5 py-2 shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5">
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-[#E4F0F2] text-[#073B43]">
                <svg className="h-4 w-4 text-[#073B43] fill-current" viewBox="0 0 24 24">
                  <path d="M18.8 4c-1.6 0-3 1.1-3.6 2.6-.4.9-1.2 1.4-2.2 1.4s-1.8-.5-2.2-1.4C10.2 5.1 8.8 4 7.2 4 4.9 4 3 5.9 3 8.2c0 2.8.9 5.8 2 8.4 1 2.3 2.1 4.5 3.3 6.4.3.4.8.7 1.3.7.7 0 1.3-.5 1.5-1.2.6-2.5 1.3-5 1.9-7.5.1-.4.5-.7.9-.7s.8.3.9.7c.6 2.5 1.3 5 1.9 7.5.2.7.8 1.2 1.5 1.2.5 0 1-.3 1.3-.7 1.2-1.9 2.3-4.1 3.3-6.4 1.1-2.6 2-5.6 2-8.4C23 5.9 21.1 4 18.8 4z"/>
                </svg>
              </div>
              <div className="text-left leading-tight">
                <span className="block font-sans text-[12px] font-bold text-[#073B43]">15+</span>
                <span className="block text-[10px] font-medium text-[#707574]">specialists</span>
              </div>
            </div>
          </div>

          {/* Sub-caption */}
          <p className="mt-3 text-[11px] text-[#707574] animate-hero-fade-in">
            Caring for Coimbatore &amp; Erode smiles since 2017 · Sri Saraswathi Dental Clinic
          </p>

          {/* Primary CTA Button with admin configured color & opacity */}
          <div className="mt-6 flex flex-wrap items-center gap-3.5">
            <Link
              to={banner?.linkUrl || DEFAULT_HERO_CONTENT.btnLink}
              className="inline-flex h-[52px] items-center gap-2.5 rounded-full px-7 text-[14px] font-bold text-white shadow-[0_14px_30px_-10px_rgba(233,90,53,0.58)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_-8px_rgba(233,90,53,0.7)] hover:brightness-105 active:translate-y-0 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6878] focus-visible:ring-offset-2"
              style={{
                backgroundColor: btnBackgroundColor,
              }}
            >
              <CalendarDays className="h-4 w-4" />{" "}
              {banner?.ctaLabel || DEFAULT_HERO_CONTENT.btnText}
            </Link>
          </div>
        </div>

        {/* Right Side Column – Promotional Container + Transformation Showcase Container */}
        <div className="relative mx-auto w-full max-w-[400px] sm:max-w-[430px] lg:max-w-[440px] lg:mr-0 flex flex-col items-center">
          {/* Subtle mint green ambient glow behind the container */}
          <div className="absolute -inset-3 sm:-inset-4 rounded-[30px] bg-[#E4F0F2] blur-2xl pointer-events-none" />

          {/* Top Promotional Container with Smooth Floating Animation and Shimmer Sweep */}
          <div
            className="hero-visual relative aspect-[1.58/1] w-full overflow-hidden border border-white/20 bg-[#09282F] shadow-[0_20px_50px_-16px_rgba(7,59,67,0.38)] animate-float-subtle"
            style={{ borderRadius: "26px" }}
          >
            {/* Subtle Light Shimmer Sweep */}
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[26px]">
              <div className="h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer-sweep" />
            </div>

            <img
              src={promotionalImage || "/images/clinic/hero-dark-promo.png"}
              alt="Sri Saraswathi Dental Clinic - 12+ Years of Excellence"
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover object-center block select-none"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
            />

            {/* Top-Right Experience Badge with Soft Pulse Animation */}
            <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2 rounded-2xl border border-white/20 bg-[#133842]/95 px-3 py-1.5 text-white shadow-lg backdrop-blur-md animate-badge-pulse-soft">
              <span className="font-sans text-[18px] sm:text-[20px] font-extrabold leading-none text-white">
                {banner?.trustBadgeText || "12 +"}
              </span>
              <div className="text-left leading-none">
                <span className="block text-[7.5px] font-bold uppercase tracking-wider text-[#3CE5D3]">
                  Years of
                </span>
                <span className="block mt-0.5 text-[9.5px] font-bold leading-tight text-white">
                  Excellence
                </span>
              </div>
            </div>

            {/* Bottom-Left Google Review Card with Smooth Fade-in */}
            <div className="absolute bottom-3.5 left-3.5 z-20 flex items-center gap-2.5 rounded-[18px] border border-white/80 bg-white px-3.5 py-2 shadow-lg backdrop-blur-md animate-hero-fade-in">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#FFF7E8] text-[#FB8500]">
                <Star className="h-4 w-4 fill-[#FB8500] text-[#FB8500]" />
              </div>
              <div className="text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-[#073B43]">
                    {banner?.ratingScore ? `${banner.ratingScore} Rating` : "4.8 Rating"}
                  </span>
                  <span className="flex text-[#FB8500] text-[9.5px]">★★★★★</span>
                </div>
                <span className="block mt-0.5 text-[9.5px] font-medium text-[#707574]">
                  {banner?.reviewCount ? `${banner.reviewCount} Verified Patient Reviews` : "1.1k Verified Patient Reviews"}
                </span>
              </div>
            </div>
          </div>

          {/* Transformation Showcase Component directly below promotional container */}
          <HeroBeforeAfter settings={beforeAfterSettings} cases={heroCases} />
        </div>
      </div>
    </section>
  );
}