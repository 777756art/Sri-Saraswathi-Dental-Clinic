"use client";

import { useState } from "react";
import { BellRing, CalendarCheck, ClipboardList, FileText, HeartPulse, Smile, Stethoscope } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

const steps = [
  {
    icon: CalendarCheck,
    title: "Book Online",
    description: "Choose an available appointment slot and submit your booking details.",
  },
  {
    icon: BellRing,
    title: "Appointment Confirmation",
    description: "Receive confirmation or updates about your requested appointment.",
  },
  {
    icon: FileText,
    title: "Pre-Visit Information",
    description: "Review relevant appointment instructions and share necessary information when requested.",
  },
  {
    icon: Stethoscope,
    title: "Clinic Consultation",
    description: "Meet the dentist and discuss your dental concerns.",
  },
  {
    icon: ClipboardList,
    title: "Treatment Plan",
    description: "Understand the recommended treatment options and next steps.",
  },
  {
    icon: HeartPulse,
    title: "Treatment & Follow-Up",
    description: "Receive the agreed dental care and follow-up instructions.",
  },
  {
    icon: Smile,
    title: "Ongoing Smile Care",
    description: "Maintain oral health through appropriate follow-up visits and preventive care.",
  },
];

export function PatientJourney() {
  const [activeStep, setActiveStep] = useState(0);
  const active = steps[activeStep];
  const ActiveIcon = active.icon;

  return (
    <section className="section-pad bg-secondary-50/60">
      <div className="container-x">
        <ScrollReveal>
          <div className="max-w-2xl">
            <p className="eyebrow"><span className="eyebrow-dot" />How a visit works</p>
            <h2 className="mt-4 text-display-2 text-balance text-foreground">
              From first click to your <span className="italic text-primary-700">best smile</span>.
            </h2>
            <p className="mt-4 text-pretty text-[16px] leading-relaxed text-muted-foreground">
              Seven simple steps to help make your dental visit comfortable, clear, and convenient.
            </p>
          </div>
        </ScrollReveal>

        {/* Desktop / tablet horizontal stepper */}
        <div className="mt-12 hidden lg:block">
          <div className="relative">
            <div className="absolute left-6 right-6 top-[26px] h-px bg-border" aria-hidden="true" />
            <ol className="relative grid grid-cols-7 gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === activeStep;
                return (
                  <li key={step.title} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setActiveStep(index)}
                      onMouseEnter={() => setActiveStep(index)}
                      onFocus={() => setActiveStep(index)}
                      aria-current={isActive ? "step" : undefined}
                      className={
                        "flex w-full min-w-0 flex-col items-center rounded-2xl border px-2 py-4 text-center transition-colors " +
                        (isActive
                          ? "border-primary-200 bg-card shadow-soft"
                          : "border-transparent hover:border-border/70 hover:bg-card/60")
                      }
                    >
                      <span
                        className={
                          "relative grid h-[52px] w-[52px] place-items-center rounded-full border transition-colors " +
                          (isActive
                            ? "border-primary-700 bg-primary-700 text-white"
                            : "border-border bg-card text-primary-700")
                        }
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
                        <span
                          className={
                            "absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold ring-2 ring-secondary-50 " +
                            (isActive ? "bg-accent text-white" : "bg-ink-950 text-white")
                          }
                        >
                          {index + 1}
                        </span>
                      </span>
                      <span
                        className={
                          "mt-3 block text-[12.5px] font-medium leading-snug transition-colors " +
                          (isActive ? "text-foreground" : "text-foreground/60")
                        }
                      >
                        {step.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-6 flex items-start gap-4 rounded-3xl border border-border/70 bg-card px-6 py-5 shadow-soft">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-700">
              <ActiveIcon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Step {activeStep + 1} of {steps.length}
              </p>
              <h3 className="mt-1 font-display text-[22px] leading-tight text-foreground">{active.title}</h3>
              <p className="mt-1.5 max-w-3xl text-[14.5px] leading-relaxed text-muted-foreground">{active.description}</p>
            </div>
          </div>
        </div>

        {/* Mobile / small tablet vertical timeline */}
        <ol className="relative mt-10 space-y-3 lg:hidden">
          <span className="absolute bottom-6 left-[26px] top-6 w-px bg-border" aria-hidden="true" />
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative">
                <div className="flex gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
                  <span className="relative z-10 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border border-border bg-card text-primary-700">
                    <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-0.5 font-display text-[17px] leading-snug text-foreground">{step.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="mt-8 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
          Every visit is led by our dentist. Decisions about your care are always discussed with you before treatment
          begins.
        </p>
      </div>
    </section>
  );
}
