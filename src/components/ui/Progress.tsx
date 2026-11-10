"use client";

import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  className?: string;
  showLabel?: boolean;
}

const variantStyles = {
  default: "bg-primary-600",
  success: "bg-green-600",
  warning: "bg-yellow-500",
  danger: "bg-red-600",
};

const sizes = {
  sm: "h-2",
  md: "h-3",
};

export function Progress({
  value,
  max = 100,
  variant = "default",
  size = "md",
  className,
  showLabel = false,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full overflow-hidden rounded-md bg-secondary-200", sizes[size])}>
        <div
          className={cn(
            "h-full rounded-md transition-all duration-500 ease-out",
            variantStyles[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-right text-xs text-secondary-500">{Math.round(percentage)}%</p>
      )}
    </div>
  );
}
