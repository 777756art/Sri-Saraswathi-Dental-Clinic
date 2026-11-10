"use client";

import { useEffect, useRef } from "react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { useGsap } from "@/lib/animations";
import { TrendingUp, Users, DollarSign, Star } from "lucide-react";
import { useDeviceDetect } from "@/hooks/useDeviceDetect";

export function AnalyticsPreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const { isLowEnd } = useDeviceDetect();
  useGsap();

  useEffect(() => {
    if (isLowEnd || !sectionRef.current) return;
    const init = async () => {
      const gsap = (await import("gsap")).default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      const el = sectionRef.current!;
      const bars = el.querySelectorAll(".chart-bar");
      gsap.fromTo(bars, { scaleY: 0, transformOrigin: "bottom center" }, {
        scaleY: 1,
        duration: 1.2,
        stagger: 0.08,
        ease: "elastic.out(1, 0.5)",
        scrollTrigger: { trigger: el, start: "top 75%", toggleActions: "play none none reverse" },
      });

      const counters = el.querySelectorAll(".metric-value");
      counters.forEach((counter) => {
        const target = counter.getAttribute("data-target");
        if (!target) return;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: parseFloat(target.replace(/[^0-9.]/g, "")),
          duration: 2,
          ease: "power2.out",
          scrollTrigger: { trigger: counter.parentElement, start: "top 80%", toggleActions: "play none none reverse" },
          onUpdate: () => {
            const display = counter.getAttribute("data-display") ?? "";
            const isCurrency = display.startsWith("₹");
            const prefix = isCurrency ? "₹" : "";
            const suffix = display.includes("%") ? "%" : "";
            counter.textContent = `${prefix}${Math.round(obj.val).toLocaleString(isCurrency ? "en-IN" : "en-US")}${suffix}`;
          },
        });
      });

      const ring = el.querySelector(".progress-ring-circle");
      if (ring) {
        gsap.to(ring, {
          strokeDashoffset: 25,
          duration: 2,
          ease: "power2.out",
          scrollTrigger: { trigger: ring, start: "top 80%", toggleActions: "play none none reverse" },
        });
      }
    };
    init();
  }, [isLowEnd]);

  return (
    <section ref={sectionRef} className="section-pad relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-1/3 h-[360px] w-[360px] rounded-full bg-primary-100/50 blur-[120px]" />
      </div>
      <div className="container-x relative">
        <ScrollReveal>
          <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
            <p className="eyebrow justify-center"><span className="eyebrow-dot" />Live analytics</p>
            <h2 className="mt-4 text-display-2 text-balance text-foreground">
              A practice that <span className="italic text-primary-700">knows its numbers</span>.
            </h2>
            <p className="mt-4 text-pretty text-[16px] leading-relaxed text-muted-foreground">
              Revenue, retention and recall — surfaced in real time, so decisions happen in the
              morning huddle, not at quarter end.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft lg:col-span-2">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h3 className="font-display text-xl leading-tight text-foreground">Revenue trend</h3>
                <p className="mt-1 text-xs text-muted-foreground">Last 12 months · all locations</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">+23.5%</span>
            </div>
            <div className="flex h-52 items-end gap-1.5 sm:gap-2">
              {[40, 55, 48, 62, 58, 72, 68, 80, 75, 88, 82, 95].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{h}k</span>
                  <div className="chart-bar w-full rounded-t-md bg-gradient-to-t from-primary-700 to-primary-400" style={{ height: `${h}%` }} />
                  <span className="text-[10px] text-muted-foreground">M{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              { icon: DollarSign, label: "Monthly Revenue", target: "₹28,45,000", change: "+23.5%", color: "text-emerald-600" },
              { icon: Users, label: "Active Patients", target: "1,247", change: "+12.8%", color: "text-primary-600" },
              { icon: Star, label: "NPS Score", target: "92", change: "+4 pts", color: "text-amber-500" },
              { icon: TrendingUp, label: "Adherence Rate", target: "94%", change: "+7.2%", color: "text-primary-600" },
            ].map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                    <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{metric.label}</span>
                  </div>
                  <span className={`text-[11px] font-medium ${metric.color}`}>{metric.change}</span>
                </div>
                <div className="metric-value font-display text-[26px] leading-none text-foreground" data-target={metric.target.replace(/[^0-9.]/g, "")} data-prefix={metric.target.startsWith("₹") ? "₹" : ""} data-display={metric.target}>
                  {metric.label === "NPS Score" ? "0" : metric.label === "Adherence Rate" ? "0%" : "₹0"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
