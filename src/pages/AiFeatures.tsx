import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  Brain,
  Clock,
  FileText,
  MessageSquareText,
  Mic,
  ScanLine,
  Send,
  ShieldCheck,
  Smile,
} from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/animations/ScrollReveal";
import { cn } from "@/lib/utils";

const aiFeatures = [
  { icon: Bot, title: "Dental care assistant", description: "Get help with clinic information, common questions and the next step to book a visit." },
  { icon: Brain, title: "Smart visit preparation", description: "Organise your questions before an appointment so you can make the most of your time." },
  { icon: FileText, title: "Treatment plan notes", description: "Keep options, visit notes and next steps clear for a conversation with your dentist." },
  { icon: ScanLine, title: "Imaging support", description: "Store images for your care team to review. Your dentist explains every clinical finding." },
  { icon: Smile, title: "Smile planning", description: "Collect inspiration and describe the changes you would like to discuss with your dentist." },
  { icon: Mic, title: "Voice-to-notes", description: "Capture questions hands-free, then review and confirm your notes before sharing them." },
  { icon: Clock, title: "Follow-up reminders", description: "Keep upcoming visits and the instructions from your care team easy to find." },
  { icon: ShieldCheck, title: "Privacy & review", description: "Personal information and care decisions stay under the clinic team's supervision." },
];

const quickQuestions = [
  "How do I book a visit?",
  "What should I bring to my appointment?",
  "Can I ask about treatment options?",
  "How can I contact the clinic?",
  "I have an urgent dental concern",
];

const demoResponses: Record<string, string> = {
  "How do I book a visit?": "Choose Book a Visit in the menu to send an appointment request. The clinic team will follow up to confirm a suitable time.",
  "What should I bring to my appointment?": "Bring any previous dental records or images you have, and a list of medicines and questions you would like to discuss. Call the clinic if you need visit-specific guidance.",
  "Can I ask about treatment options?": "Of course. Your dentist can explain suitable options, expected steps and fees after assessing your needs in person.",
  "How can I contact the clinic?": "Use the Contact page to find the clinic's current phone number, address and opening hours.",
  "I have an urgent dental concern": "This demo cannot assess urgent symptoms. Please call the clinic directly; for a severe or life-threatening emergency, contact local emergency services now.",
};

