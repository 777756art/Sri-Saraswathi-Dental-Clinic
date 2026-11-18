import { useEffect, useRef } from "react";
import { useChatbot } from "./ChatbotContext";
import { ChatMessage } from "./ChatMessage";

export function ChatMessages() {
  const { messages, isLoading } = useChatbot();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#07242A] p-4 sm:p-5 space-y-4">
      {messages.map((msg, index) => (
        <ChatMessage key={msg.id ?? `msg-${index}`} message={msg} />
      ))}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
