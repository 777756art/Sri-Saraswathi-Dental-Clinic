import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { StaggerGrid } from "@/components/animations/StaggerGrid";
import { listClinicMedia, type ClinicMediaRecord } from "@/lib/media-store";
import { clinicImages } from "@/lib/images";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Play, Sparkles, X, ZoomIn } from "lucide-react";

const treatments = [
  { id: "all", label: "All photos" },
  { id: "clinic", label: "Our clinic" },
  { id: "treatment", label: "Treatment spaces" },
  { id: "smiles", label: "Smile stories" },
];

type GalleryItem = {
  id: string;
  treatment: string;
  src: string;
  alt: string;
  kind: "image" | "video";
  span: string;
};

const galleryItems: GalleryItem[] = [
  { id: "clinic-exterior", treatment: "clinic", src: clinicImages.exterior, alt: "Sri Saraswathi Dental Clinic entrance in Erode", kind: "image", span: "row-span-2" },
  { id: "clinic-reception", treatment: "clinic", src: clinicImages.reception, alt: "Reception and waiting area at the clinic", kind: "image", span: "" },
  { id: "clinic-waiting", treatment: "clinic", src: clinicImages.waitingCorridor, alt: "Waiting corridor leading to the treatment rooms", kind: "image", span: "" },
  { id: "treatment-room", treatment: "treatment", src: clinicImages.treatmentRoom, alt: "A dental treatment room at the clinic", kind: "image", span: "row-span-2" },
  { id: "treatment-chair", treatment: "treatment", src: clinicImages.treatmentChair, alt: "Dental chair and equipment in the clinic", kind: "image", span: "" },
  { id: "sterilization-room", treatment: "treatment", src: clinicImages.sterilizationRoom, alt: "Clinic sterilization and instrument preparation area", kind: "image", span: "" },
  { id: "smile-before-after", treatment: "smiles", src: clinicImages.smileBeforeAfter, alt: "Patient smile transformation before and after treatment", kind: "image", span: "row-span-2" },
  { id: "patient-smile", treatment: "smiles", src: clinicImages.patientSmile, alt: "Close-up of a patient's smile", kind: "image", span: "" },
  { id: "patient-smile-detail", treatment: "smiles", src: clinicImages.patientSmileDetail, alt: "Close-up view of a patient's teeth", kind: "image", span: "" },
];

function uploadedItemToGalleryItem(record: ClinicMediaRecord, src: string): GalleryItem {
  const category = record.category.toLowerCase();
  const treatment = ["whitening", "implants", "veneers"].includes(category) ? "smiles" : "clinic";
  return {
    id: "uploaded-" + record.id,
    treatment,
    src,
    alt: record.name,
    kind: record.kind,
    span: "",
  };
}

