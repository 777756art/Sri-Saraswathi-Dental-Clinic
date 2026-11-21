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

/**
 * Robust client-side dental assistant knowledge base.
 * Guarantees that patients receive immediate, helpful, medically-grounded answers
 * even during serverless cold starts, offline mode, or temporary network drops.
 */
function generateClientDentalAssistantReply(userQuery: string): string {
  const msg = (userQuery || "").toLowerCase();

  // 1. Severe Pain / Emergency / Urgent symptoms
  if (/(severe\s+pain|emergency|bleeding|swelling|fever|swollen|broken\s+tooth|accident|urgent|extreme\s+pain)/i.test(msg)) {
    return (
      `I'm sorry to hear you're experiencing pain or discomfort. For urgent dental concerns or severe pain, please call our clinic desk immediately at **0424 427 2494** or WhatsApp **+91 98657 53494**.\n\n` +
      `Our team will prioritize an emergency evaluation with Dr. Kishore Kumar. In the meantime, gently rinse your mouth with warm salt water and avoid chewing on that side. If you experience difficulty breathing or swallowing, please visit the nearest hospital emergency department right away.`
    );
  }

  // 2. Root Canal Treatment (RCT)
  if (/(root\s*canal|rct|pulp|nerve\s+pain|tooth\s+infection)/i.test(msg)) {
    return (
      `**Root Canal Treatment (RCT)** at Sreesaraswathi Dental Clinic:\n\n` +
      `• **What it is**: A safe, tooth-saving procedure that removes infected or inflamed nerve tissue from inside the tooth, relieves severe pain, and prevents tooth extraction.\n` +
      `• **Modern Technique**: Performed under gentle local anesthesia using modern rotary endodontics for maximum comfort. We offer single-sitting and two-sitting options.\n` +
      `• **Restoration**: Finished with a custom crown (zirconia or ceramic) to restore complete biting strength.\n\n` +
      `Would you like to schedule an examination? Call our clinic desk at **0424 427 2494** or visit our online booking page!`
    );
  }

  // 3. Dental Implants
  if (/(implant|implants|missing\s+tooth|teeth\s+replacement|artificial\s+tooth)/i.test(msg)) {
    return (
      `**Dental Implants** at Sreesaraswathi Dental Clinic:\n\n` +
      `• **Permanent Replacement**: Titanium implants are placed into the jawbone, acting as sturdy artificial roots for permanent crowns or bridges.\n` +
      `• **Key Benefits**: Lifetime durability, 100% natural chewing power, and no grinding of adjacent healthy teeth.\n` +
      `• **Specialist Care**: Led by Dr. Kishore Kumar, Implantologist with 12+ years of surgical experience.\n\n` +
      `Would you like to book an implant consultation with digital X-ray evaluation? Call us at **0424 427 2494**.`
    );
  }

  // 4. Braces & Clear Aligners
  if (/(brace|braces|aligner|aligners|invisalign|crooked\s+teeth|gap|straighten)/i.test(msg)) {
    return (
      `**Orthodontics & Clear Aligners** at Sreesaraswathi Dental Clinic:\n\n` +
      `• **Options**: We offer traditional metal braces, ceramic aesthetic braces, and invisible clear aligners.\n` +
      `• **Benefits**: Corrects teeth crowding, gaps, and overbite/underbite alignment for teens and adults.\n` +
      `• **Custom Plan**: Includes digital smile analysis and tailored aligner sets for smooth, comfortable progression.\n\n` +
      `Would you like to book an orthodontic evaluation? Call our clinic desk at **0424 427 2494**.`
    );
  }

  // 5. Teeth Cleaning & Laser Whitening
  if (/(cleaning|scaling|stain|whitening|bleach|yellow\s+teeth|plaque|tartar)/i.test(msg)) {
    return (
      `**Teeth Cleaning & Laser Whitening** at Sreesaraswathi Dental Clinic:\n\n` +
      `• **Ultrasonic Scaling**: Painlessly removes stubborn tartar, plaque, and surface stains to protect your gums from bleeding and disease.\n` +
      `• **Laser Whitening**: Professional chairside whitening that lightens coffee, tea, and age stains by multiple shades safely in about 45 minutes.\n\n` +
      `Routine cleanings are recommended every 6 months! Would you like to reserve a hygiene session today?`
    );
  }

  // 6. General Treatments Overview ("What dental treatments do you offer?", "treatments", "services", "procedures")
  if (/(treatment|treatments|service|services|procedures|offer|do you provide|available\s+services|what\s+can\s+you\s+do)/i.test(msg)) {
    return (
      `**Sreesaraswathi Dental Clinic** offers comprehensive, gentle dental care in Erode:\n\n` +
      `• **Root Canal Treatment (RCT)**: Gentle tooth-saving procedure with rotary endodontics and dental crowns.\n` +
      `• **Dental Implants**: Permanent, natural-looking titanium tooth replacements for single or multiple missing teeth.\n` +
      `• **Orthodontics (Braces & Clear Aligners)**: Metal braces, ceramic braces, and invisible aligners for a straighter smile.\n` +
      `• **Teeth Cleaning & Scaling**: Ultrasonic plaque removal and deep gum therapy to prevent bleeding and cavities.\n` +
      `• **Laser Teeth Whitening**: Professional chairside brightening for instant, stain-free confidence.\n` +
      `• **Dental Crowns & Bridges**: High-strength zirconia and ceramic restorations to repair damaged or missing teeth.\n` +
      `• **Pediatric (Child) Dentistry**: Gentle, child-friendly checkups, sealants, and cavity fillings for children.\n` +
      `• **Wisdom Tooth Surgery**: Painless extraction of impacted teeth by experienced dental surgeons.\n\n` +
      `All procedures are performed by Dr. Kishore Kumar using advanced digital equipment and strict sterilization. Would you like to book an appointment or learn more about a specific treatment?`
    );
  }

  // 7. Toothache / Pain / Sensitivity
  if (/(toothache|pain|ache|hurt|sensitive|sensitivity|cavity|decay)/i.test(msg)) {
    return (
      `If you're dealing with a toothache or sensitivity, here are immediate care tips:\n\n` +
      `1. **Rinse**: Swish gently with lukewarm salt water to reduce bacteria and swelling.\n` +
      `2. **Avoid**: Steer clear of very hot, cold, or sugary drinks, and do not chew hard foods on the painful side.\n` +
      `3. **Clinic Checkup**: A toothache usually signals deep decay, enamel breakdown, or pulp inflammation that requires chairside care.\n\n` +
      `Please call our clinic desk at **0424 427 2494** or WhatsApp **+91 98657 53494** to schedule a gentle examination with Dr. Kishore Kumar.`
    );
  }

  // 8. Clinic Location / Address / Directions
  if (/(where|location|address|directions|map|situated|place|landmark|how\s+to\s+reach)/i.test(msg)) {
    return (
      `**Sreesaraswathi Dental Clinic** is conveniently located at:\n\n` +
      `📍 **866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009**\n\n` +
      `• **Landmark**: Soli Complex at Surampatti Four Road junction, Erode.\n` +
      `• **Accessibility**: Convenient ground-floor access with parking available.\n` +
      `• **Directions**: Feel free to call our desk at **0424 427 2494** if you need directions while on the way.`
    );
  }

  // 9. Clinic Timings / Working Hours
  if (/(hour|hours|timing|timings|time|open|close|sunday|working\s+days|when\s+can)/i.test(msg)) {
    return (
      `Our clinic hours at **Sreesaraswathi Dental Clinic** are:\n\n` +
      `🕒 **Monday to Saturday: 9:00 AM – 8:45 PM**\n` +
      `🕒 **Sunday: Strictly reserved for scheduled emergency dental cases**\n\n` +
      `For emergency visits on Sunday, please call **0424 427 2494** before arriving.`
    );
  }

  // 10. Booking an Appointment
  if (/(book|booking|appointment|schedule|slot|reserve|visit)/i.test(msg)) {
    return (
      `We'd be delighted to welcome you to **Sreesaraswathi Dental Clinic**!\n\n` +
      `You can book your visit in three convenient ways:\n` +
      `1. **Online**: Visit our booking page (/booking) to pick your treatment, doctor, date, and live 30-minute time slot.\n` +
      `2. **Phone**: Call our front desk directly at **0424 427 2494**.\n` +
      `3. **WhatsApp**: Message us anytime at **+91 98657 53494**.\n\n` +
      `What date or treatment would you prefer for your visit?`
    );
  }

  // 11. Doctor Information
  if (/(doctor|dentist|dr\.|kishore|specialist|surgeon|qualification)/i.test(msg)) {
    return (
      `Our clinical team is led by **Dr. Kishore Kumar** (BDS, MDS), Chief Dental Surgeon & Specialist Implantologist with **12+ years** of clinical experience.\n\n` +
      `He specializes in painless root canal treatments, digital dental implants, orthodontic smiles, and aesthetic smile makeovers.\n\n` +
      `Would you like to schedule a consultation with Dr. Kishore Kumar? Call **0424 427 2494**.`
    );
  }

  // 12. Cost / Pricing / Fees
  if (/(cost|price|fee|charges|rate|how\s+much|affordable)/i.test(msg)) {
    return (
      `At **Sreesaraswathi Dental Clinic**, we believe in 100% transparent and affordable dental care with no hidden charges.\n\n` +
      `Because every smile and tooth condition is unique, exact costs depend on clinical evaluation during your chairside exam and digital X-ray.\n\n` +
      `Dr. Kishore Kumar will walk you through the treatment options and exact costs before any procedure begins. Call **0424 427 2494** to book your consultation!`
    );
  }

  // General clinic welcome / fallback
  return (
    `Hello! 👋 Welcome to **Sreesaraswathi Dental Clinic** in Erode. I'm here to assist you with any questions about our dental services, clinic timings, and appointment booking.\n\n` +
    `You can ask me about:\n` +
    `• **Treatments** (Root Canal, Implants, Braces, Teeth Cleaning, Whitening)\n` +
    `• **Clinic Hours & Location** at Surampatti Four Rd\n` +
    `• **Booking an Appointment** with Dr. Kishore Kumar\n\n` +
    `For immediate assistance, you can also reach our clinic desk at **0424 427 2494** or WhatsApp **+91 98657 53494**!`
  );
}

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
        console.warn("Chatbot network/api fallback invoked:", err?.message || err);
        const smartReply = generateClientDentalAssistantReply(clean);
        const fallbackMsg: ChatbotMessageItem = {
          role: "assistant",
          message: smartReply,
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
