"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  children: (activeTab: string) => React.ReactNode;
  variant?: "underline" | "pills" | "buttons";
  className?: string;
}

export function Tabs({
  tabs,
  defaultTab,
  onChange,
  children,
  variant = "underline",
  className,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const tabStyles = {
    underline: (isActive: boolean) =>
      cn(
        "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "border-primary-600 text-primary-800"
          : "border-transparent text-muted-foreground hover:border-secondary-300 hover:text-foreground"
      ),
    pills: (isActive: boolean) =>
      cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-all",
        isActive
          ? "bg-primary text-primary-foreground shadow-soft"
          : "text-secondary-600 hover:bg-secondary-100"
      ),
    buttons: (isActive: boolean) =>
      cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-all",
        isActive
          ? "border-primary/30 bg-primary-50 text-primary-800"
          : "border-border text-secondary-600 hover:bg-secondary-50"
      ),
  };

  return (
    <div>
      <div
        className={cn(
          "flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          variant === "underline" && "border-b border-secondary-200",
          className
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap",
              tabStyles[variant](activeTab === tab.id)
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge != null && (
              <span
                className={cn(
                  "ml-1 rounded-md px-2 py-0.5 text-xs font-medium",
                  activeTab === tab.id
                    ? "bg-primary-100 text-primary-700"
                    : "bg-secondary-100 text-secondary-600"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-4">{children(activeTab)}</div>
    </div>
  );
}
