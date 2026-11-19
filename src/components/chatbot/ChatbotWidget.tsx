import { motion, AnimatePresence } from "framer-motion";
import { useChatbot } from "./ChatbotContext";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";

export function ChatbotWidget() {
  const { isOpen, closeChat } = useChatbot();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop dim overlay to eliminate background clutter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeChat}
            className="fixed inset-0 z-45 bg-ink-950/40 backdrop-blur-xs sm:hidden"
            aria-hidden="true"
          />

          {/* Chatbot Window: Clean Bottom Sheet on Mobile, Luxury Floating Card on Desktop */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-50 flex flex-col overflow-hidden bg-white shadow-[0_24px_60px_-12px_rgba(7,59,67,0.35),0_0_0_1px_rgba(31,104,120,0.12)]
              inset-x-0 bottom-0 h-[88dvh] max-h-[88dvh] rounded-t-[28px] border-t border-[#1F6878]/15
              sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:max-w-[calc(100vw-3rem)] sm:h-[640px] sm:max-h-[82dvh] sm:rounded-[28px] sm:border sm:border-[#1F6878]/15"
            role="dialog"
            aria-label="Sri Saraswathi Dental Care AI Concierge"
          >
            {/* Mobile Sheet Pull Bar */}
            <div className="flex sm:hidden items-center justify-center pt-2 pb-1 bg-[#1F6878]">
              <span className="h-1 w-10 rounded-full bg-white/35" />
            </div>

            {/* Header */}
            <ChatHeader />

            {/* Messages list with auto-scroll */}
            <ChatMessages />

            {/* Input form with suggested question chips */}
            <ChatInput />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
