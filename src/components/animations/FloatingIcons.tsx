"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useDeviceDetect } from "@/hooks/useDeviceDetect";

export function FloatingIcons({ icons }: { icons: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isLowEnd } = useDeviceDetect();

  useEffect(() => {
    if (isLowEnd || !containerRef.current) return;
    const container = containerRef.current;
    const items = container.querySelectorAll(".float-icon");
    items.forEach((el) => {
      gsap.to(el, {
        y: `+=${Math.random() * 20 + 10}`,
        x: `+=${Math.random() * 10 - 5}`,
        rotation: Math.random() * 10 - 5,
        duration: Math.random() * 3 + 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2,
      });
    });
  }, [isLowEnd]);

  if (isLowEnd) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {icons.map((icon, i) => (
        <span
          key={i}
          className="float-icon absolute text-3xl opacity-[0.04]"
          style={{
            left: `${10 + (i * 17) % 80}%`,
            top: `${15 + (i * 23) % 70}%`,
            fontSize: `${Math.random() * 2 + 1.5}rem`,
          }}
        >
          {icon}
        </span>
      ))}
    </div>
  );
}
