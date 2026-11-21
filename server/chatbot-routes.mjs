// server/chatbot-routes.mjs
// Sreesaraswathi Dental Clinic – AI Chatbot API Endpoints
// Express router integration with OpenAI API and Cloudflare D1

import crypto from "node:crypto";
import {
  getOpenAIClient,
  testOpenAIConnection,
  getVerifiedClinicContext,
  buildSystemPrompt,
  generateLocalKnowledgeReply,
  checkRateLimit,
  CHATBOT_TOOLS,
  CLINIC_FALLBACK,
  DEFAULT_DOCTORS,
  DEFAULT_CLINIC_TREATMENTS,
  DEFAULT_CLINIC_FAQS,
} from "./chatbot-service.mjs";

const CLINIC_TIMEZONE = "Asia/Kolkata";

function getNowIST() {
  const now = new Date();
  const istStr = now.toLocaleString("en-US", { timeZone: CLINIC_TIMEZONE });
  return new Date(istStr);
}

function getTodayISTString() {
  const ist = getNowIST();
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatRef(id, dateStr) {
  const cleanDate = String(dateStr || "").replace(/\D/g, "").slice(2, 8);
  return `REF-${cleanDate || "2026"}-${String(id || 1).padStart(4, "0")}`;
}

/**
 * Register all AI Chatbot routes with the Express application
 */
export function registerChatbotRoutes(app, d1, requireAdmin) {
  /* ------------------------------------------------------------- 1. PUBLIC CHATBOT ENDPOINTS */

  // Public Chatbot Settings & Status
  app.get("/api/chat/settings", async (_req, res) => {
    try {
      let settings = {
        enabled: 1,
        chatbot_name: "Dental Care Assistant",
        welcome_message: "Hello! 👋 Welcome to Sreesaraswathi Dental Clinic.\n\nI'm your AI Dental Assistant. How can I help you today?",
        suggested_questions: '["What dental treatments do you offer?", "What is a root canal treatment?", "How can I book an appointment?", "What are your clinic timings?", "Where is your clinic located?", "What should I do if I have a toothache?"]',
        model_name: "gpt-4o-mini",
        appearance_settings: '{"theme":"teal","placement":"bottom-right"}',
      };

      try {
        if (d1?.prepare) {
          const row = await d1.prepare("SELECT * FROM chatbot_settings WHERE id = 1").first();
          if (row) settings = { ...settings, ...row };
        }
      } catch (dbErr) {
        console.warn("Chatbot settings db read warning:", dbErr?.message || dbErr);
      }

      let suggestedQuestions = [];
      try {
        suggestedQuestions = typeof settings.suggested_questions === "string" ? JSON.parse(settings.suggested_questions) : settings.suggested_questions;
      } catch {
        suggestedQuestions = [
          "What dental treatments do you offer?",
          "What is a root canal treatment?",
          "How can I book an appointment?",
          "What are your clinic timings?",
          "Where is your clinic located?",
          "What should I do if I have a toothache?",
        ];
      }

      let appearance = { theme: "teal", placement: "bottom-right" };
      try {
        appearance = typeof settings.appearance_settings === "string" ? JSON.parse(settings.appearance_settings) : settings.appearance_settings;
      } catch {
        // default
      }

      const hasApiKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());

      res.json({
        ok: true,
        enabled: Boolean(settings.enabled !== 0),
        chatbotName: settings.chatbot_name || "Dental Care Assistant",
        welcomeMessage: settings.welcome_message,
        suggestedQuestions,
        appearance,
        aiConfigured: hasApiKey,
        modelName: settings.model_name || process.env.OPENAI_MODEL || "gpt-4o-mini",
      });
    } catch (err) {
      console.warn("Chatbot settings endpoint fallback:", err?.message || err);
      res.json({
        ok: true,
        enabled: true,
        chatbotName: "Dental Care Assistant",
        welcomeMessage: "Hello! 👋 Welcome to Sreesaraswathi Dental Clinic.\n\nI'm your AI Dental Assistant. How can I help you today?",
        suggestedQuestions: [
          "What dental treatments do you offer?",
          "What is a root canal treatment?",
          "How can I book an appointment?",
          "What are your clinic timings?",
          "Where is your clinic located?",
          "What should I do if I have a toothache?",
        ],
        appearance: { theme: "teal", placement: "bottom-right" },
        aiConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()),
        modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
      });
    }
  });

  // Conversation History for a session
  app.get("/api/chat/history/:sessionId", async (req, res) => {
    try {
      const sessionId = String(req.params.sessionId || "").trim();
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required." });
      }

      let messages = [];
      try {
        if (d1?.prepare) {
          const rows = await d1.prepare(
            "SELECT id, role, message, metadata, created_at FROM chatbot_messages WHERE session_id = ? ORDER BY id ASC LIMIT 50"
          ).bind(sessionId).all();

          messages = (rows.results || []).map((m) => {
            let meta = {};
            try {
              meta = typeof m.metadata === "string" ? JSON.parse(m.metadata) : m.metadata || {};
            } catch {
              meta = {};
            }
            return {
              id: m.id,
              role: m.role,
              message: m.message,
              metadata: meta,
              createdAt: m.created_at,
            };
          });
        }
      } catch (dbErr) {
        console.warn("Chat history db read warning:", dbErr?.message || dbErr);
      }

      res.json({ ok: true, sessionId, messages });
    } catch (err) {
      console.warn("Chat history fallback:", err?.message || err);
      res.json({ ok: true, sessionId: req.params.sessionId || "", messages: [] });
    }
  });

  // Helper function to check availability internally
  async function checkAvailabilityInternal(date, doctorId = null, treatmentId = null) {
    const todayIST = getTodayISTString();
    if (date < todayIST) {
      return { closed: true, reason: "Past dates cannot be booked.", slots: [] };
    }
    const dateObj = new Date(`${date}T00:00:00`);
    if (dateObj.getDay() === 0) {
      return { closed: true, reason: "Clinic is closed on Sundays (Emergency only).", slots: [] };
    }

    // Check admin blocked dates
    const blocked = await d1.prepare("SELECT * FROM blocked_dates WHERE block_date = ?").bind(date).first();
    if (blocked && !blocked.start_time && !blocked.end_time) {
      return { closed: true, reason: blocked.reason || "Clinic closed on this date.", slots: [] };
    }

    const defaultSlots = [
      "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
      "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM",
      "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM",
    ];

    // Find booked appointments
    const booked = await d1.prepare(
      "SELECT appointment_time FROM appointments WHERE appointment_date = ? AND LOWER(status) NOT IN ('cancelled', 'rejected')"
    ).bind(date).all();

    const counts = {};
    for (const row of booked.results || []) {
      const t = row.appointment_time;
      counts[t] = (counts[t] || 0) + 1;
    }

    const availableSlots = defaultSlots.filter((slot) => (counts[slot] || 0) < 2);
    return {
      date,
      closed: false,
      availableCount: availableSlots.length,
      slots: availableSlots,
    };
  }

  // Helper function to create an appointment internally
  async function createAppointmentInternal({ patientName, phone, email, date, time, treatmentId, doctorId, notes }) {
    const cleanPhone = String(phone || "").replace(/\D/g, "");
    if (!patientName || patientName.length < 2) {
      throw new Error("Patient name is required (at least 2 characters).");
    }
    if (cleanPhone.length < 10) {
      throw new Error("A valid 10-digit mobile number is required.");
    }
    if (!date || !time) {
      throw new Error("Appointment date and time are required.");
    }

    const todayIST = getTodayISTString();
    if (date < todayIST) {
      throw new Error("Past dates cannot be booked.");
    }

    const dateObj = new Date(`${date}T00:00:00`);
    if (dateObj.getDay() === 0) {
      throw new Error("Clinic is closed on Sundays for routine appointments.");
    }

    // Resolve doctor
    let targetDoctorId = doctorId ? Number(doctorId) : 1;
    let targetDoctor = await d1.prepare("SELECT * FROM doctors WHERE id = ?").bind(targetDoctorId).first();
    if (!targetDoctor || targetDoctor.status !== "active") {
      const firstActive = await d1.prepare("SELECT * FROM doctors WHERE status = 'active' ORDER BY id ASC LIMIT 1").first();
      targetDoctor = firstActive;
      targetDoctorId = firstActive?.id || 1;
    }

    // Resolve treatment
    let targetTreatmentId = treatmentId ? Number(treatmentId) : null;
    let treatmentName = "General Dental Consultation";
    if (targetTreatmentId) {
      const treatRow = await d1.prepare("SELECT * FROM treatments WHERE id = ?").bind(targetTreatmentId).first();
      if (treatRow) {
        treatmentName = treatRow.treatment_name;
      }
    }

    // Insert into appointments table
    const result = await d1.prepare(`
      INSERT INTO appointments (
        patient_name, phone, email, doctor_id, treatment_id,
        appointment_date, appointment_time, message, status, admin_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', '[Booked via AI Dental Assistant]', datetime('now'), datetime('now'))
    `).bind(
      patientName.trim(),
      cleanPhone,
      email ? email.trim() : "",
      targetDoctorId,
      targetTreatmentId,
      date,
      time,
      notes ? notes.trim() : "Booked via AI Dental Care Assistant"
    ).run();

    const insertId = result.meta?.last_row_id || 1;
    const ref = formatRef(insertId, date);

    return {
      success: true,
      id: insertId,
      ref,
      patientName: patientName.trim(),
      phone: cleanPhone,
      doctorName: targetDoctor?.name || "Dr. Kishore Kumar",
      treatmentName,
      date,
      time,
      status: "Pending",
      message: `Your appointment request (${ref}) has been submitted successfully! Our clinic team will verify and confirm promptly.`,
    };
  }

  // Main Chat Completion Endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const body = req.body || {};
      const rawMessage = String(body.message || "").trim();
      let sessionId = String(body.sessionId || body.session_id || "").trim();

      if (!rawMessage) {
        return res.status(400).json({ error: "Message cannot be empty." });
      }
      if (rawMessage.length > 1200) {
        return res.status(400).json({ error: "Message exceeds maximum allowed length of 1200 characters." });
      }

      // 1. Rate limiting check
      const rateLimitKey = `${req.ip || "unknown"}_${sessionId || "guest"}`;
      if (!checkRateLimit(rateLimitKey)) {
        return res.status(429).json({
          error: "You are sending messages too quickly. Please wait a moment before sending another message.",
        });
      }

      // 2. Fetch or initialize chatbot settings
      let settings = {
        enabled: 1,
        chatbot_name: "Dental Care Assistant",
        system_instructions: "",
        model_name: "gpt-4o-mini",
      };
      try {
        if (d1?.prepare) {
          const s = await d1.prepare("SELECT * FROM chatbot_settings WHERE id = 1").first();
          if (s) settings = { ...settings, ...s };
        }
      } catch (dbErr) {
        console.warn("Chatbot settings db fetch warning:", dbErr?.message || dbErr);
      }

      if (settings.enabled === 0) {
        return res.json({
          ok: true,
          sessionId: sessionId || `sess_${Date.now()}`,
          reply:
            "The AI Dental Assistant is currently resting. Please call our clinic directly at **0424 427 2494** or message us on WhatsApp at **+91 98657 53494** for immediate assistance.",
        });
      }

      // 3. Ensure Session ID exists
      if (!sessionId) {
        sessionId = `sess_${crypto.randomUUID()}`;
      }

      // Upsert Session in D1 safely
      try {
        if (d1?.prepare) {
          const existingSession = await d1.prepare("SELECT id FROM chatbot_sessions WHERE session_id = ?").bind(sessionId).first();
          if (!existingSession) {
            await d1.prepare(`
              INSERT INTO chatbot_sessions (session_id, patient_name, patient_phone, status, created_at, updated_at)
              VALUES (?, ?, ?, 'active', datetime('now'), datetime('now'))
            `).bind(
              sessionId,
              body.patientName ? String(body.patientName).trim() : "",
              body.patientPhone ? String(body.patientPhone).trim() : ""
            ).run();
          }
        }
      } catch (sessErr) {
        console.warn("Chatbot session upsert warning:", sessErr?.message || sessErr);
      }

      // 4. Save User Message into D1 safely
      try {
        if (d1?.prepare) {
          await d1.prepare(`
            INSERT INTO chatbot_messages (session_id, role, message, metadata, created_at)
            VALUES (?, 'user', ?, '{}', datetime('now'))
          `).bind(sessionId, rawMessage).run();
        }
      } catch (msgErr) {
        console.warn("Chatbot user message log warning:", msgErr?.message || msgErr);
      }

      // 5. Fetch recent conversation history for context safely
      let reversedHistory = [];
      try {
        if (d1?.prepare) {
          const historyRows = await d1.prepare(
            "SELECT role, message FROM chatbot_messages WHERE session_id = ? ORDER BY id DESC LIMIT 10"
          ).bind(sessionId).all();
          reversedHistory = (historyRows.results || []).reverse();
        }
      } catch (histErr) {
        console.warn("Chatbot history fetch warning:", histErr?.message || histErr);
      }

      // 6. Connect to OpenAI if configured
      const openAIClient = getOpenAIClient();
      let assistantReply = "";
      let bookingResult = null;
      let interactiveBookingAction = null;

      if (openAIClient) {
        try {
          const systemPrompt = await buildSystemPrompt(d1, settings.system_instructions || "");
          const messagesPayload = [
            { role: "system", content: systemPrompt },
            ...reversedHistory.map((h) => ({
              role: h.role === "assistant" ? "assistant" : "user",
              content: h.message,
            })),
          ];

          const model = settings.model_name || process.env.OPENAI_MODEL || "gpt-4o-mini";

          // Initial OpenAI Completion with Tools
          let completion = await openAIClient.chat.completions.create({
            model,
            messages: messagesPayload,
            tools: CHATBOT_TOOLS,
            tool_choice: "auto",
            temperature: 0.5,
            max_tokens: 700,
          });

          let choice = completion.choices?.[0];
          let responseMessage = choice?.message;

          // Check if OpenAI requested a tool call (Availability check or Booking)
          if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];
            const funcName = toolCall.function?.name;
            let args = {};
            try {
              args = JSON.parse(toolCall.function?.arguments || "{}");
            } catch {
              args = {};
            }

            let toolOutput = {};

            if (funcName === "check_appointment_availability") {
              const dateToCheck = args.date || getTodayISTString();
              toolOutput = await checkAvailabilityInternal(dateToCheck, args.doctorId, args.treatmentId);
              interactiveBookingAction = {
                type: "availability_preview",
                date: dateToCheck,
                slots: toolOutput.slots || [],
                closed: toolOutput.closed || false,
                reason: toolOutput.reason || null,
              };
            } else if (funcName === "book_appointment") {
              try {
                bookingResult = await createAppointmentInternal(args);
                toolOutput = bookingResult;
                // Update session with appointment details
                try {
                  if (d1?.prepare) {
                    await d1.prepare(
                      "UPDATE chatbot_sessions SET appointment_id = ?, patient_name = ?, patient_phone = ?, updated_at = datetime('now') WHERE session_id = ?"
                    ).bind(bookingResult.id, bookingResult.patientName, bookingResult.phone, sessionId).run();
                  }
                } catch {
                  // ignore
                }
              } catch (bookingErr) {
                toolOutput = { error: bookingErr.message };
              }
            }

            // Feed tool output back to OpenAI for the final natural language summary
            messagesPayload.push(responseMessage);
            messagesPayload.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolOutput),
            });

            const followUp = await openAIClient.chat.completions.create({
              model,
              messages: messagesPayload,
              temperature: 0.5,
              max_tokens: 600,
            });

            assistantReply = followUp.choices?.[0]?.message?.content?.trim() || "";
          } else {
            assistantReply = responseMessage?.content?.trim() || "";
          }
        } catch (openaiErr) {
          console.warn("OpenAI API call notice:", openaiErr?.message || openaiErr);
          // Fall back seamlessly to verified clinic knowledge
          const clinicContext = await getVerifiedClinicContext(d1);
          assistantReply = generateLocalKnowledgeReply(rawMessage, clinicContext);
        }
      } else {
        // OpenAI not configured: use verified clinic knowledge base
        const clinicContext = await getVerifiedClinicContext(d1);
        assistantReply = generateLocalKnowledgeReply(rawMessage, clinicContext);
      }

      if (!assistantReply) {
        assistantReply = generateLocalKnowledgeReply(rawMessage, {
          clinic: CLINIC_FALLBACK,
          doctors: DEFAULT_DOCTORS,
          treatments: DEFAULT_CLINIC_TREATMENTS,
          faqs: DEFAULT_CLINIC_FAQS,
        });
      }

      // 7. Save Assistant Reply into D1 safely
      const meta = {};
      if (bookingResult) meta.bookingResult = bookingResult;
      if (interactiveBookingAction) meta.bookingAction = interactiveBookingAction;

      try {
        if (d1?.prepare) {
          await d1.prepare(`
            INSERT INTO chatbot_messages (session_id, role, message, metadata, created_at)
            VALUES (?, 'assistant', ?, ?, datetime('now'))
          `).bind(sessionId, assistantReply, JSON.stringify(meta)).run();
        }
      } catch (saveErr) {
        console.warn("Assistant reply save warning:", saveErr?.message || saveErr);
      }

      // Return clean response
      res.json({
        ok: true,
        sessionId,
        reply: assistantReply,
        bookingResult,
        bookingAction: interactiveBookingAction,
      });
    } catch (err) {
      console.error("Chatbot completion error:", err);
      // Even in the worst unhandled exception, return status 200 with verified clinic knowledge!
      const fallbackReply = generateLocalKnowledgeReply(rawMessage, {
        clinic: CLINIC_FALLBACK,
        doctors: DEFAULT_DOCTORS,
        treatments: DEFAULT_CLINIC_TREATMENTS,
        faqs: DEFAULT_CLINIC_FAQS,
      });
      res.json({
        ok: true,
        sessionId: sessionId || `sess_${Date.now()}`,
        reply: fallbackReply,
      });
    }
  });

  // Direct In-Chat Appointment Booking endpoint
  app.post("/api/chat/booking", async (req, res) => {
    try {
      const b = req.body || {};
      const result = await createAppointmentInternal({
        patientName: b.patientName,
        phone: b.phone,
        email: b.email,
        date: b.date,
        time: b.time,
        treatmentId: b.treatmentId,
        doctorId: b.doctorId,
        notes: b.notes || "Booked through AI Dental Care Assistant",
      });

      if (b.sessionId) {
        await d1.prepare(
          "UPDATE chatbot_sessions SET appointment_id = ?, patient_name = ?, patient_phone = ?, updated_at = datetime('now') WHERE session_id = ?"
        ).bind(result.id, result.patientName, result.phone, String(b.sessionId)).run();

        // Also append confirmation to messages
        await d1.prepare(`
          INSERT INTO chatbot_messages (session_id, role, message, metadata, created_at)
          VALUES (?, 'assistant', ?, ?, datetime('now'))
        `).bind(
          String(b.sessionId),
          `✅ **Appointment Requested Successfully!**\n\nReference: **${result.ref}**\nPatient: **${result.patientName}**\nDate: **${result.date}** at **${result.time}**\nDoctor: **${result.doctorName}**\n\nOur clinic team will confirm your slot promptly. If you need any immediate updates, call our desk at 0424 427 2494.`,
          JSON.stringify({ bookingResult: result })
        ).run();
      }

      res.json({ ok: true, booking: result });
    } catch (err) {
      res.status(400).json({ error: err.message || "Could not complete booking." });
    }
  });

  /* ------------------------------------------------------------- 2. ADMIN CHATBOT MANAGEMENT ENDPOINTS */

  // Get Admin Chatbot Settings
  app.get("/api/admin/chatbot/settings", requireAdmin, async (_req, res) => {
    try {
      const settings = (await d1.prepare("SELECT * FROM chatbot_settings WHERE id = 1").first()) || {};
      let suggestedQuestions = [];
      try {
        suggestedQuestions = typeof settings.suggested_questions === "string" ? JSON.parse(settings.suggested_questions) : settings.suggested_questions;
      } catch {
        suggestedQuestions = [];
      }

      let appearance = { theme: "teal", placement: "bottom-right" };
      try {
        appearance = typeof settings.appearance_settings === "string" ? JSON.parse(settings.appearance_settings) : settings.appearance_settings;
      } catch {
        // default
      }

      const hasApiKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());

      res.json({
        ok: true,
        settings: {
          enabled: Boolean(settings.enabled !== 0),
          chatbotName: settings.chatbot_name || "Dental Care Assistant",
          welcomeMessage: settings.welcome_message || "",
          systemInstructions: settings.system_instructions || "",
          suggestedQuestions: suggestedQuestions || [],
          modelName: settings.model_name || process.env.OPENAI_MODEL || "gpt-4o-mini",
          appearanceSettings: appearance,
          updatedAt: settings.updated_at,
        },
        environment: {
          openaiApiKeyConfigured: hasApiKey,
          activeModel: settings.model_name || process.env.OPENAI_MODEL || "gpt-4o-mini",
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to load admin chatbot settings." });
    }
  });

  // Update Admin Chatbot Settings
  app.put("/api/admin/chatbot/settings", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const enabled = b.enabled === false ? 0 : 1;
      const chatbotName = String(b.chatbotName || "Dental Care Assistant").trim();
      const welcomeMessage = String(b.welcomeMessage || "").trim();
      const systemInstructions = String(b.systemInstructions || "").trim();
      const modelName = String(b.modelName || "gpt-4o-mini").trim();

      let suggestedQuestions = b.suggestedQuestions;
      if (Array.isArray(suggestedQuestions)) {
        suggestedQuestions = JSON.stringify(suggestedQuestions);
      } else if (typeof suggestedQuestions !== "string") {
        suggestedQuestions = '["What dental treatments do you offer?", "What is a root canal treatment?", "How can I book an appointment?", "What are your clinic timings?", "Where is your clinic located?", "What should I do if I have a toothache?"]';
      }

      let appearanceSettings = b.appearanceSettings;
      if (typeof appearanceSettings === "object") {
        appearanceSettings = JSON.stringify(appearanceSettings);
      } else if (typeof appearanceSettings !== "string") {
        appearanceSettings = '{"theme":"teal","placement":"bottom-right"}';
      }

      await d1.prepare(`
        INSERT INTO chatbot_settings (
          id, enabled, chatbot_name, welcome_message, system_instructions, suggested_questions, model_name, appearance_settings, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          enabled = excluded.enabled,
          chatbot_name = excluded.chatbot_name,
          welcome_message = excluded.welcome_message,
          system_instructions = excluded.system_instructions,
          suggested_questions = excluded.suggested_questions,
          model_name = excluded.model_name,
          appearance_settings = excluded.appearance_settings,
          updated_at = datetime('now')
      `).bind(
        enabled,
        chatbotName,
        welcomeMessage,
        systemInstructions,
        suggestedQuestions,
        modelName,
        appearanceSettings
      ).run();

      res.json({ ok: true, message: "Chatbot settings saved successfully." });
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to update chatbot settings." });
    }
  });

  // Test OpenAI Live API Connectivity
  app.post("/api/admin/chatbot/test-connection", requireAdmin, async (req, res) => {
    try {
      const model = req.body?.modelName || process.env.OPENAI_MODEL || "gpt-4o-mini";
      const result = await testOpenAIConnection(model);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // List Chat Sessions / Conversations for Admin
  app.get("/api/admin/chatbot/conversations", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 50), 100);
      const rows = await d1.prepare(`
        SELECT 
          s.id, s.session_id, s.patient_name, s.patient_phone, s.patient_email,
          s.appointment_id, s.status, s.created_at, s.updated_at,
          (SELECT COUNT(*) FROM chatbot_messages m WHERE m.session_id = s.session_id) as message_count,
          (SELECT m.message FROM chatbot_messages m WHERE m.session_id = s.session_id ORDER BY m.id DESC LIMIT 1) as latest_message
        FROM chatbot_sessions s
        ORDER BY s.updated_at DESC
        LIMIT ?
      `).bind(limit).all();

      res.json({ ok: true, conversations: rows.results || [] });
    } catch (err) {
      res.status(500).json({ error: "Failed to list conversations." });
    }
  });

  // Get single conversation details with all messages
  app.get("/api/admin/chatbot/conversations/:sessionId", requireAdmin, async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const session = await d1.prepare("SELECT * FROM chatbot_sessions WHERE session_id = ?").bind(sessionId).first();
      if (!session) {
        return res.status(404).json({ error: "Conversation not found." });
      }

      const messagesRows = await d1.prepare(
        "SELECT id, role, message, metadata, created_at FROM chatbot_messages WHERE session_id = ? ORDER BY id ASC"
      ).bind(sessionId).all();

      let appointment = null;
      if (session.appointment_id) {
        appointment = await d1.prepare("SELECT * FROM appointments WHERE id = ?").bind(session.appointment_id).first();
      }

      res.json({
        ok: true,
        session,
        messages: messagesRows.results || [],
        appointment,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to load conversation." });
    }
  });

  // Delete conversation
  app.delete("/api/admin/chatbot/conversations/:sessionId", requireAdmin, async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      await d1.prepare("DELETE FROM chatbot_messages WHERE session_id = ?").bind(sessionId).run();
      await d1.prepare("DELETE FROM chatbot_sessions WHERE session_id = ?").bind(sessionId).run();
      res.json({ ok: true, message: "Conversation deleted successfully." });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete conversation." });
    }
  });

  // List FAQs
  app.get("/api/admin/chatbot/faqs", requireAdmin, async (_req, res) => {
    try {
      const rows = await d1.prepare("SELECT * FROM chatbot_faqs ORDER BY display_order ASC, id ASC").all();
      res.json({ ok: true, faqs: rows.results || [] });
    } catch (err) {
      res.status(500).json({ error: "Failed to load FAQs." });
    }
  });

  // Create FAQ
  app.post("/api/admin/chatbot/faqs", requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const question = String(b.question || "").trim();
      const answer = String(b.answer || "").trim();
      const category = String(b.category || "General").trim();
      const displayOrder = Number(b.displayOrder || 0);
      const status = b.status === "inactive" ? "inactive" : "active";

      if (!question || !answer) {
        return res.status(400).json({ error: "Question and Answer are both required." });
      }

      const result = await d1.prepare(`
        INSERT INTO chatbot_faqs (question, answer, category, status, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(question, answer, category, status, displayOrder).run();

      res.json({ ok: true, id: result.meta?.last_row_id || 1, message: "FAQ created successfully." });
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to create FAQ." });
    }
  });

  // Update FAQ
  app.put("/api/admin/chatbot/faqs/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const b = req.body || {};
      const question = String(b.question || "").trim();
      const answer = String(b.answer || "").trim();
      const category = String(b.category || "General").trim();
      const displayOrder = Number(b.displayOrder ?? 0);
      const status = b.status === "inactive" ? "inactive" : "active";

      if (!question || !answer) {
        return res.status(400).json({ error: "Question and Answer are required." });
      }

      await d1.prepare(`
        UPDATE chatbot_faqs
        SET question = ?, answer = ?, category = ?, status = ?, display_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(question, answer, category, status, displayOrder, id).run();

      res.json({ ok: true, message: "FAQ updated successfully." });
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to update FAQ." });
    }
  });

  // Delete FAQ
  app.delete("/api/admin/chatbot/faqs/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await d1.prepare("DELETE FROM chatbot_faqs WHERE id = ?").bind(id).run();
      res.json({ ok: true, message: "FAQ deleted successfully." });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete FAQ." });
    }
  });
}
