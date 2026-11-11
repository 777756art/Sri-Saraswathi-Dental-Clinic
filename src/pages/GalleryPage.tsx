import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Images, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset, type SiteContent } from "@/lib/api";

function ClinicGalleryGrid({ homepage = false }: { homepage?: boolean }) {
  const { items, loading } = useSiteContent("image");
  const [category, setCategory] = useState("All spaces");
  const [selected, setSelected] = useState<SiteContent | null>(null);
  const publishedPhotos = useMemo(() => items
    .filter((item) => item.mediaUrl && (!homepage || item.homepageHighlight))
    .sort((a, b) => a.displayOrder - b.displayOrder || b.id - a.id), [items, homepage]);
  const categories = useMemo(() => ["All spaces", ...Array.from(new Set(publishedPhotos.map((item) => item.category).filter(Boolean)))], [publishedPhotos]);
  const visible = category === "All spaces" ? publishedPhotos : publishedPhotos.filter((item) => item.category === category);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowRight") setSelected((current) => {
        const index = current ? visible.findIndex((item) => item.id === current.id) : -1;
        return visible[(index + 1) % visible.length] ?? null;
      });
      if (event.key === "ArrowLeft") setSelected((current) => {
        const index = current ? visible.findIndex((item) => item.id === current.id) : 0;
        return visible[(index - 1 + visible.length) % visible.length] ?? null;
      });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected, visible]);

  const selectedIndex = selected ? visible.findIndex((item) => item.id === selected.id) : -1;
  const navigatePreview = (direction: -1 | 1) => {
    if (!visible.length || selectedIndex < 0) return;
    setSelected(visible[(selectedIndex + direction + visible.length) % visible.length]);
  };

  return (
    <>
      <section className={homepage ? "bg-white px-4 py-16 sm:py-20" : "min-h-[75vh] bg-[#F5F2EB] px-4 pb-20 pt-[125px] sm:pt-[145px]"}>
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]"><Building2 className="h-3.5 w-3.5 text-white" /> Clinic, up close</p>
            <h2 className="mt-3 font-display text-[31px] font-bold leading-tight tracking-[-.035em] text-[#1F6878] sm:text-[42px]">Explore Our <span className="text-[#1F6878]">Clinic.</span></h2>
            <p className="mt-3 text-[14px] leading-7 text-[#707574]">A look around the spaces and facilities shared by the clinic.</p>
          </div>
          {!loading && publishedPhotos.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2" aria-label="Filter clinic photos">
              {categories.map((value) => <button key={value} type="button" onClick={() => setCategory(value)} aria-pressed={category === value} className={`rounded-full border px-4 py-2 text-[11px] font-semibold transition ${category === value ? "border-[#1F6878] bg-[#1F6878] text-white shadow-sm" : "border-[#1F6878]/15 bg-white text-[#707574] hover:border-[#1F6878] hover:text-[#1F6878]"}`}>{value}</button>)}
            </div>
          )}
          {loading ? (
            <div className="mt-10 grid min-h-44 place-items-center rounded-3xl border border-[#1F6878]/15 bg-white text-sm text-[#707574]">Loading clinic photographs…</div>
          ) : visible.length ? (
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.slice(0, homepage ? 6 : undefined).map((item, index) => (
                <button key={item.id} type="button" onClick={() => setSelected(item)} aria-label={`Preview ${item.title}`} className={`group relative overflow-hidden rounded-[20px] bg-[#E4F0F2]/50 text-left shadow-[0_12px_28px_-22px_rgba(31,104,120,.4)] ${index % 5 === 0 ? "sm:row-span-2 sm:min-h-[420px]" : "aspect-[1.25/1]"}`}>
                  <img src={resolveApiAsset(item.mediaUrl)} alt={item.subtitle || item.title} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#1F6878]/80 via-transparent to-transparent opacity-90" />
                  <span className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
                    <span><span className="block text-[9px] font-bold uppercase tracking-[.16em] text-white/75">{item.category || "Clinic"}</span><span className="mt-1 block font-display text-[17px] font-semibold">{item.title}</span></span>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/35 bg-white/15 backdrop-blur transition group-hover:bg-white group-hover:text-[#1F6878]"><Images className="h-4 w-4" /></span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-10 max-w-xl rounded-[24px] border border-dashed border-[#1F6878]/25 bg-white px-6 py-12 text-center">
              <Images className="mx-auto h-8 w-8 text-[#1F6878]" />
              <h3 className="mt-4 font-display text-xl font-bold text-[#1F6878]">Clinic photos will appear here</h3>
              <p className="mt-2 text-[13px] leading-6 text-[#707574]">The clinic team hasn’t published any gallery photographs yet.</p>
              {homepage && <Link to="/clinic-gallery" className="mt-5 inline-flex text-[12px] font-semibold text-[#E95A35] hover:text-[#D14824]">Visit the clinic gallery <ArrowRight className="ml-1 h-4 w-4" /></Link>}
            </div>
          )}
          {homepage && publishedPhotos.length > 6 && <div className="mt-7 text-center"><Link to="/clinic-gallery" className="inline-flex items-center gap-2 rounded-full border border-[#1F6878]/25 px-5 py-2.5 text-[12px] font-semibold text-[#1F6878] transition hover:bg-[#E4F0F2]">Explore the clinic gallery <ArrowRight className="h-4 w-4" /></Link></div>}
        </div>
      </section>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0F3841]/90 p-3 backdrop-blur-sm sm:p-7" role="dialog" aria-modal="true" aria-label={selected.title} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
            <button type="button" onClick={() => setSelected(null)} aria-label="Close photo preview" className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
            {visible.length > 1 && <button type="button" onClick={() => navigatePreview(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 sm:left-7"><ArrowLeft className="h-5 w-5" /></button>}
            <motion.figure key={selected.id} initial={{ scale: .98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[90vh] max-w-[min(1100px,90vw)] overflow-hidden rounded-[22px] bg-white shadow-2xl">
              <img src={resolveApiAsset(selected.mediaUrl)} alt={selected.subtitle || selected.title} className="max-h-[76vh] w-full object-contain bg-[#0F3841]" />
              <figcaption className="flex items-center justify-between gap-4 px-5 py-4"><span><span className="block text-[9px] font-bold uppercase tracking-[.16em] text-[#1F6878]">{selected.category || "Clinic"}</span><span className="mt-1 block font-display text-lg font-bold text-[#1F6878]">{selected.title}</span>{selected.subtitle && <span className="mt-1 block text-xs text-[#707574]">{selected.subtitle}</span>}</span><span className="flex shrink-0 gap-2"><button type="button" onClick={() => navigatePreview(-1)} aria-label="Previous photo" className="grid h-9 w-9 place-items-center rounded-full border border-[#1F6878]/15 text-[#1F6878] transition hover:bg-[#E4F0F2]"><ArrowLeft className="h-4 w-4" /></button><button type="button" onClick={() => navigatePreview(1)} aria-label="Next photo" className="grid h-9 w-9 place-items-center rounded-full bg-[#1F6878] text-white transition hover:bg-[#1F6878]"><ArrowRight className="h-4 w-4" /></button></span></figcaption>
            </motion.figure>
            {visible.length > 1 && <button type="button" onClick={() => navigatePreview(1)} aria-label="Next photo" className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 sm:right-7"><ArrowRight className="h-5 w-5" /></button>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function ClinicGalleryPage() {
  return <main className="min-h-screen bg-[#F5F2EB]"><ClinicGalleryGrid /></main>;
}

export function HomepageClinicGallery() {
  return <ClinicGalleryGrid homepage />;
}
