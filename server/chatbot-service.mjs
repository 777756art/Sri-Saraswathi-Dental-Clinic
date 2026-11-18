// server/chatbot-service.mjs
// Sreesaraswathi Dental Clinic – OpenAI AI Dental Care Assistant Service
// Powered by official OpenAI API & Cloudflare D1 Relational Database

import OpenAI from "openai";

const CLINIC_FALLBACK = {
  name: "Sri Saraswathi Dental Clinic",
  address: "866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009",
  phone: "0424 427 2494",
  whatsapp: "+91 93457 43409",
  hours: "Mon–Sat: 9:00 AM – 8:45 PM | Sunday: Emergency Only",
};

// Rate limiter: max 20 requests per minute per IP / session
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 25;

export function checkRateLimit(key) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return true;
}

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Get active OpenAI client instance if API key is configured
 */
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : "";
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

/**
 * Test connectivity with OpenAI API
 */
export async function testOpenAIConnection(modelName) {
  const apiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : "";
  if (!apiKey) {
    return {
      ok: false,
      error: "OPENAI_API_KEY is not configured in server environment.",
      configured: false,
    };
  }

  const model = modelName || process.env.OPENAI_MODEL || "gpt-4o-mini";
  try {
    const client = new OpenAI({ apiKey, timeout: 15000 });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a test ping for Sri Saraswathi Dental Clinic assistant." },
        { role: "user", content: "Reply with the exact word: READY" },
      ],
      max_tokens: 10,
      temperature: 0.1,
    });
    const reply = completion.choices?.[0]?.message?.content?.trim() || "";
    return {
      ok: true,
      model,
      reply,
      configured: true,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || "Failed to connect to OpenAI API.",
      code: err?.code || err?.status || "API_ERROR",
      configured: true,
    };
  }
}

/**
 * Retrieve verified clinic knowledge from D1 database
 */
export async function getVerifiedClinicContext(d1) {
  let clinic = { ...CLINIC_FALLBACK };
  try {
    const settings = await d1.prepare("SELECT * FROM clinic_settings WHERE id = 1").first();
    if (settings) {
      clinic.name = settings.clinic_name || clinic.name;
      clinic.phone = settings.phone || clinic.phone;
      clinic.whatsapp = settings.whatsapp_number ? `+${settings.whatsapp_number}` : clinic.whatsapp;
      clinic.address = settings.address || clinic.address;
      clinic.hours = settings.opening_hours || clinic.hours;
    }
  } catch {
    // Keep fallback
  }

  let doctors = [];
  try {
    const docRows = await d1.prepare(
      "SELECT id, name, qualification, specialization, experience, biography FROM doctors WHERE status = 'active' ORDER BY display_order ASC"
    ).all();
    doctors = docRows.results || [];
  } catch {
    doctors = [
      {
        id: 1,
        name: "Dr. Kishore Kumar",
        qualification: "BDS, MDS",
        specialization: "Chief Dental Surgeon & Implantologist",
        experience: "12+ Years",
        biography: "Specialist in painless root canals, dental implants, and smile transformations.",
      },
    ];
  }

  let treatments = [];
  try {
    const treatRows = await d1.prepare(
      "SELECT id, treatment_name, slug, short_description, full_description, benefits, duration_minutes FROM treatments WHERE status = 'active' ORDER BY display_order ASC"
    ).all();
    treatments = treatRows.results || [];
  } catch {
    treatments = [];
  }

  let faqs = [];
  try {
    const faqRows = await d1.prepare(
      "SELECT question, answer, category FROM chatbot_faqs WHERE status = 'active' ORDER BY display_order ASC"
    ).all();
    faqs = faqRows.results || [];
  } catch {
    faqs = [];
  }

  let offers = [];
  try {
    const offerRows = await d1.prepare(
      "SELECT title, excerpt, start_date, end_date FROM site_content WHERE type = 'offer' AND published = 1 ORDER BY display_order ASC"
    ).all();
    offers = offerRows.results || [];
  } catch {
    offers = [];
  }

  return { clinic, doctors, treatments, faqs, offers };
}

/**
 * Build rich system prompt incorporating verified database knowledge and medical safety guidelines
 */
