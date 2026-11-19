import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { resolveApiAsset } from "@/lib/api";
import type { BeforeAfterSectionSettings } from "@/lib/api";

export interface HeroTransformationCase {
  id: string | number;
  title: string;
  treatment: string;
  beforeImg: string;
  afterImg: string;
}

interface HeroBeforeAfterProps {
  settings?: BeforeAfterSectionSettings;
  cases: HeroTransformationCase[];
  heading?: string;
  subtitle?: string;
  beforeLabel?: string;
  afterLabel?: string;
  linkUrl?: string;
}

export function HeroBeforeAfter({
  settings,
  cases,
  heading,
  subtitle,
  beforeLabel = "BEFORE",
  afterLabel = "AFTER",
  linkUrl = "/smile-gallery",
}: HeroBeforeAfterProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-cycle if there are multiple cases (smooth 6s interval, respecting reduced motion)
  useEffect(() => {
    if (cases.length <= 1) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cases.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [cases.length]);

  if (settings && (!settings.enabled || settings.displayStatus === "draft") && cases.length === 0) {
    return null;
  }
  if (cases.length === 0) return null;

  const activeCase = cases[currentIndex] || cases[0];
  const displayHeading = heading || settings?.heading || "REAL SMILES. CONFIDENT RESULTS.";
  const displaySubtitle = subtitle || settings?.subtitle || "Your Smile Transformation Starts Here.";

  return (
    <div
      className="mt-3.5 w-full rounded-[24px] sm:rounded-[26px] border border-[#E7E2DA] bg-[#FDFCF9] sm:bg-[#FDFAF5] p-3.5 sm:p-4 lg:p-4.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all duration-300"
      aria-label="Before and After Dental Transformations"
    >
      {/* Header Block: Centered Pill with Horizontal Lines & Exact Typography */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="h-[1px] w-6 sm:w-8 bg-[#C9D6D8]" aria-hidden="true" />
          <span className="inline-flex items-center rounded-full bg-[#E3F2F3] px-2.5 py-0.5 text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#087E8B]">
            TRANSFORMATION SHOWCASE
          </span>
          <span className="h-[1px] w-6 sm:w-8 bg-[#C9D6D8]" aria-hidden="true" />
        </div>
        <h3 className="mt-1 font-sans text-[13.5px] sm:text-[14.5px] font-black uppercase tracking-[0.05em] text-[#073B43]">
          {displayHeading}
        </h3>
        <p className="mt-0.5 font-sans text-[10.5px] sm:text-[11px] font-medium text-[#667085]">
          {displaySubtitle}
        </p>
      </div>

      {/* Optional Dedicated Promotional Hero Image Accent */}
      {settings?.heroImage && (
        <div className="mt-2 overflow-hidden rounded-xl border border-[#1F6878]/15 bg-[#E4F0F2]">
          <picture>
            {settings.heroImageMobile && (
              <source media="(max-width: 640px)" srcSet={resolveApiAsset(settings.heroImageMobile)} />
            )}
            <img
              src={resolveApiAsset(settings.heroImage)}
              alt={settings.heroImageAlt || "Sri Saraswathi Dental Clinic - Smile Transformation"}
              loading="lazy"
              className="h-14 w-full object-cover object-center sm:h-16"
            />
          </picture>
        </div>
      )}

      {/* Before & After Cards: Two cards side by side with centered badges & orange arrow */}
      <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-2 sm:gap-2.5">
        {/* Left: BEFORE Card */}
        <div className="group relative flex-1 aspect-[1.12/1] overflow-hidden rounded-[14px] sm:rounded-[16px] bg-[#E4F0F2] shadow-sm transition-all duration-300 hover:-translate-y-0.5">
          {/* Centered Teal Badge */}
          <span className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 rounded-full bg-[#073B43] px-3 py-0.5 text-[7.5px] sm:text-[8px] font-black tracking-[0.12em] text-white shadow-sm select-none">
            {beforeLabel}
          </span>
          <img
            key={`before-${activeCase.id}`}
            src={activeCase.beforeImg || "/images/clinic/hero-patient-before.jpg"}
            alt={`${activeCase.title || "Smile"} - Before Treatment`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center transition-all duration-[1200ms] ease-in-out group-hover:scale-105"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Orange Transformation Arrow */}
        <div className="shrink-0 flex items-center justify-center px-0.5">
          <div
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#FB8500] text-white shadow-[0_4px_12px_-2px_rgba(251,133,0,0.5)] transition-transform duration-300 hover:scale-110 animate-arrow-slide-gentle"
            aria-hidden="true"
          >
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5]" />
          </div>
        </div>

        {/* Right: AFTER Card */}
        <div className="group relative flex-1 aspect-[1.12/1] overflow-hidden rounded-[14px] sm:rounded-[16px] bg-[#E4F0F2] shadow-sm transition-all duration-300 hover:-translate-y-0.5">
          {/* Centered Teal Badge */}
          <span className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 rounded-full bg-[#087E8B] px-3 py-0.5 text-[7.5px] sm:text-[8px] font-black tracking-[0.12em] text-white shadow-sm select-none">
            {afterLabel}
          </span>
          <img
            key={`after-${activeCase.id}`}
            src={activeCase.afterImg || "/images/clinic/hero-patient-after.jpg"}
            alt={`${activeCase.title || "Smile"} - After Treatment`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center transition-all duration-[1200ms] ease-in-out group-hover:scale-105"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      {/* Centered Disclaimer Note and CTA link */}
      <div className="mt-2 sm:mt-2.5 flex items-center justify-between text-[9.5px] sm:text-[10px] text-[#8C98A4]">
        <span>Actual Patient Results. Results May Vary.</span>
        {linkUrl && (
          <Link
            to={linkUrl}
            className="font-semibold text-[#087E8B] hover:text-[#073B43] hover:underline flex items-center gap-1 transition"
          >
            View Gallery <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
