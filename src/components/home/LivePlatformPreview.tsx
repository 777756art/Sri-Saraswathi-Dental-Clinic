"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Bot, Calendar, BarChart3, User, LayoutDashboard, Search, Bell, ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "reception", label: "Reception", icon: Calendar },
  { id: "dashboard", label: "Dentist", icon: LayoutDashboard },
  { id: "portal", label: "Patients", icon: User },
  { id: "ai", label: "AI Assistant", icon: Bot },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

type Row = { title: string; meta: string; right: string; tone?: "primary" | "success" | "accent" | "muted" };

const content: Record<
  string,
  { title: string; desc: string; stats: { label: string; value: string; delta?: string }[]; rows: Row[]; bars: number[] }
> = {
  reception: {
    title: "Smart reception",
    desc: "Front desk flow, fully automated.",
    stats: [
      { label: "Today", value: "24", delta: "+4" },
      { label: "Checked in", value: "11", delta: "46%" },
      { label: "Avg. wait", value: "6m", delta: "-3m" },
    ],
    rows: [
      { title: "Sarah Johnson", meta: "Check-up · 2:30 PM", right: "Checked in", tone: "success" },
      { title: "Michael Chen", meta: "Implant follow-up · 3:00 PM", right: "Confirmed", tone: "primary" },
      { title: "Divya Suresh", meta: "Whitening · 4:15 PM", right: "AI prep sent", tone: "accent" },
    ],
    bars: [42, 58, 51, 70, 64, 82, 76],
  },
  dashboard: {
    title: "Clinical overview",
    desc: "Every chair, every chart, in real time.",
    stats: [
      { label: "In waiting room", value: "3" },
      { label: "Lab results", value: "2" },
      { label: "Completed today", value: "5", delta: "+2" },
    ],
    rows: [
      { title: "AI flag · X-ray #4521", meta: "Possible enamel demineralisation", right: "Review", tone: "accent" },
      { title: "Amanda Foster", meta: "Invisalign check · Chair 2", right: "In session", tone: "primary" },
      { title: "Robert Kim", meta: "Implant osseointegration scan", right: "On track", tone: "success" },
    ],
    bars: [30, 46, 38, 55, 62, 58, 71],
  },
  portal: {
    title: "Patient portal",
    desc: "Records, billing and aftercare in one place.",
    stats: [
      { label: "Next visit", value: "Dec 15" },
      { label: "Balance", value: "₹0", delta: "Paid" },
      { label: "Documents", value: "12" },
    ],
    rows: [
      { title: "Prescription · Amoxicillin", meta: "Issued Nov 28 · 7-day course", right: "View", tone: "primary" },
      { title: "Whitening aftercare plan", meta: "AI-personalised · 4 steps", right: "Open", tone: "accent" },
      { title: "Insurance claim", meta: "Delta Dental · Approved", right: "Approved", tone: "success" },
    ],
    bars: [20, 34, 30, 48, 44, 52, 60],
  },
  ai: {
    title: "AI assistant",
    desc: "Trained on clinical notes, not the internet.",
    stats: [
      { label: "Triage level", value: "L3" },
      { label: "Response", value: "1.8s" },
      { label: "Accuracy", value: "98.7%", delta: "+0.4" },
    ],
    rows: [
      { title: "\u201CMy crown feels loose\u201D", meta: "Suggested: same-day recementation", right: "Urgent", tone: "accent" },
      { title: "Treatment plan drafted", meta: "4 options · priced & sequenced", right: "Ready", tone: "success" },
      { title: "Voice note transcribed", meta: "Chairside · 00:42", right: "Saved", tone: "primary" },
    ],
    bars: [18, 40, 32, 61, 49, 74, 66],
  },
  analytics: {
    title: "Practice analytics",
    desc: "Decisions backed by live numbers.",
    stats: [
      { label: "Revenue", value: "₹8.4L", delta: "+23%" },
      { label: "Active patients", value: "1,247", delta: "+12%" },
      { label: "NPS", value: "92", delta: "+4" },
    ],
    rows: [
      { title: "Appointment adherence", meta: "Rolling 30 days", right: "94%", tone: "success" },
      { title: "Treatment acceptance", meta: "AI-assisted consults", right: "81%", tone: "primary" },
      { title: "No-show risk", meta: "12 patients flagged", right: "Act", tone: "accent" },
    ],
    bars: [28, 44, 40, 62, 56, 78, 88],
  },
};

const toneClasses: Record<string, string> = {
  primary: "bg-primary-50 text-primary-700",
  success: "bg-emerald-50 text-emerald-700",
  accent: "bg-accent-50 text-accent-700",
  muted: "bg-secondary-100 text-secondary-600",
};

