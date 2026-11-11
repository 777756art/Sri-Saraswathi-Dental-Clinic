import { Link } from "react-router-dom";
import { clinicImages } from "@/lib/images";
import { useClinicSettings } from "@/lib/clinic-settings";
import { Phone, Mail, MapPin, Clock, Sparkles, ArrowUpRight } from "lucide-react";

const services = [
  { label: "All treatments", href: "/treatments" },
];

const quickLinks = [
  { label: "Our Dentists", href: "/our-dentists" },
  { label: "Doctors’ Achievements", href: "/our-dentists/achievements" },
  { label: "Clinic Gallery", href: "/clinic-gallery" },
  { label: "Before & After", href: "/gallery/before-after" },
  { label: "Blogs", href: "/blogs" },
  { label: "Patient Portal", href: "/patient-portal" },
  { label: "Contact & About", href: "/contact" },
  { label: "Book a visit", href: "/booking" },
];

const socials = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/srisaraswathidental",
    path: "M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.17 2.1 16.03 2 14.8 2 12.28 2 10.5 3.54 10.5 6.36V9.5H8v4h2.5V22h3.5z",
  },
  {
    name: "Twitter",
    href: "https://x.com/srisaraswathident",
    path: "M18.9 2H22l-6.77 7.74L23 22h-6.2l-4.86-6.36L6.4 22H3.28l7.24-8.28L2 2h6.36l4.39 5.8z",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/srisaraswathidental",
    path: "M12 2c2.72 0 3.06.01 4.12.06 1.07.05 1.79.22 2.43.47.66.25 1.22.6 1.77 1.15.55.55.9 1.11 1.15 1.77.25.64.42 1.36.47 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.07-.22 1.79-.47 2.43-.25.66-.6 1.22-1.15 1.77-.55.55-1.11.9-1.77 1.15-.64.25-1.36.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.07-.05-1.79-.22-2.43-.47-.66-.25-1.22-.6-1.77-1.15-.55-.55-.9-1.11-1.15-1.77-.25-.64-.42-1.36-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.07.22-1.79.47-2.43.25-.66.6-1.22 1.15-1.77.55-.55 1.11-.9 1.77-1.15.64-.25 1.36-.42 2.43-.47C8.94 2.01 9.28 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5.25-2.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/srisaraswathidental",
    path: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C20.5 8.65 22 10.5 22 14v7h-4v-6.1c0-1.45-.03-3.32-2.02-3.32-2.02 0-2.33 1.58-2.33 3.21V21H9z",
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@srisaraswathidental",
    path: "M23 12s0-3.4-.43-5.03a2.6 2.6 0 0 0-1.83-1.84C19.11 4.7 12 4.7 12 4.7s-7.11 0-8.74.43A2.6 2.6 0 0 0 1.43 6.97C1 8.6 1 12 1 12s0 3.4.43 5.03c.24.9.95 1.6 1.83 1.84C4.89 19.3 12 19.3 12 19.3s7.11 0 8.74-.43a2.6 2.6 0 0 0 1.83-1.84C23 15.4 23 12 23 12zM9.75 15.02V8.98L15.5 12l-5.75 3.02z",
  },
];

export function Footer() {
  const { settings } = useClinicSettings();
  return (
    <footer className="relative overflow-hidden bg-[#1F6878] text-white/75">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-[#1F6878]/20 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-[360px] w-[360px] rounded-full bg-[#E95A35]/10 blur-3xl" />
      </div>

      <div className="container-x relative py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_0.9fr_0.9fr_1.2fr]">
          <div>
            <Link
              to="/"
              className="mb-5 inline-flex w-fit items-center"
              aria-label="Sri Saraswathi Dental Clinic home"
            >
              <img
                src={clinicImages.logoLight}
                alt="Sri Saraswathi Dental Clinic"
                width={136}
                height={64}
                loading="lazy"
                decoding="async"
                className="h-11 w-auto max-w-[125px] object-contain"
              />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed">
              Thoughtful dental care in Erode, with clear guidance and a welcoming team for every visit.
            </p>
            <div className="mt-6 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1F6878]/35 text-white/60 transition-all hover:-translate-y-0.5 hover:border-[#E4F0F2] hover:bg-[#1F6878] hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-eyebrow uppercase text-[#E4F0F2]">Services</h3>
            <ul className="space-y-2.5">
              {services.map((s) => (
                <li key={s.label}>
                  <Link to={s.href} className="text-sm transition-colors hover:text-[#E4F0F2]">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-eyebrow uppercase text-[#E4F0F2]">Explore</h3>
            <ul className="space-y-2.5">
              {quickLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="text-sm transition-colors hover:text-[#E4F0F2]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-eyebrow uppercase text-[#E4F0F2]">Visit the clinic</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#E4F0F2]" />
                <span className="text-sm leading-relaxed">
                  {settings.address || "866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-[#E4F0F2]" />
                <a href={`tel:${(settings.phone || "04244272494").replace(/\s+/g, "")}`} className="text-sm transition-colors hover:text-white">
                  {settings.phone || "0424 427 2494"}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-[#E4F0F2]" />
                <a href={`mailto:${settings.email || "info@srisaraswathidental.com"}`} className="text-sm transition-colors hover:text-white">
                  {settings.email || "info@srisaraswathidental.com"}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#E4F0F2]" />
                <span className="text-sm leading-relaxed">
                  {settings.opening_hours || "Mon–Sat: 9:00 AM – 8:45 PM | Sunday: Emergency only"}
                </span>
              </li>
            </ul>
            <Link
              to="/booking"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#E95A35] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_10px_24px_-12px_rgba(233,90,53,0.85)] transition-all hover:-translate-y-0.5 hover:bg-[#D14824]"
            >
              Book a visit
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#1F6878]/35 bg-[#1F6878]/25 p-3">
              <Sparkles className="h-4 w-4 shrink-0 text-[#E4F0F2]" />
              <p className="text-xs text-[#E4F0F2]/85">Questions before booking? Call the clinic team.</p>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/15 pt-6 md:flex-row">
          <p className="text-xs text-white/55">
            &copy; {new Date().getFullYear()} Sri Saraswathi Dental Clinic. All rights reserved.
          </p>
          <Link to="/contact" className="text-xs text-white/60 transition-colors hover:text-[#E4F0F2]">Contact the clinic</Link>
        </div>
      </div>
    </footer>
  );
}
