import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { useChatbot } from "./ChatbotContext";

export function ChatInput() {
  const { sendMessage, isLoading, settings, selectQuestion } = useChatbot();
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on input content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || isLoading) return;
    setDraft("");
    sendMessage(text);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = settings?.suggestedQuestions && settings.suggestedQuestions.length > 0
    ? settings.suggestedQuestions
    : [
        "What dental treatments do you offer?",
        "What is a root canal treatment?",
        "How can I book an appointment?",
        "What are your clinic timings?",
        "Where is your clinic located?",
        "What should I do if I have a toothache?",
      ];

  return (
    <div className="border-t border-[#1F6878]/15 bg-white p-3 sm:p-3.5 shadow-sm">
      {/* Quick Suggested Question Chips (Scrollable) */}
      <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#1F6878] shrink-0 pl-1">
          <Sparkles className="h-3 w-3 text-[#1F6878]" /> Quick:
        </span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => selectQuestion(q)}
            className="shrink-0 rounded-full border border-[#1F6878]/25 bg-[#F5F2EB]/60 px-3 py-1 text-[11.5px] font-semibold text-[#1F6878] shadow-2xs transition hover:bg-[#1F6878] hover:text-white disabled:opacity-50 active:scale-95"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Typing indicator banner if assistant is thinking */}
      {isLoading && (
        <div className="mb-2 flex items-center gap-2 text-[11.5px] font-medium text-[#1F6878]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Dental Concierge is consulting clinical guidelines...</span>
        </div>
      )}

      {/* Input row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-end gap-2"
      >
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            disabled={isLoading}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Dr. Kishore's team about treatments, visits, pain..."
            className="w-full resize-none rounded-2xl border border-[#1F6878]/25 bg-[#F5F2EB]/40 px-4 py-2.5 text-[13.5px] text-[#15191B] placeholder:text-[#707574] focus:bg-white focus:border-[#1F6878] focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20 disabled:opacity-60 transition"
            style={{ maxHeight: "110px" }}
          />
        </div>

        <button
          type="submit"
          disabled={!draft.trim() || isLoading}
          aria-label="Send message"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#E95A35] hover:bg-[#D14824] text-white shadow-sm transition active:scale-95 disabled:opacity-35 disabled:pointer-events-none"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Send className="h-4 w-4 text-white" />
          )}
        </button>
      </form>

      <p className="mt-2 text-center text-[10.5px] text-[#707574]">
        AI concierge provides general dental guidance. Non-diagnostic · In-clinic consultation required.
      </p>
    </div>
  );
}