export function LivePlatformPreview() {
  const [activeTab, setActiveTab] = useState("reception");
  const active = content[activeTab];

  return (
    <section className="section-pad relative overflow-hidden bg-secondary-50/70">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid opacity-[0.35]" />
        <div className="absolute left-1/2 top-0 h-[300px] w-[700px] -translate-x-1/2 rounded-full bg-primary-200/30 blur-[120px]" />
      </div>

      <div className="container-x relative">
        <ScrollReveal>
          <SectionHeading
            align="center"
            eyebrow="Live platform preview"
            title={
              <>
                One system for the whole <span className="italic text-primary-700">clinic</span>.
              </>
            }
            description="Reception, clinicians, patients and analytics — connected by the same AI layer. Click through the modules below."
          />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.15}>
          <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lift">
            <div className="flex items-center gap-3 border-b border-border/70 bg-secondary-50/60 px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </div>
              <div className="mx-auto hidden items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-[10px] text-muted-foreground sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                app.srisaraswathidental.com
              </div>
            </div>

            <div className="grid lg:grid-cols-[210px_1fr]">
              <aside className="hidden border-r border-border/70 bg-secondary-50/40 p-4 lg:block">
                <div className="mb-6 flex items-center gap-2 px-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-950 font-display text-sm text-white">
                    S
                  </span>
                  <span className="font-display text-[15px] text-foreground">Saraswathi OS</span>
                </div>
                <nav className="space-y-0.5">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] font-medium transition-colors",
                          activeTab === tab.id
                            ? "bg-card text-primary-800 shadow-soft"
                            : "text-secondary-600 hover:bg-card/70 hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
                <div className="mt-6 rounded-xl border border-primary-200/60 bg-primary-50/70 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-800">
                    <Sparkles className="h-3.5 w-3.5" /> AI credits
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-200/60">
                    <div className="h-full w-[72%] rounded-full bg-primary-600" />
                  </div>
                  <p className="mt-1.5 text-[10px] text-primary-700/70">7,200 of 10,000 used</p>
                </div>
              </aside>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-100 text-[11px] font-semibold text-secondary-700">
                      DR
                    </span>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">{active.title}</p>
                      <p className="text-[10px] text-muted-foreground">{active.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-[10px] text-muted-foreground sm:flex">
                      <Search className="h-3 w-3" /> Search
                    </div>
                    <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-border/60 text-secondary-500">
                      <Bell className="h-3.5 w-3.5" />
                      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                    </span>
                  </div>
                </div>

                <div className="flex gap-1 overflow-x-auto border-b border-border/70 px-4 py-2 lg:hidden">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                        activeTab === tab.id ? "bg-primary text-white" : "text-secondary-600"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    className="p-4 sm:p-5"
                  >
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {active.stats.map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-border/70 bg-background/60 p-3">
                          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{stat.label}</p>
                          <div className="mt-1.5 flex items-baseline gap-1.5">
                            <span className="font-display text-xl leading-none text-foreground">{stat.value}</span>
                            {stat.delta && (
                              <span className="text-[10px] font-medium text-emerald-600">{stat.delta}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 grid gap-2.5 lg:grid-cols-[1.6fr_1fr]">
                      <div className="rounded-xl border border-border/70 bg-background/60 p-3.5">
                        <div className="mb-2.5 flex items-center justify-between">
                          <p className="text-[11px] font-semibold text-foreground">Live activity</p>
                          <span className="text-[10px] text-muted-foreground">View all</span>
                        </div>
                        <div className="space-y-2">
                          {active.rows.map((row) => (
                            <div
                              key={row.title}
                              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-medium text-foreground">{row.title}</p>
                                <p className="truncate text-[10px] text-muted-foreground">{row.meta}</p>
                              </div>
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold",
                                  toneClasses[row.tone ?? "muted"]
                                )}
                              >
                                {row.right}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col rounded-xl border border-border/70 bg-background/60 p-3.5">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[11px] font-semibold text-foreground">Weekly trend</p>
                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
                            <ArrowUpRight className="h-3 w-3" /> 23%
                          </span>
                        </div>
                        <div className="flex flex-1 items-end gap-1.5 pt-2">
                          {active.bars.map((h, i) => (
                            <motion.div
                              key={i}
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
                              className={cn(
                                "min-h-[6px] flex-1 rounded-t-[4px]",
                                i === active.bars.length - 1 ? "bg-primary" : "bg-primary-200/70"
                              )}
                            />
                          ))}
                        </div>
                        <div className="mt-2 flex justify-between text-[9px] uppercase tracking-wide text-muted-foreground/70">
                          <span>Mon</span>
                          <span>Sun</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
