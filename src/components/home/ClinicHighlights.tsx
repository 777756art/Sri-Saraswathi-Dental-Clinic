import { Award, Smile, Stethoscope, Star } from "lucide-react";

const stats = [
  {
    icon: Award,
    value: "15+",
    title: "Years Experience",
    detail: "Dedicated clinical care in Erode",
    tone: "teal",
  },
  {
    icon: Smile,
    value: "5,000+",
    title: "Happy Smiles",
    detail: "Patients and families restored",
    tone: "pink",
  },
  {
    icon: Stethoscope,
    value: "15+",
    title: "Dental Procedures",
    detail: "Advanced restorative & aesthetic care",
    tone: "green",
  },
  {
    icon: Star,
    value: "4.9★",
    title: "Patient Rating",
    detail: "Verified clinic satisfaction in Erode",
    tone: "amber",
  },
];

export function ClinicHighlights() {
  return (
    <section className="border-y border-[#dce4e5] bg-[#F5F2EB] py-6 sm:py-8" aria-label="Clinic Highlights">
      <div className="container-x">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map(({ icon: Icon, value, title, detail, tone }) => (
            <div
              key={title}
              className="group flex flex-col justify-between rounded-[20px] border border-[#dce4e5] bg-white p-4 shadow-[0_6px_20px_-16px_rgba(31,104,120,0.2)] transition duration-300 hover:-translate-y-0.5 hover:border-[#1F6878]/35 hover:shadow-[0_12px_28px_-16px_rgba(31,104,120,0.28)] sm:p-5"
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
