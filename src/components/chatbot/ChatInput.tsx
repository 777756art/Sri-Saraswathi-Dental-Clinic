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
    <div className="border-t border-white/10 bg-[#073B43]/95 backdrop-blur-md p-3 sm:p-4">
      {/* Quick Suggested Question Chips (Scrollable) */}
      <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#99E3EC] shrink-0 pl-1">
          <Sparkles className="h-3 w-3" /> Quick:
        </span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => selectQuestion(q)}
            className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11.5px] font-medium text-[#E4F0F2] transition hover:bg-[#0E8A5E] hover:border-[#19B987] hover:text-white disabled:opacity-50 active:scale-95"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Typing indicator banner if assistant is thinking */}
      {isLoading && (
        <div className="mb-2 flex items-center gap-2 text-[11.5px] text-[#99E3EC]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Dental Care Assistant is thinking...</span>
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
            placeholder="Ask about treatments, pain, clinic hours, or booking..."
            className="w-full resize-none rounded-2xl border border-white/20 bg-[#0B252B] px-4 py-2.5 text-[13.5px] text-white placeholder:text-[#E4F0F2]/50 focus:border-[#19B987] focus:outline-none focus:ring-2 focus:ring-[#19B987]/25 disabled:opacity-60 transition"
            style={{ maxHeight: "120px" }}
          />
        </div>

        <button
          type="submit"
          disabled={!draft.trim() || isLoading}
          aria-label="Send message"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#0E8A5E] to-[#19B987] text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Send className="h-4 w-4 text-white" />
          )}
        </button>
      </form>

      <p className="mt-2 text-center text-[10px] text-white/50">
        AI assistant provides general clinic information. Non-diagnostic · Chairside exams by Dr. Kishore Kumar.
      </p>
    </div>
  );
}
