import { Link } from "react-router-dom";
import { ArrowRight, Award, CalendarDays, Stethoscope, UserRound } from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

export default function DentistsPage() {
  const { items, loading } = useSiteContent("doctor");
  const dentists = [...items].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
  return (
    <main className="min-h-screen bg-[#F5F2EB] pb-20 pt-[124px] sm:pt-[145px]">
      <section className="container-x">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#1F6878]"><Stethoscope className="h-3.5 w-3.5 text-[#1F6878]" /> Our dentists</p>
          <h1 className="mt-3 font-display text-[34px] font-bold leading-tight tracking-[-.035em] text-[#1F6878] sm:text-[48px]">Meet the <span className="text-[#1F6878]">experts</span> behind your smile.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-7 text-[#707574]">Get to know the dentists who care for patients at Sri Saraswathi Dental Clinic.</p>
        </div>
        {loading ? <div className="mt-10 grid min-h-48 place-items-center rounded-3xl border border-[#dce4e5] bg-white text-sm text-[#707574]">Loading dentist profiles…</div> : dentists.length ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dentists.map((doctor) => (
              <article key={doctor.id} className="group overflow-hidden rounded-[22px] border border-[#dce4e5] bg-white shadow-[0_14px_34px_-26px_rgba(31,104,120,.35)] transition duration-300 hover:-translate-y-1 hover:border-[#1F6878]/35 hover:shadow-[0_22px_44px_-26px_rgba(31,104,120,.38)]">
                <Link to={`/our-dentists/${doctor.slug || doctor.id}`} className="relative block aspect-[4/4.1] overflow-hidden bg-[#E4F0F2]">
                  {doctor.mediaUrl ? <img src={resolveApiAsset(doctor.mediaUrl)} alt={doctor.title} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.035]" /> : <span className="absolute inset-0 grid place-items-center"><UserRound className="h-14 w-14 text-[#1F6878]/50" /></span>}
                  <span className="absolute inset-0 bg-gradient-to-t from-[#1F6878]/85 via-transparent to-transparent" />
                  <span className="absolute bottom-4 left-4 right-4 text-white"><span className="block text-[9px] font-bold uppercase tracking-[.17em] text-[#E4F0F2]">{doctor.specialization || "Dental care"}</span><span className="mt-1 block font-display text-[22px] font-bold leading-tight">{doctor.title}</span></span>
                </Link>
                <div className="p-5">
                  <p className="text-[11px] font-bold text-[#1F6878]">{doctor.qualification || ""}{doctor.yearsExperience ? ` · ${doctor.yearsExperience}` : ""}</p>
                  {doctor.excerpt && <p className="mt-3 line-clamp-3 text-[12.5px] leading-6 text-[#707574]">{doctor.excerpt}</p>}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#dce4e5] pt-4">
                    <Link to={`/our-dentists/${doctor.slug || doctor.id}`} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1F6878] hover:text-[#1F6878]">View profile <ArrowRight className="h-3.5 w-3.5 text-[#1F6878]" /></Link>
                    <Link to={`/booking?doctor=${encodeURIComponent(doctor.title)}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#E95A35] px-3.5 py-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#D14824]"><CalendarDays className="h-3.5 w-3.5" /> Book appointment</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-xl rounded-[24px] border border-dashed border-[#dce4e5] bg-white px-6 py-12 text-center">
            <UserRound className="mx-auto h-9 w-9 text-[#1F6878]" /><h2 className="mt-4 font-display text-xl font-bold text-[#1F6878]">Dentist profiles are being prepared</h2><p className="mt-2 text-[13px] leading-6 text-[#707574]">Please contact the clinic if you would like help choosing a visit.</p>
          </div>
        )}
        <div className="mt-8 flex justify-center"><Link to="/our-dentists/achievements" className="inline-flex items-center gap-2 rounded-full border border-[#1F6878]/30 bg-white px-5 py-2.5 text-[11px] font-semibold text-[#1F6878] transition hover:bg-[#E4F0F2]">View doctors’ achievements <Award className="h-4 w-4 text-[#1F6878]" /></Link></div>
      </section>
    </main>
  );
}
