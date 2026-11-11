"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { resolveApiAsset, type SiteContent } from "@/lib/api";

export function AnnouncementBanner({ offers }: { offers: SiteContent[] }) {
  const sorted = useMemo(
    () =>
      [...offers].sort((a, b) => (a.displayOrder !== b.displayOrder ? a.displayOrder - b.displayOrder : a.id - b.id)),
    [offers],
  );
  const signature = sorted.map((item) => item.id).join(",");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (sorted.length < 2) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % sorted.length), 5500);
    return () => window.clearInterval(timer);
  }, [signature, sorted.length]);

  if (!sorted.length) return null;
  const offer = sorted[index % sorted.length];
  const ctaLabel = offer.ctaLabel || "View offer";
  const ctaClass = "shrink-0 items-center gap-1 font-semibold text-[#E4F0F2] transition-colors hover:text-white";

  return (
    <div className="fixed inset-x-0 top-0 z-[70] h-[30px]">
      <div className="relative h-full overflow-hidden bg-gradient-to-r from-[#1F6878] via-[#1F6878] to-[#1F6878] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -left-10 top-1/2 h-10 w-40 -translate-y-1/2 rotate-12 bg-[#E95A35]/25 blur-2xl" />
          <div className="absolute right-0 top-1/2 h-10 w-40 -translate-y-1/2 -rotate-12 bg-[#E4F0F2]/20 blur-2xl" />
        </div>
        <div className="container-x relative flex h-full items-center justify-center gap-2 px-2 text-center text-[10px] sm:text-[11px]">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#E4F0F2]" aria-hidden="true" />
          {offer.mediaUrl && (
            <img
              src={resolveApiAsset(offer.mediaUrl)}
              alt=""
              aria-hidden="true"
              className="h-5 w-5 shrink-0 rounded-full border border-white/25 object-cover"
            />
          )}
          {offer.badgeText && (
            <span className="hidden shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#E4F0F2] sm:inline">
              {offer.badgeText}
            </span>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={offer.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="min-w-0 truncate font-medium"
            >
              {offer.title}
              {offer.subtitle ? " · " + offer.subtitle : ""}
            </motion.span>
          </AnimatePresence>
          {offer.linkUrl?.startsWith("https://") ? (
            <a
              href={offer.linkUrl}
              target="_blank"
              rel="noreferrer"
              className={`hidden sm:inline-flex ${ctaClass}`}
            >
              {ctaLabel} <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : (
            <Link to={offer.linkUrl || "/booking"} className={`hidden sm:inline-flex ${ctaClass}`}>
              {ctaLabel} <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          )}
          {offer.linkUrl?.startsWith("https://") ? (
            <a href={offer.linkUrl} target="_blank" rel="noreferrer" aria-label={ctaLabel} className={`inline-flex sm:hidden ${ctaClass}`}>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : (
            <Link to={offer.linkUrl || "/booking"} aria-label={ctaLabel} className={`inline-flex sm:hidden ${ctaClass}`}>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
