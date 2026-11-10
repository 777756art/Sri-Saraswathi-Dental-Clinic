import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, MessageCircleHeart, Star } from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

export function PatientReviews() {
  const { items, loading } = useSiteContent("testimonial");
  const testimonials = items.filter((item) => item.homepageHighlight).sort((a, b) => a.displayOrder - b.displayOrder || b.id - a.id);
  const [start, setStart] = useState(0);
  const visible = testimonials.length <= 3 ? testimonials : Array.from({ length: 3 }, (_, index) => testimonials[(start + index) % testimonials.length]);
  return <section className="bg-[#fff8fa] px-4 py-16 sm:py-20 lg:py-24">
    <div className="container-x">
      <div className="flex flex-wrap items-end justify-between gap-4"><div className="mx-auto max-w-2xl text-center sm:mx-0 sm:text-left"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#c72d70]">Patient-approved stories</p><h2 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-[-.035em] text-[#173d43] sm:text-[40px]">Real Stories. Confident Smiles.</h2><p className="mt-3 text-[13px] leading-6 text-[#718087]">Shared by patients with permission to publish.</p></div>
        {!loading && testimonials.length > 3 && <div className="mx-auto flex gap-2 sm:mx-0"><button type="button" aria-label="Previous testimonials" onClick={() => setStart((value) => (value - 1 + testimonials.length) % testimonials.length)} className="grid h-10 w-10 place-items-center rounded-full border border-[#eadde0] bg-white text-[#173d43] hover:border-[#c72d70] hover:text-[#c72d70]"><ArrowLeft className="h-4 w-4" /></button><button type="button" aria-label="Next testimonials" onClick={() => setStart((value) => (value + 1) % testimonials.length)} className="grid h-10 w-10 place-items-center rounded-full bg-[#073b43] text-white hover:bg-[#087e8b]"><ArrowRight className="h-4 w-4" /></button></div>}
      </div>
      {loading ? <div className="mt-8 grid min-h-36 place-items-center rounded-3xl border border-[#f0e2e5] bg-white text-sm text-[#758187]">Loading approved stories…</div> : visible.length ? <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => { const rating = Number(item.ratingScore); const hasRating = item.ratingVerified && Number.isFinite(rating) && rating > 0 && rating <= 5; return <article key={item.id} className="flex min-h-[210px] flex-col rounded-[20px] border border-[#f0e2e5] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(48,35,48,.4)] sm:p-6">
          <div className="flex items-center justify-between gap-3">{hasRating ? <span className="flex items-center gap-1 text-[#d59b24]" aria-label={`Rated ${rating} out of 5`}>{Array.from({ length: Math.round(rating) }, (_, index) => <Star key={index} className="h-3.5 w-3.5 fill-current" />)}<span className="ml-1 text-[10px] font-semibold text-[#66717d]">{rating}</span></span> : <MessageCircleHeart className="h-5 w-5 text-[#c72d70]" />}{item.category && <span className="text-[9px] font-bold uppercase tracking-[.13em] text-[#28827a]">{item.category}</span>}</div>
          <blockquote className="mt-4 flex-1 text-[13px] leading-6 text-[#5f6e76]">“{item.body || item.excerpt}”</blockquote>
          <div className="mt-5 flex items-center gap-3 border-t border-[#f1e8e9] pt-4">{item.mediaUrl ? <img src={resolveApiAsset(item.mediaUrl)} alt="" loading="lazy" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fce8f1] text-[12px] font-bold text-[#a83266]">{(item.author || "P").slice(0, 1).toUpperCase()}</span>}<div><p className="text-[12px] font-semibold text-[#24474c]">{item.author || "Clinic patient"}</p>{item.publishedAt && <p className="mt-0.5 text-[9px] text-[#879198]">{new Date(item.publishedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>}</div></div>
        </article>; })}
      </div> : <div className="mx-auto mt-8 max-w-xl rounded-[20px] border border-dashed border-[#e8d8de] bg-white px-6 py-9 text-center"><MessageCircleHeart className="mx-auto h-7 w-7 text-[#bd7193]" /><p className="mt-3 font-display text-lg font-semibold text-[#173d43]">Patient stories will appear here</p><p className="mt-1 text-[12px] leading-5 text-[#738087]">Only reviews approved for publication are shown.</p><Link to="/contact" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#bd2d6d]">Contact the clinic <ArrowRight className="h-3 w-3" /></Link></div>}
    </div>
  </section>;
}
