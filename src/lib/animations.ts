"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function useGsap() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }
  }, []);
}

export const easings = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  smooth: "cubic-bezier(0.25, 0.1, 0.25, 1)",
};

export const durations = {
  fast: 0.3,
  normal: 0.6,
  slow: 1.2,
};

export function animateCounter(
  el: HTMLElement | null,
  end: number,
  duration = 2,
  prefix = "",
  suffix = ""
) {
  if (!el) return;
  const obj = { val: 0 };
  gsap.to(obj, {
    val: end,
    duration,
    ease: easings.out,
    onUpdate: () => {
      el.textContent = `${prefix}${Math.round(obj.val).toLocaleString()}${suffix}`;
    },
  });
}

export function floatAnimation(
  el: HTMLElement | null,
  amount = 10,
  duration = 3
) {
  if (!el) return;
  gsap.to(el, {
    y: amount,
    duration,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });
}

export function maskReveal(el: HTMLElement | null) {
  if (!el) return;
  gsap.fromTo(
    el,
    { clipPath: "inset(0 100% 0 0)" },
    {
      clipPath: "inset(0 0% 0 0)",
      duration: 1.5,
      ease: easings.smooth,
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
    }
  );
}

export function splitReveal(el: HTMLElement | null) {
  if (!el) return;
  gsap.fromTo(
    el,
    { opacity: 0, x: -100, skewX: 5 },
    {
      opacity: 1,
      x: 0,
      skewX: 0,
      duration: 1,
      ease: easings.smooth,
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
    }
  );
}

export function blurReveal(el: HTMLElement | null) {
  if (!el) return;
  gsap.fromTo(
    el,
    { opacity: 0, filter: "blur(20px)" },
    {
      opacity: 1,
      filter: "blur(0px)",
      duration: 1.2,
      ease: easings.smooth,
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
    }
  );
}

export function scaleReveal(el: HTMLElement | null) {
  if (!el) return;
  gsap.fromTo(
    el,
    { opacity: 0, scale: 0.8, transformOrigin: "center center" },
    {
      opacity: 1,
      scale: 1,
      duration: 0.8,
      ease: easings.out,
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        toggleActions: "play none none reverse",
      },
    }
  );
}
