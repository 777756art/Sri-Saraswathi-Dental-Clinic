import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MessageCircle, Sparkles, X } from "lucide-react";
import { clinicImages } from "@/lib/images";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

interface TransformationCase {
  id: string | number;
  title: string;
  treatment: string;
  description: string;
  beforeImg: string;
  afterImg: string;
}

const defaultCases: TransformationCase[] = [
  {
    id: "case-1",
    title: "Complete Aesthetic Smile Makeover",
    treatment: "Veneers & Contouring",
    description: "Correction of enamel discoloration, minor gaps, and worn edges with custom dental veneers.",
    beforeImg: clinicImages.smileBeforeAfter,
    afterImg: clinicImages.patientSmile,
  },
  {
    id: "case-2",
    title: "Teeth Brightening & Stain Removal",
    treatment: "Professional Whitening",
    description: "In-clinic gentle whitening treatment restoring natural enamel luster after years of coffee staining.",
    beforeImg: clinicImages.treatmentRoom,
    afterImg: clinicImages.patientSmileDetail,
  },
  {
    id: "case-3",
    title: "Anterior Tooth Restoration",
    treatment: "Composite Restorations",
    description: "Seamless tooth-colored restorative bonding following accidental chip injury.",
    beforeImg: clinicImages.smileBeforeAfter,
    afterImg: clinicImages.patientSmile,
  },
];

export function BeforeAfterShowcaseSection() {
  const { items: baItems } = useSiteContent("before_after");
  const { items: galleryItems } = useSiteContent("gallery");
  const allItems = [...baItems, ...galleryItems];
  const [selectedCase, setSelectedCase] = useState<TransformationCase | null>(null);

  const dynamicCases = allItems
    .filter((item) => (item.beforeImage || item.before_image) && (item.afterImage || item.after_image))
    .map((item) => ({
      id: item.id,
      title: item.title || "Smile Transformation",
      treatment: item.badgeText || item.category || "Clinical Restoration",
      description: item.description || item.subtitle || item.excerpt || "Consented patient transformation case at Sri Saraswathi Dental Clinic.",
      beforeImg: resolveApiAsset(item.beforeImage || item.before_image || ""),
      afterImg: resolveApiAsset(item.afterImage || item.after_image || item.mediaUrl || ""),
    }));

  const cases: TransformationCase[] = dynamicCases.length > 0 ? dynamicCases.slice(0, 6) : defaultCases;

  return (
    <section className="bg-white px-4 py-16 sm:py-20 lg:py-24" aria-label="Before and After Showcase">
      <div className="container-x">
        {/* Centered Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#1F6878]/20 bg-[#E4F0F2] px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1F6878]">
            <Sparkles className="h-3.5 w-3.5 text-[#1F6878]" /> Proven Results
          </span>
          <h2 className="mt-3 font-sans text-[32px] font-bold leading-tight tracking-[-0.035em] text-[#1F6878] sm:text-[42px]">
            Before &amp; After <span className="text-[#1F6878]">Showcase</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[#707574] sm:text-[15px]">
            Every smile has a unique story. Explore genuine transformations achieved through meticulous clinical skill and conservative dental techniques.
          </p>
        </div>

        {/* Horizontal Comparison Cards */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((item) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-[24px] border border-[#dce4e5] bg-[#F5F2EB] p-3.5 shadow-[0_10px_30px_-20px_rgba(31,104,120,0.22)] transition duration-300 hover:-translate-y-1.5 hover:border-[#dce4e5] hover:shadow-[0_20px_45px_-20px_rgba(31,104,120,0.32)]"
            >
              {/* Before and After Side by Side */}
              <button
                type="button"
                onClick={() => setSelectedCase(item)}
                aria-label={`View ${item.title}`}
                className="grid w-full grid-cols-2 gap-2 text-left"
              >
                {/* Before */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-[#E4F0F2]">
                  <img
                    src={item.beforeImg}
                    alt={`${item.title} - Before`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-black/70 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                    Before
                  </span>
                </div>

                {/* After */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-[#E4F0F2]">
                  <img
                    src={item.afterImg}
                    alt={`${item.title} - After`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-[#1F6878] px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                    After
                  </span>
                </div>
              </button>

              {/* Card Meta */}
              <div className="p-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E95A35]">
                  {item.treatment}
                </span>
                <h3 className="mt-1 font-sans text-[16px] font-bold leading-snug text-[#1F6878]">
                  {item.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#707574]">
                  {item.description}
                </p>

                <div className="mt-3.5 flex items-center justify-between border-t border-[#dce4e5] pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCase(item)}
                    className="text-[11px] font-bold text-[#E95A35] hover:underline"
                  >
                    Compare Closer
                  </button>
                  <a
                    href={`https://wa.me/919345743409?text=${encodeURIComponent(`Hello Sri Saraswathi Dental Clinic, I am interested in ${item.treatment}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#19B987] px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-[#139A70]"
                  >
                    <MessageCircle className="h-3 w-3" /> Inquire
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* View All Results CTA */}
        <div className="mt-10 text-center">
          <Link
            to="/gallery/before-after"
            className="inline-flex h-[48px] items-center gap-2 rounded-full border border-[#1F6878] px-7 text-[13px] font-bold text-[#1F6878] transition hover:bg-[#1F6878] hover:text-white"
          >
            View All Results <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedCase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={selectedCase.title}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelectedCase(null);
            }}
            className="fixed inset-0 z-[95] grid place-items-center bg-black/90 p-4 backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setSelectedCase(null)}
              aria-label="Close case viewer"
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-4xl overflow-hidden rounded-[26px] border border-white/15 bg-[#0F3841] p-6 text-white shadow-2xl"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black">
                    <img src={selectedCase.beforeImg} alt="Before treatment" className="h-full w-full object-cover" />
                    <span className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-[10px] font-bold tracking-wider">
                      BEFORE
                    </span>
                  </div>
                </div>
                <div>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black">
                    <img src={selectedCase.afterImg} alt="After treatment" className="h-full w-full object-cover" />
                    <span className="absolute left-3 top-3 rounded-full bg-[#1F6878] px-3 py-1 text-[10px] font-bold tracking-wider">
                      AFTER
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#E4F0F2]">
                  {selectedCase.treatment}
                </span>
                <h3 className="mt-1 font-sans text-[22px] font-bold">{selectedCase.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/70">{selectedCase.description}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}