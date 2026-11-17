import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
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
  settings: BeforeAfterSectionSettings;
  cases: HeroTransformationCase[];
}

export function HeroBeforeAfter({ settings, cases }: HeroBeforeAfterProps) {
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

  if (!settings.enabled || settings.displayStatus === "draft" || cases.length === 0) {
    return null;
  }

  const activeCase = cases[currentIndex] || cases[0];
  const total = cases.length;

  return (
    <div
      className="mt-4 w-full max-w-[400px] sm:max-w-[430px] lg:max-w-[440px] rounded-[26px] border border-[#E7E2DA] bg-[#FDFCF9] sm:bg-[#FDFAF5] p-5 sm:p-5.5 shadow-[0_16px_40px_-15px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all duration-300"
      aria-label="Before and After Dental Transformations"
    >
      {/* Header Block: Centered Pill with Horizontal Lines & Exact Typography */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2.5">
          <span className="h-[1px] w-7 sm:w-9 bg-[#C9D6D8]" aria-hidden="true" />
          <span className="inline-flex items-center rounded-full bg-[#E3F2F3] px-3 py-0.5 text-[9px] sm:text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#087E8B]">
            TRANSFORMATION SHOWCASE
          </span>
          <span className="h-[1px] w-7 sm:w-9 bg-[#C9D6D8]" aria-hidden="true" />
        </div>
        <h3 className="mt-2 font-sans text-[15px] sm:text-[16.5px] font-black uppercase tracking-[0.06em] text-[#073B43]">
          {settings.heading || "REAL SMILES. CONFIDENT RESULTS."}
        </h3>
        <p className="mt-0.5 font-sans text-[11.5px] sm:text-[12px] font-medium text-[#667085]">
          {settings.subtitle || "Your Smile Transformation Starts Here."}
        </p>
      </div>

      {/* Optional Dedicated Promotional Hero Image Accent */}
      {settings.heroImage && (
        <div className="mt-2.5 overflow-hidden rounded-xl border border-[#1F6878]/15 bg-[#E4F0F2]">
          <picture>
            {settings.heroImageMobile && (
              <source media="(max-width: 640px)" srcSet={resolveApiAsset(settings.heroImageMobile)} />
            )}
            <img
              src={resolveApiAsset(settings.heroImage)}
              alt={settings.heroImageAlt || "Sri Saraswathi Dental Clinic - Smile Transformation"}
              loading="lazy"
              className="h-16 w-full object-cover object-center sm:h-20"
            />
          </picture>
        </div>
      )}

      {/* Before & After Cards: Two square 1:1 cards side by side with centered badges & orange arrow */}
      <div className="mt-3.5 flex items-center justify-between gap-2.5 sm:gap-3.5">
        {/* Left: BEFORE Card */}
        <div
          className="group relative flex-1 aspect-square overflow-hidden rounded-[18px] sm:rounded-[20px] bg-[#E4F0F2] shadow-sm transition-all duration-300 hover:-translate-y-0.5"
          style={{ aspectRatio: "1 / 1" }}
        >
          {/* Centered Teal Badge */}
          <span className="absolute top-2 left-1/2 -translate-x-1/2 z-20 rounded-full bg-[#073B43] px-3.5 py-0.5 text-[8.5px] sm:text-[9px] font-black tracking-[0.12em] text-white shadow-md select-none">
            BEFORE
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
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#FB8500] text-white shadow-[0_6px_16px_-4px_rgba(251,133,0,0.55)] transition-transform duration-300 hover:scale-110 animate-arrow-slide-gentle"
            aria-hidden="true"
          >
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.8]" />
          </div>
        </div>

        {/* Right: AFTER Card */}
        <div
          className="group relative flex-1 aspect-square overflow-hidden rounded-[18px] sm:rounded-[20px] bg-[#E4F0F2] shadow-sm transition-all duration-300 hover:-translate-y-0.5"
          style={{ aspectRatio: "1 / 1" }}
        >
          {/* Centered Teal Badge */}
          <span className="absolute top-2 left-1/2 -translate-x-1/2 z-20 rounded-full bg-[#087E8B] px-3.5 py-0.5 text-[8.5px] sm:text-[9px] font-black tracking-[0.12em] text-white shadow-md select-none">
            AFTER
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

      {/* Centered Disclaimer Note */}
      <p className="mt-3.5 text-center font-sans text-[10.5px] sm:text-[11px] font-medium text-[#8C98A4]">
        Actual Patient Results. Results May Vary.
      </p>
    </div>
  );
}
