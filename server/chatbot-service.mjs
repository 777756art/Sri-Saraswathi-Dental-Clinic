// server/chatbot-service.mjs
// Sreesaraswathi Dental Clinic – OpenAI AI Dental Care Assistant Service
// Powered by official OpenAI API & Cloudflare D1 Relational Database

import OpenAI from "openai";

export const CLINIC_FALLBACK = {
  name: "Sri Saraswathi Dental Clinic",
  address: "866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009",
  phone: "0424 427 2494",
  whatsapp: "+91 93457 43409",
  hours: "Mon–Sat: 9:00 AM – 8:45 PM | Sunday: Emergency Only",
};

export const DEFAULT_DOCTORS = [
  {
    id: 1,
    name: "Dr. Kishore Kumar",
    qualification: "BDS, MDS",
    specialization: "Chief Dental Surgeon & Implantologist",
    experience: "12+ Years",
    biography: "Specialist in painless root canals, dental implants, cosmetic dentistry, and smile transformations.",
  },
];

export const DEFAULT_CLINIC_TREATMENTS = [
  {
    id: 1,
    treatment_name: "Root Canal Treatment (RCT)",
    slug: "root-canal-treatment",
    short_description: "Gentle, tooth-saving procedure using digital rotary endodontics and dental crowns to eliminate infection and relieve tooth pain permanently.",
    benefits: ["Painless modern procedure", "Preserves your natural tooth", "Single or two sitting options available"],
    duration_minutes: 45,
  },
  {
    id: 2,
    treatment_name: "Dental Implants",
    slug: "dental-implants",
    short_description: "Permanent titanium tooth replacements designed to look, feel, and function exactly like your natural teeth.",
    benefits: ["Lifetime durability", "Restores full chewing power", "Natural smile aesthetics"],
    duration_minutes: 60,
  },
  {
    id: 3,
    treatment_name: "Orthodontics (Braces & Clear Aligners)",
    slug: "orthodontics",
    short_description: "Traditional metal braces, ceramic aesthetic braces, and invisible clear aligners to correct crooked teeth and bite alignment.",
    benefits: ["Straightens crowded teeth", "Improves bite and speech", "Custom digital aligner trays"],
    duration_minutes: 30,
  },
  {
    id: 4,
    treatment_name: "Teeth Cleaning & Scaling",
    slug: "teeth-cleaning",
    short_description: "Ultrasonic tartar removal, surface polishing, and deep periodontal gum care to prevent gum bleeding and decay.",
    benefits: ["Removes tough plaque & stains", "Prevents gum disease", "Long-lasting fresh breath"],
    duration_minutes: 30,
  },
  {
    id: 5,
    treatment_name: "Laser Teeth Whitening",
    slug: "teeth-whitening",
    short_description: "Advanced chairside laser teeth whitening to lighten stubborn stains and discoloration by multiple shades safely.",
    benefits: ["Immediate visible results", "Enamel-safe formula", "Long-lasting brilliance"],
    duration_minutes: 45,
  },
  {
    id: 6,
    treatment_name: "Dental Crowns & Bridges",
    slug: "crowns-and-bridges",
    short_description: "High-grade zirconia and ceramic restorations to protect cracked or treated teeth and replace missing teeth seamlessly.",
    benefits: ["Natural tooth matching", "Superior strength & durability", "Precise digital fit"],
    duration_minutes: 45,
  },
  {
    id: 7,
    treatment_name: "Pediatric (Child) Dentistry",
    slug: "pediatric-dentistry",
    short_description: "Gentle dental checkups, cavity prevention sealants, fluoride therapy, and painless fillings in a calm, caring atmosphere.",
    benefits: ["Child-friendly approach", "Prevents early tooth decay", "Builds healthy dental habits"],
    duration_minutes: 30,
  },
  {
    id: 8,
    treatment_name: "Wisdom Tooth Extractions & Minor Surgery",
    slug: "wisdom-tooth-extraction",
    short_description: "Safe, painless removal of impacted or painful wisdom teeth under local anesthesia with fast recovery guidance.",
    benefits: ["Rapid pain relief", "Minimally invasive technique", "Prevents crowding of adjacent teeth"],
    duration_minutes: 45,
  },
];

