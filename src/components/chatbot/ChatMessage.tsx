import React from "react";
import { MessageCircle, CheckCircle2, Calendar, Phone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ChatbotMessageItem } from "@/lib/api";
import { useChatbot } from "./ChatbotContext";

function renderFormattedText(text: string) {
  // Simple, safe Markdown parser for paragraphs, bold, lists, and links
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`br-${lineIdx}`} className="h-2" />);
      return;
    }

    // Bullet points
    if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.slice(2);
      elements.push(
        <div key={`li-${lineIdx}`} className="flex items-start gap-2 my-0.5">
          <span className="text-[#99E3EC] mt-1.5">•</span>
          <span className="flex-1">{formatInline(content)}</span>
        </div>
      );
      return;
    }

    elements.push(
      <p key={`p-${lineIdx}`} className="my-1 leading-relaxed">
        {formatInline(trimmed)}
      </p>
    );
  });

  return elements;
}

function formatInline(str: string): React.ReactNode[] {
  // Regex to split on bold **text** or phone numbers
  const parts = str.split(/(\*\*[^*]+\*\*|0424\s*427\s*2494|\+91\s*93457\s*43409)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/0424\s*427\s*2494/.test(part)) {
      return (
        <a
          key={i}
          href="tel:04244272494"
          className="font-bold text-[#99E3EC] underline underline-offset-2 hover:text-white"
        >
          {part}
        </a>
      );
    }
    if (/\+91\s*93457\s*43409/.test(part)) {
      return (
        <a
          key={i}
          href="https://wa.me/919345743409"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#19B987] underline underline-offset-2 hover:text-[#99E3EC]"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ChatMessage({ message }: { message: ChatbotMessageItem }) {
  const isUser = message.role === "user";
  const { sendMessage } = useChatbot();
  const timeStr = formatTime(message.createdAt);

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[88%] sm:max-w-[82%] rounded-2xl rounded-tr-xs bg-[#154650] px-4 py-3 text-[13.5px] leading-relaxed text-white shadow-sm sm:text-[14px]">
          <p className="font-bold text-[#99E3EC]/80 text-[10px] uppercase tracking-wider mb-1">
            PATIENT
          </p>
          <p className="whitespace-pre-wrap">{message.message}</p>
          {timeStr && (
            <span className="block mt-1 text-right text-[10px] text-white/50">
              {timeStr}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Assistant Message
  const bookingResult = message.metadata?.bookingResult;
  const bookingAction = message.metadata?.bookingAction;

  return (
    <div className="flex items-start gap-2.5 sm:gap-3 animate-fade-in">
      {/* Avatar Badge matching reference image */}
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#E4F0F2] text-[#1F6878] mt-1 shadow-xs">
        <MessageCircle className="h-4 w-4" />
      </span>

      <div className="flex-1 min-w-0 max-w-[92%] sm:max-w-[85%]">
        <div className="rounded-2xl rounded-tl-xs border border-white/15 bg-[#0C2B32]/90 px-4 py-3.5 text-[13.5px] leading-relaxed text-white/95 shadow-sm sm:text-[14px]">
          <p className="font-bold text-[#99E3EC] text-[10px] uppercase tracking-wider mb-1">
            SRI SARASWATHI TEAM
          </p>

          <div className="text-[13px] sm:text-[13.5px] leading-relaxed text-white/90">
            {renderFormattedText(message.message)}
          </div>

          {/* Interactive Booking Confirmation Card */}
          {bookingResult && (
            <div className="mt-3 overflow-hidden rounded-xl border border-[#19B987]/30 bg-[#0E8A5E]/15 p-3.5 text-white">
              <div className="flex items-center gap-2 text-[#19B987]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="text-[12px] font-bold uppercase tracking-wider">
                  Booking Request Recorded
                </span>
              </div>
              <div className="mt-2 space-y-1 text-[12px] text-white/90">
                <p>
                  <span className="text-white/60">Reference:</span>{" "}
                  <strong className="text-white">{bookingResult.ref}</strong>
                </p>
                <p>
                  <span className="text-white/60">Date &amp; Time:</span>{" "}
                  <strong className="text-[#99E3EC]">
                    {bookingResult.date} at {bookingResult.time}
                  </strong>
                </p>
                <p>
                  <span className="text-white/60">Doctor:</span>{" "}
                  <strong>{bookingResult.doctorName}</strong>
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                <Link
                  to="/booking"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#E95A35] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#D14824]"
                >
                  <Calendar className="h-3.5 w-3.5" /> View Booking Portal
                </Link>
                <a
                  href="tel:04244272494"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/10"
                >
                  <Phone className="h-3.5 w-3.5" /> Call Front Desk
                </a>
              </div>
            </div>
          )}

          {/* Available Slots Chips */}
          {bookingAction?.type === "availability_preview" && bookingAction.slots?.length > 0 && (
            <div className="mt-3 rounded-xl border border-white/10 bg-[#07242A]/60 p-3">
              <p className="text-[11px] font-bold text-[#99E3EC] uppercase tracking-wider mb-2">
                Available Slots on {bookingAction.date}:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {bookingAction.slots.slice(0, 10).map((slot: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      sendMessage(`I would like to book an appointment on ${bookingAction.date} at ${slot}.`)
                    }
                    className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-[#0E8A5E] hover:border-[#19B987] active:scale-95"
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-white/60">
                Tap any time slot above to request booking directly in chat.
              </p>
            </div>
          )}

          {timeStr && (
            <span className="block mt-1.5 text-right text-[10px] text-white/40">
              {timeStr}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
