"use client";

import { Link } from "react-router-dom";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { ShieldCheck, ArrowRight } from "lucide-react";

const insurers = [
  "Star Health", "HDFC ERGO", "ICICI Lombard", "Niva Bupa", "Care Health",
  "New India Assurance", "Bajaj Allianz", "Tata AIG", "Aditya Birla Health",
  "Oriental Insurance", "National Insurance", "ManipalCigna",
];

export function InsuranceSection() {
  return (
    <section className="relative overflow-hidden border-y border-border/70 bg-card/60 py-16 md:py-20">
      <div className="container-x">
        <ScrollReveal>
          <div className="mx-auto mb-8 max-w-2xl text-center md:mb-10">
            <p className="eyebrow justify-center">
              <ShieldCheck className="h-3.5 w-3.5 text-primary-600" />
              Insurance &amp; payment
            </p>
            <h2 className="mt-4 text-display-3 text-balance text-foreground">
              We work with all major insurers
            </h2>
            <p className="mt-3 text-pretty text-[15px] leading-relaxed text-muted-foreground">
              Over 50 plans accepted, plus interest-free payment options. We handle the paperwork
              so you can focus on your smile.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1}>
          <div className="flex flex-wrap justify-center gap-2">
            {insurers.map((insurer) => (
              <span
                key={insurer}
                className="rounded-full border border-border/80 bg-background px-4 py-2 text-[12px] font-medium text-secondary-600 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-800 hover:shadow-soft"
              >
                {insurer}
              </span>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2}>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            And 38+ more plans.{" "}
            <Link to="/contact" className="inline-flex items-center gap-1 font-medium text-primary-700 link-underline">
              Verify your coverage <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
