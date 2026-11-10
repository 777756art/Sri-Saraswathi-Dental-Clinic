import { useState } from "react";
import { ArrowUpRight, CheckCircle, Clock3, HeartHandshake, Mail, MapPin, MessageCircle, Phone, Send, ShieldCheck, Users } from "lucide-react";
import { LiveChat } from "@/components/home/LiveChat";
import { clinicImages } from "@/lib/images";
import { useClinicSettings } from "@/lib/clinic-settings";
import { api } from "@/lib/api";

const values = [
  { icon: HeartHandshake, title: "We listen first", copy: "Your concerns and priorities are part of the care conversation." },
  { icon: ShieldCheck, title: "Clear choices", copy: "Understand the options, timing and cost before deciding how to proceed." },
  { icon: Users, title: "Care for families", copy: "A welcoming clinic for patients at different stages of life." },
];

export default function ContactPage() {
  const { settings } = useClinicSettings();
  const whatsappNumber = (settings.whatsapp_number || "919345743409").replace(/\D/g, "");
  const details = [
    { icon: Phone, label: "Phone", value: settings.phone || "0424 427 2494", href: `tel:${(settings.phone || "04244272494").replace(/\s+/g, "")}` },
    { icon: Mail, label: "Email", value: settings.email || "info@srisaraswathidental.com", href: `mailto:${settings.email || "info@srisaraswathidental.com"}` },
    { icon: MapPin, label: "Visit", value: settings.address || "866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009", href: "https://share.google/Izecs47hnhjCpmBBs" },
    { icon: Clock3, label: "Opening hours", value: settings.opening_hours || "Mon–Sat · 9:00 AM–8:45 PM · Sunday emergency only" },
  ];
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [formKey, setFormKey] = useState(0);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setState("sending"); setError("");
    try {
      await api.post("/api/contact-enquiries", {
        name: String(data.get("name") || ""),
        phone: String(data.get("phone") || ""),
        email: String(data.get("email") || ""),
        message: String(data.get("message") || ""),
      });
      setState("success"); setFormKey((value) => value + 1);
    } catch (cause) {
      setState("error"); setError(cause instanceof Error ? cause.message : "Your message could not be sent. Please try again or call the clinic.");
    }
  };

  return <>
    <main className="min-h-screen bg-[#faf8f4]">
      <section className="relative mt-[108px] min-h-[370px] overflow-hidden bg-[#073b43] sm:min-h-[445px]">
        <img src={clinicImages.practiceErode} alt="Inside Sri Saraswathi Dental Clinic in Erode" loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a282e]/80 via-[#0a282e]/50 to-[#0a282e]/10" />
        <div className="container-x relative flex min-h-[370px] items-end pb-8 sm:min-h-[445px] sm:pb-12"><div className="max-w-2xl text-white"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/75">Sri Saraswathi Dental Clinic · Erode</p><h1 className="mt-3 font-display text-[34px] font-semibold leading-[1.1] tracking-[-.035em] sm:text-[48px]">Compassionate Care.<br /><span className="italic text-[#ff9ec2]">Confident Smiles.</span></h1><p className="mt-4 max-w-xl text-[14px] leading-7 text-white/75">Thoughtful dental care for every generation. We listen first, explain your options and help you feel confident about your next step.</p></div></div>
      </section>

      <section className="px-4 py-14 sm:py-20"><div className="container-x grid gap-9 lg:grid-cols-[.8fr_1.2fr] lg:gap-16"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#c72d70]">About our clinic</p><h2 className="mt-3 font-display text-[30px] font-semibold leading-tight text-[#173d43] sm:text-[38px]">A considered approach to every visit.</h2><p className="mt-4 text-[14px] leading-7 text-[#67757c]">Sri Saraswathi Dental Clinic welcomes patients in Erode for conversations about their oral health and dental care. Each visit starts with listening, an assessment and a clear explanation of possible next steps.</p><p className="mt-4 text-[14px] leading-7 text-[#67757c]">Our aim is to make care easier to understand, with time for questions and decisions made together with your dentist.</p><div className="mt-6 rounded-[18px] border border-[#ece5df] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#c72d70]">Our purpose</p><p className="mt-2 font-display text-[21px] font-semibold leading-snug text-[#173d43]">Listen carefully. Explain clearly. Care thoughtfully.</p></div></div><div className="grid gap-3 sm:grid-cols-3">{values.map(({ icon: Icon, title, copy }) => <article key={title} className="rounded-[18px] border border-[#ece5df] bg-white p-5 shadow-[0_10px_28px_-24px_rgba(25,50,55,.35)]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fce8f1] text-[#c72d70]"><Icon className="h-4 w-4" /></span><h3 className="mt-4 font-display text-[17px] font-semibold text-[#173d43]">{title}</h3><p className="mt-2 text-[11px] leading-5 text-[#718087]">{copy}</p></article>)}</div></div></section>

      <section className="border-y border-[#ebe5df] bg-white px-4 py-14 sm:py-18"><div className="container-x"><div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#c72d70]">Contact the clinic</p><h2 className="mt-3 font-display text-[30px] font-semibold text-[#173d43] sm:text-[38px]">We’re here to help you smile.</h2></div><div className="mt-7 grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-start"><div className="space-y-3">{details.map(({ icon: Icon, label, value, href }) => <div key={label} className="flex items-start gap-3 rounded-[16px] border border-[#eee7e1] bg-[#fcfbf8] p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#177f78] shadow-sm"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#899397]">{label}</p>{href ? <a href={href} target={href.startsWith("https") ? "_blank" : undefined} rel={href.startsWith("https") ? "noreferrer" : undefined} className="mt-1 block text-[12px] leading-5 text-[#29464b] hover:text-[#c72d70]">{value}{href.startsWith("https") && <ArrowUpRight className="ml-1 inline h-3 w-3" />}</a> : <p className="mt-1 text-[12px] leading-5 text-[#29464b]">{value}</p>}</div></div>)}<a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello Sri Saraswathi Dental Clinic, I have a question about a visit.")}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#128c68] px-5 text-[11px] font-bold text-white transition hover:bg-[#0d7457]"><MessageCircle className="h-4 w-4" /> Message us on WhatsApp</a><div className="overflow-hidden rounded-[18px] border border-[#eee7e1]"><iframe title="Sri Saraswathi Dental Clinic location in Erode" src="https://maps.google.com/maps?q=866%20Soli%20Complex%20Surampatti%20Four%20Road%20Erode%20Tamil%20Nadu%20638009&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-[260px] w-full border-0" /></div></div>

        <div className="rounded-[22px] border border-[#eee7e1] bg-[#faf8f4] p-5 shadow-[0_14px_36px_-28px_rgba(25,50,55,.36)] sm:p-7">{state === "success" ? <div className="flex min-h-[360px] flex-col items-center justify-center text-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#e8f6ef] text-[#278052]"><CheckCircle className="h-7 w-7" /></span><h3 className="mt-5 font-display text-2xl font-semibold text-[#173d43]">Your enquiry has been sent</h3><p className="mt-2 max-w-sm text-[13px] leading-6 text-[#718087]">The clinic team has received your message and can follow up using the contact information you provided.</p><button type="button" onClick={() => setState("idle")} className="mt-5 text-[11px] font-semibold text-[#bd2d6d]">Send another message</button></div> : <><div><span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#c72d70] shadow-sm"><Send className="h-4 w-4" /></span><h3 className="mt-4 font-display text-[23px] font-semibold text-[#173d43]">Send an enquiry</h3><p className="mt-1.5 text-[12px] leading-5 text-[#718087]">Share your question and the clinic team can get back to you.</p></div><form key={formKey} onSubmit={submit} className="mt-6 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-[11px] font-medium text-[#52666e]">Full name<input name="name" required autoComplete="name" minLength={2} maxLength={120} className="mt-1.5 h-11 w-full rounded-xl border border-[#e6e0da] bg-white px-3.5 text-[13px] text-[#203b41] outline-none focus:border-[#138d7d] focus:ring-4 focus:ring-[#138d7d]/10" /></label><label className="text-[11px] font-medium text-[#52666e]">Phone<input name="phone" type="tel" autoComplete="tel" className="mt-1.5 h-11 w-full rounded-xl border border-[#e6e0da] bg-white px-3.5 text-[13px] text-[#203b41] outline-none focus:border-[#138d7d] focus:ring-4 focus:ring-[#138d7d]/10" placeholder="Phone or email is required" /></label></div><label className="block text-[11px] font-medium text-[#52666e]">Email (optional)<input name="email" type="email" autoComplete="email" className="mt-1.5 h-11 w-full rounded-xl border border-[#e6e0da] bg-white px-3.5 text-[13px] text-[#203b41] outline-none focus:border-[#138d7d] focus:ring-4 focus:ring-[#138d7d]/10" /></label><label className="block text-[11px] font-medium text-[#52666e]">Message<textarea name="message" required minLength={5} maxLength={4000} rows={5} className="mt-1.5 w-full resize-y rounded-xl border border-[#e6e0da] bg-white px-3.5 py-3 text-[13px] leading-6 text-[#203b41] outline-none focus:border-[#138d7d] focus:ring-4 focus:ring-[#138d7d]/10" /></label>{state === "error" && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">{error}</p>}<button type="submit" disabled={state === "sending"} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#073b43] px-5 text-[11px] font-bold text-white transition hover:bg-[#087e8b] disabled:cursor-wait disabled:opacity-70">{state === "sending" ? "Sending…" : "Send Enquiry"}<ArrowUpRight className="h-4 w-4" /></button><p className="text-center text-[10px] leading-5 text-[#899397]">Your enquiry is saved for the clinic team to follow up. Avoid including urgent or highly sensitive clinical details.</p></form></>}</div>
      </div></div></section>
    </main>
    <LiveChat />
  </>;
}
