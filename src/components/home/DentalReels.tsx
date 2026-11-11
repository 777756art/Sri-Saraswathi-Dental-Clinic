import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Pause,
  Play,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

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
          item.published &&
          item.homepageHighlight &&
          Boolean(item.mediaUrl || item.mobileMediaUrl)
      )
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
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(maxScroll - el.scrollLeft > 6);
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
    const step = firstCard ? firstCard.offsetWidth + 24 : Math.max(300, el.clientWidth * 0.72);
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
      className="bg-[#F5F2EB] px-4 py-16 sm:py-20 lg:py-24"
      aria-label={reelsSettings.heading || "Trending Reels & Videos"}
    >
      <div className="container-x">
        {/* Centered Header + Desktop Carousel Controls */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.55)]">
            <Video className="h-3.5 w-3.5 text-white" /> Clinic Reels &amp; Stories
          </span>
          <h2 className="mt-4 font-sans text-[32px] font-bold leading-tight tracking-[-0.03em] text-[#1F6878] sm:text-[42px]">
            {reelsSettings.heading || "Trending Reels & Videos"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-[#707574] sm:text-[16px]">
            {reelsSettings.subtitle ||
              "Watch real patient experiences, dental care videos, clinic moments and educational content."}
          </p>
        </div>

        {/* Navigation Arrows Row */}
        {!loading && reels.length > 0 && (
          <div className="mt-8 flex items-center justify-end gap-2.5">
            <button
              type="button"
              data-testid="reels-prev-btn"
              onClick={() => scrollByCard(-1)}
              disabled={!canScrollLeft}
              aria-label="Previous videos"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#1F6878]/25 bg-white text-[#1F6878] shadow-sm transition hover:border-[#1F6878] hover:bg-[#E4F0F2] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              data-testid="reels-next-btn"
              onClick={() => scrollByCard(1)}
              disabled={!canScrollRight}
              aria-label="Next videos"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#1F6878]/25 bg-white text-[#1F6878] shadow-sm transition hover:border-[#1F6878] hover:bg-[#E4F0F2] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Horizontal Carousel */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((skeleton) => (
              <div
                key={skeleton}
                className="aspect-[9/16] w-full animate-pulse rounded-[24px] border border-[#dce4e5] bg-[#E4F0F2]/70"
              />
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
            className={`mt-4 flex gap-5 overflow-x-auto pb-3 pt-1 select-none [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden ${
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
                  className="group relative aspect-[9/16] w-[80%] flex-none snap-start overflow-hidden rounded-[24px] border border-[#dce4e5] bg-[#15191B] text-left shadow-[0_18px_40px_-24px_rgba(31,104,120,0.45)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_48px_-22px_rgba(31,104,120,0.4)] sm:w-[calc((100%-24px)/2)] lg:w-[calc((100%-48px)/3)]"
                >
                  {/* Video Poster or Metadata Frame */}
                  {hasExplicitThumb && !isVideoThumb ? (
                    <img
                      src={reel.thumbnail}
                      alt={reel.title}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <video
                      src={reel.videoUrl ? `${reel.videoUrl}#t=0.15` : undefined}
                      muted
                      playsInline
                      preload="metadata"
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                  )}

                  {/* Readability Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#15191B]/95 via-[#15191B]/25 to-black/25" />

                  {/* Top Badges: Only display category if assigned by admin; Featured pill when marked */}
                  <div className="absolute left-4 right-4 top-4 flex flex-wrap items-center justify-between gap-2">
                    {reel.category ? (
                      <span
                        data-testid="reel-category-badge"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[#1F6878]/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#E4F0F2] backdrop-blur-md"
                      >
                        <Video className="h-3 w-3 text-[#E4F0F2]" />
                        {reel.category}
                      </span>
                    ) : (
                      <span />
                    )}

                    {reel.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E95A35] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
                        <Sparkles className="h-3 w-3" /> Featured
                      </span>
                    )}
                  </div>

                  {/* Center Play Button */}
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <span className="grid h-15 w-15 place-items-center rounded-full border-2 border-white/60 bg-[#1F6878]/65 text-white shadow-2xl backdrop-blur-md transition duration-300 group-hover:scale-110 group-hover:border-[#E95A35] group-hover:bg-[#E95A35]">
                      <Play className="ml-0.5 h-6 w-6 fill-current" />
                    </span>
                  </div>

                  {/* Bottom Title & Optional Description */}
                  <div className="absolute inset-x-4 bottom-5">
                    <h3 className="font-sans text-[18px] font-bold leading-snug text-white drop-shadow-sm sm:text-[19px]">
                      {reel.title}
                    </h3>
                    {reel.description && (
                      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-white/80">
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

      {/* Single-Video Modal Player */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
