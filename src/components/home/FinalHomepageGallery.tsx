import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Images, X } from "lucide-react";
import { clinicImages } from "@/lib/images";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

interface GalleryItem {
  id: string | number;
  title: string;
  category: string;
  image: string;
}

const defaultPhotos: GalleryItem[] = [
  {
    id: "g-1",
    title: "Welcoming Reception & Patient Lounge",
    category: "Reception",
    image: clinicImages.reception,
  },
  {
    id: "g-2",
    title: "Advanced Operatory Dental Chair",
    category: "Treatment Rooms",
    image: clinicImages.treatmentChair,
  },
  {
    id: "g-3",
    title: "Private Consultation Operatory",
    category: "Treatment Rooms",
    image: clinicImages.treatmentRoom,
  },
  {
    id: "g-4",
    title: "Hospital-Grade Sterilization Suite",
    category: "Facilities",
    image: clinicImages.sterilizationRoom,
  },
  {
    id: "g-5",
    title: "Modern Implant & Surgical Unit",
    category: "Operatory",
    image: clinicImages.operatoryChair,
  },
  {
    id: "g-6",
    title: "Clinic Exterior & Patient Accessibility",
    category: "Exterior",
    image: clinicImages.exterior,
  },
];

const defaultCategories = ["All Spaces", "Treatment Rooms", "Reception", "Operatory", "Facilities"];

export function FinalHomepageGallery() {
  const { items: imgItems } = useSiteContent("image");
  const { items: galItems } = useSiteContent("gallery");
  const allItems = [...imgItems, ...galItems.filter(g => !imgItems.some(i => i.id === g.id))];

  const [activeCategory, setActiveCategory] = useState("All Spaces");
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);

  const dynamicPhotos: GalleryItem[] = allItems
    .filter((item) => item.mediaUrl || item.media_url)
    .map((item) => ({
      id: item.id,
      title: item.title || "Clinic Facility",
      category: item.category || "Facility",
      image: resolveApiAsset(item.mediaUrl || item.media_url || ""),
    }));

  const allPhotos: GalleryItem[] = dynamicPhotos.length > 0 ? dynamicPhotos : defaultPhotos;

  const categories =
    dynamicPhotos.length > 0
      ? ["All Spaces", ...Array.from(new Set(allPhotos.map((p) => p.category.trim()).filter(Boolean)))]
      : defaultCategories;

  const effectiveCategory = categories.includes(activeCategory) ? activeCategory : "All Spaces";

  const filteredPhotos =
    effectiveCategory === "All Spaces"
      ? allPhotos
      : allPhotos.filter((p) => p.category.toLowerCase().includes(effectiveCategory.toLowerCase()));

  const selectedIndex = selectedPhoto ? filteredPhotos.findIndex((p) => p.id === selectedPhoto.id) : -1;

  const navigate = (direction: -1 | 1) => {
    if (!filteredPhotos.length || selectedIndex < 0) return;
    const nextIdx = (selectedIndex + direction + filteredPhotos.length) % filteredPhotos.length;
    setSelectedPhoto(filteredPhotos[nextIdx]);
  };

  return (
    <section className="bg-white px-4 py-16 sm:py-20 lg:py-24" aria-label="Clinic Space Showcase">
      <div className="container-x">
        {/* Centered Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#f0d4df] bg-[#fff8fa] px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ed2f79]">
            <Building2 className="h-3.5 w-3.5" /> Clinic Spaces
          </span>
          <h2 className="mt-3 font-sans text-[32px] font-bold leading-tight tracking-[-0.035em] text-[#073b43] sm:text-[42px]">
            Explore Sri Saraswathi <span className="text-[#0e8a5e]">Up Close.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[#687680] sm:text-[15px]">
            A comfortable, hygienic environment located at Soli Complex, Surampatti Four Rd, Erode.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-2" aria-label="Filter spaces">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-4 py-1.5 text-[11px] font-bold transition ${
                effectiveCategory === cat
                  ? "border-[#073b43] bg-[#073b43] text-white shadow-sm"
                  : "border-[#e5ded9] bg-white text-[#56656b] hover:border-[#ed2f79] hover:text-[#ed2f79]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Image Grid matching screenshot arrangement */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPhotos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelectedPhoto(photo)}
              aria-label={`View ${photo.title}`}
              className="group relative aspect-[1.3/1] overflow-hidden rounded-[22px] border border-[#ebe4de] bg-[#eef3f1] text-left shadow-[0_8px_24px_-16px_rgba(7,59,67,0.22)] transition duration-300 hover:-translate-y-1 hover:border-[#dfc3d0] hover:shadow-[0_18px_36px_-18px_rgba(7,59,67,0.3)]"
            >
              <img
                src={photo.image}
                alt={photo.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#073b43]/85 via-transparent to-transparent opacity-90 transition duration-300 group-hover:from-[#073b43]/95" />

              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
                <div>
                  <span className="block text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#a3d8c9]">
                    {photo.category}
                  </span>
                  <p className="mt-1 font-sans text-[15px] font-bold leading-snug">
                    {photo.title}
                  </p>
                </div>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/30 bg-white/20 backdrop-blur-md transition group-hover:bg-[#ed2f79] group-hover:border-[#ed2f79]">
                  <Images className="h-4 w-4" />
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* View All CTA */}
        <div className="mt-10 text-center">
          <Link
            to="/clinic-gallery"
            className="inline-flex h-[48px] items-center gap-2 rounded-full border border-[#073b43] px-7 text-[13px] font-bold text-[#073b43] transition hover:bg-[#073b43] hover:text-white"
          >
            Explore Full Clinic Gallery <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={selectedPhoto.title}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelectedPhoto(null);
            }}
            className="fixed inset-0 z-[95] grid place-items-center bg-black/90 p-4 backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              aria-label="Close photo preview"
              className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            {filteredPhotos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(-1);
                }}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}

            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="max-h-[88vh] max-w-[min(1050px,92vw)] overflow-hidden rounded-[26px] border border-white/15 bg-[#0e171b] shadow-2xl"
            >
              <img
                src={selectedPhoto.image}
                alt={selectedPhoto.title}
                className="max-h-[72vh] w-full object-contain bg-black"
              />
              <div className="p-4 sm:p-5 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a3d8c9]">
                    {selectedPhoto.category}
                  </span>
                  <p className="mt-0.5 text-[17px] font-bold">{selectedPhoto.title}</p>
                </div>
              </div>
            </motion.div>

            {filteredPhotos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(1);
                }}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
