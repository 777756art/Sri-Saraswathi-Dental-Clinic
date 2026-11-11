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
        ink ? "border-white/10 bg-[#1F6878]" : "border-[#dce4e5] bg-gradient-to-b from-[#F5F2EB] via-[#F5F2EB] to-white",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        {ink ? (
          <>
            <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#1F6878]/20 blur-[120px]" />
            <div className="absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full bg-[#E95A35]/12 blur-[120px]" />
            <div className="absolute inset-0 bg-grid opacity-[0.14]" />
          </>
        ) : (
          <>
            <div className="absolute -left-32 -top-40 h-[460px] w-[460px] rounded-full bg-[#E4F0F2]/75 blur-[120px]" />
            <div className="absolute right-0 top-0 h-[360px] w-[360px] rounded-full bg-[#E4F0F2]/55 blur-[110px]" />
            <div className="absolute inset-0 bg-grid opacity-[0.35] mask-fade-b" />
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
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {eyebrow}
              </span>
            )}

            <h1
              className={cn(
                "mt-5 text-display-2 text-balance",
                ink ? "text-white" : "text-[#1F6878]",
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
