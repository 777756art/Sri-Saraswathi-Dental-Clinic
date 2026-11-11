import { Bot, CalendarDays, MessageCircle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export function AiWorkspace() {
  return (
    <section className="bg-white px-4 py-16 sm:py-20 lg:py-24">
      <div className="container-x">
        <ScrollReveal>
          <div className="overflow-hidden rounded-[18px] bg-[#1F6878] p-5 text-white shadow-[0_22px_55px_-38px_rgba(31,104,120,.55)] sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.1] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#E4F0F2]">
                <Bot className="h-3.5 w-3.5" /> Clinic assistant preview
              </span>
              <h2 className="mt-3 font-display text-[25px] font-medium leading-tight tracking-[-.025em] text-white sm:text-[32px]">
                Your smile deserves care that <span className="italic text-[#E4F0F2]">listens.</span>
              </h2>
              <p className="mt-2 max-w-xl text-[12px] leading-5 text-white/75 sm:text-[13px]">
                Get help finding clinic information and booking steps. Treatment questions are always for your dentist.
              </p>
            </div>

            <div className="mt-6 rounded-[15px] bg-[#154C58] p-4 sm:p-5">
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.08] px-3.5 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#E4F0F2] text-[#1F6878]"><Bot className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-white">Sri Saraswathi Assistant</p>
                  <p className="mt-0.5 text-[10px] text-[#E4F0F2]/80">Preview · clinic information and booking</p>
                </div>
                <span className="hidden rounded-full bg-white/[0.1] px-2.5 py-1 text-[9px] text-white/75 sm:inline">Sample conversation</span>
              </div>

              <div className="mt-4 space-y-3 px-1 sm:px-2">
                <div className="flex justify-end"><p className="max-w-[80%] rounded-2xl rounded-br-sm bg-white/15 px-4 py-2.5 text-[12px] leading-relaxed text-white sm:text-[13px]">How do I request an appointment?</p></div>
                <div className="flex justify-start gap-2.5">
                  <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#E4F0F2] text-[#1F6878]"><MessageCircle className="h-3 w-3" /></span>
                  <p className="max-w-[82%] rounded-2xl rounded-bl-sm bg-[#0F3841] px-4 py-2.5 text-[12px] leading-relaxed text-white/90 sm:text-[13px]">Choose a treatment and request a time online. The clinic team will review your request and confirm your visit.</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
                <p className="flex items-center gap-2 text-[10px] leading-relaxed text-white/70"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#E4F0F2]" /> Not a clinical service. Contact the clinic for care questions.</p>
                <div className="flex flex-wrap gap-2">
                  <Link to="/ai-features" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/25 px-3.5 text-[10px] font-semibold text-white transition hover:bg-white/10">Explore assistant</Link>
                  <Link to="/booking" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#E95A35] px-3.5 text-[10px] font-semibold text-white transition hover:bg-[#D14824]"><CalendarDays className="h-3.5 w-3.5" /> Book a visit</Link>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