export async function buildSystemPrompt(d1, customInstructions = "") {
  const { clinic, doctors, treatments, faqs, offers } = await getVerifiedClinicContext(d1);

  const doctorsList = doctors
    .map(
      (d) =>
        `- ${d.name} (${d.qualification || "BDS"}): ${d.specialization || "General Dentistry"}, ${d.experience || "Experienced"}. ${d.biography || ""}`
    )
    .join("\n");

  const treatmentsList = treatments
    .map((t) => {
      let benStr = "";
      try {
        const b = typeof t.benefits === "string" ? JSON.parse(t.benefits) : t.benefits;
        if (Array.isArray(b) && b.length > 0) benStr = ` (Key benefits: ${b.join(", ")})`;
      } catch {
        // ignore
      }
      return `- ${t.treatment_name} (ID: ${t.id}, Duration: ${t.duration_minutes || 30} mins): ${t.short_description || ""}${benStr}`;
    })
    .join("\n");

  const faqsList = faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");

  const offersList =
    offers.length > 0
      ? offers.map((o) => `- ${o.title}: ${o.excerpt || ""}`).join("\n")
      : "No active promotional offers at this time.";

  return `You are the official AI Dental Care Assistant for "${clinic.name}" located in Erode, Tamil Nadu.

### CLINIC PROFILE & CONTACT:
- Clinic Name: ${clinic.name}
- Location / Address: ${clinic.address}
- Desk Phone: ${clinic.phone}
- Direct WhatsApp: ${clinic.whatsapp}
- Clinic Operating Hours: ${clinic.hours}

### ACTIVE CLINIC DOCTORS (SOURCE OF TRUTH):
${doctorsList || "- Dr. Kishore Kumar: Chief Dental Surgeon"}

### ACTIVE CLINIC TREATMENTS (SOURCE OF TRUTH):
${treatmentsList || "- General Dental Checkup & Cleaning\n- Root Canal Treatment\n- Dental Implants\n- Orthodontics & Braces"}

### VERIFIED CLINIC FAQS:
${faqsList || "Consult clinic desk for custom questions."}

### CURRENT CLINIC OFFERS:
${offersList}

### PERSONALITY & COMMUNICATION STYLE:
- Warm, polite, professional, empathetic, and patient.
- Communicate in simple, reassuring English.
- Answer clearly and concisely without excessive medical jargon.
- Format responses nicely with brief paragraphs or bullet points where helpful.

### STRICT MEDICAL SAFETY DIRECTIVES:
1. NEVER diagnose patient dental or medical conditions.
2. NEVER prescribe medications (antibiotics, pain relievers, etc.) or recommend specific drug dosages.
3. NEVER guarantee dental treatment results or promise that a procedure is 100% painless.
4. Emphasize that in-person examination by our dentists is essential for an accurate diagnosis and treatment plan.
5. If the patient reports acute or severe pain, uncontrolled bleeding, fever, or swelling, urge them to contact our clinic directly at ${clinic.phone} for immediate assistance.
6. If the patient reports difficulty breathing, difficulty swallowing, or rapidly expanding facial swelling, advise them to visit the nearest hospital emergency room immediately.

### SOURCE OF TRUTH & ACCURACY:
- Only reference the doctors, treatments, hours, and clinic location detailed above.
- Do NOT invent prices or guarantees. If pricing is not explicitly listed, explain that fees depend on clinical evaluation during the chairside exam, and invite the patient to schedule a visit.

### APPOINTMENT GUIDANCE & BOOKING:
- If a patient expresses interest in booking an appointment, you can guide them step-by-step:
  1. Ask for their Full Name and 10-digit mobile number.
  2. Ask which treatment they need (from our active list) or their main concern.
  3. Ask their preferred date (Monday to Saturday, not Sundays).
  4. You can also mention they can visit the online booking page (/booking) or call ${clinic.phone}.
- When using tools to check availability or submit appointments, ensure dates are formatted as YYYY-MM-DD.

${customInstructions ? `### CUSTOM CLINIC INSTRUCTIONS:\n${customInstructions}` : ""}`;
}

/**
 * Fallback knowledge matcher when OpenAI API key is unavailable or quota is exceeded
 */
