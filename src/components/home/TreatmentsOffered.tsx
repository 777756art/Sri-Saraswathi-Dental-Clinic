import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Stethoscope } from "lucide-react";
import { clinicImages } from "@/lib/images";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

interface TreatmentCard {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  image: string;
}

const defaultTreatments: TreatmentCard[] = [
  {
    slug: "general-dentistry",
    title: "General Check-up & Ultrasonic Cleaning",
    category: "Preventative",
    excerpt: "Comprehensive digital examination, ultrasonic scaling, and tartar removal to maintain lasting gum health and protect natural teeth.",
    image: clinicImages.treatmentChair,
  },
  {
    slug: "root-canal",
    title: "Gentle Root Canal Therapy",
    category: "Restorative",
    excerpt: "Advanced endodontic procedure performed with high precision and local anesthesia to relieve pain and preserve your natural tooth.",
    image: clinicImages.treatmentRoom,
  },
  {
    slug: "cosmetic-dentistry",
    title: "Cosmetic Dentistry & Smile Makeovers",
    category: "Aesthetics",
    excerpt: "Custom ceramic veneers, aesthetic contouring, and composite bonding designed to give you a harmonious, radiant smile.",
    image: clinicImages.smileBeforeAfter,
  },
  {
    slug: "dental-implants",
    title: "Permanent Dental Implants",
    category: "Implantology",
    excerpt: "Titanium implant posts and natural-looking crowns that restore chewing efficiency, speech clarity, and structural jaw health.",
    image: clinicImages.operatoryChair,
  },
  {
    slug: "orthodontics",
    title: "Orthodontics & Clear Aligners",
    category: "Orthodontics",
    excerpt: "Modern discreet aligners and traditional braces for children, teenagers, and adults seeking perfectly aligned bites.",
    image: clinicImages.patientSmileDetail,
  },
  {
    slug: "teeth-whitening",
    title: "Professional Teeth Whitening",
    category: "Brightening",
    excerpt: "Safe, rapid in-chair brightening and take-home systems to lift stubborn stains from coffee, tea, and age discoloration.",
    image: clinicImages.patientSmile,
  },
];

export function TreatmentsOffered() {
  const { items } = useSiteContent("treatment");
  const publishedItems = items.filter((item) => item.published);

  // Dynamic D1 treatments with verified defaults fallback
  const treatments: TreatmentCard[] = publishedItems.length > 0
    ? publishedItems.map((item) => ({
        slug: item.slug || String(item.id),
        title: item.title,
        category: item.category || "Clinical Care",
        excerpt: item.excerpt || item.subtitle || (item.description ? item.description.slice(0, 140) + "..." : "Comprehensive oral care tailored to your needs."),
        image: item.mediaUrl ? resolveApiAsset(item.mediaUrl) : clinicImages.treatmentChair,
      }))
    : defaultTreatments;

  return (
    <section id="treatments-section" className="bg-white px-4 py-16 sm:py-20 lg:py-24" aria-label="Treatments Offered">
      <div className="container-x">
        {/* Centred Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">
            <Stethoscope className="h-3.5 w-3.5 text-white" /> Treatments Offered
          </span>
          <h2 className="mt-3 font-sans text-[32px] font-bold leading-tight tracking-[-0.035em] text-[#1F6878] sm:text-[42px]">
            Comprehensive Dental Care <span className="text-[#1F6878]">for Every Smile.</span>
          </h2>
          <div className="mx-auto mt-3.5 h-1 w-14 rounded-full bg-[#1F6878]" />
          <p className="mx-auto mt-3.5 max-w-xl text-[14px] leading-relaxed text-[#707574] sm:text-[15px]">
            Explore our six core clinical treatments, delivered with gentle techniques, modern equipment, and personalised care plans.
          </p>
        </div>

        {/* 6 Treatment Cards in 3-Column, 2-Row Layout */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {treatments.map((treatment) => (
            <article
              key={treatment.slug}
              className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#1F6878]/15 bg-white shadow-[0_10px_30px_-20px_rgba(31,104,120,0.2)] transition duration-300 hover:-translate-y-1.5 hover:border-[#1F6878]/40 hover:shadow-[0_20px_40px_-20px_rgba(31,104,120,0.28)]"
            >
              {/* Image Container */}
              <Link
                to={`/treatments/${treatment.slug}`}
                className="relative block aspect-[1.7/1] overflow-hidden bg-[#E4F0F2]"
                aria-label={treatment.title}
              >
                <img
                  src={treatment.image}
                  alt={treatment.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F6878]/60 via-transparent to-transparent" />
                <span className="absolute right-3.5 top-3.5 rounded-full bg-[#E4F0F2]/95 px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#1F6878] shadow-sm backdrop-blur-md">
                  {treatment.category}
                </span>
                <span className="absolute bottom-3 left-3.5 grid h-9 w-9 place-items-center rounded-xl bg-white/95 text-[#1F6878] shadow-sm">
                  <Stethoscope className="h-4.5 w-4.5" />
                </span>
              </Link>

              {/* Card Body */}
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <h3 className="font-sans text-[18px] font-bold leading-snug text-[#15191B] transition group-hover:text-[#1F6878]">
                  {treatment.title}
                </h3>
                <p className="mt-2.5 line-clamp-3 flex-1 text-[13px] leading-relaxed text-[#707574]">
                  {treatment.excerpt}
                </p>

                {/* Footer Links */}
                <div className="mt-5 flex items-center justify-between border-t border-[#dce4e5] pt-4">
                  <Link
                    to={`/treatments/${treatment.slug}`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#1F6878] transition hover:translate-x-0.5 hover:text-[#1F6878]"
                  >
                    View Details <ArrowRight className="h-3.5 w-3.5 text-[#1F6878]" />
                  </Link>

                  <Link
                    to={`/booking?service=${encodeURIComponent(treatment.slug)}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#E95A35] px-3.5 text-[10.5px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(233,90,53,0.55)] transition hover:bg-[#D14824]"
                  >
                    <CalendarDays className="h-3 w-3" /> Book Visit
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* View All CTA */}
        <div className="mt-10 text-center">
          <Link
            to="/treatments"
            className="inline-flex h-[48px] items-center gap-2 rounded-full border border-[#1F6878] px-7 text-[13px] font-bold text-[#1F6878] transition hover:bg-[#1F6878] hover:text-white"
          >
            Explore All Clinic Treatments <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}