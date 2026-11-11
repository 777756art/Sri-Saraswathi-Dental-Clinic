import { Link } from "react-router-dom";
import { CalendarDays, Star } from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";
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

  // Button background color with targeted alpha
  const btnBackgroundColor = hexToRgba(
    styleConfig.btnColor,
    styleConfig.btnOpacity / 100
  );

  // Description: use saved body or fallback
  const heroDescription =
    banner?.body && banner.body.trim().length > 10
      ? banner.body
      : DEFAULT_HERO_CONTENT.description;

  return (
    <section
      className="relative isolate w-full min-h-[700px] lg:min-h-[720px] lg:h-[730px] overflow-hidden border-b border-[#dce4e5] bg-[#F5F2EB] pt-[132px] pb-14 sm:pt-[142px] sm:pb-16 lg:pt-[150px] lg:pb-18 flex items-center"
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

      <div className="container-x relative z-10 grid w-full items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
        {/* Left Side – Hero Content */}
        <div className="max-w-[620px]">
          {/* Small introductory badge */}
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">
            <span className="h-2 w-2 rounded-full bg-white" />
            {banner?.badgeText || "Complete Dental Care for Every Generation"}
          </span>

          {/* Main Headline */}
          <h1 className="mt-5 font-sans text-[38px] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#1F6878] sm:text-[48px] lg:text-[54px]">
            {renderHeroHeading(banner?.title)}
          </h1>

          {/* Supporting description */}
          <p className="mt-4 max-w-[560px] text-[13.5px] leading-[1.8] text-[#707574] sm:text-[14.5px]">
            {heroDescription}
          </p>

          {/* Google review rating */}
          <div className="mt-5 flex items-center gap-2.5 text-[13px]">
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

          {/* Clinic experience and patient statistics pills */}
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-[#1F6878]">
            <span className="rounded-full border border-[#1F6878]/15 bg-white/95 px-3 py-1 shadow-sm backdrop-blur-sm">
              8+ yrs experience
            </span>
            <span className="rounded-full border border-[#1F6878]/15 bg-white/95 px-3 py-1 shadow-sm backdrop-blur-sm">
              18,000+ patients
            </span>
            <span className="rounded-full border border-[#1F6878]/15 bg-white/95 px-3 py-1 shadow-sm backdrop-blur-sm">
              15+ specialists
            </span>
          </div>

          {/* Sub-caption */}
          <p className="mt-3 text-[11px] text-[#707574]">
            Caring for Coimbatore &amp; Erode smiles since 2017 · Sri Saraswathi Dental Clinic
          </p>

          {/* Primary CTA Button with admin configured color & opacity */}
          <div className="mt-6 flex flex-wrap items-center gap-3.5">
            <Link
              to={banner?.linkUrl || DEFAULT_HERO_CONTENT.btnLink}
              className="inline-flex h-[52px] items-center gap-2.5 rounded-full px-7 text-[14px] font-bold text-white shadow-[0_14px_30px_-10px_rgba(233,90,53,0.58)] transition duration-300 hover:-translate-y-0.5 hover:brightness-95 active:translate-y-0 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F6878] focus-visible:ring-offset-2"
              style={{
                backgroundColor: btnBackgroundColor,
              }}
            >
              <CalendarDays className="h-4 w-4" />{" "}
              {banner?.ctaLabel || DEFAULT_HERO_CONTENT.btnText}
            </Link>
          </div>
        </div>

        {/* Right Side – Large Admin-Uploaded Dental Promotional Image Container */}
        <div className="relative mx-auto w-full max-w-[540px] lg:max-w-[580px] lg:mr-0">
          {/* Subtle mint green ambient glow behind the container */}
          <div className="absolute -inset-4 sm:-inset-6 rounded-[38px] bg-[#E4F0F2] blur-3xl pointer-events-none" />

          {/* Rounded Image Container (Border Radius: 30px, Subtle Border, Premium Shadow) */}
          <div
            className="hero-visual relative aspect-[1.32/1] sm:aspect-[1.34/1] w-full overflow-hidden border border-[#1F6878]/15 bg-[#E4F0F2] shadow-[0_24px_60px_-20px_rgba(31,104,120,0.3),0_0_38px_-12px_rgba(31,104,120,0.2)]"
            style={{ borderRadius: "30px" }}
          >
            <img
              src={promotionalImage}
              alt="Sri Saraswathi Dental Clinic - Advanced Dental Care"
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover object-center block transition duration-700 hover:scale-[1.02]"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
            />

            {/* Top-Right Experience Badge */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-2xl border border-white/20 bg-[#1F6878]/95 px-3.5 py-1.5 text-white shadow-lg backdrop-blur-md sm:top-5 sm:right-5">
              <span className="font-sans text-[18px] sm:text-[20px] font-extrabold leading-none text-white">
                {banner?.trustBadgeText || "12 +"}
              </span>
              <div className="text-left">
                <span className="block text-[8px] font-bold uppercase tracking-wider text-[#E4F0F2]/75">
                  Years of
                </span>
                <span className="block text-[9.5px] sm:text-[10px] font-bold leading-tight text-white">
                  Excellence
                </span>
              </div>
            </div>

            {/* Bottom-Left Google Review Card */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2.5 rounded-2xl border border-[#dce4e5] bg-white/95 px-3.5 py-2.5 shadow-[0_12px_28px_-10px_rgba(31,104,120,0.28)] backdrop-blur-md sm:bottom-5 sm:left-5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#fff7e6] text-[#f5a623]">
                <Star className="h-4 w-4 fill-current" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-[#1F6878]">
                    {banner?.ratingScore ? `${banner.ratingScore} Rating` : "4.8 Rating"}
                  </span>
                  <span className="flex text-[#f5a623] text-[9.5px]">★★★★★</span>
                </div>
                <span className="block text-[9.5px] text-[#707574]">
                  {banner?.reviewCount ? `${banner.reviewCount} Verified Patient Reviews` : "1,100+ Verified Patient Reviews"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}