export function generateLocalKnowledgeReply(userMessage, context) {
  const msg = (userMessage || "").toLowerCase();
  const { clinic, doctors, treatments, faqs } = context;

  // Emergency / Urgent symptoms
  if (/(severe\s+pain|emergency|bleeding|swelling|fever|swollen|broken\s+tooth|accident|urgent)/i.test(msg)) {
    return (
      `I'm sorry to hear you're experiencing pain or discomfort. For urgent dental concerns or severe pain, please call our clinic desk immediately at **${clinic.phone}**.\n\n` +
      `Our team will prioritize an emergency evaluation with Dr. Kishore Kumar. If you have trouble breathing or swallowing, please visit the nearest hospital emergency department right away.`
    );
  }

  // Booking questions
  if (/(book|appointment|schedule|slot|reserve|visit|timing)/i.test(msg)) {
    return (
      `We'd be delighted to welcome you to ${clinic.name}!\n\n` +
      `You can book an appointment directly through our online booking system where you can select your treatment, doctor, date, and live time slot.\n\n` +
      `Would you like to tell me your name, mobile number, and preferred date so I can help, or you can call us directly at **${clinic.phone}**!`
    );
  }

  // Location / Address
  if (/(where|location|address|directions|map|situated|place)/i.test(msg)) {
    return (
      `**${clinic.name}** is conveniently located at:\n\n` +
      `📍 **${clinic.address}**\n\n` +
      `We offer easy ground-floor access and parking. Feel free to call us at **${clinic.phone}** if you need directions while on the way.`
    );
  }

  // Hours / Timings
  if (/(hour|timing|time|open|close|sunday|working\s+days)/i.test(msg)) {
    return (
      `Our regular clinic hours are:\n\n` +
      `🕒 **${clinic.hours}**\n\n` +
      `Sundays are strictly reserved for urgent emergency appointments. Please call **${clinic.phone}** before visiting on Sundays.`
    );
  }

  // Check matching custom FAQs
  for (const f of faqs) {
    const qKeywords = f.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matchCount = qKeywords.filter((w) => msg.includes(w)).length;
    if (matchCount >= 2 || msg.includes(f.question.toLowerCase())) {
      return `${f.answer}\n\nWould you like to book an appointment with our dental team?`;
    }
  }

  // Doctors
  if (/(doctor|dentist|dr\.|kishore|specialist|surgeon)/i.test(msg)) {
    const docNames = doctors.map((d) => `• **${d.name}** – ${d.specialization} (${d.experience})`).join("\n");
    return (
      `Our experienced clinical team is led by:\n\n${docNames}\n\n` +
      `Every treatment is performed with gentle, modern care. Would you like to schedule a consultation?`
    );
  }

  // Treatments
  if (/(treatment|service|root\s+canal|implant|braces|cleaning|whitening|extraction|crown)/i.test(msg)) {
    const treatNames = treatments.slice(0, 6).map((t) => `• **${t.treatment_name}**: ${t.short_description}`).join("\n");
    return (
      `Here are some of our primary dental treatments:\n\n${treatNames}\n\n` +
      `We prioritize comfortable, painless treatments with digital dental equipment. You can book an appointment online or call us at **${clinic.phone}**!`
    );
  }

  // General clinic welcome / fallback
  return (
    `Hello! Welcome to ${clinic.name}. I'm here to help you learn about our dental services, clinic timings, and appointment scheduling.\n\n` +
    `How can I assist your smile today? You can ask about treatments (like Root Canals or Implants), clinic location, or booking a visit!`
  );
}

/**
 * Tool definitions for OpenAI Function / Tool Calling
 */
export const CHATBOT_TOOLS = [
  {
    type: "function",
    function: {
      name: "check_appointment_availability",
      description: "Check available appointment dates and 30-minute time slots for a given date at Sri Saraswathi Dental Clinic.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "The appointment date in YYYY-MM-DD format (must not be in the past, Monday through Saturday).",
          },
          doctorId: {
            type: "number",
            description: "Optional doctor ID if the patient requested a specific doctor.",
          },
          treatmentId: {
            type: "number",
            description: "Optional treatment ID.",
          },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Submit an official appointment booking to the clinic database once the patient has provided their name, phone, date, time slot, and treatment.",
      parameters: {
        type: "object",
        properties: {
          patientName: {
            type: "string",
            description: "Full name of the patient.",
          },
          phone: {
            type: "string",
            description: "10-digit mobile number.",
          },
          email: {
            type: "string",
            description: "Optional email address.",
          },
          date: {
            type: "string",
            description: "Appointment date in YYYY-MM-DD format.",
          },
          time: {
            type: "string",
            description: "Appointment time slot (e.g. '10:00 AM', '4:30 PM').",
          },
          treatmentId: {
            type: "number",
            description: "Treatment ID if selected.",
          },
          doctorId: {
            type: "number",
            description: "Doctor ID (defaults to 1).",
          },
          notes: {
            type: "string",
            description: "Chief complaint or symptoms described by patient.",
          },
        },
        required: ["patientName", "phone", "date", "time"],
      },
    },
  },
];
