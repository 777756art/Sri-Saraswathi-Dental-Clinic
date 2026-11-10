"use client";

import { useEffect, useRef } from "react";
import { useInView } from "framer-motion";

interface NumberTickerProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}

export function NumberTicker({ value, suffix = "", prefix = "", duration = 2, decimals = 0, className = "" }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView || !ref.current) return;
    const element = ref.current;
    const format = (number: number) => {
      const parts = number.toFixed(decimals).split(".");
      const int = parts[0].padStart(String(Math.round(value)).length, "0");
      return `${prefix}${decimals > 0 ? `${int}.${parts[1]}` : int}${suffix}`;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.textContent = format(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / Math.max(duration * 1000, 1), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = format(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isInView, value, duration, decimals, prefix, suffix]);

  const parts = (0).toFixed(decimals).split(".");
  const initialText = decimals > 0 ? `${parts[0].padStart(String(Math.round(value)).length, "0")}.${parts[1]}` : parts[0].padStart(String(Math.round(value)).length, "0");
  return <span ref={ref} className={className}>{prefix}{initialText}{suffix}</span>;
}
