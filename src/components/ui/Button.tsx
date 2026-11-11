"use client";

import {
  forwardRef,
  ButtonHTMLAttributes,
  cloneElement,
  isValidElement,
  ReactElement,
} from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
}

const variants = {
  primary:
    "bg-[#E95A35] text-white shadow-[0_12px_28px_-12px_rgba(233,90,53,0.55)] hover:bg-[#D14824] active:bg-[#D14824] hover:-translate-y-0.5 active:translate-y-0",
  secondary: "bg-[#E4F0F2] text-[#1F6878] hover:bg-[#d1e4e8]",
  outline:
    "border border-[#1F6878] text-[#1F6878] hover:bg-[#E4F0F2]",
  ghost: "text-[#15191B]/80 hover:bg-[#E4F0F2]/70 hover:text-[#1F6878]",
  danger: "bg-destructive text-destructive-foreground hover:brightness-110",
  success: "bg-[#19B987] text-white hover:bg-[#139A70]",
};

const sizes = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
  xl: "h-14 px-8 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      fullWidth = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      "group inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:pointer-events-none disabled:opacity-50",
      variants[variant],
      sizes[size],
      fullWidth && "w-full",
      className
    );

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string }>;
      return cloneElement(child, {
        ...props,
        className: cn(classes, child.props.className),
      });
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={classes}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
