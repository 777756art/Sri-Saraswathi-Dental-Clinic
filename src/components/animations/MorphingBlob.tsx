"use client";

import { motion } from "framer-motion";

const paths = [
  "M 400 300 C 400 200, 500 100, 600 200 C 700 300, 600 400, 500 400 C 400 400, 400 400, 400 300",
  "M 400 300 C 300 200, 400 100, 500 150 C 600 200, 700 300, 600 400 C 500 500, 400 400, 400 300",
  "M 400 300 C 500 150, 600 200, 550 300 C 500 400, 400 500, 300 400 C 200 300, 300 200, 400 300",
];

export function MorphingBlob({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={`pointer-events-none ${className}`} aria-hidden="true">
      <motion.path
        d={paths[0]}
        fill="currentColor"
        animate={{ d: paths }}
        transition={{
          repeat: Infinity,
          duration: 8,
          ease: "easeInOut",
          repeatType: "mirror",
        }}
      />
    </svg>
  );
}
