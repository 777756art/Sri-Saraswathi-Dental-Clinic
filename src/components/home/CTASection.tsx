import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";

export function CTASection() {
  return <section className="bg-white px-4 pb-16 pt-4 sm:pb-20">
    <div className="container-x"><div className="relative isolate overflow-hidden rounded-[28px] bg-[#1F6878] px-6 py-12 text-center text-white sm:px-12 sm:py-16">
      <div className="pointer-events-none absolute inset-0 -z-10"><div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[#E4F0F2]/15 blur-[100px]" /><div className="absolute -bottom-24 -right-12 h-80 w-80 rounded-full bg-[#154C58]/45 blur-[100px]" /><div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:24px_24px] opacity-20" /></div>
      <p className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]"><MapPin className="h-3.5 w-3.5 text-white" /> Sri Saraswathi Dental Clinic · Erode</p>
      <h2 className="mx-auto mt-5 max-w-3xl font-display text-[31px] font-semibold leading-tight tracking-[-.03em] sm:text-[42px]">Your Journey to a Healthier Smile Starts Here.</h2>
      <p className="mx-auto mt-4 max-w-xl text-[13px] leading-6 text-white/70">Choose a convenient appointment time and tell us how the clinic team can help.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3"><Link to="/booking" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#E95A35] px-6 text-[12px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(233,90,53,.9)] transition hover:-translate-y-0.5 hover:bg-[#D14824]"><CalendarDays className="h-4 w-4" /> Book Your Appointment <ArrowRight className="h-4 w-4" /></Link><a href="tel:+914244272494" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 px-5 text-[12px] font-semibold text-white transition hover:bg-white/10">Call 0424 427 2494</a></div>
    </div></div>
  </section>;
}