export const DEFAULT_CLINIC_FAQS = [
  {
    question: "What dental treatments do you offer?",
    answer: "Sreesaraswathi Dental Clinic offers comprehensive dental services including Root Canal Treatment (RCT), Dental Implants, Orthodontics (Braces & Clear Aligners), Professional Teeth Cleaning & Scaling, Laser Teeth Whitening, Dental Crowns & Bridges, Pediatric Dentistry, and Wisdom Tooth Extractions.",
    category: "Treatments",
  },
  {
    question: "What is a root canal treatment?",
    answer: "Root canal treatment is a safe, tooth-saving procedure that removes infected or inflamed pulp tissue from inside the tooth, relieves severe discomfort, and seals the canal with a dental crown to preserve your natural tooth permanently.",
    category: "Treatments",
  },
  {
    question: "How can I book an appointment?",
    answer: "You can easily book online by choosing your preferred treatment, doctor, date, and live time slot through our booking page (/booking), or call our clinic desk directly at 0424 427 2494 or WhatsApp +91 93457 43409.",
    category: "Appointments",
  },
  {
    question: "What are your clinic timings?",
    answer: "Our clinic is open Monday to Saturday from 9:00 AM to 8:45 PM. Sundays are reserved for scheduled emergency dental visits only.",
    category: "Clinic Info",
  },
  {
    question: "Where is your clinic located?",
    answer: "We are located at 866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009. We have convenient parking and easy ground-floor accessibility.",
    category: "Clinic Info",
  },
  {
    question: "What should I do if I have a toothache?",
    answer: "Rinse your mouth gently with warm salt water and avoid chewing hard foods on that side. For severe pain, swelling, or fever, please contact our clinic at 0424 427 2494 immediately for a gentle chairside examination.",
    category: "Emergency & Symptoms",
  },
];

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
    if (d1?.prepare) {
      const settings = await d1.prepare("SELECT * FROM clinic_settings WHERE id = 1").first();
      if (settings) {
        clinic.name = settings.clinic_name || clinic.name;
        clinic.phone = settings.phone || clinic.phone;
        clinic.whatsapp = settings.whatsapp_number ? `+${settings.whatsapp_number}` : clinic.whatsapp;
        clinic.address = settings.address || clinic.address;
        clinic.hours = settings.opening_hours || clinic.hours;
      }
    }
  } catch {
    // Keep fallback
  }

  let doctors = [];
  try {
    if (d1?.prepare) {
      const docRows = await d1.prepare(
        "SELECT id, name, qualification, specialization, experience, biography FROM doctors WHERE status = 'active' ORDER BY display_order ASC"
      ).all();
      doctors = docRows.results || [];
    }
  } catch {
    doctors = [];
  }
  if (!doctors || doctors.length === 0) {
    doctors = [...DEFAULT_DOCTORS];
  }

  let treatments = [];
  try {
    if (d1?.prepare) {
      const treatRows = await d1.prepare(
        "SELECT id, treatment_name, slug, short_description, full_description, benefits, duration_minutes FROM treatments WHERE status = 'active' ORDER BY display_order ASC"
      ).all();
      treatments = treatRows.results || [];
    }
  } catch {
    treatments = [];
  }
  if (!treatments || treatments.length === 0) {
    treatments = [...DEFAULT_CLINIC_TREATMENTS];
  }

  let faqs = [];
  try {
    if (d1?.prepare) {
      const faqRows = await d1.prepare(
        "SELECT question, answer, category FROM chatbot_faqs WHERE status = 'active' ORDER BY display_order ASC"
      ).all();
      faqs = faqRows.results || [];
    }
  } catch {
    faqs = [];
  }
  if (!faqs || faqs.length === 0) {
    faqs = [...DEFAULT_CLINIC_FAQS];
  }

  let offers = [];
  try {
    if (d1?.prepare) {
      const offerRows = await d1.prepare(
        "SELECT title, excerpt, start_date, end_date FROM site_content WHERE type = 'offer' AND published = 1 ORDER BY display_order ASC"
      ).all();
      offers = offerRows.results || [];
    }
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
  const { clinic, doctors, treatments, faqs } = context || {};
  const safeClinic = clinic || CLINIC_FALLBACK;
  const safeDoctors = doctors && doctors.length > 0 ? doctors : DEFAULT_DOCTORS;
  const safeTreatments = treatments && treatments.length > 0 ? treatments : DEFAULT_CLINIC_TREATMENTS;
  const safeFaqs = faqs && faqs.length > 0 ? faqs : DEFAULT_CLINIC_FAQS;

  // 1. Emergency / Urgent symptoms
  if (/(severe\s+pain|emergency|bleeding|swelling|fever|swollen|broken\s+tooth|accident|urgent|extreme\s+pain)/i.test(msg)) {
    return (
      `I'm sorry to hear you're experiencing pain or discomfort. For urgent dental concerns or severe pain, please call our clinic desk immediately at **${safeClinic.phone}** or WhatsApp **${safeClinic.whatsapp}**.\n\n` +
      `Our team will prioritize an emergency evaluation with Dr. Kishore Kumar. In the meantime, gently rinse your mouth with warm salt water and avoid chewing on that side. If you experience difficulty breathing or swallowing, please visit the nearest hospital emergency department right away.`
    );
  }

  // 2. Specific FAQ Match
  for (const f of safeFaqs) {
    const qClean = f.question.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const msgClean = msg.replace(/[^a-z0-9\s]/g, "");
    if (msgClean.includes(qClean) || qClean.includes(msgClean)) {
      return `${f.answer}\n\nWould you like to book an appointment with Dr. Kishore Kumar or ask anything else?`;
    }
  }

  // 3. Treatment: Root Canal Treatment
  if (/(root\s*canal|rct|pulp|nerve\s+pain|tooth\s+infection)/i.test(msg)) {
    return (
      `**Root Canal Treatment (RCT)** at ${safeClinic.name}:\n\n` +
      `• **Purpose**: A safe, tooth-saving procedure that removes infected or inflamed nerve tissue from inside the tooth, relieves pain, and preserves your natural tooth.\n` +
      `• **Procedure**: Performed under gentle local anesthesia using modern rotary endodontics for maximum comfort. We offer single-sitting and two-sitting options.\n` +
      `• **Restoration**: Finished with a custom zirconia or ceramic crown to restore full chewing strength.\n\n` +
      `Would you like to schedule an examination or book a visit? You can call us at **${safeClinic.phone}** or visit our online booking page.`
    );
  }

  // 4. Treatment: Dental Implants
  if (/(implant|implants|missing\s+tooth|teeth\s+replacement|artificial\s+tooth)/i.test(msg)) {
    return (
      `**Dental Implants** at ${safeClinic.name}:\n\n` +
      `• **Permanent Solution**: Titanium implants are placed securely into the jawbone, acting as sturdy artificial roots for replacement crowns or bridges.\n` +
      `• **Key Benefits**: Lifetime durability, 100% natural chewing power, and no alteration of adjacent healthy teeth.\n` +
      `• **Led by**: Dr. Kishore Kumar, Specialist Implantologist with 12+ years of surgical experience.\n\n` +
      `Would you like to schedule an implant consultation with digital X-ray evaluation? Call us at **${safeClinic.phone}**!`
    );
  }

  // 5. Treatment: Braces & Aligners
  if (/(brace|braces|aligner|aligners|invisalign|crooked\s+teeth|gap|straighten)/i.test(msg)) {
    return (
      `**Orthodontics & Clear Aligners** at ${safeClinic.name}:\n\n` +
      `• **Options**: We offer traditional metal braces, discreet ceramic braces, and removable invisible clear aligners.\n` +
      `• **Benefits**: Corrects teeth crowding, gaps, and overbite/underbite alignment for teens and adults.\n` +
      `• **Custom Plan**: Includes digital smile analysis and tailored aligner sets for smooth, comfortable progression.\n\n` +
      `Would you like to book an orthodontic evaluation? Call our clinic at **${safeClinic.phone}**.`
    );
  }

  // 6. Treatment: Teeth Cleaning & Whitening
  if (/(cleaning|scaling|stain|whitening|bleach|yellow\s+teeth|plaque|tartar)/i.test(msg)) {
    return (
      `**Teeth Cleaning & Laser Whitening** at ${safeClinic.name}:\n\n` +
      `• **Ultrasonic Scaling**: Painlessly removes stubborn tartar, plaque, and surface stains to protect your gums from bleeding and disease.\n` +
      `• **Laser Whitening**: Professional chairside whitening that lightens coffee, tea, and age stains by multiple shades safely in about 45 minutes.\n\n` +
      `Routine cleanings are recommended every 6 months! Would you like to reserve a hygiene session today?`
    );
  }

  // 7. General Treatments Overview ("What dental treatments do you offer?", "treatments", "services", "procedures", "offer")
  if (/(treatment|treatments|service|services|procedures|offer|do you provide|available\s+services|what\s+can\s+you\s+do)/i.test(msg)) {
    const list = safeTreatments
      .map((t) => `• **${t.treatment_name}**: ${t.short_description}`)
      .join("\n");

    return (
      `**${safeClinic.name}** offers comprehensive, gentle dental care in Erode:\n\n` +
      `${list}\n\n` +
      `All procedures are performed by Dr. Kishore Kumar using advanced digital technology and strict sterilization. Would you like to book an appointment or learn more about a specific procedure?`
    );
  }

  // 8. Toothache / Pain / Symptoms
  if (/(toothache|pain|ache|hurt|sensitive|sensitivity|cavity|decay)/i.test(msg)) {
    return (
      `If you're dealing with a toothache or sensitivity, here are immediate care tips:\n\n` +
      `1. **Rinse**: Swish gently with lukewarm salt water to reduce bacteria and swelling.\n` +
      `2. **Avoid**: Steer clear of very hot, cold, or sugary drinks, and do not chew hard foods on the painful side.\n` +
      `3. **Clinic Checkup**: A toothache usually signals deep decay, enamel breakdown, or pulp inflammation that requires chairside care.\n\n` +
      `Please call our clinic desk at **${safeClinic.phone}** or WhatsApp **${safeClinic.whatsapp}** to schedule a gentle examination with Dr. Kishore Kumar.`
    );
  }

  // 9. Location / Address / Directions
  if (/(where|location|address|directions|map|situated|place|landmark|how\s+to\s+reach)/i.test(msg)) {
    return (
      `**${safeClinic.name}** is conveniently located at:\n\n` +
      `📍 **${safeClinic.address}**\n\n` +
      `• **Landmark**: Soli Complex at Surampatti Four Road junction, Erode.\n` +
      `• **Accessibility**: Convenient ground-floor access with parking available.\n` +
      `• **Google Maps**: You can view verified directions or call our desk at **${safeClinic.phone}** if you need guidance on your way.`
    );
  }

  // 10. Clinic Timings / Hours
  if (/(hour|hours|timing|timings|time|open|close|sunday|working\s+days|when\s+can)/i.test(msg)) {
    return (
      `Our clinic hours at **${safeClinic.name}** are:\n\n` +
      `🕒 **${safeClinic.hours}**\n\n` +
      `• **Monday to Saturday**: 9:00 AM – 8:45 PM\n` +
      `• **Sunday**: Strictly reserved for scheduled emergency dental cases.\n\n` +
      `For emergency visits on Sunday, please call **${safeClinic.phone}** before arriving.`
    );
  }

  // 11. Booking / Appointments
  if (/(book|booking|appointment|schedule|slot|reserve|visit)/i.test(msg)) {
    return (
      `We'd be delighted to welcome you to **${safeClinic.name}**!\n\n` +
      `You can book your visit in three convenient ways:\n` +
      `1. **Online**: Visit our booking page (/booking) to pick your doctor, date, and live 30-minute time slot.\n` +
      `2. **Phone**: Call our front desk directly at **${safeClinic.phone}**.\n` +
      `3. **WhatsApp**: Message us anytime at **${safeClinic.whatsapp}**.\n\n` +
      `What date or treatment would you prefer for your visit?`
    );
  }

  // 12. Doctor Information
  if (/(doctor|dentist|dr\.|kishore|specialist|surgeon|qualification)/i.test(msg)) {
    const docInfo = safeDoctors
      .map((d) => `• **${d.name}** (${d.qualification || "BDS, MDS"}) – ${d.specialization} with ${d.experience} of clinical experience.\n  ${d.biography || ""}`)
      .join("\n\n");

    return (
      `Our clinical team is led by:\n\n${docInfo}\n\n` +
      `Dr. Kishore Kumar specializes in comfortable, painless dental procedures and long-lasting smile restoration. Would you like to book a consultation?`
    );
  }

  // 13. Cost / Pricing / Fees
  if (/(cost|price|fee|charges|rate|how\s+much|affordable)/i.test(msg)) {
    return (
      `At **${safeClinic.name}**, we believe in 100% transparent and affordable dental care with no hidden fees.\n\n` +
      `Because every smile and tooth condition is unique, exact costs depend on clinical evaluation during your chairside exam and digital X-ray.\n\n` +
      `Dr. Kishore Kumar will walk you through the treatment options and exact costs before any procedure begins. Call **${safeClinic.phone}** to book your consultation!`
    );
  }

  // General clinic welcome / fallback
  return (
    `Hello! 👋 Welcome to **${safeClinic.name}** in Erode. I'm here to assist you with any questions about our dental services, clinic timings, and appointment booking.\n\n` +
    `You can ask me about:\n` +
    `• **Treatments** (Root Canal, Implants, Braces, Teeth Cleaning, Whitening)\n` +
    `• **Clinic Hours & Location** at Surampatti Four Rd\n` +
    `• **Booking an Appointment** with Dr. Kishore Kumar\n\n` +
    `How can I assist your smile today?`
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
