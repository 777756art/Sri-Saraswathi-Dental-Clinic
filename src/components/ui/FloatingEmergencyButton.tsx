"use client";

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { useEffect, useState } from "react";

export function FloatingEmergencyButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 700);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (!visible) return null;

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to="/emergency"
        className="group relative flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[13px] font-semibold text-white shadow-[0_16px_34px_-16px_rgba(201,83,44,0.9)] transition-all hover:-translate-y-0.5"
      >
        <motion.span
          className="absolute inset-0 rounded-full bg-accent"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(201,83,44,0.45)",
              "0 0 0 14px rgba(201,83,44,0)",
            ],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
        <Phone className="h-4 w-4 relative z-10" />
        <span className="relative z-10">Emergency</span>
      </Link>
    </motion.div>
  );
}
