"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface StaggerGridProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
  direction?: "up" | "down" | "left" | "right";
}

export function StaggerGrid({ children, className = "", staggerDelay = 0.06, once = true, direction = "up" }: StaggerGridProps) {
  const dist = 40;
  const variants = {
    hidden: {},
    visible: { transition: { staggerChildren: staggerDelay } },
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? dist : direction === "down" ? -dist : 0,
      x: direction === "left" ? -dist : direction === "right" ? dist : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
    },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-50px" }}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : <motion.div variants={itemVariants}>{children}</motion.div>}
    </motion.div>
  );
}
