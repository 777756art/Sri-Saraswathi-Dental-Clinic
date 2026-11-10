"use client";

import { motion } from "framer-motion";

interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  mode?: "words" | "chars";
  once?: boolean;
}

export function TextReveal({ text, className = "", delay = 0, mode = "words", once = true }: TextRevealProps) {
  const items = mode === "words" ? text.split(" ") : text.split("");

  return (
    <motion.span
      className={`inline-flex flex-wrap ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-50px" }}
    >
      {items.map((item, i) => (
        <motion.span
          key={i}
          className="inline-block"
          variants={{
            hidden: { opacity: 0, y: 20, rotateX: -90 },
            visible: {
              opacity: 1,
              y: 0,
              rotateX: 0,
              transition: {
                duration: 0.5,
                delay: delay + i * (mode === "words" ? 0.05 : 0.02),
                ease: [0.25, 0.1, 0.25, 1],
              },
            },
          }}
        >
          {item}{mode === "words" ? "\u00A0" : ""}
        </motion.span>
      ))}
    </motion.span>
  );
}
