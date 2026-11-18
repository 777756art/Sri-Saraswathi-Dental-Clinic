"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, MessageCircle, X, Send, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type ChatMessage = { role: "bot" | "user"; text: string };

function clinicHelpReply(question: string) {
  const value = question.toLowerCase();
  if (/urgent|emergency|pain|swollen|bleed|injur/.test(value)) {
    return "For an urgent dental concern, please call the clinic directly at 0424 427 2494 to discuss emergency slot availability. For a life-threatening emergency, please visit the nearest hospital emergency room.";
  }
  if (/book|appointment|visit|slot|time/.test(value)) {
    return "You can use our online Booking page to choose your doctor, treatment, and live IST time slot. Our clinic team confirms appointments promptly with automated WhatsApp updates.";
  }
  if (/where|address|location|directions/.test(value)) {
    return "Sri Saraswathi Dental Clinic is located at 866, Soli Complex, Surampatti Four Road, Erode, Tamil Nadu 638009. Google Maps directions are available on our Contact page.";
  }
  if (/hour|open|close|sunday/.test(value)) {
    return "Our regular clinic hours are Monday to Saturday, 9:00 AM – 8:45 PM. Sundays are reserved for scheduled emergency visits. Please call 0424 427 2494 before travelling.";
  }
  if (/treatment|service|tooth|implant|clean|braces|whiten|root canal/.test(value)) {
    return "We offer comprehensive treatments including Root Canals, Dental Implants, Orthodontic Braces, Laser Dentistry, Smile Design, and Children's Dentistry. Visit our Treatments page for full details.";
  }
  if (/contact|phone|call|email|whatsapp/.test(value)) {
    return "Call our clinic desk at 0424 427 2494 or WhatsApp us at +91 93457 43409 for quick enquiries.";
  }
  return "I can answer questions regarding clinic hours, address, treatments, and booking steps. For personal medical diagnosis or urgent appointments, please call 0424 427 2494 or WhatsApp our team.";
}

export function FloatingActions() {
  const [scrolled, setScrolled] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hello! Welcome to Sri Saraswathi Dental Clinic." },
    { role: "bot", text: "How can we assist your smile today? You can ask about treatments, clinic hours, or directions." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 400);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && chatOpen) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, chatOpen]);

  const handleSendMessage = () => {
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
      {/* Unified Floating Actions Stack - Single Container guarantees ZERO overlapping */}
      <div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2.5 pointer-events-none"
        aria-label="Quick contact actions"
      >
        {/* 1. Emergency Action Button (Orange) - Smoothly revealed when scrolled */}
        <AnimatePresence>
          {scrolled && (
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="pointer-events-auto"
            >
              <Link
                to="/emergency"
                className="group flex h-11 w-11 sm:h-auto sm:w-auto items-center justify-center sm:gap-2 rounded-full bg-[#E95A35] sm:px-4 sm:py-2.5 text-white shadow-[0_10px_24px_-10px_rgba(233,90,53,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#D14824] active:translate-y-0"
                title="Emergency Dental Care"
                aria-label="Emergency dental care"
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline font-sans text-[12.5px] font-bold">Emergency</span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Clinic FAQ Assistant Chat Toggle (Teal) - Revealed when scrolled */}
        <AnimatePresence>
          {scrolled && (
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 10 }}
              transition={{ duration: 0.22, ease: "easeOut", delay: 0.05 }}
              className="pointer-events-auto"
            >
              <button
                type="button"
                onClick={() => setChatOpen(!chatOpen)}
                className="flex h-11 w-11 sm:h-auto sm:w-auto items-center justify-center sm:gap-2 rounded-full bg-[#1F6878] sm:px-4 sm:py-2.5 text-white shadow-[0_10px_24px_-10px_rgba(31,104,120,0.65)] transition-all hover:-translate-y-0.5 hover:bg-[#185360] active:translate-y-0"
                title={chatOpen ? "Close Assistant" : "Clinic Assistant"}
                aria-label="Toggle Clinic Assistant Chat"
              >
                {chatOpen ? <X className="h-4 w-4 shrink-0" /> : <Bot className="h-4 w-4 shrink-0" />}
                <span className="hidden sm:inline font-sans text-[12.5px] font-bold">
                  {chatOpen ? "Close" : "Assistant"}
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Primary WhatsApp Action Button (Green) - Always easily accessible */}
        <div className="pointer-events-auto">
          <a
            href="https://wa.me/919345743409?text=Hello%20Sri%20Saraswathi%20Dental%20Clinic%2C%20I%20have%20a%20question%20about%20a%20visit."
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-12 w-12 sm:h-auto sm:w-auto items-center justify-center sm:gap-2.5 rounded-full bg-[#19B987] sm:px-4 sm:py-2.5 text-white shadow-[0_12px_28px_-10px_rgba(25,185,135,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#139A70] hover:shadow-[0_16px_32px_-8px_rgba(25,185,135,0.7)] active:translate-y-0"
            title="Chat with Clinic on WhatsApp"
            aria-label="Chat with Sri Saraswathi Dental Clinic on WhatsApp"
          >
            <svg
              className="h-6 w-6 sm:h-5 sm:w-5 shrink-0 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span className="hidden sm:inline font-sans text-[12.5px] font-bold tracking-wide">
              WhatsApp
            </span>
          </a>
        </div>
      </div>

      {/* Interactive Chat Assistant Modal Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-[#1F6878]/25 bg-white shadow-2xl pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-[#1F6878] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-[#E4F0F2]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-bold leading-tight">Sri Saraswathi Assistant</p>
                  <p className="text-[11px] text-[#E4F0F2]/80">Instant Clinic Information &amp; FAQ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label="Close assistant"
                className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Conversation */}
            <div ref={scrollRef} className="h-72 space-y-3 overflow-y-auto bg-[#F5F2EB] p-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-xs ${
                    msg.role === "user"
                      ? "ml-auto rounded-br-md bg-[#1F6878] text-white"
                      : "rounded-bl-md border border-[#dce4e5] bg-white text-[#15191B]"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Text Input Form */}
            <div className="border-t border-[#dce4e5] bg-white p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 rounded-full border border-[#dce4e5] bg-[#F5F2EB] px-4 py-2.5 text-[13px] text-[#15191B] placeholder:text-[#707574] focus:border-[#1F6878] focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E95A35] text-white shadow-sm transition hover:bg-[#D14824]"
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
