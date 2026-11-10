import { Link } from "react-router-dom";
import { ArrowRight, Bot, CalendarDays, CheckCircle2, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";

export function DentalCommunicationShowcase() {
  return (
    <section className="bg-[#121920] px-4 py-16 sm:py-20 lg:py-24 text-white" aria-label="Dental Communication and Information Showcase">
      <div className="container-x">
        {/* Centered Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#a3d8c9]">
            <Sparkles className="h-3.5 w-3.5" /> Care & Communication Flow
          </span>
          <h2 className="mt-3 font-sans text-[32px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[42px]">
            Care That Listens. <span className="text-[#a3d8c9]">Guidance You Can Trust.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed text-white/70">
            Clear communication at every stage of your visit. Get immediate assistance with clinic hours, treatments, and online appointment scheduling.
          </p>
        </div>

        {/* Center Dark UI Showcase Card */}
        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-[26px] border border-white/15 bg-[#1a232c] shadow-[0_28px_65px_-30px_rgba(0,0,0,0.8)]">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-5 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0e8a5e] text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13px] font-bold text-white">Sri Saraswathi Clinic Assistant</p>
                <p className="text-[10px] text-[#a3d8c9] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0e8a5e] animate-pulse" /> Live Patient Support Preview
                </p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] text-white/60">
              Surampatti, Erode
            </span>
          </div>

          {/* Dialogue Presentation */}
          <div className="space-y-4 p-5 sm:p-7">
            {/* Patient Message */}
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#2b3744] px-4.5 py-3 text-[13px] leading-relaxed text-white shadow-sm sm:text-[14px]">
                <p className="font-semibold text-white/50 text-[10px] uppercase tracking-wider mb-1">Patient</p>
                I have tooth sensitivity while drinking cold water. How do I request an appointment with Dr. Kishore?
              </div>
            </div>

            {/* Clinic Assistant Response */}
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#0e8a5e] text-white mt-1">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#0e8a5e]/30 bg-[#162e2c] px-4.5 py-3.5 text-[13px] leading-relaxed text-white/90 shadow-sm sm:text-[14px]">
                <p className="font-semibold text-[#a3d8c9] text-[10px] uppercase tracking-wider mb-1">Sri Saraswathi Team</p>
                <p>
                  Tooth sensitivity can often be treated promptly with a gentle check-up and digital exam. Dr. Kishore Kumar evaluates the enamel and gums to provide clear relief.
                </p>
                <p className="mt-2 text-[12px] text-white/75">
                  You can select a convenient 30-minute slot online right now, or call the desk at <span className="font-bold text-white">0424 427 2494</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 bg-white/[0.02] px-5 py-4 sm:px-6">
            <p className="flex items-center gap-2 text-[11px] text-white/50">
              <ShieldCheck className="h-3.5 w-3.5 text-[#a3d8c9]" /> Non-diagnostic assistant. Clinical evaluation is always chairside.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/ai-features"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 px-4 text-[11px] font-bold text-white transition hover:bg-white/10"
              >
                Learn More
              </Link>
              <Link
                to="/booking"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#ed2f79] px-4.5 text-[11px] font-bold text-white shadow-md transition hover:bg-[#d91d68]"
              >
                <CalendarDays className="h-3.5 w-3.5" /> Book Your Visit
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
