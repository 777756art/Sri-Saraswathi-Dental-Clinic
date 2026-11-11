import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple" | "accent";
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
}

const variants = {
  default: "bg-[#F5F2EB] text-[#1F6878] ring-[#1F6878]/15",
  success: "bg-[#E4F0F2] text-[#1F6878] ring-[#1F6878]/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/15",
  danger: "bg-red-50 text-red-700 ring-red-600/15",
  info: "bg-[#E4F0F2] text-[#1F6878] ring-[#1F6878]/20",
  purple: "bg-[#E4F0F2] text-[#E95A35] ring-[#E95A35]/20",
  accent: "bg-[#E4F0F2] text-[#E95A35] ring-[#E95A35]/20",
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
