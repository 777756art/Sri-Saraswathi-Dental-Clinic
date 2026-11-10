import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  align?: "left" | "center";
  tone?: "light" | "ink";
  className?: string;
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  align = "left",
  tone = "light",
  className,
}: PageHeroProps) {
  const ink = tone === "ink";

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b pt-32 pb-14 md:pt-36 md:pb-20",
        ink ? "border-white/10 bg-ink-950" : "border-border/60 bg-gradient-to-b from-secondary-50/80 via-background to-background",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        {ink ? (
          <>
            <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-primary-500/20 blur-[120px]" />
            <div className="absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full bg-accent/15 blur-[120px]" />
            <div className="absolute inset-0 bg-grid opacity-[0.14]" />
          </>
        ) : (
          <>
            <div className="absolute -left-32 -top-40 h-[460px] w-[460px] rounded-full bg-primary-200/40 blur-[120px]" />
            <div className="absolute right-0 top-0 h-[360px] w-[360px] rounded-full bg-accent-200/30 blur-[110px]" />
            <div className="absolute inset-0 bg-grid opacity-[0.4] mask-fade-b" />
          </>
        )}
      </div>

      <div className="container-x relative">
        <div
          className={cn(
            "grid gap-10",
            aside && "lg:grid-cols-[1.08fr_0.92fr] lg:items-center"
          )}
        >
          <div className={cn(align === "center" && "mx-auto max-w-3xl text-center")}>
            {eyebrow && (
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em]",
                  ink
                    ? "border-white/10 bg-white/[0.04] text-white/60"
                    : "border-border/80 bg-card/70 text-muted-foreground backdrop-blur"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {eyebrow}
              </span>
            )}

            <h1
              className={cn(
                "mt-5 text-display-2 text-balance",
                ink ? "text-white" : "text-foreground",
                align === "center" && "mx-auto"
              )}
            >
              {title}
            </h1>

            {description && (
              <p
                className={cn(
                  "mt-5 max-w-2xl text-pretty text-[16px] leading-relaxed",
                  ink ? "text-white/55" : "text-muted-foreground",
                  align === "center" && "mx-auto"
                )}
              >
                {description}
              </p>
            )}

            {actions && (
              <div
                className={cn(
                  "mt-8 flex flex-wrap items-center gap-3",
                  align === "center" && "justify-center"
                )}
              >
                {actions}
              </div>
            )}
          </div>

          {aside && <div>{aside}</div>}
        </div>
      </div>
    </section>
  );
}
