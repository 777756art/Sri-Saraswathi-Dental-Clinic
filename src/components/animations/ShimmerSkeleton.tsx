"use client";

import { motion } from "framer-motion";

interface ShimmerSkeletonProps {
  className?: string;
  count?: number;
  rows?: number;
  type?: "text" | "card" | "table" | "avatar";
}

export function ShimmerSkeleton({ className = "", count = 1, rows = 3, type = "text" }: ShimmerSkeletonProps) {
  const shimmer = {
    background: "linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted-foreground)/0.1) 50%, hsl(var(--muted)) 100%)",
    backgroundSize: "200% 100%",
  };

  if (type === "card") {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            className="rounded-2xl border border-border p-6"
            animate={{ backgroundPosition: ["0% 0", "200% 0"] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            style={shimmer}
          >
            <div className="h-12 w-12 rounded-xl bg-muted mb-4" />
            <div className="h-4 w-2/3 rounded bg-muted mb-2" />
            <div className="h-3 w-full rounded bg-muted" />
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <motion.div
            key={i}
            className="flex gap-4 p-4 rounded-xl border border-border"
            animate={{ backgroundPosition: ["0% 0", "200% 0"] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: i * 0.05 }}
            style={shimmer}
          >
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
            <div className="h-6 w-16 rounded-full bg-muted shrink-0" />
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === "avatar") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <motion.div
          className="h-10 w-10 rounded-full bg-muted shrink-0"
          animate={{ backgroundPosition: ["0% 0", "200% 0"] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          style={shimmer}
        />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/2 rounded bg-muted" />
          <div className="h-3 w-1/3 rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          className="h-3 rounded bg-muted"
          style={{ width: `${[60, 80, 45, 70, 90][i % 5]}%`, ...shimmer }}
          animate={{ backgroundPosition: ["0% 0", "200% 0"] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}
