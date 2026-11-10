"use client";

import { useDeviceDetect } from "@/hooks/useDeviceDetect";

export function BackgroundFX({ sectionIndex = 0 }: { sectionIndex?: number }) {
  const { isLowEnd } = useDeviceDetect();
  if (isLowEnd) return null;

  const layouts = [
    { left: "6%", top: "12%" },
    { left: "82%", top: "20%" },
    { left: "68%", top: "74%" },
    { left: "14%", top: "68%" },
    { left: "44%", top: "86%" },
  ];
  const spot = layouts[sectionIndex % layouts.length];

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
      <div
        className="absolute h-[380px] w-[380px] rounded-full bg-primary-100/50 blur-[120px]"
        style={{ left: spot.left, top: spot.top }}
      />
      <div className="absolute -right-32 top-10 h-[300px] w-[300px] rounded-full bg-accent-100/40 blur-[110px]" />
      <div className="absolute inset-0 bg-dots opacity-[0.18] mask-fade-b" />
    </div>
  );
}

export function SectionDivider({ variant = "line" }: { variant?: "line" | "wave" | "blur" | "gradient" }) {
  if (variant === "wave") {
    return (
      <div className="relative h-20 overflow-hidden">
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    );
  }

  return (
    <div className="container-x">
      <div className="flex items-center gap-4 py-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-border" />
        <span className="h-1.5 w-1.5 rotate-45 bg-primary-300" />
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-border" />
      </div>
    </div>
  );
}
