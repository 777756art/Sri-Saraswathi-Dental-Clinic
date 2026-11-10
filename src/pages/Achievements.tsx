import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Award, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset, type SiteContent } from "@/lib/api";

function AchievementCards({ homepage = false }: { homepage?: boolean }) {
  const { items, loading } = useSiteContent("achievement");
  const [selected, setSelected] = useState<SiteContent | null>(null);
  const achievements = useMemo(() => items.filter((item) => !homepage || item.homepageHighlight).sort((a, b) => a.displayOrder - b.displayOrder || b.id - a.id), [items, homepage]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; };
  }, [selected]);

  return <>
    <section className={homepage ? "bg-[#faf8f4] px-4 py-16 sm:py-20" : "min-h-[70vh] bg-[#faf8f4] px-4 pb-20 pt-[125px] sm:pt-[145px]"}>
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center"><p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#c72d70]"><Award className="h-3.5 w-3.5" /> Professional milestones</p><h2 className="mt-3 font-display text-[32px] font-semibold leading-tight tracking-[-.035em] text-[#173d43] sm:text-[42px]">Excellence Beyond Dentistry.</h2><p className="mt-3 text-[14px] leading-7 text-[#68777c]">Professional achievements shared by the clinic team.</p></div>
        {loading ? <div className="mt-9 grid min-h-36 place-items-center rounded-3xl border border-[#eee7e2] bg-white text-sm text-[#758187]">Loading achievements…</div> : achievements.length ? <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.slice(0, homepage ? 3 : undefined).map((item) => <button type="button" key={item.id} onClick={() => setSelected(item)} className="group overflow-hidden rounded-[20px] border border-[#ece5df] bg-white text-left shadow-[0_12px_30px_-24px_rgba(25,50,55,.4)] transition hover:-translate-y-1 hover:shadow-lg">
            {item.mediaUrl && <div className="aspect-[4/3] overflow-hidden bg-[#eef3f1]"><img src={resolveApiAsset(item.mediaUrl)} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" /></div>}
            <div className="p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#c72d70]">{item.category || "Achievement"}{item.publishedAt ? ` · ${new Date(item.publishedAt).getFullYear()}` : ""}</p><h3 className="mt-2 font-display text-[19px] font-semibold leading-snug text-[#173d43]">{item.title}</h3>{item.subtitle && <p className="mt-1 text-[12px] font-medium text-[#287d75]">{item.subtitle}</p>}{item.body && <p className="mt-2 line-clamp-3 text-[12px] leading-6 text-[#728087]">{item.body}</p>}</div>
          </button>)}
        </div> : <div className="mx-auto mt-9 max-w-xl rounded-[24px] border border-dashed border-[#e2d9d3] bg-white px-6 py-12 text-center"><Award className="mx-auto h-9 w-9 text-[#bd7193]" /><h3 className="mt-4 font-display text-xl font-semibold text-[#173d43]">Verified achievements will appear here</h3><p className="mt-2 text-[13px] leading-6 text-[#738087]">The clinic has not published any professional awards or certificates yet.</p></div>}
        {homepage && achievements.length > 3 && <div className="mt-7 text-center"><Link to="/our-dentists/achievements" className="inline-flex items-center gap-2 rounded-full border border-[#e8bdcf] bg-white px-5 py-2.5 text-[11px] font-semibold text-[#be2f6f]">View all achievements <ArrowRight className="h-4 w-4" /></Link></div>}
      </div>
    </section>
    <AnimatePresence>{selected && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={selected.title} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }} className="fixed inset-0 z-[95] grid place-items-center bg-[#061d21]/90 p-4 backdrop-blur-sm"><button type="button" onClick={() => setSelected(null)} aria-label="Close achievement preview" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white"><X className="h-5 w-5" /></button><motion.figure initial={{ scale: .98 }} animate={{ scale: 1 }} className="max-h-[90vh] max-w-[92vw] overflow-hidden rounded-[22px] bg-white shadow-2xl">{selected.mediaUrl && <img src={resolveApiAsset(selected.mediaUrl)} alt={selected.title} className="max-h-[74vh] w-full bg-[#102b30] object-contain" />}<figcaption className="p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#c72d70]">{selected.category || "Achievement"}</p><h3 className="mt-1 font-display text-xl font-semibold text-[#173d43]">{selected.title}</h3>{selected.body && <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#68777c]">{selected.body}</p>}</figcaption></motion.figure></motion.div>}</AnimatePresence>
  </>;
}

export default function AchievementsPage() { return <main className="min-h-screen"><AchievementCards /></main>; }
export function HomepageAchievements() { return <AchievementCards homepage />; }