export function Gallery({ standalone = false }: { standalone?: boolean }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [uploadedItems, setUploadedItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    let active = true;
    let objectUrls: string[] = [];

    void listClinicMedia()
      .then((records) => {
        const visibleRecords = records.filter((record) => record.includeInGallery);
        const items = visibleRecords.map((record) => {
          const src = URL.createObjectURL(record.blob);
          objectUrls.push(src);
          return uploadedItemToGalleryItem(record, src);
        });
        if (active) setUploadedItems(items);
        else objectUrls.forEach((url) => URL.revokeObjectURL(url));
      })
      .catch(() => {
        // The public gallery remains available when local browser storage is unavailable.
      });

    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const allItems = [...uploadedItems, ...galleryItems];
  const filtered = activeFilter === "all" ? allItems : allItems.filter((item) => item.treatment === activeFilter);

  return (
    <section id={standalone ? undefined : "gallery"} className={cn("relative overflow-hidden bg-[#F5F2EB]", standalone ? "pb-24 pt-[126px] sm:pb-28 sm:pt-[150px]" : "section-pad")}>
      <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-primary-100/60 blur-3xl" />
      <div className="container-x relative">
        <ScrollReveal>
          <div className="mx-auto mb-8 max-w-2xl text-center md:mb-10">
            <p className="eyebrow justify-center"><span className="eyebrow-dot" />Our clinic, up close</p>
            <h2 className="mt-4 text-display-2 text-balance text-[#1F6878]">
              A glimpse into our <span className="italic text-[#1F6878]">world of care.</span>
            </h2>
            <p className="mt-4 text-pretty text-[16px] leading-relaxed text-muted-foreground">
              A glimpse of the spaces, people and moments that make a visit feel easy.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.15}>
          <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
            {treatments.map((treatment) => (
              <button
                key={treatment.id}
                onClick={() => setActiveFilter(treatment.id)}
                aria-pressed={activeFilter === treatment.id}
                className={cn(
                  "rounded-full px-5 py-2 text-[13px] font-medium transition-all",
                  activeFilter === treatment.id
                    ? "bg-[#E95A35] text-white shadow-soft"
                    : "border border-border/80 bg-white text-muted-foreground hover:border-[#E95A35]/50 hover:text-[#D14824]"
                )}
              >
                {treatment.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <StaggerGrid className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
          {filtered.map((item) => (
            <motion.button
              key={item.id}
              type="button"
              layout
              className={cn(
                "group relative block w-full break-inside-avoid overflow-hidden rounded-[22px] border border-border/60 bg-ink-950 text-left shadow-soft",
                item.span
              )}
              whileHover={{ y: -3 }}
              onClick={() => setLightboxItem(item)}
              aria-label={(item.kind === "video" ? "Play video: " : "View photo: ") + item.alt}
            >
              {item.kind === "image" ? (
                <img
                  src={item.src}
                  alt={item.alt}
                  width={800}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <video src={item.src} muted playsInline preload="metadata" className="h-auto w-full object-cover" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-ink-950/0 transition-all duration-300 group-hover:bg-ink-950/35">
                <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-white/90 text-ink-950 opacity-0 shadow-xl transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                  {item.kind === "video" ? <Play className="h-4 w-4 fill-current" /> : <ZoomIn className="h-5 w-5" />}
                </span>
              </span>
              <span className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-ink-950/65 px-3 py-2 text-[10px] font-medium text-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
                <span className="truncate">{item.alt}</span>
                <span className="flex shrink-0 items-center gap-1 uppercase tracking-[0.12em] text-white/65">
                  {item.kind === "video" ? "Clip" : "View"} <ArrowUpRight className="h-3 w-3" />
                </span>
              </span>
              {item.kind === "video" && (
                <span className="absolute right-3 top-3 rounded-full bg-ink-950/60 p-2 text-white backdrop-blur"><Play className="h-3 w-3 fill-current" /></span>
              )}
              {item.id.startsWith("uploaded-") && (
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-[#E4F0F2] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1F6878]">
                  <Sparkles className="h-3 w-3" /> Added by clinic
                </span>
              )}
            </motion.button>
          ))}
        </StaggerGrid>
      </div>

      <AnimatePresence>
        {lightboxItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={lightboxItem.alt}
            onClick={() => setLightboxItem(null)}
          >
            <button
              onClick={() => setLightboxItem(null)}
              aria-label="Close gallery preview"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              className="relative max-h-[90vh] max-w-[92vw]"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(event) => event.stopPropagation()}
            >
              {lightboxItem.kind === "video" ? (
                <video src={lightboxItem.src} aria-label={lightboxItem.alt} controls autoPlay playsInline className="max-h-[82vh] max-w-[92vw] rounded-2xl shadow-lift" />
              ) : (
                <img
                  src={lightboxItem.src}
                  alt={lightboxItem.alt}
                  width={1400}
                  height={1000}
                  decoding="async"
                  className="max-h-[82vh] max-w-[92vw] rounded-2xl object-contain shadow-lift"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
