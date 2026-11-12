import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Pause,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

const CLINIC_INSTAGRAM_URL = "https://www.instagram.com/srisaraswathidental";

interface ReelCardItem {
  id: number;
  title: string;
  description: string;
  category: string;
  featured: boolean;
  thumbnail: string;
  videoUrl: string;
}

export function DentalReels() {
  const { items, reelsSettings, loading } = useSiteContent();
  const [selected, setSelected] = useState<ReelCardItem | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Modal player controls synced with native <video> element
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  const reels = useMemo<ReelCardItem[]>(() => {
    return items
      .filter(
        (item) =>
          (item.type === "reel" || item.type === "video") &&
          Boolean(item.published) &&
          Boolean(item.mediaUrl || item.mobileMediaUrl)
      )
      .sort((a, b) => a.displayOrder - b.displayOrder || b.id - a.id)
      .map((item) => ({
        id: item.id,
        title: item.title || "Dental Care Reel",
        description: (item.excerpt || item.subtitle || "").trim(),
        category: (item.category || "").trim(),
        featured: Boolean(item.featured || String(item.badgeText || "").trim().toLowerCase() === "featured"),
        thumbnail: item.mobileMediaUrl ? resolveApiAsset(item.mobileMediaUrl) : "",
        videoUrl: item.mediaUrl ? resolveApiAsset(item.mediaUrl) : "",
      }));
  }, [items]);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setIsScrollable(maxScroll > 4);
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [reels.length, updateScrollState]);

  useEffect(() => {
    if (!selected) return;
    setIsPlaying(true);
    setIsMuted(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const scrollByCard = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>("[data-reel-card]");
    const computedGap = Number.parseFloat(window.getComputedStyle(el).columnGap || window.getComputedStyle(el).gap || "24") || 24;
    const step = firstCard ? firstCard.offsetWidth + computedGap : 256;
    el.scrollBy({
      left: direction * step,
      behavior: "smooth",
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el || e.button !== 0) return;
    dragStateRef.current = {
      active: true,
      startX: e.pageX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    const drag = dragStateRef.current;
    if (!drag.active || !el) return;
    const delta = e.pageX - drag.startX;
    if (Math.abs(delta) > 6) {
      drag.moved = true;
    }
    el.scrollLeft = drag.startScrollLeft - delta;
  };

  const endMouseDrag = () => {
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    setIsDragging(false);
    window.setTimeout(() => {
      dragStateRef.current.moved = false;
    }, 60);
  };

  const handleCardClick = (reel: ReelCardItem) => {
    if (dragStateRef.current.moved) return;
    setSelected(reel);
  };

  const togglePlayPause = () => {
    const vid = modalVideoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const vid = modalVideoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  const triggerFullscreen = () => {
    const vid = modalVideoRef.current;
    if (!vid) return;
    if (vid.requestFullscreen) {
      vid.requestFullscreen().catch(() => {});
    }
  };

  if (!reelsSettings.enabled) {
    return null;
  }

  if (!loading && reels.length === 0) {
    return null;
  }

  return (
    <section
      id="reels"
      data-testid="reels-section"
      className="relative overflow-hidden bg-[#F5F2EB] py-12 sm:py-14 lg:py-16"
      aria-label={reelsSettings.heading || "Trending Reels & Videos"}
    >
      {/* Subtle Pale Blue Organic Wave Accents matching Clinic Palette */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full opacity-75 sm:h-24 lg:h-28"
      >
        <path
          d="M0,112 C240,36 520,148 820,96 C1080,52 1280,104 1440,68 L1440,160 L0,160 Z"
          fill="#E4F0F2"
        />
        <path
          d="M0,132 C320,76 620,160 940,114 C1180,80 1320,122 1440,94 L1440,160 L0,160 Z"
          fill="#CFE5EA"
          opacity="0.65"
        />
      </svg>

      <div className="container-x relative z-10">
        {/* Centered Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sans text-[28px] font-bold leading-tight tracking-[-0.03em] text-[#1F6878] sm:text-[36px]">
            {reelsSettings.heading || "Trending Reels & Videos"}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-[#707574] sm:text-[15px]">
            {reelsSettings.subtitle ||
              "Watch real patient experiences, dental care videos, clinic moments and educational content."}
          </p>
        </div>

        {/* Compact 4-Card Carousel Frame with Side Navigation Arrows */}
        <div className="relative mx-auto mt-7 max-w-[1048px] md:px-11">
          {/* Decorative Corner Accents Flanking Desktop Cards */}
          <svg
            aria-hidden="true"
            viewBox="0 0 28 28"
            className="pointer-events-none absolute left-4 -top-2 hidden h-6 w-6 text-[#1F6878] lg:block"
          >
            <path
              d="M22 8 L10 4 M20 14 L6 13 M21 20 L11 22"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <svg
            aria-hidden="true"
            viewBox="0 0 28 28"
            className="pointer-events-none absolute right-4 -top-2 hidden h-6 w-6 text-[#1F6878] lg:block"
          >
            <path
              d="M6 8 L18 4 M8 14 L22 13 M7 20 L17 22"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {/* Compact Mobile-Only Top Arrows */}
          {!loading && reels.length > 0 && (
            <div className="mb-2.5 flex items-center justify-end gap-1.5 md:hidden">
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                disabled={!canScrollLeft}
                aria-label="Previous videos"
                className="grid h-8 w-8 place-items-center rounded-full border border-[#1F6878]/20 bg-white text-[#1F6878] shadow-sm transition hover:border-[#1F6878] hover:bg-[#E4F0F2] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                disabled={!canScrollRight}
                aria-label="Next videos"
                className="grid h-8 w-8 place-items-center rounded-full border border-[#1F6878]/20 bg-white text-[#1F6878] shadow-sm transition hover:border-[#1F6878] hover:bg-[#E4F0F2] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Side-Flanking Prev/Next Arrows (Tablet & Desktop) */}
          {!loading && reels.length > 0 && (
            <>
              <button
                type="button"
                data-testid="reels-prev-btn"
                onClick={() => scrollByCard(-1)}
                disabled={!canScrollLeft}
                aria-label="Previous reels"
                className="hidden md:grid absolute left-0 top-1/2 z-20 h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-[#dce4e5] bg-white text-[#1F6878] shadow-[0_6px_16px_-4px_rgba(31,104,120,0.22)] transition hover:border-[#1F6878] hover:bg-[#E4F0F2] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-testid="reels-next-btn"
                onClick={() => scrollByCard(1)}
                disabled={!canScrollRight}
                aria-label="Next reels"
                className="hidden md:grid absolute right-0 top-1/2 z-20 h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-[#dce4e5] bg-white text-[#1F6878] shadow-[0_6px_16px_-4px_rgba(31,104,120,0.22)] transition hover:border-[#1F6878] hover:bg-[#E4F0F2] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {loading ? (
            <div className="flex justify-center gap-5 overflow-hidden lg:gap-6">
              {[0, 1, 2, 3].map((skeleton) => (
                <div
                  key={skeleton}
                  className="w-[232px] flex-none overflow-hidden rounded-[16px] border border-[#dce4e5] bg-white sm:w-[220px] lg:w-[222px]"
                >
                  <div className="aspect-[9/16] w-full animate-pulse bg-[#E4F0F2]/80" />
                  <div className="space-y-1 px-3 py-2">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-[#E4F0F2]" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#F5F2EB]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              ref={trackRef}
              data-testid="reels-carousel-track"
              onScroll={updateScrollState}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={endMouseDrag}
              onMouseLeave={endMouseDrag}
              className={`flex gap-5 overflow-x-auto pb-2 pt-1 select-none [scrollbar-width:none] sm:gap-5 lg:gap-6 [&::-webkit-scrollbar]:hidden ${
                isScrollable ? "justify-start" : "sm:justify-center"
              } ${
                isDragging ? "cursor-grabbing scroll-auto" : "cursor-grab scroll-smooth snap-x snap-mandatory"
              }`}
            >
              {reels.map((reel) => {
                const hasExplicitThumb = Boolean(reel.thumbnail);
                const isVideoThumb = hasExplicitThumb && /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(reel.thumbnail);

                return (
                  <button
                    key={reel.id}
                    type="button"
                    data-reel-card
                    onClick={() => handleCardClick(reel)}
                    aria-label={`Play ${reel.title}`}
                    className="group flex w-[232px] flex-none snap-start flex-col overflow-hidden rounded-[16px] border border-[#e1e9ea] bg-white text-left shadow-[0_8px_22px_-12px_rgba(31,104,120,0.2)] transition duration-300 hover:-translate-y-1 hover:border-[#1F6878]/35 hover:shadow-[0_14px_28px_-12px_rgba(31,104,120,0.28)] sm:w-[220px] lg:w-[222px]"
                  >
                    {/* Compact 9:16 Portrait Video Box (222x395px desktop, 220x391px tablet, 232x412px mobile) */}
                    <div
                      data-reel-video-box
                      className="relative aspect-[9/16] w-full overflow-hidden bg-[#15191B]"
                    >
                      {hasExplicitThumb && !isVideoThumb ? (
                        <img
                          src={reel.thumbnail}
                          alt={reel.title}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <video
                          src={reel.videoUrl ? `${reel.videoUrl}#t=0.15` : undefined}
                          muted
                          playsInline
                          preload="metadata"
                          aria-hidden="true"
                          className="pointer-events-none h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      )}

                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20" />

                      {/* Top Badges: Show Category ONLY when assigned by admin */}
                      <div className="absolute inset-x-2 top-2 flex flex-wrap items-center justify-between gap-1">
                        {reel.category ? (
                          <span
                            data-testid="reel-category-badge"
                            className="inline-flex items-center rounded-full border border-white/25 bg-[#1F6878]/85 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#E4F0F2] backdrop-blur-md"
                          >
                            {reel.category}
                          </span>
                        ) : (
                          <span />
                        )}

                        {reel.featured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E95A35] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white shadow-sm">
                            <Sparkles className="h-2.5 w-2.5" /> Featured
                          </span>
                        )}
                      </div>

                      {/* Centered Compact Play Button */}
                      <div className="pointer-events-none absolute inset-0 grid place-items-center">
                        <span className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-white/90 bg-[#15191B]/35 text-white shadow-md backdrop-blur-sm transition duration-300 group-hover:scale-110 group-hover:border-[#E95A35] group-hover:bg-[#E95A35]">
                          <Play className="ml-0.5 h-3.5 w-3.5 fill-white text-white" />
                        </span>
                      </div>
                    </div>

                    {/* Compact White Card Content Below Video */}
                    <div className="px-3 py-2">
                      <h3 className="line-clamp-1 font-sans text-[13px] font-bold leading-snug text-[#1F6878] transition-colors group-hover:text-[#E95A35]">
                        {reel.title}
                      </h3>
                      {reel.description && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-[#707574]">
                          {reel.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Centered Compact Coral Follow Us on Instagram CTA */}
        <div className="mt-6 flex justify-center">
          <a
            href={CLINIC_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="follow-instagram-btn"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#E95A35] px-4.5 py-2 text-[12px] font-semibold leading-5 text-white shadow-[0_10px_20px_-8px_rgba(233,90,53,0.6)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d14824] hover:shadow-[0_14px_24px_-8px_rgba(233,90,53,0.72)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 shrink-0 fill-none stroke-current"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
            <span>Follow Us on Instagram</span>
            <ChevronRight className="h-3.5 w-3.5 text-white" />
          </a>
        </div>
      </div>

      {/* Single-Video Modal Player */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelected(null);
            }}
            className="fixed inset-0 z-[95] grid place-items-center bg-[#15191B]/90 p-4 backdrop-blur-md"
          >
            <button
              type="button"
              data-testid="reel-modal-close"
              onClick={() => setSelected(null)}
              aria-label="Close video player"
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-[#E95A35] hover:border-[#E95A35]"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              className="w-full max-w-[430px] overflow-hidden rounded-[26px] border border-white/15 bg-[#0F3841] shadow-2xl"
            >
              <div className="relative aspect-[9/16] max-h-[72vh] w-full overflow-hidden bg-black">
                {selected.videoUrl ? (
                  <video
                    ref={modalVideoRef}
                    key={selected.videoUrl}
                    src={selected.videoUrl}
                    poster={selected.thumbnail || undefined}
                    controls
                    autoPlay
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onVolumeChange={(e) => setIsMuted(e.currentTarget.muted)}
                    className="h-full w-full object-contain"
                  />
                ) : selected.thumbnail ? (
                  <img
                    src={selected.thumbnail}
                    alt={selected.title}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              {/* Quick Player Action Bar + Details */}
              <div className="space-y-3 p-4 sm:p-5 text-white">
                {selected.videoUrl && (
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={togglePlayPause}
                        aria-label={isPlaying ? "Pause video" : "Play video"}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#E95A35] px-3.5 py-1.5 text-[12px] font-bold text-white transition hover:bg-[#d14824]"
                      >
                        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {isPlaying ? "Pause" : "Play"}
                      </button>
                      <button
                        type="button"
                        onClick={toggleMute}
                        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={triggerFullscreen}
                      aria-label="Enter fullscreen"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/90 transition hover:bg-white/20"
                    >
                      <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selected.category && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#1F6878] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#E4F0F2]">
                        {selected.category}
                      </span>
                    )}
                    {selected.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E95A35] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                        Featured
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 font-sans text-[18px] font-bold leading-snug text-white">
                    {selected.title}
                  </h3>
                  {selected.description && (
                    <p className="mt-1 text-[13px] leading-relaxed text-[#E4F0F2]/80">
                      {selected.description}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
