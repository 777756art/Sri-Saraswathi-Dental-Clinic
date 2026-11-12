import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquarePlus,
  Star,
} from "lucide-react";
import {
  api,
  DEFAULT_GOOGLE_REVIEWS_CONFIG,
  type GoogleReviewItem,
  type GoogleReviewsConfig,
  type GoogleReviewsStatus,
} from "@/lib/api";
import { SITE_CONTENT_SYNC_CHANNEL, SITE_CONTENT_SYNC_KEY } from "@/lib/reels";

function GoogleLogoMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

function StarRatingRow({ rating, sizeClass = "h-4 w-4" }: { rating: number; sizeClass?: string }) {
  const clamped = Math.max(0, Math.min(5, rating));
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${clamped} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((index) => {
        const fillPercent = Math.max(0, Math.min(1, clamped - (index - 1)));
        if (fillPercent >= 0.75) {
          return (
            <Star
              key={index}
              className={`${sizeClass} fill-[#F59E0B] text-[#F59E0B]`}
              aria-hidden="true"
            />
          );
        }
        if (fillPercent >= 0.25) {
          return (
            <span key={index} className={`relative inline-flex ${sizeClass}`} aria-hidden="true">
              <Star className={`${sizeClass} text-[#073B43]/15`} />
              <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
                <Star className={`${sizeClass} fill-[#F59E0B] text-[#F59E0B]`} />
              </span>
            </span>
          );
        }
        return <Star key={index} className={`${sizeClass} text-[#073B43]/18`} aria-hidden="true" />;
      })}
    </div>
  );
}

const AVATAR_TONES = [
  "bg-[#DCFCE7] text-[#166534]",
  "bg-[#DBEAFE] text-[#1E40AF]",
  "bg-[#FCE7F3] text-[#9D174D]",
  "bg-[#E0F2F1] text-[#073B43]",
];

function getInitial(name: string): string {
  const clean = name.trim();
  return clean ? clean.charAt(0).toUpperCase() : "G";
}

function formatDateLabel(review: GoogleReviewItem): string {
  const rel = (review.relativeTime || "").trim();
  if (rel) return rel;
  const rawDate = (review.reviewDate || "").trim();
  if (!rawDate) return "";
  const isoOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawDate);
  if (isoOnly) {
    const dt = new Date(Number(isoOnly[1]), Number(isoOnly[2]) - 1, Number(isoOnly[3]));
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
  }
  const parsed = Date.parse(rawDate);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  return rawDate;
}

