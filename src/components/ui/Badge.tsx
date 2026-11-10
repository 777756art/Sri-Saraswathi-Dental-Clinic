import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple" | "accent";
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
}

const variants = {
  default: "bg-secondary-100 text-secondary-700 ring-secondary-300/60",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/15",
  danger: "bg-red-50 text-red-700 ring-red-600/15",
  info: "bg-primary-50 text-primary-700 ring-primary-600/15",
  purple: "bg-violet-50 text-violet-700 ring-violet-600/15",
  accent: "bg-accent-50 text-accent-700 ring-accent-600/15",
};

const sizes = {
  sm: "px-2.5 py-0.5 text-[11px]",
  md: "px-3 py-1 text-xs",
};

export function Badge({ variant = "default", size = "sm", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
