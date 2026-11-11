import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Clock3, Heart, MapPin, Microscope, PhoneCall, ShieldCheck, Sparkles, Users, Wind } from "lucide-react";
import { LiveChat } from "@/components/home/LiveChat";
import { clinicImages } from "@/lib/images";

const values = [
  { icon: ShieldCheck, title: "Clear explanations", text: "We talk through what we see, the available options and what each next step involves." },
  { icon: Heart, title: "Patient-led decisions", text: "Your comfort, questions and priorities shape the conversation and care plan." },
  { icon: Microscope, title: "Thoughtful technology", text: "Modern dental tools support careful assessment and a clearer view of your care." },
  { icon: Users, title: "Care for every age", text: "A welcoming clinic for children, adults and families at every stage of life." },
  { icon: Wind, title: "A calmer visit", text: "We explain each step before we begin and make room for you to ask questions." },
  { icon: Sparkles, title: "Personal attention", text: "Your treatment plan starts with a conversation about your needs and goals." },
];

export default function AboutPage() {
  return (
    <>
      <main className="min-h-screen bg-[#F5F2EB]">
        <section className="relative mt-[108px] h-[340px] overflow-hidden bg-[#1F6878] sm:h-[400px]">
          <img src={clinicImages.heroDentalCare} alt="Dentist discussing care with a patient" loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[center_17%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1F6878]/85 via-[#1F6878]/45 to-[#1F6878]/15" />
          <div className="container-x relative flex h-full items-end pb-8 sm:pb-10">
            <div className="max-w-2xl text-white">
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#E4F0F2]">Sri Saraswathi Dental Clinic · Erode</p>
              <h1 className="mt-2 font-display text-[32px] font-bold leading-tight tracking-[-.03em] sm:text-[42px]">Care that makes room <span className="text-[#E4F0F2]">for you.</span></h1>
              <Link to="/booking" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#E95A35] px-5 text-[11px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(233,90,53,0.75)] transition hover:-translate-y-0.5 hover:bg-[#D14824]">Book a visit <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:py-20">
          <div className="container-x grid gap-8 lg:grid-cols-[.86fr_1.14fr] lg:gap-16">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#1F6878]">Our mission</p>
              <h2 className="mt-4 max-w-lg font-display text-[31px] font-bold leading-[1.13] tracking-[-.035em] text-[#1F6878] sm:text-[38px]">Make extraordinary care feel <span className="text-[#1F6878]">ordinary.</span></h2>
              <div className="mt-4 h-1 w-14 rounded-full bg-[#1F6878]" />
            </div>
            <div>
              <div className="flex items-center gap-3 border-t border-[#dce4e5] pt-4">
                <img src={clinicImages.dentistPortrait} alt="Dr. Kishore Kumar" loading="lazy" decoding="async" className="h-11 w-11 rounded-full object-cover object-top" />
                <div><p className="font-display text-[15px] font-bold text-[#1F6878]">Dr. Kishore Kumar</p><p className="text-[10px] font-medium text-[#1F6878]">Founder &amp; Chief Dental Surgeon</p></div>
              </div>
              <p className="mt-5 text-[14px] leading-7 text-[#707574]">A healthy smile should not come with guesswork. At Sri Saraswathi Dental Clinic, we make time to listen, explain what we find and help you understand your options before treatment begins.</p>
              <p className="mt-4 text-[14px] leading-7 text-[#707574]">Our aim is a visit that feels calm and personal: a welcoming team, clear guidance and care shaped around the person in the chair.</p>
              <div className="mt-6 grid gap-2 border-t border-[#dce4e5] pt-5 sm:grid-cols-2">
                {["Talk through every concern", "Understand the care plan", "Know the next step", "Ask questions at your pace"].map((item) => <p key={item} className="flex items-center gap-2 text-[11px] font-medium text-[#1F6878]"><Check className="h-3.5 w-3.5 text-[#1F6878]" />{item}</p>)}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#dce4e5] bg-[#F5F2EB] px-4 py-14 sm:py-18">
          <div className="container-x">
            <div className="max-w-2xl">
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#1F6878]">What sets us apart</p>
              <h2 className="mt-3 font-display text-[30px] font-bold leading-tight text-[#1F6878] sm:text-[36px]">Six things we refuse to <span className="text-[#1F6878]">compromise.</span></h2>
              <div className="mt-3.5 h-1 w-14 rounded-full bg-[#1F6878]" />
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {values.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-[18px] border border-[#1F6878]/15 bg-[#E4F0F2]/55 p-5 shadow-[0_8px_22px_-18px_rgba(31,104,120,.25)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#1F6878] shadow-sm"><Icon className="h-4 w-4" /></span>
                  <h3 className="mt-4 font-display text-[16px] font-bold text-[#1F6878]">{title}</h3>
                  <p className="mt-1.5 text-[11px] leading-[1.7] text-[#707574]">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:py-20">
          <div className="container-x grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-14">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#1F6878]">Reach us directly</p>
              <h2 className="mt-3 font-display text-[30px] font-bold leading-tight text-[#1F6878] sm:text-[36px]">Real people, on the other end of the line.</h2>
              <p className="mt-3 max-w-md text-[13px] leading-6 text-[#707574]">Have a question about a visit or treatment? Contact the clinic team and we’ll help you find the right next step.</p>
              <div className="mt-6 space-y-2.5">
                <a href="tel:+914244272494" className="flex items-center gap-3 rounded-xl border border-[#dce4e5] bg-[#F5F2EB] px-4 py-3 text-[12px] font-semibold text-[#1F6878] transition hover:border-[#1F6878]"><PhoneCall className="h-4 w-4 text-[#1F6878]" />0424 427 2494</a>
                <p className="flex items-center gap-3 rounded-xl border border-[#dce4e5] bg-[#F5F2EB] px-4 py-3 text-[11px] text-[#707574]"><Clock3 className="h-4 w-4 text-[#1F6878]" />Mon–Sat · 9:00 AM–8:45 PM · Sunday emergency only</p>
                <p className="flex items-start gap-3 rounded-xl border border-[#dce4e5] bg-[#F5F2EB] px-4 py-3 text-[11px] leading-5 text-[#707574]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1F6878]" />866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009</p>
              </div>
            </div>
            <div className="rounded-[20px] border border-[#dce4e5] bg-[#F5F2EB] p-6 shadow-[0_12px_30px_-22px_rgba(31,104,120,.28)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#1F6878]">We’re here to help</p>
                  <h3 className="mt-2 font-display text-[22px] font-bold text-[#1F6878]">Send us a message</h3>
                  <p className="mt-1.5 max-w-md text-[12px] leading-5 text-[#707574]">Share a little about your question. Your email app will open so you can review and send it to the clinic.</p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E4F0F2] text-[#1F6878]"><PhoneCall className="h-4 w-4" /></span>
              </div>
              <form className="mt-5 space-y-3" onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const subject = encodeURIComponent(String(form.get("subject") || "Clinic enquiry"));
                const body = encodeURIComponent([
                  `Name: ${form.get("name") || ""}`,
                  `Email: ${form.get("email") || ""}`,
                  `Phone: ${form.get("phone") || ""}`,
                  "",
                  String(form.get("message") || ""),
                ].join("\n"));
                window.location.href = `mailto:info@srisarawathidental.com?subject=${subject}&body=${body}`;
              }}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[10px] font-semibold text-[#1F6878]">Name<input name="name" required autoComplete="name" className="mt-1.5 h-10 w-full rounded-lg border border-[#dce4e5] bg-white px-3 text-[12px] text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-4 focus:ring-[#1F6878]/15" /></label>
                  <label className="text-[10px] font-semibold text-[#1F6878]">Email<input name="email" type="email" required autoComplete="email" className="mt-1.5 h-10 w-full rounded-lg border border-[#dce4e5] bg-white px-3 text-[12px] text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-4 focus:ring-[#1F6878]/15" /></label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[10px] font-semibold text-[#1F6878]">Phone<input name="phone" type="tel" autoComplete="tel" className="mt-1.5 h-10 w-full rounded-lg border border-[#dce4e5] bg-white px-3 text-[12px] text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-4 focus:ring-[#1F6878]/15" /></label>
                  <label className="text-[10px] font-semibold text-[#1F6878]">Subject<input name="subject" required className="mt-1.5 h-10 w-full rounded-lg border border-[#dce4e5] bg-white px-3 text-[12px] text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-4 focus:ring-[#1F6878]/15" /></label>
                </div>
                <label className="block text-[10px] font-semibold text-[#1F6878]">Message<textarea name="message" required rows={4} className="mt-1.5 w-full resize-y rounded-lg border border-[#dce4e5] bg-white px-3 py-2.5 text-[12px] text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-4 focus:ring-[#1F6878]/15" /></label>
                <button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#E95A35] px-5 text-[11px] font-bold text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.65)] transition hover:bg-[#D14824]">Continue to email <ArrowUpRight className="h-3.5 w-3.5" /></button>
                <p className="text-center text-[9px] text-[#707574]">Your message stays in your email app until you choose to send it.</p>
              </form>
            </div>
          </div>
        </section>

        <section className="container-x pb-14 sm:pb-20">
          <div className="group relative isolate overflow-hidden rounded-[22px] bg-[#1F6878]">
            <img src={clinicImages.exterior} alt="Sri Saraswathi Dental Clinic exterior in Erode" loading="lazy" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#1F6878]/85 via-[#1F6878]/40 to-transparent" />
            <div className="flex min-h-[220px] flex-col items-start justify-end p-6 text-white sm:min-h-[270px] sm:p-9">
              <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#E4F0F2]">Visit our clinic</p>
              <h2 className="mt-2 font-display text-[26px] font-semibold sm:text-[32px]">Sri Saraswathi Dental Clinic</h2>
              <p className="mt-1 text-[11px] text-[#E4F0F2]/80">Soli Complex · Surampatti Four Rd · Erode</p>
              <a href="https://share.google/Izecs47hnhjCpmBBs" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-[#E95A35] px-4 text-[10px] font-bold text-white shadow-[0_8px_18px_-10px_rgba(233,90,53,0.85)] transition hover:bg-[#D14824]">Get directions <ArrowUpRight className="h-3 w-3" /></a>
            </div>
          </div>
        </section>
      </main>
      <LiveChat />
    </>
  );
}
