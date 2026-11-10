"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PathDrawProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  viewBox?: string;
}

export function PathDraw({ children, className = "", duration = 2, delay = 0, viewBox = "0 0 100 100" }: PathDrawProps) {
  return (
    <svg viewBox={viewBox} className={className} aria-hidden="true">
      <motion.g
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {children}
      </motion.g>
    </svg>
  );
}

export function ToothLine({ className = "" }: { className?: string }) {
  return (
    <PathDraw viewBox="0 0 200 200" className={`w-24 h-24 ${className}`}>
      <path
        d="M100 30 C 130 30, 160 50, 160 90 C 160 130, 140 160, 120 170 C 110 175, 100 180, 100 180 C 100 180, 90 175, 80 170 C 60 160, 40 130, 40 90 C 40 50, 70 30, 100 30 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M100 30 L100 180" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
    </PathDraw>
  );
}
