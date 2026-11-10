"use client";

import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Bot, Brain, MessageSquareText, ScanLine, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Bot,
    title: "AI Triage System",
    description: "Describe your symptoms once. Our AI prioritizes your needs and prepares your visit before you arrive.",
    gradient: "bg-primary",
  },
  {
    icon: Brain,
    title: "Smile Simulation",
    description: "See your future smile before treatment begins with AI-powered before/after visualization.",
    gradient: "bg-primary",
  },
  {
    icon: MessageSquareText,
    title: "24/7 AI Assistant",
    description: "Get instant answers to dental questions, appointment reminders, and post-treatment follow-up — day or night.",
    gradient: "bg-primary",
  },
  {
    icon: ScanLine,
    title: "Digital Impressions",
    description: "No more messy molds. Our intraoral scanners create precise 3D models in minutes.",
    gradient: "bg-primary",
  },
  {
    icon: Sparkles,
    title: "Same-Day Dentistry",
    description: "CEREC technology lets us design, create, and place crowns in a single visit.",
    gradient: "bg-primary",
  },
  {
    icon: ShieldCheck,
    title: "HIPAA-Compliant Cloud",
    description: "Your records are encrypted, backed up, and accessible only by you and your care team.",
    gradient: "bg-primary",
  },
];

export function ClinicOverview() {
  return (
    <section className="relative py-24 bg-gradient-to-b from-background to-muted/20 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-md bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary">
              The AI Advantage
            </span>
            <h2 className="mt-6 font-display text-display-2 text-foreground">
              Technology Meets Tenderness
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              We&apos;ve integrated cutting-edge AI into every step of your dental journey — 
              so you spend less time in the chair and more time smiling with confidence.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <ScrollReveal key={feature.title} direction="up" delay={i * 0.1}>
                <motion.div
                  className="group relative rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-xl hover:-translate-y-1"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.gradient} shadow-sm transition-transform group-hover:scale-110`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-card-foreground mb-3">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
