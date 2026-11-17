import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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
      className="mt-3.5 sm:mt-4 w-full max-w-[420px] lg:max-w-[450px] rounded-[20px] border border-[#1F6878]/15 bg-white/95 p-3 sm:p-3.5 shadow-[0_12px_32px_-14px_rgba(31,104,120,0.2)] backdrop-blur-md transition-all duration-300"
      aria-label="Before and After Dental Transformations"
    >
      {/* Header Block: Compact Heading & Subtitle */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F0F2] px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#073B43]">
          <Sparkles className="h-2.5 w-2.5 text-[#FB8500]" />
          <span>Transformation Showcase</span>
        </div>
        <h3 className="mt-1.5 font-sans text-[11.5px] sm:text-[12.5px] font-extrabold uppercase tracking-[0.14em] text-[#073B43]">
          {settings.heading || "REAL SMILES. CONFIDENT RESULTS."}
        </h3>
        <p className="mt-0.5 text-[10px] sm:text-[10.5px] font-medium text-[#707574]">
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

      {/* Before & After Cards: Two compact square 1:1 cards side by side with orange arrow */}
      <div className="mt-2.5 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: BEFORE Card */}
        <div
          className="group relative flex-1 aspect-square overflow-hidden rounded-[14px] border border-white bg-[#E4F0F2] shadow-[0_6px_16px_-6px_rgba(31,104,120,0.2)] transition-all duration-300 hover:-translate-y-0.5"
          style={{ aspectRatio: "1 / 1" }}
        >
          {/* Small Teal Label */}
          <span className="absolute top-2 left-2 z-20 rounded-md bg-[#073B43]/90 px-2 py-0.5 text-[7.5px] sm:text-[8px] font-extrabold tracking-[0.12em] text-white shadow-sm backdrop-blur-sm">
            BEFORE
          </span>
          <img
            key={`before-${activeCase.id}`}
            src={activeCase.beforeImg}
            alt={`${activeCase.title || "Smile"} - Before Treatment`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center transition-all duration-[1200ms] ease-in-out group-hover:scale-105"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Orange Transformation Arrow with gentle left-to-right movement */}
        <div className="shrink-0 flex items-center justify-center px-0.5">
          <div
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-r from-[#FB8500] to-[#E95A35] text-white shadow-[0_6px_16px_-4px_rgba(251,133,0,0.5)] transition-transform duration-300 hover:scale-110 animate-arrow-slide-gentle"
            aria-hidden="true"
          >
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5]" />
          </div>
        </div>

        {/* Right: AFTER Card */}
        <div
          className="group relative flex-1 aspect-square overflow-hidden rounded-[14px] border border-white bg-[#E4F0F2] shadow-[0_6px_16px_-6px_rgba(31,104,120,0.2)] transition-all duration-300 hover:-translate-y-0.5"
          style={{ aspectRatio: "1 / 1" }}
        >
          {/* Small Teal Label */}
          <span className="absolute top-2 left-2 z-20 rounded-md bg-[#087E8B]/95 px-2 py-0.5 text-[7.5px] sm:text-[8px] font-extrabold tracking-[0.12em] text-white shadow-sm backdrop-blur-sm">
            AFTER
          </span>
          <img
            key={`after-${activeCase.id}`}
            src={activeCase.afterImg}
            alt={`${activeCase.title || "Smile"} - After Treatment`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center transition-all duration-[1200ms] ease-in-out group-hover:scale-105"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      {/* Bottom Information & Navigation */}
      <div className="mt-2.5 flex items-center justify-between gap-2 pt-1.5 border-t border-[#1F6878]/10 text-[10px] sm:text-[10.5px]">
        <div className="min-w-0 flex items-center gap-1.5 truncate">
          <span className="font-bold text-[#073B43] truncate">{activeCase.title}</span>
          {activeCase.treatment && (
            <span className="hidden sm:inline text-[#707574] truncate">
              · {activeCase.treatment}
            </span>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {total > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev - 1 + total) % total)}
                aria-label="Previous smile transformation"
                className="grid h-5 w-5 place-items-center rounded-full border border-[#1F6878]/20 bg-white text-[#073B43] transition hover:bg-[#E4F0F2]"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <span className="text-[9.5px] font-semibold text-[#707574]">
                {currentIndex + 1}/{total}
              </span>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev + 1) % total)}
                aria-label="Next smile transformation"
                className="grid h-5 w-5 place-items-center rounded-full border border-[#1F6878]/20 bg-white text-[#073B43] transition hover:bg-[#E4F0F2]"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}

          <Link
            to="/gallery/before-after"
            className="inline-flex items-center gap-1 font-semibold text-[#087E8B] hover:text-[#073B43] transition"
          >
            <span>All results</span>
            <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