function GoogleReviewCard({
  review,
  index,
  fallbackMapsUrl,
}: {
  review: GoogleReviewItem;
  index: number;
  fallbackMapsUrl: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isClamped, setIsClamped] = useState(review.comment.length > 155);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    setIsClamped(el.scrollHeight > el.clientHeight + 2 || review.comment.length > 155);
  }, [review.comment, expanded]);

  const dateLabel = formatDateLabel(review);
  const toneClass = AVATAR_TONES[index % AVATAR_TONES.length];
  const mapsHref = review.reviewUrl || fallbackMapsUrl;

  return (
    <article
      className="flex w-full shrink-0 snap-start self-stretch flex-col justify-between rounded-[20px] border border-[#073B43]/10 bg-white p-6 shadow-[0_10px_28px_-18px_rgba(7,59,67,0.18)] transition duration-300 hover:-translate-y-0.5 hover:border-[#073B43]/22 hover:shadow-[0_18px_38px_-20px_rgba(7,59,67,0.24)] md:w-[calc((100%-20px)/2)] lg:w-[calc((100%-40px)/3)]"
      aria-label={`Google review by ${review.author}`}
    >
      <div>
        {/* Card Header: Avatar, Customer Name, Date, Google Logo */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {review.authorPhotoUrl && !avatarFailed ? (
              <img
                src={review.authorPhotoUrl}
                alt={review.author}
                className="h-10 w-10 shrink-0 rounded-full border border-[#073B43]/10 object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-bold ${toneClass}`}
                aria-hidden="true"
              >
                {getInitial(review.author)}
              </span>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold text-[#073B43]">{review.author}</h3>
              {dateLabel && (
                <p className="mt-0.5 truncate text-[12px] text-[#707574]">{dateLabel}</p>
              )}
            </div>
          </div>

          <GoogleLogoMark className="mt-0.5 h-5 w-5 shrink-0" />
        </div>

        {/* Dynamic Star Rating + Score */}
        <div className="mt-3.5 flex items-center gap-2">
          <StarRatingRow rating={review.rating} sizeClass="h-4 w-4" />
          <span className="text-[12.5px] font-bold text-[#073B43]">{review.rating.toFixed(1)}</span>
        </div>

        {/* Actual Google Review Comment + Read More / Read Less */}
        <p
          ref={textRef}
          className={`mt-3 text-[14px] leading-[1.68] text-[#15191B]/85 ${
            expanded ? "" : "line-clamp-4"
          }`}
        >
          “{review.comment}”
        </p>

        {(isClamped || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-2 text-[12.5px] font-semibold text-[#D94E67] transition hover:text-[#073B43]"
          >
            {expanded ? "Read less" : "Read more"}
          </button>
        )}
      </div>

      {/* Card Footer: Google Verified Badge + View on Maps */}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#073B43]/8 pt-3.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          Google Verified
        </span>

        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#707574] transition hover:text-[#073B43]"
        >
          <span>View on Maps</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export function GoogleReviewsSection() {
  const [config, setConfig] = useState<GoogleReviewsConfig>(DEFAULT_GOOGLE_REVIEWS_CONFIG);
  const [reviews, setReviews] = useState<GoogleReviewItem[]>([]);
  const [status, setStatus] = useState<GoogleReviewsStatus>("empty");
  const [configIssue, setConfigIssue] = useState("");
  const [loading, setLoading] = useState(true);

  const trackRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({ isDown: false, startX: 0, scrollLeft: 0 });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const loadGoogleReviews = useCallback(async () => {
    try {
      const res = await api.getGoogleReviews();
      if (res?.config) setConfig(res.config);
      setReviews(Array.isArray(res?.reviews) ? res.reviews : []);
      if (res?.status) setStatus(res.status);
      setConfigIssue(typeof res?.issue === "string" ? res.issue : "");
    } catch {
      setConfig((prev) => prev || DEFAULT_GOOGLE_REVIEWS_CONFIG);
      setReviews([]);
      setStatus("sync_error");
      setConfigIssue("Google Reviews API endpoint is currently unreachable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGoogleReviews();
    const periodicTimer = window.setInterval(() => {
      void loadGoogleReviews();
    }, 15 * 60 * 1000);

    const onUpdated = () => {
      void loadGoogleReviews();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === SITE_CONTENT_SYNC_KEY) onUpdated();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onUpdated();
    };

    window.addEventListener("site-content-updated", onUpdated);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onUpdated);
    document.addEventListener("visibilitychange", onVisibility);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(SITE_CONTENT_SYNC_CHANNEL);
        channel.onmessage = onUpdated;
      } catch {
        channel = null;
      }
    }

    return () => {
      window.clearInterval(periodicTimer);
      window.removeEventListener("site-content-updated", onUpdated);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onUpdated);
      document.removeEventListener("visibilitychange", onVisibility);
      channel?.close();
    };
  }, [loadGoogleReviews]);

  const updateScrollButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) {
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanScrollPrev(el.scrollLeft > 8);
    setCanScrollNext(maxScroll > 10 && el.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const timer = window.setTimeout(updateScrollButtons, 180);
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [reviews.length, updateScrollButtons]);

  const scrollTrackBy = (direction: "prev" | "next") => {
    const el = trackRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>("article");
    const step = firstCard ? firstCard.offsetWidth + 20 : Math.max(300, Math.round(el.clientWidth * 0.8));
    el.scrollBy({
      left: direction === "next" ? step : -step,
      behavior: "smooth",
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el || (e.target as HTMLElement)?.closest("a, button")) return;
    dragStateRef.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el || !dragStateRef.current.isDown) return;
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = dragStateRef.current.scrollLeft - (x - dragStateRef.current.startX);
  };

  const endMouseDrag = () => {
    dragStateRef.current.isDown = false;
  };

  const viewAllUrl = useMemo(
    () => config.googleReviewsUrl || DEFAULT_GOOGLE_REVIEWS_CONFIG.googleReviewsUrl,
    [config.googleReviewsUrl]
  );
  const mapsFallbackUrl = useMemo(
    () => config.googleMapsUri || viewAllUrl,
    [config.googleMapsUri, viewAllUrl]
  );
  const writeReviewUrl = useMemo(
    () => config.effectiveWriteReviewUrl || viewAllUrl,
    [config.effectiveWriteReviewUrl, viewAllUrl]
  );

  const hasOverallRating = typeof config.overallRating === "number" && config.overallRating > 0;
  const hasTotalReviews = typeof config.totalReviews === "number" && config.totalReviews > 0;

  return (
    <section
      id="google-reviews"
      className="scroll-mt-24 border-y border-[#073B43]/10 bg-[#FAF8F4] px-4 py-16 sm:py-20 lg:py-24"
      aria-labelledby="google-reviews-heading"
    >
      <div className="container-x">
        {/* Top Centered Header Row + Right Prev/Next Navigation Controls */}
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#073B43]/12 bg-white px-4 py-1.5 text-[12px] font-semibold text-[#073B43] shadow-sm">
              <GoogleLogoMark className="h-4 w-4" />
              Google Verified Reviews
            </span>

            <h2
              id="google-reviews-heading"
              className="mt-4 font-sans text-[32px] font-bold leading-tight tracking-[-0.03em] text-[#073B43] sm:text-[42px]"
            >
              What Our Customers Say
            </h2>

            {/* Overall Rating Summary Bar */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5 text-[14px]">
              {hasOverallRating && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#FFF9E6] px-2.5 py-1 text-[13px] font-bold text-[#073B43]">
                  <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />
                  {config.overallRating!.toFixed(1)}/5
                </span>
              )}
              <span className="font-semibold text-[#073B43]">Based on Google Reviews</span>
              {hasTotalReviews && (
                <span className="text-[#707574]">
                  · {config.totalReviews!.toLocaleString("en-IN")} Reviews on Google
                </span>
              )}
            </div>
          </div>

          {reviews.length > 1 && (
            <div className="mt-5 flex items-center justify-center gap-2 md:absolute md:right-0 md:top-1/2 md:mt-0 md:-translate-y-1/2">
              <button
                type="button"
                onClick={() => scrollTrackBy("prev")}
                disabled={!canScrollPrev}
                aria-label="Previous Google reviews"
                className="grid h-10 w-10 place-items-center rounded-full border border-[#073B43]/15 bg-white text-[#073B43] shadow-sm transition hover:bg-[#073B43] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-[#073B43]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollTrackBy("next")}
                disabled={!canScrollNext}
                aria-label="Next Google reviews"
                className="grid h-10 w-10 place-items-center rounded-full border border-[#073B43]/15 bg-white text-[#073B43] shadow-sm transition hover:bg-[#073B43] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-[#073B43]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Review Cards Carousel (3 Desktop, 2 Tablet, 1 Mobile) */}
        <div className="mx-auto mt-10 max-w-6xl">
          {loading ? (
            <div
              className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
              aria-busy="true"
              aria-label="Loading Google reviews"
            >
              {[1, 2, 3].map((slot) => (
                <div
                  key={slot}
                  className="h-64 animate-pulse rounded-[20px] border border-[#073B43]/10 bg-white/85 p-6"
                />
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <>
              <div
                ref={trackRef}
                onScroll={updateScrollButtons}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={endMouseDrag}
                onMouseLeave={endMouseDrag}
                className="scrollbar-hide flex cursor-grab snap-x snap-mandatory items-stretch gap-5 overflow-x-auto scroll-smooth pb-2 active:cursor-grabbing"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                role="region"
                aria-label="Google customer reviews carousel"
              >
                {reviews.map((review, index) => (
                  <GoogleReviewCard
                    key={review.id}
                    review={review}
                    index={index}
                    fallbackMapsUrl={mapsFallbackUrl}
                  />
                ))}
              </div>
              <p className="mt-3 text-center text-[12px] text-[#707574]">
                Showing recent Google Business Profile reviews synced via the official Google Places API.
              </p>
            </>
          ) : (
            <div className="mx-auto max-w-3xl rounded-[20px] border border-[#073B43]/12 bg-white px-6 py-8 text-center shadow-[0_10px_28px_-18px_rgba(7,59,67,0.16)]">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#FAF8F4]">
                <GoogleLogoMark className="h-5 w-5" />
              </div>
              <p className="text-[15px] font-semibold text-[#073B43]">
                {status === "api_key_missing" || status === "place_id_missing"
                  ? "Google Reviews Configuration Required"
                  : status === "sync_error"
                    ? "Unable to Load Live Google Reviews"
                    : "No Google Reviews Available Yet"}
              </p>
              <p className="mx-auto mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-[#707574]">
                {configIssue ||
                  "Visit our verified Google Business Profile directly to read real patient feedback or leave a review."}
              </p>
            </div>
          )}
        </div>

        {/* External Google Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <a
            href={viewAllUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#073B43] px-6 py-3 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-[#0B4F5A]"
          >
            <span>View All Google Reviews</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <a
            href={writeReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#073B43]/25 bg-white px-6 py-3 text-[13.5px] font-semibold text-[#073B43] shadow-sm transition hover:border-[#073B43] hover:bg-[#073B43]/5"
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            <span>Write a Google Review</span>
          </a>
        </div>
      </div>
    </section>
  );
}
