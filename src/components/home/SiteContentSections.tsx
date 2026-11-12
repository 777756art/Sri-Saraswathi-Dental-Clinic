import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowUpRight, BadgeCheck, Clock3, Eye, Heart, Play, Shield, Sparkles, Star, Stethoscope, Video, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api, resolveApiAsset, type ReelsSectionSettings, type SiteContent, type SiteContentType } from "@/lib/api";
import { DEFAULT_REELS_SECTION_SETTINGS, SITE_CONTENT_SYNC_CHANNEL, SITE_CONTENT_SYNC_KEY } from "@/lib/reels";
import { formatArticleDate } from "@/lib/blog";
import { clinicImages } from "@/lib/images";
import { SectionHeading } from "@/components/ui/SectionHeading";

type SiteContentState = {
  items: SiteContent[];
  reelsSettings: ReelsSectionSettings;
  loading: boolean;
};
const SiteContentContext = createContext<SiteContentState>({
  items: [],
  reelsSettings: DEFAULT_REELS_SECTION_SETTINGS,
  loading: true,
});

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SiteContent[]>([]);
  const [reelsSettings, setReelsSettings] = useState<ReelsSectionSettings>(DEFAULT_REELS_SECTION_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let lastFetchAt = 0;

    const fetchContent = (force = false) => {
      const now = Date.now();
      if (!force && now - lastFetchAt < 1200) return;
      lastFetchAt = now;
      api
        .get<{ items: SiteContent[]; reelsSettings?: ReelsSectionSettings }>("/api/content", {
          cache: "no-store",
        })
        .then((data) => {
          if (!active) return;
          setItems(Array.isArray(data.items) ? data.items : []);
          if (data.reelsSettings) {
            setReelsSettings({
              enabled: Boolean(data.reelsSettings.enabled),
              heading: data.reelsSettings.heading || DEFAULT_REELS_SECTION_SETTINGS.heading,
              subtitle: data.reelsSettings.subtitle || DEFAULT_REELS_SECTION_SETTINGS.subtitle,
            });
          }
        })
        .catch(() => {
          if (active) setItems([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    fetchContent(true);
    const onUpdated = () => fetchContent(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchContent(false);
    };
    const onFocus = () => fetchContent(false);
    const onStorage = (evt: StorageEvent) => {
      if (evt.key === SITE_CONTENT_SYNC_KEY) fetchContent(true);
    };

    window.addEventListener("site-content-updated", onUpdated);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(SITE_CONTENT_SYNC_CHANNEL);
        channel.onmessage = () => fetchContent(true);
      } catch {
        channel = null;
      }
    }

    return () => {
      active = false;
      window.removeEventListener("site-content-updated", onUpdated);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      channel?.close();
    };
  }, []);

  const value = useMemo(() => ({ items, reelsSettings, loading }), [items, reelsSettings, loading]);
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent(type?: SiteContentType) {
  const content = useContext(SiteContentContext);
  const items = type ? content.items.filter((item) => item.type === type) : content.items;
  return { items, reelsSettings: content.reelsSettings, loading: content.loading };
}

function ContentLink({ item, children, className }: { item: SiteContent; children: ReactNode; className: string }) {
  if (!item.linkUrl) return <div className={className}>{children}</div>;
  if (/^https:\/\//i.test(item.linkUrl)) {
    return <a className={className} href={item.linkUrl} target="_blank" rel="noreferrer">{children}</a>;
  }
  return <Link className={className} to={item.linkUrl}>{children}</Link>;
}

const sectionInfo: Record<"blog" | "offer" | "badge", { eyebrow: string; title: string; description: string }> = {
  blog: {
    eyebrow: "From the clinic",
    title: "Knowledge Today, Healthier Smiles Tomorrow.",
    description: "Helpful guidance and clinic updates for healthier smiles.",
  },
  offer: {
    eyebrow: "Clinic offers",
    title: "Special Care. Beautiful Smiles. Great Value.",
    description: "Explore the current offers published by the clinic.",
  },
  badge: {
    eyebrow: "Treatment highlights",
    title: "Thoughtful care, made clear.",
    description: "A closer look at the treatments and details that help you feel prepared for your visit.",
  },
};

const highlightIconMap = { tooth: Stethoscope, sparkle: Sparkles, shield: Shield, check: BadgeCheck, heart: Heart, clock: Clock3, activity: Activity, star: Star, eye: Eye, badge: BadgeCheck };

export function ManagedContentSection({ type }: { type: "blog" | "offer" | "badge" }) {
  const { items, loading } = useSiteContent(type);
  const sectionItems = type === "offer" ? items : items.filter((item) => item.homepageHighlight);
  if (loading) return null;
  if (!sectionItems.length) return null;
  const sortedItems = [...sectionItems].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return b.id - a.id;
  });
  const info = sectionInfo[type];

  if (type === "badge") {
    return (
      <section className="section-pad relative overflow-hidden bg-gradient-to-b from-[#F5F2EB] via-background to-[#E4F0F2]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-[#E4F0F2]/75 blur-[110px]" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#E4F0F2]/75 blur-[120px]" />
        </div>
        <div className="container-x relative">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow justify-center"><span className="eyebrow-dot" />{info.eyebrow}</p>
            <h2 className="mt-4 text-display-2 text-balance text-[#1F6878]">{info.title}</h2>
            <p className="mt-4 text-pretty text-[16px] leading-relaxed text-muted-foreground">{info.description}</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sortedItems.map((item) => (
              <article key={item.id} className="group overflow-hidden rounded-[24px] border border-border/70 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#E4F0F2]">
                  {item.mediaUrl ? <img src={resolveApiAsset(item.mediaUrl)} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" /> : <div className="grid h-full place-items-center"><BadgeCheck className="h-9 w-9 text-primary-700" strokeWidth={1.5} /></div>}
                  {(() => { const Icon = highlightIconMap[item.badgeText as keyof typeof highlightIconMap] ?? BadgeCheck; return <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary-800 shadow-sm backdrop-blur"><Icon className="h-4 w-4" /></span>; })()}
                </div>
                <div className="p-5">
                  {item.category && <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#1F6878]">{item.category}</p>}
                  <h3 className="mt-1.5 font-display text-lg font-semibold leading-tight tracking-tight text-[#1F6878]">{item.title}</h3>
                  {item.subtitle && <p className="mt-2 text-xs font-medium text-primary-800">{item.subtitle}</p>}
                  {item.body && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{item.body}</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={"relative overflow-hidden " + (type === "offer" ? "bg-[#F5F2EB] px-0 py-10 sm:py-14" : "section-pad bg-background")}>
      <div className="container-x relative">
        {(type === "blog" || type === "offer") && <SectionHeading
          align={type === "blog" ? "left" : "center"}
          eyebrow={info.eyebrow}
          title={<>{info.title}</>}
          description={info.description}
          action={
            type === "blog" ? (
              <Link to="/blogs" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-800 transition-colors hover:text-primary-950">
                View all articles <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            ) : undefined
          }
        />}
        <div className={"grid max-w-6xl gap-5 " + (type === "blog" ? "mt-11 sm:grid-cols-2 lg:grid-cols-3" : "mx-auto " + (type === "offer" ? "grid-cols-1" : "md:grid-cols-2"))}>
          {sortedItems.map((item) =>
            type === "blog" ? (
              <article key={item.id} className="group flex flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lift">
                <Link to={`/blog/${item.slug}`} className="block overflow-hidden">
                  <img
                    src={item.mediaUrl ? resolveApiAsset(item.mediaUrl) : clinicImages.blogSmileCare}
                    alt={item.mediaUrl ? item.title : "Dental care at Sri Saraswathi Dental Clinic"}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-5 md:p-6">
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#1F6878]">
                    {item.category || "Dental care"}
                  </p>
                  <h3 className="mt-2 font-display text-[19px] leading-snug tracking-tight text-[#1F6878]">
                    <Link to={`/blog/${item.slug}`} className="transition-colors hover:text-[#1F6878]">{item.title}</Link>
                  </h3>
                  {(item.excerpt || item.body) && (
                    <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-muted-foreground">{item.excerpt || item.body}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <span className="text-[11px] text-muted-foreground">{formatArticleDate(item.publishedAt)}</span>
                    <Link to={`/blog/${item.slug}`} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary-800">
                      Read article <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </article>
            ) : type === "offer" ? (
              <ContentLink key={item.id} item={item.linkUrl ? item : { ...item, linkUrl: "/booking" }} className="group block overflow-hidden rounded-[26px] bg-[#F5F2EB] border border-[#1F6878]/15 shadow-[0_18px_55px_-38px_rgba(31,104,120,.4)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_-36px_rgba(31,104,120,.46)]">
                <div className="grid min-h-[300px] md:grid-cols-[1fr_.88fr]">
                  <div className="relative z-10 flex flex-col items-start justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-14">
                    <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#1F6878]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1F6878]" /> {item.badgeText || "A little care goes a long way"}
                    </span>
                    <h3 className="mt-4 max-w-lg font-display text-[30px] font-bold leading-[1.08] tracking-[-.035em] text-[#1F6878] sm:text-[40px]">{item.title}</h3>
                    {item.subtitle && <p className="mt-3 text-[15px] font-semibold text-[#1F6878]">{item.subtitle}</p>}
                    {item.body && <p className="mt-3 max-w-md text-[13px] leading-6 text-[#707574]">{item.body}</p>}
                    {(item.startDate || item.endDate) && <p className="mt-3 text-[10px] font-medium text-[#707574]">{item.startDate ? `From ${formatArticleDate(item.startDate)}` : "Available now"}{item.endDate ? ` · Until ${formatArticleDate(item.endDate)}` : ""}</p>}
                    <span className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#E95A35] px-5 text-[12px] font-bold text-white shadow-[0_8px_18px_-10px_rgba(233,90,53,.7)] transition group-hover:bg-[#D14824]">{item.ctaLabel || "Book your visit"}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                  </div>
                  <div className="relative min-h-[230px] overflow-hidden bg-[#dce4e5] md:min-h-[340px]">
                    <img src={item.mediaUrl ? resolveApiAsset(item.mediaUrl) : clinicImages.heroDentalCare} alt={item.mediaUrl ? item.title : "Dentist speaking with a patient"} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.025]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#15191B]/20 via-transparent to-transparent md:bg-gradient-to-l md:from-transparent md:via-transparent md:to-[#F5F2EB]/15" />
                  </div>
                </div>
              </ContentLink>
            ) : (
              <ContentLink key={item.id} item={item} className="group block overflow-hidden rounded-[26px] border border-border/70 bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lift">
                {item.mediaUrl && (
                  <div className="relative overflow-hidden">
                    <img src={resolveApiAsset(item.mediaUrl)} alt={item.title} loading="lazy" decoding="async" className="aspect-[1.7/1] w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
                  </div>
                )}
                <div className="relative p-5 md:p-6">
                  {item.badgeText && (
                    <span className="inline-flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-primary-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> {item.badgeText}
                    </span>
                  )}
                  <h3 className="mt-2 font-display text-xl font-medium tracking-tight text-[#1F6878]">{item.title}</h3>
                  {item.subtitle && <p className="mt-1.5 text-sm font-medium text-primary-800">{item.subtitle}</p>}
                  {item.body && <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{item.body}</p>}
                  {item.linkUrl && (
                    <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-primary-800">
                      {item.ctaLabel || "Learn more"} <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  )}
                </div>
              </ContentLink>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

export function ManagedMediaSection() {
  const { items } = useSiteContent();
  const [selected, setSelected] = useState<SiteContent | null>(null);
  const media = items.filter((item) => ["reel", "video"].includes(item.type) && item.mediaUrl && item.homepageHighlight)
    .sort((a, b) => a.displayOrder - b.displayOrder || b.id - a.id);
  return (
    <section className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24">
      <div className="relative mx-auto max-w-7xl">
        <div className="container-x text-center">
            <h2 className="font-display text-[32px] font-bold leading-tight tracking-[-.045em] text-[#1F6878] sm:text-[42px]">
            Smile Stories, <span className="text-[#1F6878]">Beyond the Clinic.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-[720px] text-[14px] leading-7 text-[#707574] sm:text-[16px]">
            Short stories and helpful videos from Sri Saraswathi Dental Clinic.
          </p>
          <a
            href="https://www.instagram.com/srisaraswathidental"
            target="_blank"
            rel="noreferrer"
            className="mx-auto mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#E95A35] px-6 text-[13px] font-bold text-white shadow-[0_10px_22px_-9px_rgba(233,90,53,.55)] transition hover:-translate-y-0.5 hover:bg-[#D14824]"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r=".75" fill="currentColor" stroke="none" />
            </svg>
            Visit our Instagram
          </a>
        </div>
        {media.length ? <div className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] sm:mt-12 sm:gap-6 sm:px-8 lg:px-10 [&::-webkit-scrollbar]:hidden">
          {media.slice(0, 8).map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)} aria-label={`Play ${item.title}`} className="group relative aspect-[9/16] w-[min(72vw,250px)] flex-none snap-start overflow-hidden rounded-[22px] bg-[#15191B] text-left shadow-[0_12px_28px_-16px_rgba(15,23,42,.62)] ring-1 ring-black/[.06] transition duration-300 hover:-translate-y-1">
            {item.mobileMediaUrl ? <img src={resolveApiAsset(item.mobileMediaUrl)} alt={item.title} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" /> : <video src={resolveApiAsset(item.mediaUrl)} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />}
            <span className="absolute inset-0 bg-gradient-to-t from-[#0F3841]/85 via-transparent to-black/10" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#15191B]/65 px-2.5 py-1.5 text-[9px] font-semibold text-white backdrop-blur"><Video className="h-3 w-3" />{item.category || item.badgeText || "Clinic reel"}</span>
            <span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-white/20 text-white shadow-lg backdrop-blur transition group-hover:scale-110 group-hover:bg-[#E95A35]"><Play className="ml-0.5 h-5 w-5 fill-current" /></span></span>
            <span className="absolute bottom-4 left-4 right-4"><span className="block font-display text-[17px] font-semibold leading-snug text-white">{item.title}</span>{item.subtitle && <span className="mt-1 line-clamp-2 block text-[10px] leading-relaxed text-white/75">{item.subtitle}</span>}</span>
          </button>)}
        </div> : <div className="container-x mt-9"><div className="rounded-[20px] border border-dashed border-[#dce4e5] bg-[#F5F2EB] px-5 py-8 text-center text-[12px] text-[#707574]">Published clinic reels will appear here.</div></div>}
      </div>
      <AnimatePresence>{selected && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={selected.title} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }} className="fixed inset-0 z-[95] grid place-items-center bg-[#0F3841]/90 p-4 backdrop-blur-sm"><button type="button" onClick={() => setSelected(null)} aria-label="Close reel" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white"><X className="h-5 w-5" /></button><motion.div initial={{ scale: .97, y: 8 }} animate={{ scale: 1, y: 0 }} className="grid max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[24px] border border-white/10 bg-[#154C58] sm:grid-cols-[minmax(220px,.8fr)_1fr]"><video key={selected.id} src={resolveApiAsset(selected.mediaUrl)} poster={selected.mobileMediaUrl ? resolveApiAsset(selected.mobileMediaUrl) : undefined} controls autoPlay playsInline preload="metadata" className="mx-auto max-h-[72vh] w-auto max-w-full bg-black sm:max-h-[78vh]" /><div className="flex flex-col justify-center p-6 text-white sm:p-8"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#E4F0F2]">{selected.category || selected.badgeText || "Clinic reel"}</p><h3 className="mt-2 font-display text-2xl font-semibold">{selected.title}</h3>{selected.subtitle && <p className="mt-3 text-[13px] leading-6 text-white/75">{selected.subtitle}</p>}</div></motion.div></motion.div>}</AnimatePresence>
    </section>
  );
}
