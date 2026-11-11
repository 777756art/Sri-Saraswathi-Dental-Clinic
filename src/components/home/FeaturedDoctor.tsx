import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";
import {
  DEFAULT_DOCTOR_DATA,
  parseDoctorData,
} from "@/lib/doctor-section-config";

export function FeaturedDoctor() {
  const { items } = useSiteContent("doctor");
  const featured =
    items.find((item) => item.homepageHighlight && item.published) ||
    items.find((item) => item.published) ||
    null;

  const data = parseDoctorData(featured);
  const doctorImage = data.image ? resolveApiAsset(data.image) : DEFAULT_DOCTOR_DATA.image;

  return (
    <section className="bg-white px-4 py-16 sm:py-20 lg:py-24" aria-label="Featured Doctor Introduction">
      <div className="container-x">
        <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          {/* Left Column: Doctor Photograph */}
          <div className="relative mx-auto w-full max-w-[480px] lg:mx-0">
            <div className="relative aspect-[3.8/4.8] overflow-hidden rounded-[28px] border border-[#dce4e5] bg-[#E4F0F2] shadow-[0_24px_55px_-30px_rgba(31,104,120,0.32)]">
              <img
                src={doctorImage}
                alt={`${data.name} - ${data.designation}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-top transition duration-700 hover:scale-[1.025]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1F6878]/90 via-[#1F6878]/25 to-transparent" />

              <div className="absolute bottom-5 left-5 right-5 text-white">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[#1F6878]/75 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#E4F0F2] backdrop-blur-md">
                  <Sparkles className="h-3 w-3 text-[#E4F0F2]" /> Chief Dental Specialist
                </span>
                <p className="mt-2 font-sans text-[22px] font-bold tracking-tight text-white sm:text-[24px]">
                  {data.name}
                </p>
                <p className="text-[12px] text-[#E4F0F2]/90">
                  {data.qualification} · Over {data.experience} of Clinical Practice in Erode
                </p>
              </div>
            </div>

            {/* Floating verification badge */}
            <div className="absolute -bottom-3 -right-2 z-10 flex items-center gap-2.5 rounded-2xl border border-[#1F6878]/20 bg-white px-4 py-3 shadow-[0_12px_32px_-16px_rgba(31,104,120,0.35)] sm:-bottom-4 sm:right-2 sm:px-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E4F0F2] text-[#1F6878]">
                <UserCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1F6878]">Verified Practitioner</p>
                <p className="text-[13px] font-bold text-[#15191B]">
                  {data.verifiedText || "Tamil Nadu Dental Council"}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Bio & Highlights */}
          <div className="max-w-[620px]">
            <span className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#1F6878]">
              <span className="h-2 w-2 rounded-full bg-[#1F6878]" />
              {data.badgeText || "Dedicated Clinical Leadership"}
            </span>

            <h2 className="mt-3 font-sans text-[32px] font-bold leading-[1.12] tracking-[-0.035em] text-[#1F6878] sm:text-[42px]">
              Meet {data.name}.
              <span className="mt-1 block text-[20px] font-semibold text-[#1F6878] sm:text-[24px]">
                {data.qualification} — {data.designation}
              </span>
            </h2>
            <div className="mt-3 h-1 w-14 rounded-full bg-[#1F6878]" />

            <p className="mt-4 text-[15px] leading-[1.8] text-[#707574]">
              {data.description}
            </p>

            {/* Three compact mint feature cards */}
            <div className="mt-6 grid gap-3.5 sm:grid-cols-3">
              {/* Highlight Card 1: Experience & Focus */}
              <div className="rounded-[20px] border border-[#1F6878]/15 bg-[#E4F0F2]/75 p-4 transition hover:border-[#1F6878]/40">
                <div className="flex items-center gap-2 text-[#1F6878]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#1F6878] shadow-sm">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <h3 className="text-[13px] font-bold leading-tight">
                    {data.experience} {data.experienceTitle}
                  </h3>
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-[#707574]">
                  {data.experienceDesc}
                </p>
              </div>

              {/* Highlight Card 2: Patient-First Care */}
              <div className="rounded-[20px] border border-[#1F6878]/15 bg-[#E4F0F2]/75 p-4 transition hover:border-[#1F6878]/40">
                <div className="flex items-center gap-2 text-[#1F6878]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#1F6878] shadow-sm">
                    <HeartHandshake className="h-4 w-4" />
                  </span>
                  <h3 className="text-[13px] font-bold leading-tight">
                    {data.patientFirstTitle}
                  </h3>
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-[#707574]">
                  {data.patientFirstDesc}
                </p>
              </div>

              {/* Highlight Card 3: Advanced Dental Technology */}
              <div className="rounded-[20px] border border-[#1F6878]/15 bg-[#E4F0F2]/75 p-4 transition hover:border-[#1F6878]/40">
                <div className="flex items-center gap-2 text-[#1F6878]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#1F6878] shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <h3 className="text-[13px] font-bold leading-tight">
                    {data.advancedTreatmentTitle}
                  </h3>
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-[#707574]">
                  {data.advancedTreatmentDesc}
                </p>
              </div>
            </div>

            {/* Key trust bullets / Key features */}
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-medium text-[#1F6878]">
              {data.keyFeatures.map((feat, index) => (
                <span key={index} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#1F6878]" /> {feat}
                </span>
              ))}
            </div>

            {/* Two CTAs: Orchid Pink primary appointment CTA + Midnight Teal secondary */}
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <Link
                to={data.secondaryBtnLink || "/booking"}
                className="inline-flex h-[48px] items-center gap-2 rounded-full bg-[#E95A35] px-6 text-[13px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(233,90,53,0.6)] transition hover:-translate-y-0.5 hover:bg-[#D14824]"
              >
                <CalendarDays className="h-4 w-4" />{" "}
                {data.secondaryBtnText || "Book With Doctor"}
              </Link>
              <Link
                to={data.primaryBtnLink || "/our-dentists"}
                className="inline-flex h-[48px] items-center gap-2 rounded-full border border-[#1F6878]/25 bg-white px-6 text-[13px] font-bold text-[#1F6878] transition hover:border-[#1F6878] hover:bg-[#E4F0F2]"
              >
                {data.primaryBtnText || "Explore Dentist Profile"}{" "}
                <ArrowRight className="h-4 w-4 text-[#1F6878]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
