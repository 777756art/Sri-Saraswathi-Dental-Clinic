import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BeforeAfterSlider } from "@/components/ui/BeforeAfterSlider";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";
import { clinicImages } from "@/lib/images";

export function SmileGallery() {
  const { items, loading } = useSiteContent("gallery");
  const entries = [...items]
    .filter((item) => item.beforeImage && item.afterImage)
    .sort((a, b) => (a.displayOrder !== b.displayOrder ? a.displayOrder - b.displayOrder : b.id - a.id));

  if (loading) return null;

  return (
    <section className="section-pad relative overflow-hidden bg-background">
      <div className="container-x relative">
        <SectionHeading
          align="center"
          eyebrow="Smile showcase"
          title={<>Before &amp; After <span className="italic text-[#1F6878]">Showcase.</span></>}
          description="A closer look at smile transformations and the care behind them."
          action={
            <Link
              to="/booking"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-800 transition-colors hover:text-primary-950"
            >
              Book a consultation <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {entries.length ? (
          <div className="mx-auto mt-11 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
            {entries.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-[20px] border border-[#dce4e5] bg-white p-3 shadow-[0_8px_24px_-18px_rgba(31,104,120,.35)]">
                <BeforeAfterSlider
                  beforeImage={resolveApiAsset(item.beforeImage)}
                  afterImage={resolveApiAsset(item.afterImage)}
                  alt={item.title || "Dental transformation before and after"}
                />
                <figcaption className="px-2 pb-1 pt-4">
                  {item.badgeText && <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#1F6878]">{item.badgeText}</p>}
                  <p className="mt-1.5 font-display text-[16px] font-semibold leading-snug text-[#15191B]">{item.title}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <figure className="mx-auto mt-11 max-w-3xl overflow-hidden rounded-[22px] border border-[#dce4e5] bg-white p-3 shadow-[0_8px_24px_-18px_rgba(31,104,120,.35)]">
            <img src={clinicImages.smileBeforeAfter} alt="Before and after smile showcase" loading="lazy" decoding="async" className="max-h-[420px] w-full rounded-[14px] object-cover" />
            <figcaption className="px-3 pb-2 pt-4"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#1F6878]">Patient transformations</p><p className="mt-1.5 font-display text-[16px] font-semibold text-[#15191B]">Every smile starts with a conversation.</p></figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
