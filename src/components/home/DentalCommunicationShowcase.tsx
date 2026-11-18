import { Link } from "react-router-dom";
import { ArrowRight, Bot, CalendarDays, CheckCircle2, MessageCircle, ShieldCheck, Sparkles, Send } from "lucide-react";
import { useChatbot } from "@/components/chatbot/ChatbotContext";

export function DentalCommunicationShowcase() {
  const { openChat, selectQuestion } = useChatbot();

  const previewQuestions = [
    "What dental treatments do you offer?",
    "What is a root canal treatment?",
    "How can I book an appointment?",
    "What are your clinic timings?",
    "What should I do if I have a toothache?",
  ];

  return (
    <section className="bg-[#1F6878] px-4 py-16 sm:py-20 lg:py-24 text-white" aria-label="OpenAI Dental Assistant Showcase">
      <div className="container-x">
        {/* Centered Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#0E8A5E] bg-[#0E8A5E] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(14,138,94,0.6)]">
            <Sparkles className="h-3.5 w-3.5 text-white" /> OpenAI AI Dental Assistant
          </span>
          <h2 className="mt-3 font-sans text-[32px] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[42px]">
            Care That Listens. <span className="text-[#E4F0F2]">AI Guidance You Can Trust.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed text-[#E4F0F2]/80">
            Intelligent, friendly dental guidance available 24/7. Ask questions about treatments, explore symptoms, and schedule appointments with Dr. Kishore Kumar.
          </p>
        </div>

        {/* Center Deep Teal Showcase Card */}
        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-[26px] border border-white/15 bg-[#154C58] shadow-[0_28px_65px_-30px_rgba(15,56,65,0.85)]">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/15 bg-white/[0.05] px-5 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/15 text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13px] font-bold text-white">Dental Care Assistant</p>
                <p className="text-[10px] text-[#E4F0F2] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#19B987] animate-pulse" /> Live Patient Support · Powered by OpenAI
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openChat()}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-white transition hover:bg-[#0E8A5E] hover:border-[#19B987]"
            >
              <Bot className="h-3 w-3" /> Chat Live
            </button>
          </div>

          {/* Dialogue Presentation matching user reference screenshot */}
          <div className="space-y-4 p-4 sm:p-7">
            {/* Patient Message */}
            <div className="flex justify-end">
              <div className="max-w-[90%] sm:max-w-[85%] rounded-2xl rounded-tr-sm bg-[#133F49] px-4 py-3 text-[13px] leading-relaxed text-white shadow-sm sm:text-[14px]">
                <p className="font-semibold text-[#99E3EC]/80 text-[10px] uppercase tracking-wider mb-1">PATIENT</p>
                I have tooth sensitivity while drinking cold water. How do I request an appointment with Dr. Kishore?
              </div>
            </div>

            {/* Clinic Assistant Response */}
            <div className="flex items-start gap-2.5 sm:gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#E4F0F2] text-[#1F6878] mt-1 shadow-xs">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0 max-w-[90%] sm:max-w-[85%] rounded-2xl rounded-tl-sm border border-white/15 bg-[#0F3841]/85 px-4 py-3.5 text-[13px] leading-relaxed text-white/95 shadow-sm sm:text-[14px]">
                <p className="font-semibold text-[#99E3EC] text-[10px] uppercase tracking-wider mb-1">SRI SARASWATHI TEAM</p>
                <p>
                  Tooth sensitivity can often be treated promptly with a gentle check-up and digital exam. Dr. Kishore Kumar evaluates the enamel and gums to provide clear relief.
                </p>
                <p className="mt-2 text-[12px] text-[#E4F0F2]/85">
                  You can select a convenient 30-minute slot online right now, or call the desk at <a href="tel:04244272494" className="font-bold text-white underline underline-offset-2 hover:text-[#99E3EC]">0424 427 2494</a>.
                </p>
              </div>
            </div>
          </div>

          {/* Quick interactive questions */}
          <div className="border-t border-white/10 bg-[#0B2A31]/50 px-4 py-3 sm:px-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#99E3EC] mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Try asking our AI Assistant:
            </p>
            <div className="flex flex-wrap gap-2">
              {previewQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectQuestion(q)}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-[#0E8A5E] hover:border-[#19B987] active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 bg-white/[0.02] px-5 py-4 sm:px-6">
            <p className="flex items-center gap-2 text-[11px] text-[#E4F0F2]/65">
              <ShieldCheck className="h-3.5 w-3.5 text-[#E4F0F2]" /> Non-diagnostic AI assistant. Chairside examination is always required for dental care.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => openChat()}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/25 px-4 text-[11.5px] font-bold text-white transition hover:bg-white/10"
              >
                <Bot className="h-3.5 w-3.5" /> Open Chatbot
              </button>
              <Link
                to="/booking"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#E95A35] px-4.5 text-[11.5px] font-bold text-white shadow-md transition hover:bg-[#D14824]"
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
