"use client";

import { useState, useEffect } from "react";

export function useDeviceDetect() {
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const hasTouch = "ontouchstart" in window;
    const hasLowMemory = (navigator as any).deviceMemory !== undefined && (navigator as any).deviceMemory < 4;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setIsLowEnd(isMobile || hasLowMemory || prefersReduced || hasTouch);
  }, []);

  return { isLowEnd };
}
