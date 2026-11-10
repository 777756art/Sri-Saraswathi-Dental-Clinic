import { HeartHandshake, ShieldCheck, Stethoscope, ClipboardCheck, UsersRound, MessageCircle } from "lucide-react";

const reasons = [
  {
    icon: Stethoscope,
    title: "Experienced Clinicians",
    text: "Led by Dr. Kishore Kumar with 15+ years of dedicated, proven dental practice in Erode.",
  },
  {
    icon: HeartHandshake,
    title: "Patient-Centred Comfort",
    text: "Your peace of mind and comfort are prioritized through gentle, pain-free techniques.",
  },
  {
    icon: ShieldCheck,
    title: "Modern Sterilization",
    text: "Strict hospital-grade disinfection and autoclaving for absolute treatment safety.",
  },
  {
    icon: UsersRound,
    title: "Welcoming Family Environment",
    text: "A friendly, calm clinic atmosphere designed to reassure children, adults, and seniors alike.",
  },
  {
    icon: ClipboardCheck,
    title: "Clear, Transparent Plans",
    text: "Detailed step-by-step explanations with no surprise costs or rushed clinical decisions.",
  },
  {
    icon: MessageCircle,
    title: "Follow-Up & Ongoing Care",
    text: "Continuous guidance, preventive tips, and friendly check-in support after every procedure.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="bg-white px-4 py-16 sm:py-20 lg:py-24" aria-label="Why Choose Us">
      <div className="container-x">
        {/* Centered Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#f0d4df] bg-[#fff8fa] px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ed2f79]">
            <ShieldCheck className="h-3.5 w-3.5" /> Our Commitment
          </span>
          <h2 className="mt-3 font-sans text-[32px] font-bold leading-tight tracking-[-0.03em] text-[#073b43] sm:text-[42px]">
            Why Choose Sri Saraswathi Dental Clinic?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[#687680] sm:text-[15px]">
            A patient-first healthcare experience built on honest conversations, advanced clinical standards, and gentle chairside care.
          </p>
        </div>

        {/* 3-Column Feature Cards */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map(({ icon: Icon, title, text }, index) => (
            <article
              key={title}
              className="group rounded-[22px] border border-[#ebe4de] bg-[#faf8f4] p-6 shadow-[0_6px_22px_-16px_rgba(7,59,67,0.18)] transition duration-300 hover:-translate-y-1 hover:border-[#dfc3d0] hover:bg-white hover:shadow-[0_16px_36px_-18px_rgba(7,59,67,0.25)] sm:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#ed2f79] shadow-sm transition duration-300 group-hover:bg-[#ed2f79] group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[12px] font-bold text-[#b0bcc1]">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-5 font-sans text-[18px] font-bold leading-snug text-[#073b43]">
                {title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#687680]">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
