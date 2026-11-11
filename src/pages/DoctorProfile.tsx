import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Stethoscope, UserRound } from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

export default function DoctorProfilePage() {
  const { slug = "" } = useParams();
  const { items, loading } = useSiteContent("doctor");
  const doctor = useMemo(() => items.find((item) => item.slug === slug || String(item.id) === slug), [items, slug]);
  if (loading) return <main className="grid min-h-[70vh] place-items-center bg-[#F5F2EB] text-sm text-[#707574]">Loading dentist profile…</main>;
  if (!doctor) return <main className="grid min-h-[70vh] place-items-center bg-[#F5F2EB] px-4 pt-20"><div className="max-w-md text-center"><UserRound className="mx-auto h-9 w-9 text-[#1F6878]" /><h1 className="mt-4 font-display text-2xl font-bold text-[#1F6878]">This dentist profile is unavailable</h1><p className="mt-2 text-sm leading-6 text-[#707574]">The profile may have been unpublished or moved.</p><Link to="/our-dentists" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#E95A35] hover:text-[#D14824]"><ArrowLeft className="h-4 w-4" /> Back to our dentists</Link></div></main>;
  return <main className="min-h-screen bg-[#F5F2EB] pb-20 pt-[120px] sm:pt-[145px]">
    <div className="container-x"><Link to="/our-dentists" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#707574] transition hover:text-[#1F6878]"><ArrowLeft className="h-4 w-4" /> All dentists</Link>
      <article className="mt-5 overflow-hidden rounded-[26px] border border-[#1F6878]/15 bg-white shadow-[0_20px_48px_-34px_rgba(31,104,120,.35)]"><div className="grid lg:grid-cols-[.8fr_1.2fr]">
        <div className="relative min-h-[360px] bg-[#E4F0F2] sm:min-h-[520px]">{doctor.mediaUrl ? <img src={resolveApiAsset(doctor.mediaUrl)} alt={doctor.title} className="absolute inset-0 h-full w-full object-cover object-top" /> : <div className="grid h-full place-items-center"><UserRound className="h-20 w-20 text-[#1F6878]/60" /></div>}<span className="absolute inset-0 bg-gradient-to-t from-[#1F6878]/75 via-transparent to-transparent" /><span className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#1F6878]/80 px-3 py-2 text-[10px] font-semibold text-white backdrop-blur"><Stethoscope className="h-3.5 w-3.5 text-[#E4F0F2]" /> Sri Saraswathi Dental Clinic</span></div>
        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#1F6878]">Dentist profile</p><h1 className="mt-3 font-display text-[34px] font-bold leading-tight tracking-[-.035em] text-[#1F6878] sm:text-[44px]">{doctor.title}</h1>{doctor.subtitle && <p className="mt-2 text-[15px] font-semibold text-[#1F6878]">{doctor.subtitle}</p>}
          <div className="mt-5 flex flex-wrap gap-2">{doctor.qualification && <span className="rounded-full bg-[#E4F0F2] px-3 py-1.5 text-[11px] font-semibold text-[#1F6878]">{doctor.qualification}</span>}{doctor.specialization && <span className="rounded-full bg-[#E4F0F2] px-3 py-1.5 text-[11px] font-semibold text-[#E95A35]">{doctor.specialization}</span>}{doctor.yearsExperience && <span className="rounded-full border border-[#1F6878]/10 bg-[#F5F2EB] px-3 py-1.5 text-[11px] font-medium text-[#1F6878]">{doctor.yearsExperience} experience</span>}</div>
          {(doctor.excerpt || doctor.body) && <div className="mt-6 space-y-4 text-[14px] leading-7 text-[#707574]"><p>{doctor.excerpt}</p>{doctor.body && <p className="whitespace-pre-line">{doctor.body}</p>}</div>}
          <div className="mt-8 flex flex-wrap gap-3"><Link to={`/booking?doctor=${encodeURIComponent(doctor.title)}`} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#E95A35] px-6 text-[12px] font-bold text-white shadow-[0_12px_26px_-12px_rgba(233,90,53,0.55)] transition hover:bg-[#D14824] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E95A35] focus-visible:ring-offset-2"><CalendarDays className="h-4 w-4" /> Book an appointment</Link><Link to="/our-dentists/achievements" className="inline-flex h-12 items-center gap-2 rounded-full border border-[#1F6878]/25 px-5 text-[12px] font-semibold text-[#1F6878] transition hover:border-[#1F6878] hover:bg-[#E4F0F2] hover:text-[#1F6878]">Doctor achievements <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </div></article>
    </div>
  </main>;
}
