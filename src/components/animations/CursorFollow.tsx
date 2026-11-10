"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CursorFollow() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const [label, setLabel] = useState("");
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const springX = useSpring(cursorX, { stiffness: 200, damping: 30 });
  const springY = useSpring(cursorY, { stiffness: 200, damping: 30 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    const over = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("[data-cursor]");
      if (el) {
        setLabel(el.getAttribute("data-cursor") || "");
        setVisible(true);
      }
    };
    const out = () => {
      setVisible(false);
      setLabel("");
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    window.addEventListener("mouseout", out);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      window.removeEventListener("mouseout", out);
    };
  }, [cursorX, cursorY]);

  if (mounted && window.matchMedia("(hover: none)").matches) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 z-[999] pointer-events-none"
      style={{ x: springX, y: springY }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="-translate-x-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-ink-950/90 text-[11px] font-semibold text-white shadow-lift backdrop-blur-sm">
        {label || "View"}
      </div>
    </motion.div>
  );
}
