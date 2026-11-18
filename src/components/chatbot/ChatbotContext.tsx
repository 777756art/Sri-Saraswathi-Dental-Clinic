import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { chatbotApi, type PublicChatbotSettings, type ChatbotMessageItem } from "@/lib/api";

type ChatbotContextType = {
  isOpen: boolean;
  openChat: (initialQuery?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
  messages: ChatbotMessageItem[];
  isLoading: boolean;
  settings: PublicChatbotSettings | null;
  sendMessage: (text: string) => Promise<void>;
  startNewChat: () => void;
  selectQuestion: (question: string) => Promise<void>;
  submitBookingFromChat: (data: {
    patientName: string;
    phone: string;
    date: string;
    time: string;
    treatmentId?: number;
    notes?: string;
  }) => Promise<void>;
};

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = "ssd_chat_session_id";

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<PublicChatbotSettings | null>(null);
  const [messages, setMessages] = useState<ChatbotMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });

  const initializedRef = useRef(false);

  // Load public chatbot settings on mount
  useEffect(() => {
    let active = true;
    chatbotApi.getSettings()
      .then((data) => {
        if (!active) return;
        setSettings(data);
      })
      .catch((err) => {
        console.warn("Failed to load chatbot settings:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Rehydrate existing session history or set welcome message
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (sessionId) {
      chatbotApi.getHistory(sessionId)
        .then((res) => {
          if (res.messages && res.messages.length > 0) {
            setMessages(res.messages);
          } else {
            initWelcomeMessage();
          }
        })
        .catch(() => {
          initWelcomeMessage();
        });
    } else {
      initWelcomeMessage();
    }
  }, [sessionId, settings?.welcomeMessage]);

  const initWelcomeMessage = useCallback(() => {
    const welcome =
      settings?.welcomeMessage ||
      "Hello! 👋 Welcome to Sreesaraswathi Dental Clinic.\n\nI'm your AI Dental Assistant. I can help you explore our dental treatments, understand our clinic services, and guide you through appointment booking.\n\nHow can I help you today?";

    setMessages([
      {
        role: "assistant",
        message: welcome,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [settings?.welcomeMessage]);

  const startNewChat = useCallback(() => {
    const newId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, newId);
    } catch {
      // ignore
    }
    setSessionId(newId);
    initWelcomeMessage();
  }, [initWelcomeMessage]);

  const sendMessage = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || isLoading) return;

      let currentSession = sessionId;
      if (!currentSession) {
        currentSession = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        try {
          localStorage.setItem(SESSION_STORAGE_KEY, currentSession);
        } catch {
          // ignore
        }
        setSessionId(currentSession);
      }

      // Add user message optimistically
      const userMsg: ChatbotMessageItem = {
        role: "user",
        message: clean,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const res = await chatbotApi.sendMessage({
          message: clean,
          sessionId: currentSession,
        });

        if (res.sessionId && res.sessionId !== currentSession) {
          setSessionId(res.sessionId);
          try {
            localStorage.setItem(SESSION_STORAGE_KEY, res.sessionId);
          } catch {
            // ignore
          }
        }

        const assistantMsg: ChatbotMessageItem = {
          role: "assistant",
          message: res.reply,
          metadata: {
            bookingResult: res.bookingResult,
            bookingAction: res.bookingAction,
          },
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        const fallbackMsg: ChatbotMessageItem = {
          role: "assistant",
          message:
            "I apologize, but our connection was briefly interrupted. For immediate help, please call our clinic desk at **0424 427 2494** or WhatsApp us at **+91 93457 43409**.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, isLoading]
  );

  const selectQuestion = useCallback(
    async (question: string) => {
      if (!isOpen) setIsOpen(true);
      await sendMessage(question);
    },
    [isOpen, sendMessage]
  );

  const submitBookingFromChat = useCallback(
    async (data: {
      patientName: string;
      phone: string;
      date: string;
      time: string;
      treatmentId?: number;
      notes?: string;
    }) => {
      setIsLoading(true);
      try {
        const res = await chatbotApi.submitBooking({
          ...data,
          sessionId,
        });
        if (res.booking) {
          const confirmMsg: ChatbotMessageItem = {
            role: "assistant",
            message: `✅ **Appointment Requested Successfully!**\n\nReference: **${res.booking.ref}**\nPatient: **${res.booking.patientName}**\nDate: **${res.booking.date}** at **${res.booking.time}**\n\nOur clinic team will confirm your slot promptly with WhatsApp notifications.`,
            metadata: { bookingResult: res.booking },
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, confirmMsg]);
        }
      } catch (err: any) {
        const errorMsg: ChatbotMessageItem = {
          role: "assistant",
          message: `⚠️ Could not complete your booking: ${err?.message || "Please check details and try again or call 0424 427 2494."}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  const openChat = useCallback(
    (initialQuery?: string) => {
      setIsOpen(true);
      if (initialQuery) {
        setTimeout(() => {
          sendMessage(initialQuery);
        }, 300);
      }
    },
    [sendMessage]
  );

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <ChatbotContext.Provider
      value={{
        isOpen,
        openChat,
        closeChat,
        toggleChat,
        messages,
        isLoading,
        settings,
        sendMessage,
        startNewChat,
        selectQuestion,
        submitBookingFromChat,
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error("useChatbot must be used within a ChatbotProvider");
  }
  return context;
}
