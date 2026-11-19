import { Stethoscope, RotateCcw, X, Sparkles, Phone } from "lucide-react";
import { useChatbot } from "./ChatbotContext";

export function ChatHeader() {
  const { settings, closeChat, startNewChat } = useChatbot();

  return (
    <div className="relative flex items-center justify-between border-b border-white/10 bg-[#1F6878] px-4 py-3 sm:px-5 sm:py-3.5 text-white shadow-sm select-none">
      <div className="flex items-center gap-3">
        {/* Assistant Avatar Badge */}
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/15 p-0.5 shadow-sm">
          <div className="grid h-full w-full place-items-center rounded-[14px] bg-[#E4F0F2]">
            <Stethoscope className="h-5 w-5 text-[#1F6878]" />
          </div>
          {/* Online green indicator dot */}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#19B987] opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#1F6878] bg-[#19B987]" />
          </span>
        </div>

        {/* Title and Status */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-sans text-[14px] font-bold tracking-tight text-white sm:text-[15px]">
              {settings?.chatbotName || "Dental Concierge AI"}
            </h3>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/15 px-2 py-0.5 text-[9.5px] font-bold text-[#E4F0F2]">
              <Sparkles className="h-2.5 w-2.5 text-[#E4F0F2]" /> 24/7
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-[#E4F0F2]/85">
            <span className="font-medium text-[#99E3EC]">Active</span>
            <span>·</span>
            <span className="truncate">Dr. Kishore Kumar's Clinic</span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <a
          href="tel:04244272494"
          title="Call Clinic Emergency Front Desk"
          className="grid h-8 w-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Call clinic"
        >
          <Phone className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={startNewChat}
          title="Restart Conversation"
          className="grid h-8 w-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Start new conversation"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={closeChat}
          title="Close Concierge"
          className="grid h-8 w-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Close assistant"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
