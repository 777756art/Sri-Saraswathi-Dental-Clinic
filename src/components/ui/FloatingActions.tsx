"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Bot, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatbot } from "@/components/chatbot/ChatbotContext";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";

export function FloatingActions() {
  const [scrolled, setScrolled] = useState(false);
  const { isOpen, toggleChat } = useChatbot();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 300);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Unified Floating Actions Stack - Single Container guarantees ZERO overlapping */}
      <div
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2.5 pointer-events-none select-none transition-all duration-200 ${
          isOpen ? "hidden sm:flex" : "flex"
        }`}
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

        {/* 2. OpenAI AI Dental Assistant Chat Toggle (Teal) */}
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={toggleChat}
            className={`flex h-12 w-12 sm:h-auto sm:w-auto items-center justify-center sm:gap-2 rounded-full text-white shadow-[0_10px_24px_-10px_rgba(7,59,67,0.7)] transition-all hover:-translate-y-0.5 active:translate-y-0 ${
              isOpen
                ? "bg-[#D14824] hover:bg-[#B33B1C] sm:px-4 sm:py-2.5"
                : "bg-gradient-to-r from-[#073B43] to-[#0E8A5E] hover:brightness-110 sm:px-4 sm:py-2.5"
            }`}
            title={isOpen ? "Close Dental Assistant" : "Ask AI Dental Assistant"}
            aria-label="Toggle Dental Assistant Chat"
          >
            {isOpen ? (
              <X className="h-5 w-5 sm:h-4 sm:w-4 shrink-0" />
            ) : (
              <div className="relative">
                <Bot className="h-5 w-5 sm:h-4 sm:w-4 shrink-0" />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#19B987] animate-pulse" />
              </div>
            )}
            <span className="hidden sm:inline font-sans text-[12.5px] font-bold">
              {isOpen ? "Close" : "AI Assistant"}
            </span>
          </button>
        </div>

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

      {/* OpenAI AI Dental Care Assistant Floating Window */}
      <ChatbotWidget />
    </>
  );
}
