import { Award, Smile, Stethoscope, Star, Heart, Users, ShieldCheck, Clock, Sparkles } from "lucide-react";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { parseHeroSectionSettings } from "@/lib/hero-banner-config";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  award: Award,
  smile: Smile,
  stethoscope: Stethoscope,
  star: Star,
  heart: Heart,
  users: Users,
  shield: ShieldCheck,
  clock: Clock,
  sparkles: Sparkles,
};

export function ClinicHighlights() {
  const { items } = useSiteContent("hero");
  const publishedBanners = items.filter((item) => item.published);
  const banner = publishedBanners[0] || null;
  const settings = parseHeroSectionSettings(banner);

  if (settings.visibility?.showHighlights === false) {
    return null;
  }

  const stats = [
    {
      icon: ICON_MAP[settings.highlight1Icon?.toLowerCase()] || Award,
      value: settings.highlight1Value || "15+",
      title: settings.highlight1Title || "Years Experience",
      detail: settings.highlight1Detail || "Dedicated clinical care in Erode",
    },
    {
      icon: ICON_MAP[settings.highlight2Icon?.toLowerCase()] || Smile,
      value: settings.highlight2Value || "5,000+",
      title: settings.highlight2Title || "Happy Smiles",
      detail: settings.highlight2Detail || "Patients and families restored",
    },
    {
      icon: ICON_MAP[settings.highlight3Icon?.toLowerCase()] || Stethoscope,
      value: settings.highlight3Value || "15+",
      title: settings.highlight3Title || "Dental Procedures",
      detail: settings.highlight3Detail || "Advanced restorative & aesthetic care",
    },
    {
      icon: ICON_MAP[settings.highlight4Icon?.toLowerCase()] || Star,
      value: settings.highlight4Value || "4.9★",
      title: settings.highlight4Title || "Patient Rating",
      detail: settings.highlight4Detail || "Verified clinic satisfaction in Erode",
    },
  ];

  return (
    <section className="border-y border-[#dce4e5] bg-[#F5F2EB] py-6 sm:py-8" aria-label="Clinic Highlights">
      <div className="container-x">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {stats.map(({ icon: Icon, value, title, detail }) => (
            <div
              key={title}
              className="group flex flex-col justify-between rounded-[20px] border border-[#dce4e5] bg-white p-3.5 sm:p-5 shadow-[0_6px_20px_-16px_rgba(31,104,120,0.2)] transition duration-300 hover:-translate-y-0.5 hover:border-[#1F6878]/35 hover:shadow-[0_12px_28px_-16px_rgba(31,104,120,0.28)]"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#E4F0F2] text-[#1F6878] transition duration-300 group-hover:bg-[#1F6878] group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-sans text-[26px] font-bold tracking-tight text-[#1F6878] sm:text-[30px]">
                  {value}
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-[13.5px] font-bold text-[#15191B]">{title}</h3>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#707574]">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
