import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Stethoscope, UserRound } from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

export default function DoctorProfilePage() {
  const { slug = "" } = useParams();
  const { items, loading } = useSiteContent("doctor");
  const doctor = useMemo(() => items.find((item) => item.slug === slug || String(item.id) === slug), [items, slug]);
  if (loading) return <main className="grid min-h-[70vh] place-items-center bg-[#faf8f4] text-sm text-[#738087]">Loading dentist profile…</main>;
  if (!doctor) return <main className="grid min-h-[70vh] place-items-center bg-[#faf8f4] px-4 pt-20"><div className="max-w-md text-center"><UserRound className="mx-auto h-9 w-9 text-[#bd7193]" /><h1 className="mt-4 font-display text-2xl font-semibold text-[#173d43]">This dentist profile is unavailable</h1><p className="mt-2 text-sm leading-6 text-[#738087]">The profile may have been unpublished or moved.</p><Link to="/our-dentists" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#c72d70]"><ArrowLeft className="h-4 w-4" /> Back to our dentists</Link></div></main>;
  return <main className="min-h-screen bg-[#faf8f4] pb-20 pt-[120px] sm:pt-[145px]">
    <div className="container-x"><Link to="/our-dentists" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#63757a] hover:text-[#c72d70]"><ArrowLeft className="h-4 w-4" /> All dentists</Link>
      <article className="mt-5 overflow-hidden rounded-[26px] border border-[#ece4de] bg-white shadow-[0_20px_48px_-34px_rgba(25,50,55,.4)]"><div className="grid lg:grid-cols-[.8fr_1.2fr]">
        <div className="relative min-h-[360px] bg-[#e7efec] sm:min-h-[520px]">{doctor.mediaUrl ? <img src={resolveApiAsset(doctor.mediaUrl)} alt={doctor.title} className="absolute inset-0 h-full w-full object-cover object-top" /> : <div className="grid h-full place-items-center"><UserRound className="h-20 w-20 text-[#9db4b0]" /></div>}<span className="absolute inset-0 bg-gradient-to-t from-[#092f34]/70 via-transparent to-transparent" /><span className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#0b3439]/70 px-3 py-2 text-[10px] font-semibold text-white backdrop-blur"><Stethoscope className="h-3.5 w-3.5" /> Sri Saraswathi Dental Clinic</span></div>
        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#c72d70]">Dentist profile</p><h1 className="mt-3 font-display text-[34px] font-semibold leading-tight tracking-[-.035em] text-[#173d43] sm:text-[44px]">{doctor.title}</h1>{doctor.subtitle && <p className="mt-2 text-[15px] font-semibold text-[#287d75]">{doctor.subtitle}</p>}
          <div className="mt-5 flex flex-wrap gap-2">{doctor.qualification && <span className="rounded-full bg-[#edf6f4] px-3 py-1.5 text-[11px] font-medium text-[#326e6b]">{doctor.qualification}</span>}{doctor.specialization && <span className="rounded-full bg-[#fff0f5] px-3 py-1.5 text-[11px] font-medium text-[#a83266]">{doctor.specialization}</span>}{doctor.yearsExperience && <span className="rounded-full bg-[#f4f1e9] px-3 py-1.5 text-[11px] font-medium text-[#6e695a]">{doctor.yearsExperience} experience</span>}</div>
          {(doctor.excerpt || doctor.body) && <div className="mt-6 space-y-4 text-[14px] leading-7 text-[#64717a]"><p>{doctor.excerpt}</p>{doctor.body && <p className="whitespace-pre-line">{doctor.body}</p>}</div>}
          <div className="mt-8 flex flex-wrap gap-3"><Link to={`/booking?doctor=${encodeURIComponent(doctor.title)}`} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#e83e8c] px-6 text-[12px] font-bold text-white shadow-[0_10px_22px_-12px_rgba(200,45,112,.8)]"><CalendarDays className="h-4 w-4" /> Book an appointment</Link><Link to="/our-dentists/achievements" className="inline-flex h-12 items-center gap-2 rounded-full border border-[#e7d7dd] px-5 text-[12px] font-semibold text-[#29464a]">Doctor achievements <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </div></article>
    </div>
  </main>;
}
