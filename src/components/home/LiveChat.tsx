"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot } from "lucide-react";

type ChatMessage = { role: "bot" | "user"; text: string };

function clinicHelpReply(question: string) {
  const value = question.toLowerCase();
  if (/urgent|emergency|pain|swollen|bleed|injur/.test(value)) {
    return "For an urgent dental concern, please call the clinic at 0424 427 2494 to discuss current availability. I can’t assess symptoms. For a life-threatening emergency, contact local emergency services.";
  }
  if (/book|appointment|visit|slot|time/.test(value)) {
    return "Use Book a Visit to send your preferred treatment and time. The clinic team will review availability and confirm the appointment.";
  }
  if (/where|address|location|directions/.test(value)) {
    return "Sri Saraswathi Dental Clinic is at 866, Soli Complex, Surampatti Four Road, Erode, Tamil Nadu 638009. Open the Contact page for the map.";
  }
  if (/hour|open|close|sunday/.test(value)) {
    return "The listed hours are Monday–Saturday, 9:00 AM–8:45 PM, with Sunday emergency visits by arrangement. Please call to confirm before travelling.";
  }
  if (/treatment|service|tooth|implant|clean|braces|whiten/.test(value)) {
    return "You can browse the treatments page for clinic-published information. A dentist can explain which options suit you after an assessment.";
  }
  if (/contact|phone|call|email/.test(value)) {
    return "Call the clinic at 0424 427 2494, or open the Contact page to send an enquiry and view the address.";
  }
  return "I can help with clinic information, booking steps, opening hours and the address. For a personal or clinical question, call the clinic or use the Contact page.";
}

export function LiveChat() {
  const [open, setOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hello. I can point you to clinic information and booking steps." },
    { role: "bot", text: "This helper is not monitored by clinic staff and cannot assess symptoms." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setShowQuickActions(window.scrollY > 700);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && open) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setDraft("");
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "bot", text: clinicHelpReply(text) }]);
    }, 350);
  };

  return (
    <>
      {showQuickActions && <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-3">
        <a
          href="https://wa.me/919345743409"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
          title="WhatsApp"
        >
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
        <button
          onClick={() => setOpen(!open)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-950 text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
          title="Live Chat"
        >
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      </div>}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-[11.5rem] right-6 z-40 min-w-0 w-[calc(100dvw-3rem)] overflow-hidden rounded-3xl border border-border/70 bg-card shadow-lift sm:w-96"
          >
            <div className="flex items-center gap-3 bg-ink-950 px-5 py-4 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Clinic information</p>
                <p className="text-[11px] text-white/55">Automated helper · not live monitored</p>
              </div>
            </div>
            <div ref={scrollRef} className="h-72 space-y-3 overflow-y-auto bg-secondary-50/60 p-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md border border-border/70 bg-card text-card-foreground"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="border-t border-border/70 p-3">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  aria-label="Ask about clinic information"
                  placeholder="Type your message..."
                  className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-800"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
