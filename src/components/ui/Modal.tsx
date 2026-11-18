"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showClose?: boolean;
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-6xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showClose = true,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-ink-950/45 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Dialog"}
        className={cn(
          "relative flex max-h-[90dvh] w-full flex-col animate-scale-in overflow-hidden rounded-2xl border border-border/70 bg-card shadow-lift",
          sizes[size]
        )}
      >
        {showClose && (
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary-100 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {(title || description) && (
          <div className="shrink-0 border-b border-border/70 px-4 py-4 sm:px-6 sm:py-5 pr-12">
            {title && (
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#1F6878]">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>
  );
}
