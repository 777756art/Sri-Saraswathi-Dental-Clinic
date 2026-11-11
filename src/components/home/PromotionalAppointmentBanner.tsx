import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock, MapPin, Phone, ShieldCheck } from "lucide-react";
import { clinicImages } from "@/lib/images";
import { resolveApiAsset } from "@/lib/api";
import { useClinicSettings } from "@/lib/clinic-settings";
import { useSiteContent } from "@/components/home/SiteContentSections";

export function PromotionalAppointmentBanner() {
  const { settings } = useClinicSettings();
  const { items: offers } = useSiteContent("offer");
  const activeOffer = offers[0];

  const phone = settings.phone || "0424 427 2494";
  const cleanPhone = phone.replace(/\s+/g, "");

  const title = activeOffer?.title || "Ready to Experience Gentle, Compassionate Dental Care?";
  const description = activeOffer?.description || "Whether you need a routine check-up, pain relief, or want to discuss a full smile makeover, Dr. Kishore Kumar and our team are here to help you every step of the way.";
  const imageSrc = activeOffer?.mediaUrl ? resolveApiAsset(activeOffer.mediaUrl) : clinicImages.heroDentalCare;

  return (
    <section className="bg-white px-4 py-12 sm:py-16" aria-label="Promotional Appointment Banner">
      <div className="container-x">
        <div className="relative isolate overflow-hidden rounded-[32px] border border-[#1F6878]/15 bg-[#E4F0F2]/70 shadow-[0_20px_50px_-28px_rgba(31,104,120,0.2)]">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left Side: Content */}
            <div className="p-8 sm:p-12 lg:p-14">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">
                <MapPin className="h-3.5 w-3.5 text-white" /> Sri Saraswathi Dental Clinic · Erode
              </span>

              <h2 className="mt-4 font-sans text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-[#1F6878] sm:text-[38px] lg:text-[42px]">
                {title}
              </h2>

              <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-[#707574]">
                {description}
              </p>

              {/* Clinic Perks */}
              <div className="mt-6 flex flex-wrap gap-4 text-[12px] font-semibold text-[#1F6878]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#1F6878]" /> No Long Waiting Times
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#1F6878]" /> {settings.opening_hours || "Mon–Sat: 9 AM – 8:45 PM"}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  to="/booking"
                  className="inline-flex h-[50px] items-center gap-2.5 rounded-full bg-[#E95A35] px-7 text-[13px] font-bold text-white shadow-[0_12px_28px_-12px_rgba(233,90,53,0.75)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#D14824]"
                >
                  <CalendarDays className="h-4 w-4" /> Book an Appointment <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href={`tel:${cleanPhone}`}
                  className="inline-flex h-[50px] items-center gap-2 rounded-full border border-[#1F6878]/20 bg-white px-6 text-[13px] font-bold text-[#1F6878] transition hover:bg-[#1F6878] hover:text-white"
                >
                  <Phone className="h-4 w-4 text-[#1F6878]" /> Call {phone}
                </a>
              </div>
            </div>

            {/* Right Side: Professional Photograph */}
            <div className="relative h-full min-h-[300px] sm:min-h-[380px] lg:min-h-[440px]">
              <img
                src={imageSrc}
                alt="Sri Saraswathi Dental Clinic Consultation"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#E4F0F2]/90 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#E4F0F2] lg:via-transparent lg:to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