export default function AIFeaturesPage() {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hello. I can help with clinic information and booking steps. For symptoms or treatment decisions, please speak directly with your dentist." },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    setTimeout(() => {
      const matchedQuestion = Object.keys(demoResponses).find(
        (q) => q.toLowerCase() === userMsg.toLowerCase()
      );
      const matchedKey = Object.keys(demoResponses).find((q) => userMsg.toLowerCase().includes(q.toLowerCase()));
      const response = matchedQuestion
        ? demoResponses[matchedQuestion]
        : matchedKey
          ? demoResponses[matchedKey]
          : "This sample assistant cannot assess individual symptoms. Please contact the clinic to discuss your question with the care team.";
      setChatMessages((prev) => [...prev, { role: "ai", text: response }]);
      setChatLoading(false);
    }, 1000);
  };

  const askQuick = (q: string) => {
    setChatMessages((prev) => [...prev, { role: "user", text: q }]);
    setChatLoading(true);
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { role: "ai", text: demoResponses[q] || "Let me look that up for you…" },
      ]);
      setChatLoading(false);
    }, 800);
  };

  return (
    <main className="min-h-screen bg-white">
      <section className="px-4 pb-8 pt-[118px] sm:pb-10 sm:pt-[156px] lg:pb-16">
        <div className="container-x">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-[650px]">
              <span className="eyebrow"><span className="eyebrow-dot" /> What&apos;s inside</span>
              <h1 className="mt-4 font-sans text-[34px] font-bold leading-[1.12] tracking-[-.04em] text-[#17282c] sm:text-[46px]">
                The operating system<br className="hidden sm:block" /> behind your <span className="text-[#ed2f79]">care</span>
              </h1>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ece8e3] bg-white px-3.5 py-2 text-[10px] font-medium text-[#6c7880] shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-[#ed2f79]" /> Clinic-reviewed preview
            </span>
          </div>

          <StaggerContainer className="mt-12 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {aiFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <StaggerItem key={feature.title}>
                  <article className="group h-full min-h-[175px] rounded-[18px] border border-[#f0eeeb] bg-white p-5 shadow-[0_10px_25px_-20px_rgba(20,40,50,.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_15px_30px_-20px_rgba(20,40,50,.42)] lg:min-h-[200px]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#edf6f8] text-[#337d98] transition-colors group-hover:bg-[#e5f4f1] group-hover:text-[#15816f]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h2 className="mt-3 font-display text-[15px] font-semibold leading-snug text-[#24383d]">{feature.title}</h2>
                    <p className="mt-1.5 text-[11px] leading-[1.65] text-[#7c858b]">{feature.description}</p>
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      <section id="demo" className="px-4 pb-16 pt-5 sm:pb-24 sm:pt-7">
        <div className="container-x">
          <ScrollReveal>
            <div className="rounded-[18px] bg-[#242424] p-5 text-white shadow-[0_22px_55px_-38px_rgba(0,0,0,.55)] sm:p-8 lg:p-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#b8d9d0]">
                <Bot className="h-3.5 w-3.5" /> Clinic assistant preview
              </span>
              <h2 className="mt-3 font-display text-[24px] font-medium leading-tight tracking-[-.025em] text-white sm:text-[30px]">
                Your smile deserves care that <span className="italic text-[#a3d8c9]">listens.</span>
              </h2>
              <p className="mt-2 max-w-xl text-[12px] leading-5 text-white/55 sm:text-[13px]">
                Replies in this sample are pre-written for clinic information and booking. They do not diagnose or recommend treatment.
              </p>

              <div className="mt-5 overflow-hidden rounded-[15px] bg-[#303030] p-4 sm:p-5">
                <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3.5 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#bcefe0] text-[#214841]"><Bot className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-white">Aura · Sri Saraswathi care assistant</p>
                  <p className="mt-0.5 text-[10px] text-[#a4c8bf]">Clinic information · care team review</p>
                  </div>
                  <span className="hidden rounded-full bg-white/[0.08] px-2.5 py-1 text-[9px] text-white/55 sm:inline">Clinic information</span>
                </div>

                <div ref={scrollRef} className="mt-3 h-[460px] space-y-3 overflow-y-auto p-1 sm:h-[560px] sm:p-2">
                  {chatMessages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-[12px] leading-relaxed sm:text-[13px]", msg.role === "user" ? "rounded-br-sm bg-[#596361] text-white" : "rounded-bl-sm bg-[#163a37] text-white/85")}>
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                  {chatLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-sm bg-[#163a37] px-4 py-3"><div className="flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/65" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/35 [animation-delay:240ms]" /></div></div>
                    </motion.div>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {quickQuestions.map((q) => (
                    <button key={q} type="button" onClick={() => askQuick(q)} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] text-white/70 transition hover:border-[#a3d8c9]/50 hover:text-white">{q}</button>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] p-1.5 pl-4">
                  <MessageSquareText className="h-4 w-4 shrink-0 text-white/45" />
                  <input type="text" value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSendMessage()} placeholder="Ask about the clinic or booking…" className="min-w-0 flex-1 bg-transparent py-1.5 text-[12px] text-white placeholder:text-white/40 focus:outline-none" />
                  <button type="button" onClick={handleSendMessage} disabled={!chatInput.trim()} aria-label="Send message" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#bcefe0] text-[#214841] transition hover:bg-white disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-white/45"><AlertTriangle className="mr-1 inline h-3 w-3 text-[#e9c786]" />This preview is not a clinical service. For symptoms or urgent concerns, contact the clinic directly.</p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
