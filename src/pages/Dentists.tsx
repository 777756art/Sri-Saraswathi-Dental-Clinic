import { Link } from "react-router-dom";
import { ArrowRight, Award, CalendarDays, Stethoscope, UserRound } from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

export default function DentistsPage() {
  const { items, loading } = useSiteContent("doctor");
  const dentists = [...items].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
  return (
    <main className="min-h-screen bg-[#faf8f4] pb-20 pt-[124px] sm:pt-[145px]">
      <section className="container-x">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#c72d70]"><Stethoscope className="h-3.5 w-3.5" /> Our dentists</p>
          <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight tracking-[-.035em] text-[#173d43] sm:text-[48px]">Meet the experts behind your smile.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-7 text-[#64717a]">Get to know the dentists who care for patients at Sri Saraswathi Dental Clinic.</p>
        </div>
        {loading ? <div className="mt-10 grid min-h-48 place-items-center rounded-3xl border border-[#ece4de] bg-white text-sm text-[#738087]">Loading dentist profiles…</div> : dentists.length ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dentists.map((doctor) => (
              <article key={doctor.id} className="group overflow-hidden rounded-[22px] border border-[#ece4de] bg-white shadow-[0_14px_34px_-26px_rgba(26,54,58,.42)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-26px_rgba(26,54,58,.38)]">
                <Link to={`/our-dentists/${doctor.slug || doctor.id}`} className="relative block aspect-[4/4.1] overflow-hidden bg-[#e8efed]">
                  {doctor.mediaUrl ? <img src={resolveApiAsset(doctor.mediaUrl)} alt={doctor.title} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.035]" /> : <span className="absolute inset-0 grid place-items-center"><UserRound className="h-14 w-14 text-[#8da9a7]" /></span>}
                  <span className="absolute inset-0 bg-gradient-to-t from-[#0a3035]/80 via-transparent to-transparent" />
                  <span className="absolute bottom-4 left-4 right-4 text-white"><span className="block text-[9px] font-bold uppercase tracking-[.17em] text-white/65">{doctor.specialization || "Dental care"}</span><span className="mt-1 block font-display text-[22px] font-semibold leading-tight">{doctor.title}</span></span>
                </Link>
                <div className="p-5">
                  <p className="text-[11px] font-semibold text-[#207c73]">{doctor.qualification || ""}{doctor.yearsExperience ? ` · ${doctor.yearsExperience}` : ""}</p>
                  {doctor.excerpt && <p className="mt-3 line-clamp-3 text-[12.5px] leading-6 text-[#6c7980]">{doctor.excerpt}</p>}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#efebe7] pt-4">
                    <Link to={`/our-dentists/${doctor.slug || doctor.id}`} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#bc2c6b]">View profile <ArrowRight className="h-3.5 w-3.5" /></Link>
                    <Link to={`/booking?doctor=${encodeURIComponent(doctor.title)}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#073b43] px-3.5 py-2 text-[10px] font-bold text-white transition hover:bg-[#087e8b]"><CalendarDays className="h-3.5 w-3.5" /> Book appointment</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-xl rounded-[24px] border border-dashed border-[#e2d9d3] bg-white px-6 py-12 text-center">
            <UserRound className="mx-auto h-9 w-9 text-[#bd7193]" /><h2 className="mt-4 font-display text-xl font-semibold text-[#173d43]">Dentist profiles are being prepared</h2><p className="mt-2 text-[13px] leading-6 text-[#738087]">Please contact the clinic if you would like help choosing a visit.</p>
          </div>
        )}
        <div className="mt-8 flex justify-center"><Link to="/our-dentists/achievements" className="inline-flex items-center gap-2 rounded-full border border-[#e8bdcf] bg-white px-5 py-2.5 text-[11px] font-semibold text-[#be2f6f]">View doctors’ achievements <Award className="h-4 w-4" /></Link></div>
      </section>
    </main>
  );
}
