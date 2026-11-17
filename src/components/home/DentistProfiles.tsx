import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays } from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

function isValidDoctor(doc: any): boolean {
  if (!doc) return false;
  const name = String(doc.title || doc.name || "").trim();
  const media = String(doc.mediaUrl || doc.profileImageUrl || doc.profile_image_url || "").trim();
  if (!name || name.length < 3) return false;
  if (/test\s*\d+/i.test(name) || /dummy/i.test(name) || /sample/i.test(name)) return false;
  if (!media) return false;
  if (doc.published === false || doc.status === "inactive") return false;
  return true;
}

export function DentistProfiles() {
  const { items, loading } = useSiteContent("doctor");
  const dentists = [...items]
    .filter(isValidDoctor)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
    .slice(0, 3);

  const getGridClass = (count: number) => {
    if (count === 1) return "mt-8 mx-auto max-w-sm sm:max-w-md";
    if (count === 2) return "mt-8 mx-auto max-w-3xl grid gap-5 sm:grid-cols-2 justify-center";
    return "mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3";
  };

  return (
    <section className="bg-white px-4 py-16 sm:py-20 lg:py-24">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">
              Our care team
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-[30px] font-semibold leading-tight tracking-[-.035em] text-[#1F6878] sm:text-[40px]">
              Meet the Experts Behind Your Smile.
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-7 text-[#707574]">
              Get to know the experienced clinicians dedicated to your comfort and health.
            </p>
          </div>
          <Link
            to="/our-dentists"
            className="hidden items-center gap-2 text-[12px] font-semibold text-[#E95A35] sm:inline-flex hover:underline"
          >
            View all dentists <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 grid min-h-40 place-items-center rounded-3xl border border-[#1F6878]/15 bg-[#F5F2EB] text-sm text-[#707574]">
            Loading dentist profiles…
          </div>
        ) : dentists.length ? (
          <div className={getGridClass(dentists.length)}>
            {dentists.map((doctor) => (
              <article
                key={doctor.id}
                className="group overflow-hidden rounded-[20px] border border-[#1F6878]/15 bg-white shadow-[0_12px_28px_-24px_rgba(31,104,120,.4)] transition hover:-translate-y-1 hover:shadow-lg"
              >
                <Link
                  to={`/our-dentists/${doctor.slug || doctor.id}`}
                  className="relative block aspect-[4/3.2] overflow-hidden bg-[#E4F0F2]"
                >
                  <img
                    src={resolveApiAsset(doctor.mediaUrl)}
                    alt={doctor.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.035]"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#1F6878]/75 via-transparent to-transparent" />
                  <span className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="block text-[9px] font-bold uppercase tracking-[.17em] text-[#E4F0F2]">
                      {doctor.specialization || "Dental Specialist"}
                    </span>
                    <span className="mt-1 block font-display text-[21px] font-semibold">
                      {doctor.title}
                    </span>
                  </span>
                </Link>
                <div className="p-4">
                  <p className="text-[11px] font-semibold text-[#1F6878]">
                    {doctor.qualification || ""}
                    {doctor.yearsExperience ? ` · ${doctor.yearsExperience}` : ""}
                  </p>
                  {doctor.excerpt && (
                    <p className="mt-2 line-clamp-2 text-[11.5px] leading-5 text-[#707574]">
                      {doctor.excerpt}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-[#E4F0F2] pt-3">
                    <Link
                      to={`/our-dentists/${doctor.slug || doctor.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1F6878] hover:text-[#1F6878]"
                    >
                      View profile <ArrowRight className="h-3 w-3" />
                    </Link>
                    <Link
                      to={`/booking?doctor=${encodeURIComponent(doctor.title)}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#E95A35] px-3 py-2 text-[9px] font-bold text-white shadow-sm transition hover:bg-[#D14824]"
                    >
                      <CalendarDays className="h-3 w-3" /> Book visit
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[20px] border border-dashed border-[#1F6878]/25 bg-[#F5F2EB] px-5 py-9 text-center text-[13px] text-[#707574]">
            Dentist profiles are currently updating.
          </div>
        )}

        <Link
          to="/our-dentists"
          className="mt-5 inline-flex items-center gap-2 text-[12px] font-semibold text-[#E95A35] sm:hidden"
        >
          View all dentists <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
