import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, ChevronRight, CircleHelp, Clock3, PhoneCall, ShieldCheck, Sparkles, Heart, Smile } from "lucide-react";
import { LiveChat } from "@/components/home/LiveChat";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

interface ServicePageProps {
  title: string;
  description: string;
  overview: string;
  benefits: string[];
  procedureSteps: { title: string; description: string }[];
  estimatedDuration: string;
  recoveryGuidance: string[];
  faqs: { question: string; answer: string }[];
  priceRange?: string;
  imageUrl?: string;
  imageAlt?: string;
}

const benefitIcons = [Smile, Heart, ShieldCheck, Sparkles];
const pathwayDescriptions = [
  "Your dentist listens to your concerns and checks your oral health.",
  "The available options, timing and costs are explained before you decide.",
  "Treatment is provided in the stages agreed with your dentist.",
  "You receive aftercare guidance and a follow-up plan for your needs.",
];

export function ServiceTemplate({
  title,
  description,
  overview,
  benefits,
  procedureSteps,
  estimatedDuration,
  recoveryGuidance,
  faqs,
  priceRange,
  imageUrl,
  imageAlt,
}: ServicePageProps) {
  const benefitItems = [
    "Understand your options",
    "A plan shaped around you",
    "Clear next steps",
    "Support through your care",
  ];
  const pathwayItems = procedureSteps.slice(0, 4);

  return (
    <>
      <main className="min-h-screen bg-[#F5F2EB]">
        <section className="px-4 pb-10 pt-[108px] md:pb-14 md:pt-[125px]">
          <div className="container-x">
            <div className="mb-5 flex items-center gap-2 text-[10px] text-[#707574]">
              <Link to="/treatments" className="hover:text-[#1F6878]">Treatments</Link><ChevronRight className="h-3 w-3" /><span className="font-semibold text-[#1F6878]">{title}</span>
            </div>
            <div className="grid items-center gap-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-12">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">Treatment guide · Sri Saraswathi Dental Clinic</p>
                <h1 className="mt-3 max-w-[670px] font-display text-[34px] font-bold leading-[1.1] tracking-[-.04em] text-[#1F6878] sm:text-[44px]">
                  {title} <span className="text-[#1F6878]">&amp; precision care.</span>
                </h1>
                <p className="mt-4 max-w-[600px] text-[14px] leading-7 text-[#707574]">{description}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-[#1F6878]">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F0F2] px-3 py-1.5 text-[#1F6878]"><CheckCircle2 className="h-3.5 w-3.5 text-[#1F6878]" /> Dentist-guided care</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[#1F6878] border border-[#1F6878]/15"><Clock3 className="h-3.5 w-3.5 text-[#1F6878]" /> {estimatedDuration || "Timing discussed at consultation"}</span>
                </div>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Link to={`/booking?service=${encodeURIComponent(title)}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#E95A35] px-5 text-[11px] font-bold text-white shadow-[0_12px_24px_-12px_rgba(233,90,53,.55)] transition hover:-translate-y-0.5 hover:bg-[#D14824]"><CalendarDays className="h-4 w-4" /> Book this treatment</Link>
                  <a href="tel:+914244272494" className="inline-flex h-11 items-center gap-2 rounded-full border border-[#1F6878]/25 bg-white px-5 text-[11px] font-semibold text-[#1F6878] transition hover:border-[#1F6878] hover:bg-[#E4F0F2]"><PhoneCall className="h-3.5 w-3.5 text-[#1F6878]" /> Call the clinic</a>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[20px] border border-[#1F6878]/15 bg-[#E4F0F2] shadow-[0_14px_36px_-24px_rgba(31,104,120,.35)]">
                {imageUrl ? <img src={imageUrl} alt={imageAlt ?? `${title} at Sri Saraswathi Dental Clinic`} loading="eager" decoding="async" className="aspect-[1.35/1] w-full object-cover" /> : <div className="grid aspect-[1.35/1] place-items-center"><Sparkles className="h-10 w-10 text-[#1F6878]" /></div>}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-[#1F6878]/80 to-transparent p-4 pt-12 text-white sm:p-5 sm:pt-16">
                  <p className="text-[10px] font-semibold uppercase tracking-[.13em]">Treatment at your pace</p>
                  {priceRange && <p className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-semibold backdrop-blur">{priceRange}</p>}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E4F0F2] bg-white px-4 py-11 sm:py-14">
          <div className="container-x">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">Expected outcomes</p>
              <h2 className="mt-3 font-display text-[27px] font-bold text-[#1F6878] sm:text-[32px]">Benefits of <span className="text-[#1F6878]">{title}</span></h2>
              <p className="mt-1 text-[11px] text-[#707574]">Your dentist will discuss which outcomes are realistic for your individual care.</p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {benefitItems.map((label, index) => {
                const Icon = benefitIcons[index];
                return <article key={label} className="rounded-[16px] border border-[#1F6878]/15 bg-[#E4F0F2]/35 p-4 sm:p-5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E4F0F2] text-[#1F6878]"><Icon className="h-4 w-4" /></span>
                  <h3 className="mt-3 text-[12px] font-bold text-[#1F6878]">{label}</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#707574]">{benefits[index] || "Your care plan is discussed with you before treatment begins."}</p>
                </article>;
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:py-16">
          <div className="container-x grid gap-5 lg:grid-cols-[.92fr_1.08fr]">
            <article className="rounded-[18px] border border-[#1F6878]/15 bg-white p-5 sm:p-7">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">Treatment overview</p>
              <h2 className="mt-3 font-display text-[22px] font-bold text-[#1F6878]">What is this treatment?</h2>
              <p className="mt-3 text-[12px] leading-[1.8] text-[#707574]">{overview}</p>
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#E4F0F2]/70 p-3.5">
                <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-[#1F6878]" />
                <p className="text-[10px] leading-relaxed text-[#1F6878]">Treatment suitability, timing and cost depend on your dental assessment. Your dentist will explain these with you.</p>
              </div>
            </article>
            <article className="rounded-[18px] border border-[#1F6878]/15 bg-white p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div><p className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">Guided digital flow</p><h2 className="mt-3 font-display text-[22px] font-bold text-[#1F6878]">Treatment pathway</h2></div>
                <span className="rounded-full bg-[#E4F0F2] px-3 py-1 text-[8px] font-bold uppercase tracking-[.13em] text-[#1F6878]">Your plan</span>
              </div>
              <ol className="mt-5 space-y-4 border-l border-[#E4F0F2] pl-4">
                {pathwayItems.map((step, index) => <li key={step.title} className="relative">
                  <span className="absolute -left-[21px] top-0.5 grid h-3 w-3 place-items-center rounded-full border-2 border-white bg-[#1F6878] ring-1 ring-[#1F6878]/35" />
                  <p className="text-[8px] font-bold uppercase tracking-[.14em] text-[#1F6878]">Phase {String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-0.5 text-[11px] font-bold text-[#1F6878]">{step.title}</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#707574]">{pathwayDescriptions[index]}</p>
                </li>)}
              </ol>
            </article>
          </div>
        </section>

        {faqs.length > 0 && (
          <section className="px-4 pb-12">
            <div className="container-x max-w-4xl">
              <h2 className="font-display text-[23px] font-bold text-[#1F6878]">Questions to discuss</h2>
              <div className="mt-4 divide-y divide-[#E4F0F2] overflow-hidden rounded-[16px] border border-[#1F6878]/15 bg-white">
                {faqs.slice(0, 3).map((faq) => <details key={faq.question} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-[11px] font-semibold text-[#1F6878] [&::-webkit-details-marker]:hidden">{faq.question}<ChevronRight className="h-4 w-4 text-[#1F6878] transition group-open:rotate-90" /></summary>
                  <p className="px-4 pb-4 text-[11px] leading-relaxed text-[#707574]">{faq.answer}</p>
                </details>)}
              </div>
            </div>
          </section>
        )}

        <section className="container-x pb-14 sm:pb-20">
          <div className="grid gap-5 rounded-[22px] bg-[#1F6878] p-6 text-white shadow-[0_20px_40px_-24px_rgba(31,104,120,.5)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-9">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">Selected treatment · {title}</p>
              <h2 className="mt-3 font-display text-[25px] font-bold leading-tight sm:text-[30px]">Ready to take care of your smile?</h2>
              <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-[#E4F0F2]/75">Book a consultation to talk through your concerns, options and next steps with the clinic team.</p>
            </div>
            <div className="flex flex-col gap-2 sm:min-w-[220px]">
              <Link to={`/booking?service=${encodeURIComponent(title)}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#E95A35] px-4 text-[10px] font-bold text-white shadow-[0_10px_22px_-12px_rgba(233,90,53,0.55)] transition hover:bg-[#D14824]"><CalendarDays className="h-3.5 w-3.5" /> Book an appointment</Link>
              <a href="tel:+914244272494" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/15 px-4 text-[10px] font-semibold text-white transition hover:bg-white/25"><PhoneCall className="h-3.5 w-3.5" /> Call the clinic · 0424 427 2494</a>
            </div>
          </div>
        </section>

        {recoveryGuidance.length > 0 && <section className="container-x pb-12">
          <details className="rounded-[16px] border border-[#1F6878]/15 bg-white p-4">
            <summary className="cursor-pointer text-[11px] font-semibold text-[#1F6878]">Aftercare notes</summary>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[10px] leading-relaxed text-[#707574]">{recoveryGuidance.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
          </details>
        </section>}
      </main>
      <LiveChat />
    </>
  );
}
