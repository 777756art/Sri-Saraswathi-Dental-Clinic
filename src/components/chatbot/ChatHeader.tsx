import { Bot, RotateCcw, X, Sparkles } from "lucide-react";
import { useChatbot } from "./ChatbotContext";

export function ChatHeader() {
  const { settings, closeChat, startNewChat } = useChatbot();

  return (
    <div className="relative flex items-center justify-between border-b border-white/10 bg-[#073B43] px-4 py-3.5 sm:px-5 sm:py-4 text-white shadow-md select-none">
      <div className="flex items-center gap-3">
        {/* Assistant Avatar Badge */}
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#0E8A5E] to-[#1F6878] p-0.5 shadow-md">
          <div className="grid h-full w-full place-items-center rounded-[14px] bg-[#073B43]">
            <Bot className="h-5 w-5 text-[#99E3EC]" />
          </div>
          {/* Online green indicator dot */}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#19B987] opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#073B43] bg-[#19B987]" />
          </span>
        </div>

        {/* Title and Status */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-sans text-[14px] font-bold tracking-tight text-white sm:text-[15px]">
              {settings?.chatbotName || "Dental Care Assistant"}
            </h3>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#0E8A5E]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#99E3EC]">
              <Sparkles className="h-2.5 w-2.5" /> AI
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-[#E4F0F2]/80">
            <span>Online</span>
            <span>·</span>
            <span className="truncate">Sreesaraswathi Dental Care</span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={startNewChat}
          title="Start a new conversation"
          className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Start new conversation"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={closeChat}
          title="Minimize Assistant"
          className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Close assistant"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
