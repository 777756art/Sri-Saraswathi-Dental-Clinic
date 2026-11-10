import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, UserRound } from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

export function DentistProfiles() {
  const { items, loading } = useSiteContent("doctor");
  const dentists = [...items].filter((item) => item.homepageHighlight).sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id).slice(0, 3);
  return <section className="bg-white px-4 py-16 sm:py-20 lg:py-24">
    <div className="container-x">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#c72d70]">Our care team</p><h2 className="mt-3 max-w-2xl font-display text-[30px] font-semibold leading-tight tracking-[-.035em] text-[#173d43] sm:text-[40px]">Meet the Experts Behind Your Smile.</h2><p className="mt-3 max-w-xl text-[14px] leading-7 text-[#68777c]">Get to know the clinicians who can guide your next step.</p></div><Link to="/our-dentists" className="hidden items-center gap-2 text-[12px] font-semibold text-[#bd2d6d] sm:inline-flex">View all dentists <ArrowRight className="h-4 w-4" /></Link></div>
      {loading ? <div className="mt-8 grid min-h-40 place-items-center rounded-3xl border border-[#eee7e2] bg-[#faf8f4] text-sm text-[#758187]">Loading dentist profiles…</div> : dentists.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dentists.map((doctor) => <article key={doctor.id} className="group overflow-hidden rounded-[20px] border border-[#ebe5df] bg-white shadow-[0_12px_28px_-24px_rgba(25,50,55,.4)] transition hover:-translate-y-1 hover:shadow-lg">
          <Link to={`/our-dentists/${doctor.slug || doctor.id}`} className="relative block aspect-[4/3] overflow-hidden bg-[#edf3f1]">{doctor.mediaUrl ? <img src={resolveApiAsset(doctor.mediaUrl)} alt={doctor.title} loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.035]" /> : <span className="grid h-full place-items-center"><UserRound className="h-12 w-12 text-[#9db4b0]" /></span>}<span className="absolute inset-0 bg-gradient-to-t from-[#0a3035]/75 via-transparent to-transparent" /><span className="absolute bottom-4 left-4 text-white"><span className="block text-[9px] font-bold uppercase tracking-[.17em] text-white/65">{doctor.specialization || "Our dentist"}</span><span className="mt-1 block font-display text-[21px] font-semibold">{doctor.title}</span></span></Link>
          <div className="p-4"><p className="text-[11px] font-medium text-[#287d75]">{doctor.qualification || ""}{doctor.yearsExperience ? ` · ${doctor.yearsExperience}` : ""}</p>{doctor.excerpt && <p className="mt-2 line-clamp-2 text-[11.5px] leading-5 text-[#718087]">{doctor.excerpt}</p>}<div className="mt-4 flex items-center justify-between border-t border-[#efebe7] pt-3"><Link to={`/our-dentists/${doctor.slug || doctor.id}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#bd2d6d]">View profile <ArrowRight className="h-3 w-3" /></Link><Link to={`/booking?doctor=${encodeURIComponent(doctor.title)}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#073b43] px-3 py-2 text-[9px] font-bold text-white"><CalendarDays className="h-3 w-3" /> Book visit</Link></div></div>
        </article>)}
      </div> : <div className="mt-8 rounded-[20px] border border-dashed border-[#e2d9d3] bg-[#faf8f4] px-5 py-9 text-center text-[13px] text-[#738087]">Published dentist profiles will appear here.</div>}
      <Link to="/our-dentists" className="mt-5 inline-flex items-center gap-2 text-[12px] font-semibold text-[#bd2d6d] sm:hidden">View all dentists <ArrowRight className="h-4 w-4" /></Link>
    </div>
  </section>;
}
