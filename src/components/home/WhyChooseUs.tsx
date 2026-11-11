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
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">
            <ShieldCheck className="h-3.5 w-3.5 text-white" /> Our Commitment
          </span>
          <h2 className="mt-3 font-sans text-[32px] font-bold leading-tight tracking-[-0.03em] text-[#1F6878] sm:text-[42px]">
            Why Choose <span className="text-[#1F6878]">Sri Saraswathi</span> Dental Clinic?
          </h2>
          <div className="mx-auto mt-3.5 h-1 w-14 rounded-full bg-[#1F6878]" />
          <p className="mx-auto mt-3.5 max-w-xl text-[14px] leading-relaxed text-[#707574] sm:text-[15px]">
            A patient-first healthcare experience built on honest conversations, advanced clinical standards, and gentle chairside care.
          </p>
        </div>

        {/* 3-Column Feature Cards */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map(({ icon: Icon, title, text }, index) => (
            <article
              key={title}
              className="group rounded-[22px] border border-[#1F6878]/15 bg-[#E4F0F2]/55 p-6 shadow-[0_6px_22px_-16px_rgba(31,104,120,0.16)] transition duration-300 hover:-translate-y-1 hover:border-[#1F6878]/35 hover:bg-white hover:shadow-[0_16px_36px_-18px_rgba(31,104,120,0.22)] sm:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#1F6878] shadow-sm transition duration-300 group-hover:bg-[#1F6878] group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[12px] font-bold text-[#1F6878]/45">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-5 font-sans text-[18px] font-bold leading-snug text-[#1F6878]">
                {title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#707574]">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
