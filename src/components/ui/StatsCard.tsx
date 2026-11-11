import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; isUp: boolean };
  description?: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

const variants = {
  default: "bg-card border-border/80",
  primary: "bg-[#E4F0F2] border-[#1F6878]/20",
  success: "bg-[#E4F0F2] border-[#1F6878]/25",
  warning: "bg-[#E4F0F2]/75 border-[#E95A35]/20",
  danger: "bg-rose-50 border-rose-200/70",
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  variant = "default",
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card",
        variants[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div
          className={cn(
            "rounded-xl p-2.5",
            variant === "default"
              ? "bg-secondary-100 text-secondary-600"
              : "bg-white/70 text-primary-700 shadow-inset"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          {trend.isUp ? (
            <TrendingUp className="h-4 w-4 text-[#1F6878]" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-600" />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              trend.isUp ? "text-[#1F6878]" : "text-rose-600"
            )}
          >
            {trend.value}%
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  );
}
