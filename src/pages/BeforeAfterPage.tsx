import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MessageCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset, type SiteContent } from "@/lib/api";

const whatsappNumber = (import.meta.env.VITE_CLINIC_WHATSAPP || "919345743409").replace(/\D/g, "");
function dmLink(item: SiteContent) {
  const message = `Hello Sri Saraswathi Dental Clinic, I saw your Before & After smile transformation showcase for ${item.badgeText || item.title}. I would like to know more about this treatment.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function BeforeAfterShowcase({ homepage = false }: { homepage?: boolean }) {
  const { items, loading } = useSiteContent("gallery");
  const [selected, setSelected] = useState<SiteContent | null>(null);
  const entries = useMemo(() => items
    .filter((item) => item.beforeImage && item.afterImage && (!homepage || item.homepageHighlight))
    .sort((a, b) => a.displayOrder - b.displayOrder || b.id - a.id), [items, homepage]);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [selected]);

  return (
    <>
      <section className={homepage ? "bg-[#0e151a] px-4 py-16 text-white sm:py-20 lg:py-24" : "min-h-[70vh] bg-[#0e151a] px-4 pb-20 pt-[125px] text-white sm:pt-[145px]"}>
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#f090b7]">Real smile transformations</p>
            <h2 className="mt-3 font-display text-[32px] font-semibold leading-tight tracking-[-.035em] sm:text-[44px]">Before &amp; After Showcase</h2>
            <p className="mt-3 text-[14px] leading-7 text-white/65">Real smile transformations. Every smile tells a story.</p>
          </div>
          {loading ? <div className="mt-10 grid min-h-40 place-items-center rounded-[22px] border border-white/10 bg-white/[.03] text-sm text-white/55">Loading published cases…</div> : entries.length ? (
            <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {entries.slice(0, homepage ? 3 : undefined).map((item) => (
                <article key={item.id} className="group overflow-hidden rounded-[22px] border border-white/10 bg-[#171f25] p-3 shadow-[0_20px_50px_-34px_rgba(0,0,0,.8)] transition duration-300 hover:-translate-y-1 hover:border-white/20">
                  <button type="button" onClick={() => setSelected(item)} aria-label={`Preview before and after ${item.title}`} className="grid w-full grid-cols-2 gap-2 text-left">
                    {[{ label: "BEFORE", src: item.beforeImage }, { label: "AFTER", src: item.afterImage }].map((image) => (
                      <span key={image.label} className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-white/10">
                        <img src={resolveApiAsset(image.src)} alt={`${item.title} — ${image.label.toLowerCase()}`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]" />
                        <span className="absolute left-2 top-2 rounded-full bg-[#10171b]/85 px-2.5 py-1 text-[8px] font-bold tracking-[.15em] text-white">{image.label}</span>
                      </span>
                    ))}
                  </button>
                  <div className="flex items-end justify-between gap-4 px-2 pb-2 pt-4">
                    <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#f090b7]">{item.badgeText || "Treatment"}</p><h3 className="mt-1 font-display text-[18px] font-semibold text-white">{item.title}</h3>{(item.subtitle || item.excerpt) && <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/55">{item.subtitle || item.excerpt}</p>}</div>
                    <a href={dmLink(item)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#e83e8c] px-3.5 text-[10px] font-bold text-white transition hover:bg-[#c72d70]"><MessageCircle className="h-3.5 w-3.5" /> DM Us</a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-10 max-w-xl rounded-[22px] border border-white/10 bg-white/[.04] px-6 py-12 text-center">
              <p className="font-display text-xl font-semibold">Verified smile stories will appear here</p>
              <p className="mt-2 text-[13px] leading-6 text-white/60">The clinic has not published any consented before-and-after cases yet.</p>
              <Link to="/booking" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#e83e8c] px-5 py-2.5 text-[11px] font-bold">Talk with the clinic <ArrowRight className="h-4 w-4" /></Link>
            </div>
          )}
          {homepage && entries.length > 3 && <div className="mt-7 text-center"><Link to="/gallery/before-after" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-[11px] font-semibold text-white transition hover:bg-white/10">View all transformations <ArrowRight className="h-4 w-4" /></Link></div>}
        </div>
      </section>

      <AnimatePresence>
        {selected && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] flex items-center justify-center bg-[#05090c]/95 p-3 text-white backdrop-blur-md sm:p-7" role="dialog" aria-modal="true" aria-label={`Before and after ${selected.title}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <button type="button" onClick={() => setSelected(null)} aria-label="Close showcase" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
          <motion.div initial={{ y: 12, scale: .98 }} animate={{ y: 0, scale: 1 }} className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[24px] border border-white/10 bg-[#121b20] p-4 shadow-2xl sm:p-6">
            <div className="grid gap-3 md:grid-cols-2">
              {[{ label: "BEFORE", src: selected.beforeImage }, { label: "AFTER", src: selected.afterImage }].map((image) => <figure key={image.label} className="relative overflow-hidden rounded-[18px] bg-black"><img src={resolveApiAsset(image.src)} alt={`${selected.title} — ${image.label.toLowerCase()}`} className="aspect-[4/3] h-full w-full object-contain" /><figcaption className="absolute left-3 top-3 rounded-full bg-[#0a1115]/85 px-3 py-1.5 text-[10px] font-bold tracking-[.16em]">{image.label}</figcaption></figure>)}
            </div>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#f090b7]">{selected.badgeText || "Treatment"}</p><h3 className="mt-1 font-display text-2xl font-semibold">{selected.title}</h3>{(selected.subtitle || selected.excerpt || selected.body) && <p className="mt-2 max-w-3xl text-[13px] leading-6 text-white/65">{selected.subtitle || selected.excerpt || selected.body}</p>}</div><a href={dmLink(selected)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#e83e8c] px-5 text-[12px] font-bold"><MessageCircle className="h-4 w-4" /> DM Us about this treatment</a></div>
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </>
  );
}

export default function BeforeAfterPage() {
  return <main className="min-h-screen"><BeforeAfterShowcase /></main>;
}

export function HomepageBeforeAfter() {
  return <BeforeAfterShowcase homepage />;
}
