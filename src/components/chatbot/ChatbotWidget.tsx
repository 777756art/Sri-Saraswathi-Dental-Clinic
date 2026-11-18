import { motion, AnimatePresence } from "framer-motion";
import { useChatbot } from "./ChatbotContext";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";

export function ChatbotWidget() {
  const { isOpen } = useChatbot();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col overflow-hidden rounded-[26px] border border-white/15 bg-[#0B2024] shadow-[0_25px_60px_-15px_rgba(7,59,67,0.7)] text-white w-[calc(100vw-2rem)] sm:w-[440px] max-w-[440px] h-[calc(100dvh-5rem)] sm:h-[640px] max-h-[85dvh]"
          role="dialog"
          aria-label="Dental Care Assistant Chat"
        >
          {/* Header */}
          <ChatHeader />

          {/* Messages list with auto-scroll */}
          <ChatMessages />

          {/* Input form with suggested question chips */}
          <ChatInput />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
