"use client";

import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-[#15191B]"
          >
            {label}
            {props.required && <span className="ml-1 text-[#E95A35]">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-[#15191B] placeholder:text-[#707574]/70",
            "transition-colors focus:border-[#1F6878] focus:outline-none focus:ring-4 focus:ring-[#1F6878]/15",
            "disabled:cursor-not-allowed disabled:bg-muted",
            "min-h-[100px] resize-y",
            error && "border-red-500",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
