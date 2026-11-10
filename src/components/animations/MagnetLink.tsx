"use client";

import { useRef, ReactNode } from "react";

interface MagnetLinkProps {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}

export function MagnetLink({ children, className = "", href, onClick }: MagnetLinkProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - (rect.left + rect.width / 2)) * 0.15;
    const y = (e.clientY - (rect.top + rect.height / 2)) * 0.15;
    (ref.current?.querySelector(".magnet-inner") as HTMLElement)?.style.setProperty("--x", `${x}px`);
    (ref.current?.querySelector(".magnet-inner") as HTMLElement)?.style.setProperty("--y", `${y}px`);
  };

  const handleLeave = () => {
    (ref.current?.querySelector(".magnet-inner") as HTMLElement)?.style.setProperty("--x", "0px");
    (ref.current?.querySelector(".magnet-inner") as HTMLElement)?.style.setProperty("--y", "0px");
  };

  const Tag = href ? "a" : "button";

  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} className="inline-block">
      <Tag
        href={href}
        onClick={onClick}
        className={`magnet-inner inline-block transition-transform duration-200 ease-out ${className}`}
        style={{ transform: "translate(var(--x, 0px), var(--y, 0px))" }}
      >
        {children}
      </Tag>
    </div>
  );
}
