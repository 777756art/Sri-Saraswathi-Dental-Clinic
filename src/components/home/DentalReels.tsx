import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Video, X, ExternalLink } from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset, type SiteContent } from "@/lib/api";
import { clinicImages } from "@/lib/images";

interface ReelItem {
  id: number | string;
  title: string;
  subtitle: string;
  category: string;
  thumbnail: string;
  videoUrl?: string;
}

const fallbackReels: ReelItem[] = [
  {
    id: "f1",
    title: "Gentle Cleaning & Care",
    subtitle: "What happens during a professional ultrasonic clean",
    category: "Preventative",
    thumbnail: clinicImages.treatmentChair,
  },
  {
    id: "f2",
    title: "Smile Makeover Journey",
    subtitle: "From consult to confident, natural white smile",
    category: "Cosmetics",
    thumbnail: clinicImages.patientSmile,
  },
  {
    id: "f3",
    title: "Tooth Ache Relief",
    subtitle: "Early signs of tooth decay you should not ignore",
    category: "Care Tips",
    thumbnail: clinicImages.treatmentRoom,
  },
  {
    id: "f4",
    title: "Child's First Dental Visit",
    subtitle: "Making children feel safe, happy, and calm",
    category: "Pediatric",
    thumbnail: clinicImages.reception,
  },
  {
    id: "f5",
    title: "Modern Sterilization",
    subtitle: "Hospital-grade safety protocols at Sri Saraswathi",
    category: "Clinic Tour",
    thumbnail: clinicImages.sterilizationRoom,
  },
];

export function DentalReels() {
  const { items } = useSiteContent();
  const [selected, setSelected] = useState<ReelItem | null>(null);

  const dynamicReels = items
    .filter((item) => ["reel", "video"].includes(item.type) && (item.mediaUrl || item.mobileMediaUrl))
    .map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle || item.excerpt || "",
      category: item.category || item.badgeText || "Clinic Reel",
      thumbnail: item.mobileMediaUrl ? resolveApiAsset(item.mobileMediaUrl) : item.mediaUrl ? resolveApiAsset(item.mediaUrl) : clinicImages.treatmentChair,
      videoUrl: item.mediaUrl ? resolveApiAsset(item.mediaUrl) : undefined,
    }));

  const allReels: ReelItem[] = dynamicReels.length >= 4 ? dynamicReels : [...dynamicReels, ...fallbackReels.slice(dynamicReels.length)];

  return (
    <section className="bg-[#F5F2EB] px-4 py-16 sm:py-20 lg:py-24" aria-label="Dental Reels Showcase">
      <div className="container-x">
        {/* Centred Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">
            <Video className="h-3.5 w-3.5 text-white" /> Watch Our Dental Reels
          </span>
          <h2 className="mt-4 font-sans text-[32px] font-bold leading-tight tracking-[-0.035em] text-[#1F6878] sm:text-[42px]">
            Smile Stories, <span className="text-[#1F6878]">In Motion.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[#707574] sm:text-[15px]">
            Short clinical stories, expert dental tips, and patient education directly from our clinicians in Erode.
          </p>
        </div>

        {/* Horizontal Reels Card Layout */}
        <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-2 [scrollbar-width:none] sm:gap-6 sm:justify-center [&::-webkit-scrollbar]:hidden">
          {allReels.slice(0, 5).map((reel) => (
            <button
              key={reel.id}
              type="button"
              onClick={() => setSelected(reel)}
              aria-label={`Watch ${reel.title}`}
              className="group relative aspect-[9/16] w-[220px] flex-none snap-center overflow-hidden rounded-[24px] border border-[#dce4e5] bg-[#1F6878] text-left shadow-[0_14px_35px_-20px_rgba(31,104,120,0.4)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_45px_-20px_rgba(31,104,120,0.35)] sm:w-[240px]"
            >
              {/\.(mp4|webm|mov|m4v|ogv|3gp|mkv)(?:[?#].*)?$/i.test(reel.thumbnail) ? (
                <video
                  src={`${reel.thumbnail}#t=0.1`}
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                />
              ) : (
                <img
                  src={reel.thumbnail}
                  alt={reel.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1F6878]/90 via-[#1F6878]/30 to-black/25" />

              {/* Category pill */}
              <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#1F6878]/65 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#E4F0F2] backdrop-blur-md">
                <Video className="h-3 w-3 text-[#E4F0F2]" /> {reel.category}
              </span>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 grid place-items-center">
                <span className="grid h-13 w-13 place-items-center rounded-full border border-white/40 bg-white/25 text-white shadow-xl backdrop-blur-md transition duration-300 group-hover:scale-110 group-hover:bg-[#E95A35] group-hover:border-[#E95A35]">
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                </span>
              </div>

              {/* Bottom text */}
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="font-sans text-[16px] font-bold leading-snug text-white">
                  {reel.title}
                </h3>
                {reel.subtitle && (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/75">
                    {reel.subtitle}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* View All Reels CTA */}
        <div className="mt-8 text-center">
          <a
            href="https://www.instagram.com/srisaraswathidental"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[46px] items-center gap-2 rounded-full border border-[#1F6878]/30 bg-white px-6 text-[12px] font-bold text-[#1F6878] shadow-sm transition hover:border-[#1F6878] hover:bg-[#E4F0F2]"
          >
            View All Reels on Instagram <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Video / Reel Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelected(null);
            }}
            className="fixed inset-0 z-[95] grid place-items-center bg-black/90 p-4 backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close reel player"
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md overflow-hidden rounded-[26px] border border-white/15 bg-[#0F3841] shadow-2xl"
            >
              <div className="relative aspect-[9/16] max-h-[70vh] w-full overflow-hidden bg-black">
                {selected.videoUrl ? (
                  <video
                    src={selected.videoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="relative h-full w-full">
                    <img
                      src={selected.thumbnail}
                      alt={selected.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 grid place-items-center bg-black/40">
                      <div className="text-center p-6 text-white">
                        <Play className="mx-auto h-12 w-12 text-[#E95A35]" />
                        <p className="mt-3 font-bold text-lg">{selected.title}</p>
                        <p className="mt-1 text-xs text-white/70">{selected.subtitle}</p>
                        <a
                          href="https://www.instagram.com/srisaraswathidental"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#E95A35] px-4 py-2 text-xs font-bold text-white hover:bg-[#D14824]"
                        >
                          Watch on Instagram <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5 text-white">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E4F0F2]">
                  {selected.category}
                </span>
                <h3 className="mt-1 text-[18px] font-bold">{selected.title}</h3>
                {selected.subtitle && <p className="mt-1 text-[12px] text-white/70">{selected.subtitle}</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
