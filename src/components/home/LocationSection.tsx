"use client";

import { Link } from "react-router-dom";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { MapPin, Clock, Phone, ArrowUpRight, CalendarCheck } from "lucide-react";
import { clinicImages } from "@/lib/images";

const details: { icon: typeof MapPin; label: string; lines: string[]; href?: string }[] = [
  {
    icon: MapPin,
    label: "Address",
    lines: ["866, Soli Complex, Surampatti Four Rd", "Erode, Tamil Nadu 638009"],
  },
  {
    icon: Clock,
    label: "Hours",
    lines: ["Mon–Sat: 9:00 AM – 8:45 PM", "Sunday: Emergency only"],
  },
  {
    icon: Phone,
    label: "Phone",
    lines: ["0424 427 2494"],
  },
  {
    icon: MapPin,
    label: "Directions",
    lines: ["Open in Google Maps"],
    href: "https://share.google/Izecs47hnhjCpmBBs",
  },
];

export function LocationSection() {
  return (
    <section className="section-pad relative overflow-hidden bg-background">
      <div className="container-x">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <ScrollReveal direction="left">
            <div>
              <p className="eyebrow"><span className="eyebrow-dot" />Visit the clinic</p>
              <h2 className="mt-4 text-display-2 text-balance text-foreground">
                Right where you <span className="italic text-primary-700">need us</span>.
              </h2>
              <p className="mt-4 max-w-md text-pretty text-[16px] leading-relaxed text-muted-foreground">
                A calm, daylight-filled clinic in Surampatti, Erode — easy to reach and easy to
                book, with evening slots until 8:45 PM.
              </p>

              <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {details.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-600/10">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
                        {item.lines.map((line) =>
                          item.href ? (
                            <a
                              key={line}
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-[13px] leading-relaxed text-primary-700 underline-offset-2 hover:underline"
                            >
                              {line}
                            </a>
                          ) : (
                            <p key={line} className="text-[13px] leading-relaxed text-muted-foreground">
                              {line}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  to="/booking"
                  className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_18px_36px_-20px_rgba(18,56,72,0.85)] transition-all hover:-translate-y-0.5 hover:bg-primary-800"
                >
                  <CalendarCheck className="h-4 w-4" />
                  Book your visit
                </Link>
                <a
                  href="tel:+914244272494"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground/75 transition-all hover:border-foreground/20 hover:text-foreground"
                >
                  <Phone className="h-4 w-4" /> 0424 427 2494
                </a>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right" delay={0.1}>
            <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card shadow-card">
              <div className="relative aspect-[4/3.4] overflow-hidden bg-secondary-100">
                <img
                  src={clinicImages.exterior}
                  alt="Sri Saraswathi Dental Clinic entrance in Erode"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 rounded-2xl border border-white/25 bg-ink-950/45 p-4 text-white shadow-soft backdrop-blur-md">
                  <div>
                    <p className="font-display text-[17px] leading-tight">Sri Saraswathi Dental Clinic</p>
                    <p className="mt-0.5 text-[11px] text-white/75">Surampatti · Erode, TN</p>
                  </div>
                  <a
                    href="https://share.google/Izecs47hnhjCpmBBs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[11px] font-semibold text-ink-950 transition-colors hover:bg-primary-50"
                  >
                    Directions <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
