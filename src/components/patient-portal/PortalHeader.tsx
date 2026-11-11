import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PortalHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
}

const portalTabs = [
  { label: "Overview", href: "/patient-portal" },
  { label: "Appointments", href: "/patient-portal/appointments" },
  { label: "Contact clinic", href: "/patient-portal/messages" },
];

export function PortalHeader({
  title,
  description,
  eyebrow = "Patient portal",
  actions,
}: PortalHeaderProps) {
  const { pathname } = useLocation();

  return (
    <header className="relative overflow-hidden border-b border-border/60 bg-[#F5F2EB] pb-6 pt-28 md:pb-8 md:pt-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[380px] w-[380px] rounded-full bg-[#E4F0F2]/80 blur-[110px]" />
        <div className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-[#E4F0F2]/60 blur-[100px]" />
        <div className="absolute inset-0 bg-grid opacity-[0.35] mask-fade-b" />
      </div>

      <div className="container-x relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" /> {eyebrow}
          </span>
          <h1 className="mt-3 text-display-2 text-balance text-[#1F6878]">{title}</h1>
          {description && (
            <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>

      <nav className="container-x relative mt-7" aria-label="Patient portal sections">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {portalTabs.map((tab) => {
            const isActive =
              tab.href === "/patient-portal"
                ? pathname === tab.href
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                to={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors",
                  isActive
                    ? "bg-ink-950 text-white"
                    : "text-foreground/60 hover:bg-secondary-100 hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
