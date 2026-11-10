import express from "express";
import { getD1Database, initD1Schema } from "./d1.mjs";
import { registerD1Routes } from "./d1-routes.mjs";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { GridFSBucket, MongoClient } from "mongodb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4102);

const CLINIC = {
  name: "Sri Saraswathi Dental Clinic",
  shortName: "Sri Saraswathi",
  address: "866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009",
  phone: "0424 427 2494",
  whatsapp: "+91 93457 43409",
  maps: "https://share.google/Izecs47hnhjCpmBBs",
};

const CLINIC_WHATSAPP = process.env.CLINIC_WHATSAPP || "919345743409";
const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const COOKIE_NAME = "sc_session";
const SESSION_DAYS = 7;
const SLOT_CAPACITY = 2;
const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGINS || process.env.SITE_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
);

fs.mkdirSync(DATA_DIR, { recursive: true });

const secretFile = path.join(DATA_DIR, "session-secret.txt");
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(48).toString("hex"));
const SESSION_SECRET = process.env.SESSION_SECRET || fs.readFileSync(secretFile, "utf8").trim();

let mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
    console.log("Started local in-memory MongoDB at:", mongoUri);
  } catch (err) {
    throw new Error("MONGODB_URI is required. Add it to the API environment before starting the clinic server.");
  }
}
const mongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });
await mongoClient.connect();
const database = mongoClient.db(process.env.MONGODB_DB || undefined);
const uploadsBucket = new GridFSBucket(database, { bucketName: "clinic_uploads" });
const users = database.collection("clinic_users");
const bookings = database.collection("clinic_bookings");
const siteContent = database.collection("clinic_site_content");
const contactEnquiries = database.collection("clinic_contact_enquiries");
const availabilitySettings = database.collection("clinic_availability_settings");
const counters = database.collection("clinic_counters");
const whatsappSettings = database.collection("clinic_whatsapp_settings");
const whatsappLogs = database.collection("clinic_whatsapp_logs");

await Promise.all([
  users.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } }),
  users.createIndex({ id: 1 }, { unique: true, partialFilterExpression: { id: { $type: "number" } } }),
  bookings.createIndex({ id: 1 }, { unique: true, partialFilterExpression: { id: { $type: "number" } } }),
  bookings.createIndex({ ref: 1 }, { unique: true, partialFilterExpression: { ref: { $type: "string" } } }),
  bookings.createIndex({ date: 1, time: 1, status: 1 }),
  bookings.createIndex({ user_id: 1, date: -1, id: -1 }),
  siteContent.createIndex({ id: 1 }, { unique: true, partialFilterExpression: { id: { $type: "number" } } }),
  siteContent.createIndex({ type: 1, published: 1, display_order: 1, id: -1 }),
  contactEnquiries.createIndex({ created_at: -1 }),
  whatsappLogs.createIndex({ created_at: -1 }),
  whatsappLogs.createIndex({ id: 1 }, { unique: true, partialFilterExpression: { id: { $type: "number" } } }),
]);

async function nextId(collectionName) {
  const counter = await counters.findOneAndUpdate(
    { _id: collectionName },
    { $inc: { sequence_value: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return counter.sequence_value;
}

async function migrateSqliteData() {
  const migrationId = "sqlite-to-mongodb-v2";
  if (await database.collection("clinic_migrations").findOne({ _id: migrationId })) return;
  const sqlitePath = path.join(DATA_DIR, "clinic.db");
  if (!fs.existsSync(sqlitePath)) return;

  const legacy = new DatabaseSync(sqlitePath, { readOnly: true });
  try {
    const legacyUsers = legacy.prepare("SELECT * FROM users ORDER BY id").all();
    const legacyBookings = legacy.prepare("SELECT * FROM bookings ORDER BY id").all();
    let legacyContent = [];
    try {
      legacyContent = legacy.prepare("SELECT * FROM site_content ORDER BY id").all();
    } catch {
      // Older clinic databases predate managed website content.
    }
    for (const [collection, rows] of [[users, legacyUsers], [bookings, legacyBookings], [siteContent, legacyContent]]) {
      if (rows.length) {
        await collection.bulkWrite(rows.map((row) => ({
          updateOne: { filter: { id: row.id }, update: { $setOnInsert: row }, upsert: true },
        })));
      }
    }
    for (const [name, collection] of [["clinic_users", users], ["clinic_bookings", bookings], ["clinic_site_content", siteContent]]) {
      const latest = await collection.find({}).sort({ id: -1 }).limit(1).next();
      if (latest?.id) await counters.updateOne({ _id: name }, { $max: { sequence_value: latest.id } }, { upsert: true });
    }
    await database.collection("clinic_migrations").insertOne({ _id: migrationId, completedAt: new Date().toISOString() });
    console.log("Migrated " + legacyUsers.length + " users, " + legacyBookings.length + " bookings, and " + legacyContent.length + " content items from the local SQLite database.");
  } finally {
    legacy.close();
  }
}

await migrateSqliteData();

/* ---------------------------------------------------------------- helpers */

const SERVICES = {
  "general-dentistry": "General Check-up & Cleaning",
  "cosmetic-dentistry": "Cosmetic Dentistry",
  "teeth-whitening": "Teeth Whitening",
  "dental-implants": "Dental Implants",
  orthodontics: "Orthodontics (Braces / Aligners)",
  "root-canal": "Root Canal Treatment",
  "pediatric-dentistry": "Pediatric Dentistry",
  "gum-treatment": "Gum Treatment",
  "wisdom-tooth": "Wisdom Tooth Extraction",
  "crowns-bridges": "Crowns & Bridges",
  veneers: "Veneers",
  dentures: "Dentures",
  "smile-makeover": "Smile Makeover",
  emergency: "Emergency Visit",
  consultation: "Free Consultation",
};

const SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM",
  "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM",
];

const STATUS_LABELS = {
  pending: "Pending confirmation",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const DENTISTS = ["Dr. Kishore Kumar"];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const nowISO = () => new Date().toISOString();

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return value;
}

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const digits = (phone) => String(phone || "").replace(/\D/g, "").replace(/^0+/, "");

function waNumber(phone) {
  const d = digits(phone);
  if (!d) return "";
  if (d.length === 10) return `91${d}`;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  return d;
}

const waLink = (phone, text) => {
  const number = waNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
};

const smsLink = (phone, text) => {
  const d = String(phone || "").replace(/\D/g, "");
  if (!d) return null;
  const number = d.length === 10 ? `+91${d}` : `+${d}`;
  return `sms:${number}?body=${encodeURIComponent(text)}`;
};

function clinicText(booking) {
  return [
    `New booking ${booking.ref}`,
    `Patient: ${booking.patient_name}`,
    `Phone: ${booking.patient_phone}`,
    `Email: ${booking.patient_email}`,
    `Service: ${booking.service_label}`,
    `When: ${formatDate(booking.date)} at ${booking.time}`,
    booking.dentist ? `Dentist: ${booking.dentist}` : null,
    booking.notes ? `Notes: ${booking.notes}` : null,
    `Status: ${STATUS_LABELS[booking.status]}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function patientText(booking, kind) {
  const first = booking.patient_name.split(" ")[0];
  if (kind === "confirmation") {
    return [
      `Hi ${first}, your ${CLINIC.name} appointment is booked.`,
      `Ref: ${booking.ref}`,
      `Service: ${booking.service_label}`,
      `Date: ${formatDate(booking.date)} at ${booking.time}`,
      `Dentist: ${booking.dentist || "First available dentist"}`,
      `Address: ${CLINIC.address}`,
      `Phone: ${CLINIC.phone}`,
      `Map: ${CLINIC.maps}`,
      "Reply here for any changes. See you soon!",
    ].join("\n");
  }
  return [
    `Hi ${first}, update on ${booking.ref} (${booking.service_label}) on ${formatDate(booking.date)} at ${booking.time}.`,
    `Your appointment is now: ${STATUS_LABELS[booking.status]}.`,
    booking.status === "cancelled" ? "If this was a mistake, reply here and we'll rebook you." : null,
    `— ${CLINIC.name}`,
  ]
    .filter(Boolean)
    .join("\n");
}


/* ----------------------------------------------------------- whatsapp engine */

function defaultWhatsAppSettings() {
  return {
    enabled: true,
    clinicPhone: "9345743409",
    clinicInternational: "+919345743409",
    clinicName: "Sri Saraswathi Dental Clinic",
    provider: "green_api", // "green_api" | "ultramsg" | "n8n" | "meta" | "both" | "simulated"
    greenApiInstanceId: process.env.GREEN_API_INSTANCE_ID || "",
    greenApiToken: process.env.GREEN_API_TOKEN || "",
    ultraMsgInstanceId: process.env.ULTRAMSG_INSTANCE_ID || "",
    ultraMsgToken: process.env.ULTRAMSG_TOKEN || "",
    n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || "",
    n8nAuthToken: process.env.N8N_AUTH_TOKEN || "",
    metaPhoneNumberId: process.env.META_WA_PHONE_NUMBER_ID || "",
    metaWabaId: process.env.META_WA_WABA_ID || "",
    metaAccessToken: process.env.META_WA_ACCESS_TOKEN || "",
    notifyNewBooking: true,
    notifyConfirmed: true,
    notifyRejected: true,
    notifyRescheduled: true,
    notifyReminder: true,
    notifyCustomReply: true,
    templates: {
      newBookingClinic: "🔔 NEW APPOINTMENT RECEIVED!\n\nSri Saraswathi Dental Clinic\n\nAppointment ID: {appointment_id}\nPatient Name: {patient_name}\nPhone: {patient_phone}\nTreatment: {treatment_name}\nRequested Date: {appointment_date}\nRequested Time: {appointment_time}\n\nPlease check clinic availability and manage this booking in your Admin Dashboard:\n{admin_link}\n\nStatus: PENDING",
      patientConfirmed: "✅ APPOINTMENT CONFIRMED!\n\nDear {patient_name},\n\nYour appointment at Sri Saraswathi Dental Clinic has been confirmed.\n\nAppointment ID: {appointment_id}\nTreatment: {treatment_name}\nDate: {appointment_date}\nTime: {appointment_time}\nDoctor: {doctor_name}\nLocation: Sri Saraswathi Dental Clinic, 47, Perundurai Road, Erode - 638011\n\nNeed directions or rescheduling? Contact us at +919345743409.\nSee you soon!",
      patientRejected: "❌ APPOINTMENT UPDATE\n\nDear {patient_name},\n\nWe regret to inform you that your requested appointment could not be confirmed.\n\nAppointment ID: {appointment_id}\nRequested Date: {appointment_date}\nReason: {rejection_reason}\n\nPlease call us at +919345743409 or book another time slot online.\n— Sri Saraswathi Dental Clinic",
      patientRescheduled: "🗓️ APPOINTMENT RESCHEDULED\n\nDear {patient_name},\n\nYour appointment at Sri Saraswathi Dental Clinic has been rescheduled.\n\nAppointment ID: {appointment_id}\nTreatment: {treatment_name}\nNew Date: {appointment_date}\nNew Time: {appointment_time}\nDoctor: {doctor_name}\nLocation: Sri Saraswathi Dental Clinic, 47, Perundurai Road, Erode - 638011\n\nIf this timing does not suit you, please call us at +919345743409.",
      patientReminder: "⏰ APPOINTMENT REMINDER\n\nDear {patient_name},\n\nThis is a friendly reminder for your upcoming dental visit tomorrow at Sri Saraswathi Dental Clinic.\n\nAppointment ID: {appointment_id}\nTreatment: {treatment_name}\nDate: {appointment_date}\nTime: {appointment_time}\nDoctor: {doctor_name}\nAddress: 47, Perundurai Road, Erode - 638011\n\nWe look forward to seeing you! For queries, contact +919345743409."
    }
  };
}

async function readWhatsAppSettings() {
  const stored = await whatsappSettings.findOne({ _id: "clinic-whatsapp-default" });
  if (!stored) return defaultWhatsAppSettings();
  return {
    ...defaultWhatsAppSettings(),
    ...stored,
    templates: {
      ...defaultWhatsAppSettings().templates,
      ...(stored.templates || {})
    }
  };
}

function sanitizeWhatsAppSettingsForClient(settings) {
  const safe = { ...settings };
  if (safe.metaAccessToken) {
    safe.metaAccessTokenConfigured = true;
    safe.metaAccessTokenPreview = safe.metaAccessToken.length > 8
      ? `${safe.metaAccessToken.slice(0, 4)}••••${safe.metaAccessToken.slice(-4)}`
      : "••••••••";
    delete safe.metaAccessToken;
  } else {
    safe.metaAccessTokenConfigured = false;
    safe.metaAccessTokenPreview = "";
  }
  return safe;
}

function interpolateTemplate(template, vars) {
  return String(template || "").replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

async function dispatchWhatsAppAutomation({ event, booking, extra = {} }) {
  const settings = await readWhatsAppSettings();
  if (!settings.enabled) {
    return { status: "skipped", reason: "WhatsApp automation disabled" };
  }

  const toggleMap = {
    "booking.created": settings.notifyNewBooking,
    "booking.confirmed": settings.notifyConfirmed,
    "booking.rejected": settings.notifyRejected,
    "booking.rescheduled": settings.notifyRescheduled,
    "booking.reminder": settings.notifyReminder,
    "admin.custom_reply": settings.notifyCustomReply,
  };

  if (toggleMap[event] === false) {
    return { status: "skipped", reason: `Event ${event} disabled in settings` };
  }

  const isClinicRecipient = event === "booking.created";
  const recipient = isClinicRecipient
    ? (settings.clinicInternational || "+919345743409")
    : waNumber(booking.patient_phone);

  const cleanRecipientDigits = String(recipient || "").replace(/\D/g, "");

  const vars = {
    appointment_id: booking.ref || "SC-TEMP",
    patient_name: booking.patient_name || "Patient",
    patient_phone: booking.patient_phone || "",
    treatment_name: booking.service_label || "Dental Consultation",
    appointment_date: formatDate(booking.date),
    appointment_time: booking.time || "Scheduled Slot",
    doctor_name: booking.dentist || "Dr. Kishore Kumar",
    rejection_reason: extra.reason || "Schedule conflict",
    custom_message: extra.message || "",
    admin_link: `${process.env.SITE_ORIGIN || "http://localhost:5173"}/dashboard/appointments`,
  };

  let renderedMessage = "";
  if (event === "booking.created") {
    renderedMessage = interpolateTemplate(settings.templates.newBookingClinic, vars);
  } else if (event === "booking.confirmed") {
    renderedMessage = interpolateTemplate(settings.templates.patientConfirmed, vars);
  } else if (event === "booking.rejected") {
    renderedMessage = interpolateTemplate(settings.templates.patientRejected, vars);
  } else if (event === "booking.rescheduled") {
    renderedMessage = interpolateTemplate(settings.templates.patientRescheduled, vars);
  } else if (event === "booking.reminder") {
    renderedMessage = interpolateTemplate(settings.templates.patientReminder, vars);
  } else if (event === "admin.custom_reply") {
    renderedMessage = extra.message || `Hi ${(booking.patient_name || "").split(" ")[0]}, regarding your appointment ${booking.ref} at ${settings.clinicName}.`;
  }

  const payload = {
    event,
    timestamp: nowISO(),
    recipient,
    recipientDigits: cleanRecipientDigits,
    recipientType: isClinicRecipient ? "clinic" : "patient",
    message: renderedMessage,
    booking: {
      id: booking.id,
      ref: booking.ref,
      patient_name: booking.patient_name,
      patient_phone: booking.patient_phone,
      patient_email: booking.patient_email,
      service_label: booking.service_label,
      date: booking.date,
      dateLabel: formatDate(booking.date),
      time: booking.time,
      dentist: booking.dentist,
      status: booking.status,
    },
    clinic: {
      name: settings.clinicName,
      whatsapp: settings.clinicInternational,
      phone: CLINIC.phone,
      address: CLINIC.address,
    },
    extra,
  };

  const dispatchResults = [];
  let finalStatus = "simulated";
  let finalError = null;

  // 1. Dispatch to n8n Webhook
  if (settings.n8nWebhookUrl && (settings.provider === "n8n" || settings.provider === "both")) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (settings.n8nAuthToken) {
        headers["x-webhook-token"] = settings.n8nAuthToken;
        headers["Authorization"] = `Bearer ${settings.n8nAuthToken}`;
      }
      const response = await fetch(settings.n8nWebhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        dispatchResults.push({ provider: "n8n", status: "delivered", code: response.status });
        finalStatus = "delivered";
      } else {
        const errorText = await response.text().catch(() => "");
        dispatchResults.push({ provider: "n8n", status: "failed", code: response.status, error: errorText });
        finalError = `n8n responded with status ${response.status}: ${errorText}`;
      }
    } catch (err) {
      dispatchResults.push({ provider: "n8n", status: "failed", error: err.message });
      finalError = `n8n webhook error: ${err.message}`;
    }
  }

  // 2. Dispatch to Meta WhatsApp Cloud API
  if (settings.metaPhoneNumberId && settings.metaAccessToken && (settings.provider === "meta" || settings.provider === "both")) {
    try {
      const metaUrl = `https://graph.facebook.com/v21.0/${settings.metaPhoneNumberId}/messages`;
      const metaBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanRecipientDigits,
        type: "text",
        text: { preview_url: false, body: renderedMessage },
      };
      const response = await fetch(metaUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.metaAccessToken}`,
        },
        body: JSON.stringify(metaBody),
      });
      const metaData = await response.json().catch(() => ({}));
      if (response.ok && metaData.messages) {
        dispatchResults.push({ provider: "meta", status: "delivered", messageId: metaData.messages[0]?.id });
        finalStatus = "delivered";
      } else {
        const msg = metaData.error?.message || "Meta API error";
        dispatchResults.push({ provider: "meta", status: "failed", error: msg });
        if (!finalError) finalError = `Meta API error: ${msg}`;
      }
    } catch (err) {
      dispatchResults.push({ provider: "meta", status: "failed", error: err.message });
      if (!finalError) finalError = `Meta fetch error: ${err.message}`;
    }
  }


  // 3. Dispatch to Green-API (Instant WhatsApp QR Gateway)
  if (settings.greenApiInstanceId && settings.greenApiToken && (settings.provider === "green_api" || settings.provider === "both")) {
    try {
      const targetPhone = cleanRecipientDigits.startsWith("91") ? cleanRecipientDigits : (`91${cleanRecipientDigits}`);
      const greenUrl = `https://api.green-api.com/waInstance${settings.greenApiInstanceId}/sendMessage/${settings.greenApiToken}`;
      const response = await fetch(greenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: `${targetPhone}@c.us`,
          message: renderedMessage,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.idMessage) {
        dispatchResults.push({ provider: "green_api", status: "delivered", messageId: data.idMessage });
        finalStatus = "delivered";
      } else {
        const errorText = JSON.stringify(data);
        dispatchResults.push({ provider: "green_api", status: "failed", error: errorText });
        if (!finalError) finalError = `Green-API error: ${errorText}`;
      }
    } catch (err) {
      dispatchResults.push({ provider: "green_api", status: "failed", error: err.message });
      if (!finalError) finalError = `Green-API network error: ${err.message}`;
    }
  }

  // 4. Dispatch to UltraMsg (Instant WhatsApp QR Gateway)
  if (settings.ultraMsgInstanceId && settings.ultraMsgToken && (settings.provider === "ultramsg" || settings.provider === "both")) {
    try {
      const targetPhone = cleanRecipientDigits.startsWith("91") ? cleanRecipientDigits : (`91${cleanRecipientDigits}`);
      const ultraUrl = `https://api.ultramsg.com/${settings.ultraMsgInstanceId}/messages/chat`;
      const response = await fetch(ultraUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: settings.ultraMsgToken,
          to: targetPhone,
          body: renderedMessage,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.sent === "true" || data.id)) {
        dispatchResults.push({ provider: "ultramsg", status: "delivered", messageId: data.id });
        finalStatus = "delivered";
      } else {
        const errorText = JSON.stringify(data);
        dispatchResults.push({ provider: "ultramsg", status: "failed", error: errorText });
        if (!finalError) finalError = `UltraMsg error: ${errorText}`;
      }
    } catch (err) {
      dispatchResults.push({ provider: "ultramsg", status: "failed", error: err.message });
      if (!finalError) finalError = `UltraMsg network error: ${err.message}`;
    }
  }

  // If neither n8n nor Meta was invoked
  if (dispatchResults.length === 0) {
    finalStatus = "simulated";
    dispatchResults.push({
      provider: "simulated",
      status: "simulated",
      info: "Logged successfully. Configure n8n Webhook URL or Meta Cloud API credentials in Settings for live sending.",
    });
  }

  // Record audit log in clinic_whatsapp_logs
  const logEntry = {
    id: await nextId("clinic_whatsapp_logs"),
    event,
    recipient,
    recipientType: isClinicRecipient ? "clinic" : "patient",
    patientName: booking.patient_name,
    ref: booking.ref,
    message: renderedMessage,
    provider: settings.provider,
    status: finalStatus,
    results: dispatchResults,
    error: finalError,
    created_at: nowISO(),
  };

  try {
    await whatsappLogs.insertOne(logEntry);
  } catch (err) {
    console.error("Failed to insert whatsapp log:", err);
  }

  return { status: finalStatus, logId: logEntry.id, results: dispatchResults, message: renderedMessage };
}

/* ------------------------------------------------------------------- auth */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");

function signSession(user) {
  const payload = b64url(
    JSON.stringify({ uid: user.id, role: user.role, exp: Date.now() + SESSION_DAYS * 864e5 }),
  );
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function readSession(token) {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

const publicUser = (row) =>
  row && {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
  };

async function loadUser(id) {
  return users.findOne({ id: Number(id) });
}

function setSessionCookie(res, user) {
  const token = signSession(user);
  const attributes = process.env.NODE_ENV === "production" ? "; Secure; SameSite=None" : "; SameSite=Lax";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly${attributes}; Path=/; Max-Age=${SESSION_DAYS * 86400}`,
  );
}

function clearSessionCookie(res) {
  const attributes = process.env.NODE_ENV === "production" ? "; Secure; SameSite=None" : "; SameSite=Lax";
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly${attributes}; Path=/; Max-Age=0`);
}

async function currentUser(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  const session = readSession(token);
  if (!session) return null;
  const row = await loadUser(session.uid);
  if (!row || row.role !== session.role) return null;
  return row;
}

async function requireAuth(req, _res, next) {
  try {
    const user = await currentUser(req);
    if (!user) return next(new HttpError(401, "Please sign in to continue."));
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAdmin(req, _res, next) {
  try {
    const user = await currentUser(req);
    if (!user) return next(new HttpError(401, "Please sign in to continue."));
    if (user.role !== "admin") return next(new HttpError(403, "Admin access only."));
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/* --------------------------------------------------------------- bookings */

const slotIndex = (time) => {
  const index = SLOTS.indexOf(time);
  return index === -1 ? 99 : index;
};

function serializeBooking(row) {
  return {
    id: row.id,
    ref: row.ref,
    patientName: row.patient_name,
    patientPhone: row.patient_phone,
    patientEmail: row.patient_email,
    service: row.service,
    serviceLabel: row.service_label,
    date: row.date,
    dateLabel: formatDate(row.date),
    time: row.time,
    dentist: row.dentist || "First available",
    notes: row.notes || "",
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function bookingWithLinks(row) {
  const booking = serializeBooking(row);
  const patientMsg = patientText(row, booking.status === "pending" ? "confirmation" : "status");
  return {
    ...booking,
    sms: {
      patient: smsLink(row.patient_phone, patientMsg),
    },
    whatsapp: {
      patient: waLink(row.patient_phone, patientMsg),
      clinic: waLink(CLINIC_WHATSAPP, clinicText(row)),
    },
  };
}

async function activeBookingsAt(date, time, ignoreId = 0) {
  return bookings.countDocuments({
    date,
    time,
    status: { $nin: ["cancelled", "no_show"] },
    id: { $ne: ignoreId },
  });
}

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const defaultAvailabilitySettings = () => ({
  weeklyHours: WEEK_DAYS.map((day) => ({
    day,
    enabled: day !== "Sunday",
    start: day === "Saturday" ? "09:00" : "09:30",
    end: day === "Saturday" ? "14:00" : "18:30",
    breaks: [],
  })),
  appointmentDuration: 30,
  maxPatientsPerSlot: 1,
  blockedDates: [],
});

const timeMinutes = (value) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""))) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

const formatSlotTime = (minutes) => {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hour = hour24 % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${hour24 < 12 ? "AM" : "PM"}`;
};

async function readAvailabilitySettings() {
  const stored = await availabilitySettings.findOne({ _id: "clinic-default" });
  return stored ? { ...defaultAvailabilitySettings(), ...stored } : defaultAvailabilitySettings();
}

function normalizeAvailabilitySettings(input) {
  const body = input && typeof input === "object" ? input : {};
  const defaults = defaultAvailabilitySettings();
  if (![15, 30, 45, 60].includes(Number(body.appointmentDuration))) throw new HttpError(400, "Choose an appointment duration between 15 and 60 minutes.");
  const capacity = Number(body.maxPatientsPerSlot);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10) throw new HttpError(400, "Maximum patients per slot must be between 1 and 10.");
  if (!Array.isArray(body.weeklyHours) || body.weeklyHours.length !== 7) throw new HttpError(400, "Add all seven weekly schedule days.");
  const weeklyHours = WEEK_DAYS.map((day, index) => {
    const row = body.weeklyHours[index] || {};
    const start = String(row.start || "");
    const end = String(row.end || "");
    const startAt = timeMinutes(start);
    const endAt = timeMinutes(end);
    if (row.day !== day || startAt === null || endAt === null || endAt <= startAt) throw new HttpError(400, `Set valid working hours for ${day}.`);
    const breaks = Array.isArray(row.breaks) ? row.breaks.slice(0, 4).map((item) => {
      const breakStart = String(item.start || "");
      const breakEnd = String(item.end || "");
      const breakStartAt = timeMinutes(breakStart);
      const breakEndAt = timeMinutes(breakEnd);
      if (breakStartAt === null || breakEndAt === null || breakEndAt <= breakStartAt || breakStartAt < startAt || breakEndAt > endAt) throw new HttpError(400, `Set a valid break within ${day}'s working hours.`);
      return { start: breakStart, end: breakEnd };
    }) : [];
    return { day, enabled: Boolean(row.enabled), start, end, breaks };
  });
  const blockedDates = Array.isArray(body.blockedDates) ? body.blockedDates.slice(0, 100).map((item) => {
    const date = validDate(String(item.date || ""));
    const type = item.type === "range" ? "range" : "full";
    const reason = String(item.reason || "Clinic closed").trim().slice(0, 80);
    const notes = String(item.notes || "").trim().slice(0, 250);
    if (!date || !reason) throw new HttpError(400, "Each blocked date needs a valid date and reason.");
    const start = type === "range" ? String(item.start || "") : "";
    const end = type === "range" ? String(item.end || "") : "";
    if (type === "range" && (timeMinutes(start) === null || timeMinutes(end) === null || timeMinutes(end) <= timeMinutes(start))) throw new HttpError(400, "Choose a valid time range for the blocked date.");
    return { id: String(item.id || crypto.randomUUID()), date, type, start, end, reason, notes };
  }) : [];
  return { ...defaults, weeklyHours, appointmentDuration: Number(body.appointmentDuration), maxPatientsPerSlot: capacity, blockedDates };
}

async function getAvailabilityForDate(iso) {
  const settings = await readAvailabilitySettings();
  const date = new Date(`${iso}T00:00:00`);
  const day = WEEK_DAYS[(date.getDay() + 6) % 7];
  const hours = settings.weeklyHours.find((item) => item.day === day);
  const blocked = settings.blockedDates.find((item) => item.date === iso);
  if (!hours?.enabled || blocked?.type === "full") return { date: iso, closed: true, slots: [] };
  const start = timeMinutes(hours.start);
  const end = timeMinutes(hours.end);
  const step = (Number(settings.appointmentDuration) || 30) + 10;
  const breaks = [...hours.breaks, ...(blocked?.type === "range" ? [{ start: blocked.start, end: blocked.end }] : [])]
    .map((item) => ({ start: timeMinutes(item.start), end: timeMinutes(item.end) }));
  const slots = [];
  for (let minute = start; minute + step <= end; minute += step) {
    if (breaks.some((item) => item.start !== null && item.end !== null && minute < item.end && minute + step > item.start)) continue;
    const time = formatSlotTime(minute);
    const used = await activeBookingsAt(iso, time);
    slots.push({ time, remaining: Math.max(0, settings.maxPatientsPerSlot - used) });
  }
  return { date: iso, closed: false, slots };
}

async function validateSlot(date, time, ignoreId = 0) {
  const iso = validDate(date);
  if (!iso) throw new HttpError(400, "Please choose a valid date.");
  if (iso < todayISO()) throw new HttpError(400, "That date has already passed.");
  const availability = await getAvailabilityForDate(iso);
  if (availability.closed) throw new HttpError(400, "The clinic is closed on this date. Please choose another day.");
  const slot = availability.slots.find((item) => item.time === time);
  if (!slot) throw new HttpError(400, "Please choose an available time slot.");
  const settings = await readAvailabilitySettings();
  if (await activeBookingsAt(iso, time, ignoreId) >= settings.maxPatientsPerSlot) {
    throw new HttpError(409, "That time slot just filled up. Please pick another time.");
  }
  return iso;
}

async function makeRef(date) {
  const compact = date.slice(2).replace(/-/g, "");
  let ref;
  do {
    ref = "SC-" + compact + "-" + crypto.randomBytes(2).toString("hex").toUpperCase();
  } while (await bookings.findOne({ ref }, { projection: { _id: 1 } }));
  return ref;
}

async function createBooking({ user, patientName, patientPhone, patientEmail, service, date, time, dentist, notes, dob, source, status }) {
  const managedTreatment = await siteContent.findOne({ type: "treatment", slug: service, published: 1, available_for_booking: { $ne: 0 } });
  const label = SERVICES[service] || managedTreatment?.title;
  if (!label) throw new HttpError(400, "Please choose a valid service.");
  const iso = await validateSlot(date, time);
  const managedDoctor = dentist ? await siteContent.findOne({ type: "doctor", title: dentist, published: 1 }) : null;
  if (dentist && !DENTISTS.includes(dentist) && !managedDoctor) throw new HttpError(400, "Please choose a valid dentist.");
  const stamp = nowISO();
  const row = {
    id: await nextId("clinic_bookings"),
    ref: await makeRef(iso),
    user_id: user?.id ?? null,
    patient_name: patientName,
    patient_phone: patientPhone,
    patient_email: patientEmail,
    service,
    service_label: label,
    date: iso,
    time,
    dentist: dentist || null,
    notes: notes || null,
    dob: dob || null,
    source: source || null,
    status,
    created_at: stamp,
    updated_at: stamp,
  };
  await bookings.insertOne(row);
  try {
    const d1Db = getD1Database();
    d1Db.prepare(`INSERT OR REPLACE INTO appointments (id, patient_name, phone, email, appointment_date, appointment_time, message, status, admin_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(row.id, row.patient_name, row.patient_phone || "", row.patient_email || "", row.date, row.time, row.notes || row.service_label || "", row.status || "Pending", "", row.created_at, row.updated_at).run();
  } catch (e) {
    console.error("D1 booking sync error:", e.message);
  }
  return row;
}

/* ------------------------------------------------------------------ app */

const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (ALLOWED_ORIGINS.size === 0 && process.env.NODE_ENV === "production") {
      return res.status(503).json({ error: "Clinic API setup is incomplete. Please contact the clinic." });
    }
    if (ALLOWED_ORIGINS.size > 0 && !ALLOWED_ORIGINS.has(normalizedOrigin)) {
      return res.status(403).json({ error: "This site is not allowed to access the clinic API." });
    }
    if (ALLOWED_ORIGINS.has(normalizedOrigin)) {
      res.setHeader("Access-Control-Allow-Origin", normalizedOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
      res.setHeader("Vary", "Origin");
    }
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});
app.use(express.json({ limit: "64kb" }));

// Cloudflare D1 SQLite Database Engine & Routes
const d1 = getD1Database();
await initD1Schema(d1);
registerD1Routes(app, d1, SESSION_SECRET);
console.log("Cloudflare D1 SQLite Database Engine initialized & all 11 tables active!");

function syncContentToD1(operation, row) {
  if (!d1 || !row) return;
  try {
    const type = row.type;
    const now = new Date().toISOString();
    if (operation === "DELETE") {
      if (type === "doctor") d1.prepare("DELETE FROM doctors WHERE id = ?").bind(row.id).run();
      else if (type === "treatment") d1.prepare("DELETE FROM treatments WHERE id = ?").bind(row.id).run();
      else if (type === "blog") d1.prepare("DELETE FROM blogs WHERE id = ?").bind(row.id).run();
      else if (type === "gallery") {
        d1.prepare("DELETE FROM gallery WHERE id = ?").bind(row.id).run();
        d1.prepare("DELETE FROM before_after WHERE id = ?").bind(row.id).run();
      }
      else if (type === "reel" || type === "video") d1.prepare("DELETE FROM reels WHERE id = ?").bind(row.id).run();
      else if (type === "offer") d1.prepare("DELETE FROM offers WHERE id = ?").bind(row.id).run();
      return;
    }

    if (type === "doctor") {
      const exists = d1.prepare("SELECT id FROM doctors WHERE id = ?").bind(row.id).first();
      const status = row.published ? "active" : "inactive";
      if (exists) {
        d1.prepare(`UPDATE doctors SET name = ?, qualification = ?, specialization = ?, experience = ?, biography = ?, profile_image_url = ?, status = ?, display_order = ?, updated_at = ? WHERE id = ?`)
          .bind(row.title || "", row.qualification || row.category || "", row.specialization || row.subtitle || "", row.years_experience || "", row.body || row.excerpt || "", row.media_url || "", status, Number(row.display_order) || 1, now, row.id).run();
      } else {
        d1.prepare(`INSERT OR REPLACE INTO doctors (id, name, qualification, specialization, experience, biography, profile_image_url, status, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(row.id, row.title || "", row.qualification || row.category || "", row.specialization || row.subtitle || "", row.years_experience || "", row.body || row.excerpt || "", row.media_url || "", status, Number(row.display_order) || 1, now, now).run();
      }
    } else if (type === "treatment") {
      const exists = d1.prepare("SELECT id FROM treatments WHERE id = ?").bind(row.id).first();
      const status = row.published ? "active" : "inactive";
      const slug = row.slug || String(row.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const benefits = JSON.stringify([row.subtitle, row.excerpt].filter(Boolean));
      if (exists) {
        d1.prepare(`UPDATE treatments SET treatment_name = ?, slug = ?, short_description = ?, full_description = ?, benefits = ?, treatment_image_url = ?, status = ?, display_order = ?, updated_at = ? WHERE id = ?`)
          .bind(row.title || "", slug, row.subtitle || "", row.body || row.excerpt || "", benefits, row.media_url || "", status, Number(row.display_order) || 1, now, row.id).run();
      } else {
        d1.prepare(`INSERT OR REPLACE INTO treatments (id, treatment_name, slug, short_description, full_description, benefits, treatment_image_url, status, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(row.id, row.title || "", slug, row.subtitle || "", row.body || row.excerpt || "", benefits, row.media_url || "", status, Number(row.display_order) || 1, now, now).run();
      }
    } else if (type === "blog") {
      const exists = d1.prepare("SELECT id FROM blogs WHERE id = ?").bind(row.id).first();
      const status = row.published ? "published" : "draft";
      const slug = row.slug || String(row.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (exists) {
        d1.prepare(`UPDATE blogs SET title = ?, slug = ?, category = ?, description = ?, content = ?, cover_image_url = ?, status = ?, published_at = ?, updated_at = ? WHERE id = ?`)
          .bind(row.title || "", slug, row.category || "General", row.subtitle || row.excerpt || "", row.body || "", row.media_url || "", status, row.published_at || now, now, row.id).run();
      } else {
        d1.prepare(`INSERT OR REPLACE INTO blogs (id, title, slug, category, description, content, cover_image_url, status, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(row.id, row.title || "", slug, row.category || "General", row.subtitle || row.excerpt || "", row.body || "", row.media_url || "", status, row.published_at || now, now, now).run();
      }
    } else if (type === "gallery") {
      const exists = d1.prepare("SELECT id FROM gallery WHERE id = ?").bind(row.id).first();
      const status = row.published ? "active" : "inactive";
      const img = row.media_url || row.after_image || row.before_image || "";
      if (exists) {
        d1.prepare(`UPDATE gallery SET title = ?, description = ?, image_url = ?, category = ?, status = ?, display_order = ? WHERE id = ?`)
          .bind(row.title || "", row.body || row.subtitle || "", img, row.category || "general", status, Number(row.display_order) || 1, row.id).run();
      } else {
        d1.prepare(`INSERT OR REPLACE INTO gallery (id, title, description, image_url, category, status, display_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(row.id, row.title || "", row.body || row.subtitle || "", img, row.category || "general", status, Number(row.display_order) || 1, now).run();
      }
      if (row.before_image && row.after_image) {
        d1.prepare(`INSERT OR REPLACE INTO before_after (id, title, description, before_image_url, after_image_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .bind(row.id, row.title || "Smile Transformation", row.body || row.subtitle || "", row.before_image, row.after_image, status, now).run();
      }
    } else if (type === "reel" || type === "video") {
      const exists = d1.prepare("SELECT id FROM reels WHERE id = ?").bind(row.id).first();
      const status = row.published ? "active" : "inactive";
      if (exists) {
        d1.prepare(`UPDATE reels SET title = ?, description = ?, video_url = ?, thumbnail_url = ?, homepage_visibility = ?, status = ?, display_order = ? WHERE id = ?`)
          .bind(row.title || "", row.body || row.subtitle || "", row.media_url || "", row.mobile_media_url || "", row.homepage_highlight ? 1 : 0, status, Number(row.display_order) || 1, row.id).run();
      } else {
        d1.prepare(`INSERT OR REPLACE INTO reels (id, title, description, video_url, thumbnail_url, homepage_visibility, status, display_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(row.id, row.title || "", row.body || row.subtitle || "", row.media_url || "", row.mobile_media_url || "", row.homepage_highlight ? 1 : 0, status, Number(row.display_order) || 1, now).run();
      }
    } else if (type === "offer") {
      const exists = d1.prepare("SELECT id FROM offers WHERE id = ?").bind(row.id).first();
      const status = row.published ? "active" : "inactive";
      if (exists) {
        d1.prepare(`UPDATE offers SET title = ?, description = ?, image_url = ?, start_date = ?, end_date = ?, homepage_visibility = ?, status = ? WHERE id = ?`)
          .bind(row.title || "", row.body || row.subtitle || "", row.media_url || "", row.start_date || "", row.end_date || "", row.homepage_highlight ? 1 : 0, status, row.id).run();
      } else {
        d1.prepare(`INSERT OR REPLACE INTO offers (id, title, description, image_url, start_date, end_date, homepage_visibility, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(row.id, row.title || "", row.body || row.subtitle || "", row.media_url || "", row.start_date || "", row.end_date || "", row.homepage_highlight ? 1 : 0, status, now).run();
      }
    }
  } catch (err) {
    console.error("Cloudflare D1 sync error:", err.message);
  }
}

const SITE_CONTENT_TYPES = new Set(["hero", "blog", "offer", "gallery", "reel", "video", "image", "badge", "treatment", "doctor", "achievement", "testimonial"]);
const UPLOAD_MIME_EXTENSIONS = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/svg+xml", ".svg"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
  ["image/gif", ".gif"],
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/quicktime", ".mov"],
]);
function serializeSiteContent(row) {
  return {
    id: row.id,
    type: row.type,
    slug: row.slug ?? "",
    title: row.title,
    subtitle: row.subtitle,
    category: row.category ?? "",
    author: row.author ?? "",
    excerpt: row.excerpt ?? "",
    body: row.body,
    mediaUrl: row.media_url,
    mobileMediaUrl: row.mobile_media_url ?? "",
    logoUrl: row.logo_url ?? "",
    beforeImage: row.before_image ?? "",
    afterImage: row.after_image ?? "",
    linkUrl: row.link_url,
    ctaLabel: row.cta_label ?? "",
    secondaryCtaLabel: row.secondary_cta_label ?? "",
    secondaryCtaUrl: row.secondary_cta_url ?? "",
    badgeText: row.badge_text,
    ratingScore: row.rating_score ?? "",
    ratingVerified: Boolean(row.rating_verified),
    reviewCount: row.review_count ?? "",
    trustBadgeText: row.trust_badge_text ?? "",
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    publishedAt: row.published_at ?? "",
    seoTitle: row.seo_title ?? "",
    seoDescription: row.seo_description ?? "",
    price: Number(row.price ?? 0),
    sessions: row.sessions ?? "",
    duration: row.duration ?? "",
    availableForBooking: row.available_for_booking !== 0,
    qualification: row.qualification ?? "",
    specialization: row.specialization ?? "",
    yearsExperience: row.years_experience ?? "",
    registrationNumber: row.registration_number ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    homepageHighlight: row.homepage_highlight == null ? row.type === "badge" : Boolean(row.homepage_highlight),
    patientConsent: Boolean(row.patient_consent),
    published: Boolean(row.published),
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function offerIsLive(row, today = todayISO()) {
  if (!row.published) return false;
  if (row.start_date && row.start_date > today) return false;
  if (row.end_date && row.end_date < today) return false;
  return true;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base, excludeId = 0, type = "blog") {
  const seed = slugify(base) || "article";
  let candidate = seed;
  let counter = 2;
  while (await siteContent.findOne({ type, slug: candidate, id: { $ne: excludeId } })) {
    candidate = `${seed}-${counter}`;
    counter += 1;
  }
  return candidate;
}

function normalizeContentInput(input, partial = false) {
  const body = input && typeof input === "object" ? input : {};
  const fields = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
  const takeText = (key, max, required = false) => {
    if (partial && !has(key)) return;
    const value = String(body[key] ?? "").trim();
    if (required && !value) throw new HttpError(400, "Please add a title.");
    if (value.length > max) throw new HttpError(400, "One of the content fields is too long.");
    fields[key] = value;
  };

  if (!partial || has("type")) {
    const type = String(body.type || "");
    if (!SITE_CONTENT_TYPES.has(type)) throw new HttpError(400, "Choose a valid content type.");
    fields.type = type;
  }
  takeText("title", 140, true);
  takeText("subtitle", 240);
  takeText("body", 60000);
  takeText("mediaUrl", 1000);
  takeText("mobileMediaUrl", 1000);
  takeText("logoUrl", 1000);
  takeText("beforeImage", 1000);
  takeText("afterImage", 1000);
  takeText("linkUrl", 1000);
  takeText("ctaLabel", 40);
  takeText("secondaryCtaLabel", 50);
  takeText("secondaryCtaUrl", 1000);
  takeText("badgeText", 80);
  takeText("ratingScore", 8);
  takeText("reviewCount", 20);
  takeText("trustBadgeText", 30);
  takeText("category", 60);
  takeText("author", 80);
  takeText("excerpt", 400);
  takeText("seoTitle", 80);
  takeText("seoDescription", 200);
  for (const [key, max] of [["sessions", 80], ["duration", 80], ["qualification", 120], ["specialization", 120], ["yearsExperience", 40], ["registrationNumber", 60], ["phone", 30], ["email", 120]]) {
    takeText(key, max);
  }
  if (!partial || has("price")) {
    const price = Number(body.price ?? 0);
    if (!Number.isFinite(price) || price < 0 || price > 10000000) throw new HttpError(400, "Enter a valid treatment price.");
    fields.price = price;
  }
  if (!partial || has("availableForBooking")) fields.availableForBooking = body.availableForBooking === false ? 0 : 1;
  if (!partial || has("homepageHighlight")) fields.homepageHighlight = body.homepageHighlight ? 1 : 0;
  if (!partial || has("patientConsent")) fields.patientConsent = body.patientConsent ? 1 : 0;
  if (!partial || has("ratingVerified")) fields.ratingVerified = body.ratingVerified ? 1 : 0;

  if (!partial || has("slug")) {
    const providedSlug = String(body.slug ?? "").trim().toLowerCase();
    const rawSlug = slugify(providedSlug || body.title || "");
    if (providedSlug && providedSlug !== rawSlug) {
      throw new HttpError(400, "Slugs can only use lowercase letters, numbers and dashes.");
    }
    fields.slug = rawSlug;
  }

  for (const key of ["startDate", "endDate", "publishedAt"]) {
    if (partial && !has(key)) continue;
    const raw = String(body[key] ?? "").trim();
    if (!raw) {
      fields[key] = "";
      continue;
    }
    const iso = validDate(raw);
    if (!iso) throw new HttpError(400, "Dates must use the YYYY-MM-DD format.");
    fields[key] = iso;
  }
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) {
    throw new HttpError(400, "The end date must be after the start date.");
  }

  if (!partial || has("published")) fields.published = body.published ? 1 : 0;
  if (fields.published === 0) fields.homepageHighlight = 0;
  if (!partial || has("displayOrder")) {
    const order = Number(body.displayOrder ?? 0);
    if (!Number.isInteger(order) || order < 0 || order > 9999) {
      throw new HttpError(400, "Display order must be a whole number between 0 and 9999.");
    }
    fields.displayOrder = order;
  }

  for (const key of ["mediaUrl", "mobileMediaUrl", "logoUrl", "beforeImage", "afterImage", "linkUrl", "secondaryCtaUrl"]) {
    const value = fields[key];
    if (typeof value !== "string" || !value) continue;
    const isRelative = value.startsWith("/") && !value.startsWith("//");
    const isTelephone = key === "secondaryCtaUrl" && /^tel:\+?[0-9().\-\s]+$/i.test(value);
    let isHttps = false;
    try {
      isHttps = new URL(value).protocol === "https:";
    } catch {
      isHttps = false;
    }
    if (!isRelative && !isHttps && !isTelephone) throw new HttpError(400, "Links must use HTTPS, a phone link, or a site-relative path.");
  }
  return fields;
}

const MEDIA_FIELDS = ["media_url", "mobile_media_url", "logo_url", "before_image", "after_image"];

async function deleteUploadedMediaIfUnreferenced(mediaUrl) {
  const match = /^\/api\/media\/([a-f0-9-]{36}\.(?:jpg|png|svg|webp|avif|gif|mp4|webm|mov))$/i.exec(String(mediaUrl || ""));
  if (!match) return;
  const used = await siteContent.countDocuments({
    $or: MEDIA_FIELDS.map((field) => ({ [field]: mediaUrl })),
  });
  if (used) return;
  const storedFiles = await uploadsBucket.find({ filename: match[1] }).toArray();
  await Promise.all(storedFiles.map((file) => uploadsBucket.delete(file._id)));
  try {
    fs.rmSync(path.join(UPLOADS_DIR, match[1]), { force: true });
  } catch (error) {
    if (!error || !["ENOENT", "EPERM", "EACCES"].includes(error.code)) throw error;
  }
}

app.get("/api/content", async (req, res, next) => {
  try {
    const type = req.query.type ? String(req.query.type) : "";
    if (type && !SITE_CONTENT_TYPES.has(type)) throw new HttpError(400, "Choose a valid content type.");
    const query = { published: 1, ...(type ? { type } : {}), ...(type === "gallery" || type === "testimonial" ? { patient_consent: 1 } : {}) };
    const rows = await siteContent.find(query).sort({ type: 1, display_order: 1, id: -1 }).toArray();
    const today = todayISO();
    const visible = rows.filter((row) => {
      if ((row.type === "gallery" || row.type === "testimonial") && !row.patient_consent) return false;
      return row.type === "offer" ? offerIsLive(row, today) : true;
    });
    res.json({ items: visible.map(serializeSiteContent) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/blog", async (_req, res, next) => {
  try {
    const rows = await siteContent
      .find({ type: "blog", published: 1 })
      .sort({ published_at: -1, id: -1 })
      .toArray();
    res.json({ items: rows.map(serializeSiteContent) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/blog/:slug", async (req, res, next) => {
  try {
    const slug = slugify(req.params.slug);
    if (!slug) throw new HttpError(404, "Article not found.");
    const row = await siteContent.findOne({ type: "blog", slug, published: 1 });
    if (!row) throw new HttpError(404, "Article not found.");
    const others = await siteContent
      .find({ type: "blog", published: 1, id: { $ne: row.id } })
      .sort({ published_at: -1, id: -1 })
      .toArray();
    const related = [...others.filter((item) => item.category && item.category === row.category), ...others]
      .filter((item, index, list) => list.findIndex((entry) => entry.id === item.id) === index)
      .slice(0, 3);
    res.json({ item: serializeSiteContent(row), related: related.map(serializeSiteContent) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/gallery", async (_req, res, next) => {
  try {
    const rows = await siteContent
      .find({ type: "gallery", published: 1, patient_consent: 1 })
      .sort({ display_order: 1, id: -1 })
      .toArray();
    res.json({ items: rows.map(serializeSiteContent) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/contact-enquiries", async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const phone = String(req.body?.phone ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const message = String(req.body?.message ?? "").trim();
    if (name.length < 2 || name.length > 120) throw new HttpError(400, "Enter your name (2–120 characters)." );
    if (!phone && !email) throw new HttpError(400, "Add a phone number or email address so the clinic can reply.");
    if (phone && !/^[+0-9() .-]{7,24}$/.test(phone)) throw new HttpError(400, "Enter a valid phone number.");
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new HttpError(400, "Enter a valid email address.");
    if (message.length < 5 || message.length > 4000) throw new HttpError(400, "Enter a message between 5 and 4,000 characters.");
    const createdAt = nowISO();
    const enquiry = { id: await nextId("clinic_contact_enquiries"), name, phone, email, message, status: "new", created_at: createdAt, updated_at: createdAt };
    await contactEnquiries.insertOne(enquiry);
    res.status(201).json({ ok: true, message: "Your enquiry has been sent. The clinic team will get back to you." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/contact-enquiries", requireAdmin, async (_req, res, next) => {
  try {
    const items = await contactEnquiries.find({}).sort({ created_at: -1 }).limit(200).toArray();
    res.json({ items: items.map(({ _id, ...item }) => ({ ...item, createdAt: item.created_at, updatedAt: item.updated_at })) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/contact-enquiries/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status ?? "");
    if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "Choose a valid enquiry.");
    if (!["new", "in_progress", "resolved"].includes(status)) throw new HttpError(400, "Choose a valid enquiry status.");
    const result = await contactEnquiries.updateOne({ id }, { $set: { status, updated_at: nowISO() } });
    if (!result.matchedCount) throw new HttpError(404, "Enquiry not found.");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/contact-enquiries/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "Choose a valid enquiry.");
    const result = await contactEnquiries.deleteOne({ id });
    if (!result.deletedCount) throw new HttpError(404, "Enquiry not found.");
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/content", requireAdmin, async (req, res, next) => {
  try {
    const type = req.query.type ? String(req.query.type) : "";
    if (type && !SITE_CONTENT_TYPES.has(type)) throw new HttpError(400, "Choose a valid content type.");
    const rows = await siteContent.find(type ? { type } : {}).sort({ type: 1, display_order: 1, id: -1 }).toArray();
    res.json({ items: rows.map(serializeSiteContent) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/content", requireAdmin, async (req, res, next) => {
  try {
    const fields = normalizeContentInput(req.body);
    if (["gallery", "testimonial"].includes(fields.type) && fields.published === 1 && fields.patientConsent !== 1) {
      throw new HttpError(400, "Confirm that the patient has approved this story before publishing it.");
    }
    const stamp = nowISO();
    const row = {
      id: await nextId("clinic_site_content"),
      type: fields.type,
      slug: ["blog", "treatment", "doctor"].includes(fields.type) ? await uniqueSlug(fields.slug || fields.title, 0, fields.type) : fields.slug,
      title: fields.title,
      subtitle: fields.subtitle,
      category: fields.category,
      author: fields.author,
      excerpt: fields.excerpt,
      body: fields.body,
      media_url: fields.mediaUrl,
      mobile_media_url: fields.mobileMediaUrl,
      logo_url: fields.logoUrl,
      before_image: fields.beforeImage,
      after_image: fields.afterImage,
      link_url: fields.linkUrl,
      cta_label: fields.ctaLabel,
      secondary_cta_label: fields.secondaryCtaLabel,
      secondary_cta_url: fields.secondaryCtaUrl,
      badge_text: fields.badgeText,
      rating_score: fields.ratingScore,
      rating_verified: fields.ratingVerified,
      review_count: fields.reviewCount,
      trust_badge_text: fields.trustBadgeText,
      start_date: fields.startDate,
      end_date: fields.endDate,
      published_at: fields.publishedAt || (fields.published ? todayISO() : ""),
      seo_title: fields.seoTitle,
      seo_description: fields.seoDescription,
      price: fields.price,
      sessions: fields.sessions,
      duration: fields.duration,
      available_for_booking: fields.availableForBooking,
      qualification: fields.qualification,
      specialization: fields.specialization,
      years_experience: fields.yearsExperience,
      registration_number: fields.registrationNumber,
      phone: fields.phone,
      email: fields.email,
      homepage_highlight: fields.homepageHighlight,
      patient_consent: fields.patientConsent,
      published: fields.published,
      display_order: fields.displayOrder,
      created_at: stamp,
      updated_at: stamp,
    };
    await siteContent.insertOne(row);
    syncContentToD1("INSERT", row);
    res.status(201).json({ item: serializeSiteContent(row) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/content/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "Choose a valid content item.");
    const previous = await siteContent.findOne({ id });
    if (!previous) throw new HttpError(404, "Content item not found.");
    const fields = normalizeContentInput(req.body, true);
    if (!Object.keys(fields).length) throw new HttpError(400, "Make a change before saving.");
    if (["gallery", "testimonial"].includes(previous.type)) {
      const willPublish = fields.published ?? (previous.published ? 1 : 0);
      const hasConsent = fields.patientConsent ?? (previous.patient_consent ? 1 : 0);
      if (willPublish === 1 && hasConsent !== 1) throw new HttpError(400, "Confirm that the patient has approved this story before publishing it.");
    }
    const update = {};
    const map = {
      mediaUrl: "media_url",
      mobileMediaUrl: "mobile_media_url",
      logoUrl: "logo_url",
      beforeImage: "before_image",
      afterImage: "after_image",
      linkUrl: "link_url",
      ctaLabel: "cta_label",
      secondaryCtaLabel: "secondary_cta_label",
      secondaryCtaUrl: "secondary_cta_url",
      badgeText: "badge_text",
      ratingScore: "rating_score",
      ratingVerified: "rating_verified",
      reviewCount: "review_count",
      trustBadgeText: "trust_badge_text",
      startDate: "start_date",
      endDate: "end_date",
      publishedAt: "published_at",
      seoTitle: "seo_title",
      seoDescription: "seo_description",
      sessions: "sessions",
      duration: "duration",
      availableForBooking: "available_for_booking",
      qualification: "qualification",
      specialization: "specialization",
      yearsExperience: "years_experience",
      registrationNumber: "registration_number",
      phone: "phone",
      email: "email",
      homepageHighlight: "homepage_highlight",
      patientConsent: "patient_consent",
      displayOrder: "display_order",
    };
    for (const [key, value] of Object.entries(fields)) {
      update[map[key] || key] = value;
    }
    if (["blog", "treatment", "doctor"].includes(previous.type) && typeof fields.slug === "string") {
      update.slug = await uniqueSlug(fields.slug || previous.title, id, previous.type);
    }
    if (fields.published === 1 && !previous.published_at && !fields.publishedAt) {
      update.published_at = todayISO();
    }
    await siteContent.updateOne({ id }, { $set: { ...update, updated_at: nowISO() } });
    const row = await siteContent.findOne({ id });
    syncContentToD1("UPDATE", row);
    for (const field of MEDIA_FIELDS) {
      if (previous[field] !== row[field]) await deleteUploadedMediaIfUnreferenced(previous[field]);
    }
    res.json({ item: serializeSiteContent(row) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/content/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "Choose a valid content item.");
    const row = await siteContent.findOne({ id });
    if (!row) throw new HttpError(404, "Content item not found.");
    await siteContent.deleteOne({ id });
    syncContentToD1("DELETE", row);
    for (const field of MEDIA_FIELDS) {
      await deleteUploadedMediaIfUnreferenced(row[field]);
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/admin/uploads",
  requireAdmin,
  express.raw({ type: "application/octet-stream", limit: "100mb" }),
  async (req, res, next) => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new HttpError(400, "Choose a file to upload.");
      const mimeType = String(req.query.mime || "").toLowerCase();
      const extension = UPLOAD_MIME_EXTENSIONS.get(mimeType);
      if (!extension) throw new HttpError(415, "Upload a supported image or video file.");
      const fileName = crypto.randomUUID() + extension;
      const upload = uploadsBucket.openUploadStream(fileName, {
        contentType: mimeType,
        metadata: { mimeType },
      });
      await new Promise((resolve, reject) => {
        upload.once("error", reject);
        upload.once("finish", resolve);
        upload.end(req.body);
      });
      res.status(201).json({ url: "/api/media/" + fileName, mimeType, size: req.body.length });
    } catch (error) {
      next(error);
    }
  },
);

app.get("/api/media/:fileName", async (req, res, next) => {
  try {
    const fileName = String(req.params.fileName || "");
    if (!/^[a-f0-9-]{36}\.(?:jpg|png|svg|webp|avif|gif|mp4|webm|mov)$/i.test(fileName)) {
      return res.status(404).json({ error: "Media file not found." });
    }
    const storedFile = await uploadsBucket.find({ filename: fileName }).sort({ uploadDate: -1 }).limit(1).next();
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (storedFile) {
      res.setHeader("Content-Type", storedFile.contentType || storedFile.metadata?.mimeType || "application/octet-stream");
      const download = uploadsBucket.openDownloadStream(storedFile._id);
      download.on("error", next);
      download.pipe(res);
      return;
    }
    const filePath = path.join(UPLOADS_DIR, fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Media file not found." });
    res.sendFile(filePath, (error) => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, time: nowISO() }));

app.get("/api/meta", async (_req, res, next) => {
  try {
    const [treatments, doctors] = await Promise.all([
      siteContent.find({ type: "treatment", published: 1, available_for_booking: { $ne: 0 } }).sort({ display_order: 1, id: -1 }).toArray(),
      siteContent.find({ type: "doctor", published: 1 }).sort({ display_order: 1, id: -1 }).toArray(),
    ]);
    const services = new Map(Object.entries(SERVICES).map(([value, label]) => [value, label]));
    treatments.forEach((item) => services.set(item.slug, item.title));
    const dynamicDentists = doctors.map((item) => item.title);
    res.json({
      services: [...services].map(([value, label]) => ({ value, label })),
      dentists: [...new Set([...DENTISTS, ...dynamicDentists])],
      slots: SLOTS,
      clinicWhatsapp: CLINIC_WHATSAPP,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/availability-settings", requireAdmin, async (_req, res, next) => {
  try {
    res.json(await readAvailabilitySettings());
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/availability-settings", requireAdmin, async (req, res, next) => {
  try {
    const settings = normalizeAvailabilitySettings(req.body);
    await availabilitySettings.updateOne({ _id: "clinic-default" }, { $set: settings }, { upsert: true });
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/whatsapp/settings", requireAdmin, async (_req, res, next) => {
  try {
    const settings = await readWhatsAppSettings();
    res.json({ settings: sanitizeWhatsAppSettingsForClient(settings) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/whatsapp/settings", requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const existing = await readWhatsAppSettings();
    const updated = {
      ...existing,
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : existing.enabled,
      clinicPhone: body.clinicPhone ? String(body.clinicPhone).trim() : existing.clinicPhone,
      clinicInternational: body.clinicInternational ? String(body.clinicInternational).trim() : existing.clinicInternational,
      clinicName: body.clinicName ? String(body.clinicName).trim() : existing.clinicName,
      provider: body.provider && ["green_api", "ultramsg", "n8n", "meta", "both", "simulated"].includes(body.provider) ? body.provider : existing.provider,
      greenApiInstanceId: body.greenApiInstanceId !== undefined ? String(body.greenApiInstanceId).trim() : existing.greenApiInstanceId,
      greenApiToken: body.greenApiToken !== undefined ? String(body.greenApiToken).trim() : existing.greenApiToken,
      ultraMsgInstanceId: body.ultraMsgInstanceId !== undefined ? String(body.ultraMsgInstanceId).trim() : existing.ultraMsgInstanceId,
      ultraMsgToken: body.ultraMsgToken !== undefined ? String(body.ultraMsgToken).trim() : existing.ultraMsgToken,
      n8nWebhookUrl: body.n8nWebhookUrl !== undefined ? String(body.n8nWebhookUrl).trim() : existing.n8nWebhookUrl,
      n8nAuthToken: body.n8nAuthToken !== undefined ? String(body.n8nAuthToken).trim() : existing.n8nAuthToken,
      metaPhoneNumberId: body.metaPhoneNumberId !== undefined ? String(body.metaPhoneNumberId).trim() : existing.metaPhoneNumberId,
      metaWabaId: body.metaWabaId !== undefined ? String(body.metaWabaId).trim() : existing.metaWabaId,
      notifyNewBooking: body.notifyNewBooking !== undefined ? Boolean(body.notifyNewBooking) : existing.notifyNewBooking,
      notifyConfirmed: body.notifyConfirmed !== undefined ? Boolean(body.notifyConfirmed) : existing.notifyConfirmed,
      notifyRejected: body.notifyRejected !== undefined ? Boolean(body.notifyRejected) : existing.notifyRejected,
      notifyRescheduled: body.notifyRescheduled !== undefined ? Boolean(body.notifyRescheduled) : existing.notifyRescheduled,
      notifyReminder: body.notifyReminder !== undefined ? Boolean(body.notifyReminder) : existing.notifyReminder,
      notifyCustomReply: body.notifyCustomReply !== undefined ? Boolean(body.notifyCustomReply) : existing.notifyCustomReply,
      templates: {
        ...existing.templates,
        ...(body.templates || {})
      },
      updated_at: nowISO()
    };
    if (body.metaAccessToken && String(body.metaAccessToken).trim()) {
      updated.metaAccessToken = String(body.metaAccessToken).trim();
    }
    await whatsappSettings.updateOne({ _id: "clinic-whatsapp-default" }, { $set: updated }, { upsert: true });
    res.json({ settings: sanitizeWhatsAppSettingsForClient(updated) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/whatsapp/test", requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const settings = await readWhatsAppSettings();
    const testBooking = {
      id: 999999,
      ref: "SC-TEST-" + crypto.randomBytes(2).toString("hex").toUpperCase(),
      patient_name: "Test Patient (WhatsApp Automation)",
      patient_phone: body.phone || settings.clinicPhone || "9345743409",
      patient_email: "test@srisaraswathidental.com",
      service_label: "Comprehensive Oral Health Checkup & Cleaning",
      date: todayISO(),
      time: "10:30 AM",
      dentist: "Dr. Kishore Kumar",
      status: "pending",
    };
    const result = await dispatchWhatsAppAutomation({
      event: body.event || "booking.created",
      booking: testBooking,
      extra: { reason: "Testing WhatsApp delivery pipeline" }
    });
    res.json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/whatsapp/logs", requireAdmin, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const items = await whatsappLogs.find({}).sort({ created_at: -1, id: -1 }).limit(limit).toArray();
    res.json({ logs: items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/bookings/:id/whatsapp", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await bookings.findOne({ id });
    if (!row) throw new HttpError(404, "Booking not found.");
    const body = req.body || {};
    const message = String(body.message || "").trim();
    if (!message) throw new HttpError(400, "Message cannot be empty.");
    const result = await dispatchWhatsAppAutomation({
      event: "admin.custom_reply",
      booking: row,
      extra: { message }
    });
    res.json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/bookings/:id/remind", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await bookings.findOne({ id });
    if (!row) throw new HttpError(404, "Booking not found.");
    const result = await dispatchWhatsAppAutomation({
      event: "booking.reminder",
      booking: row,
    });
    res.json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/bookings/:id/sms", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await bookings.findOne({ id });
    if (!row) throw new HttpError(404, "Booking not found.");
    const body = req.body || {};
    const message = String(body.message || "").trim();
    if (!message) throw new HttpError(400, "Message cannot be empty.");
    const logEntry = {
      id: crypto.randomUUID(),
      event: "admin.sms_dispatch",
      channel: "sms",
      booking_id: row.id,
      booking_ref: row.ref,
      recipient: row.patient_phone,
      provider: "native_sms",
      status: "delivered",
      results: { sms: "Prepared native SMS" },
      message,
      created_at: nowISO(),
    };
    await whatsappLogs.insertOne(logEntry);
    res.json({ ok: true, logId: logEntry.id, smsLink: smsLink(row.patient_phone, message) });
  } catch (error) {
    next(error);
  }
});


app.get("/api/availability", async (req, res, next) => {
  try {
    const iso = validDate(req.query.date);
    if (!iso) throw new HttpError(400, "Please choose a valid date.");
    if (iso < todayISO()) throw new HttpError(400, "That date has already passed.");
    res.json(await getAvailabilityForDate(iso));
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const body = req.body || {};
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!firstName || !lastName) throw new HttpError(400, "Please enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new HttpError(400, "Please enter a valid email address.");
    const phoneDigits = digits(phone);
    if (phoneDigits.length < 10 || phoneDigits.length > 13) throw new HttpError(400, "Please enter a valid mobile number.");
    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
    if (await users.findOne({ email })) throw new HttpError(409, "An account with this email already exists. Please sign in.");

    const user = {
      id: await nextId("clinic_users"),
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      password_hash: hashPassword(password),
      role: "patient",
      created_at: nowISO(),
      last_login_at: nowISO(),
      login_count: 1,
    };
    await users.insertOne(user);
    setSessionCookie(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = await users.findOne({ email });
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new HttpError(401, "Invalid email or password.");
    }
    const lastLoginAt = nowISO();
    await users.updateOne({ id: user.id }, { $set: { last_login_at: lastLoginAt }, $inc: { login_count: 1 } });
    user.last_login_at = lastLoginAt;
    user.login_count = (user.login_count || 0) + 1;
    setSessionCookie(res, user);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get("/api/auth/me", async (req, res, next) => {
  try {
    res.json({ user: publicUser(await currentUser(req)) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/bookings", requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const dentist = body.dentist ? String(body.dentist) : "";
    const duplicate = await bookings.findOne({
      user_id: user.id,
      date: validDate(body.date) || "",
      time: String(body.time || ""),
      status: { $in: ["pending", "confirmed"] },
    });
    if (duplicate) throw new HttpError(409, "You already have a booking at this time.");

    const row = await createBooking({
      user,
      patientName: user.first_name + " " + user.last_name,
      patientPhone: String(body.phone || user.phone),
      patientEmail: String(body.email || user.email),
      service: String(body.service || ""),
      date: String(body.date || ""),
      time: String(body.time || ""),
      dentist,
      notes: String(body.notes || ""),
      dob: String(body.dob || ""),
      source: String(body.source || ""),
      status: "pending",
    });

    try {
      await dispatchWhatsAppAutomation({ event: "booking.created", booking: row });
    } catch (err) {
      console.error("WhatsApp dispatch error on booking creation:", err);
    }
    res.status(201).json({ booking: bookingWithLinks(row) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/bookings/mine", requireAuth, async (req, res, next) => {
  try {
    const rows = await bookings.find({ user_id: req.user.id }).sort({ date: -1, id: -1 }).toArray();
    res.json({
      bookings: rows.map((row) => ({
        ...serializeBooking(row),
        whatsapp: { clinic: waLink(CLINIC_WHATSAPP, clinicText(row)) },
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/bookings/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await bookings.findOne({ id });
    if (!row || row.user_id !== req.user.id) throw new HttpError(404, "Booking not found.");
    if (row.status === "completed" || row.status === "cancelled") {
      throw new HttpError(400, "This appointment can no longer be changed. Please book a new visit.");
    }

    const body = req.body || {};
    const status = body.status ? String(body.status) : null;
    if (status && status !== "cancelled") throw new HttpError(403, "You can only cancel an appointment here.");

    let date = row.date;
    let time = row.time;
    if (body.date || body.time) {
      date = body.date ? String(body.date) : row.date;
      time = body.time ? String(body.time) : row.time;
      await validateSlot(date, time, row.id);
    }

    const nextStatus = status === "cancelled" ? "cancelled" : body.date || body.time ? "pending" : row.status;
    await bookings.updateOne({ id }, { $set: { date, time, status: nextStatus, updated_at: nowISO() } });
    const updated = await bookings.findOne({ id });
    res.json({ booking: serializeBooking(updated), whatsapp: { clinic: waLink(CLINIC_WHATSAPP, clinicText(updated)) } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/bookings", requireAdmin, async (req, res, next) => {
  try {
    const query = {};
    const status = String(req.query.status || "");
    if (status && STATUS_LABELS[status]) query.status = status;
    const date = validDate(req.query.date);
    if (date) query.date = date;
    const q = String(req.query.q || "").trim();
    if (q) {
      const literal = q.replace(/[.*+?^$|()[\]{}\\]/g, "\\$&");
      const search = new RegExp(literal, "i");
      query.$or = [
        { patient_name: search },
        { ref: search },
        { patient_phone: search },
        { service_label: search },
      ];
    }
    const rows = await bookings.find(query).toArray();
    rows.sort((left, right) => left.date === right.date
      ? slotIndex(left.time) - slotIndex(right.time)
      : right.date.localeCompare(left.date));
    res.json({ bookings: rows.map(bookingWithLinks) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/bookings", requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const patientName = String(body.patientName || "").trim();
    if (!patientName) throw new HttpError(400, "Patient name is required.");
    const patientPhone = String(body.patientPhone || "").trim();
    if (digits(patientPhone).length < 10) throw new HttpError(400, "A valid patient phone number is required.");
    const patientEmail = String(body.patientEmail || "").trim().toLowerCase();
    const existing = patientEmail ? await users.findOne({ email: patientEmail }) : null;

    const row = await createBooking({
      user: existing || null,
      patientName,
      patientPhone,
      patientEmail,
      service: String(body.service || ""),
      date: String(body.date || ""),
      time: String(body.time || ""),
      dentist: body.dentist ? String(body.dentist) : "",
      notes: String(body.notes || ""),
      status: "confirmed",
    });
    try {
      await dispatchWhatsAppAutomation({ event: "booking.confirmed", booking: row });
    } catch (err) {
      console.error("WhatsApp dispatch error on admin booking creation:", err);
    }
    res.status(201).json({ booking: bookingWithLinks(row) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/bookings/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await bookings.findOne({ id });
    if (!row) throw new HttpError(404, "Booking not found.");

    const body = req.body || {};
    const status = body.status ? String(body.status) : row.status;
    if (!STATUS_LABELS[status]) throw new HttpError(400, "Unknown status.");
    const date = body.date ? validDate(body.date) : row.date;
    if (!date) throw new HttpError(400, "Please choose a valid date.");
    const time = body.time ? String(body.time) : row.time;
    if (date !== row.date || time !== row.time) await validateSlot(date, time, row.id);
    const dentist = body.dentist === undefined ? row.dentist : String(body.dentist);

    await bookings.updateOne({ id }, { $set: {
      date,
      time,
      dentist: dentist || null,
      status,
      notes: body.notes === undefined ? row.notes : String(body.notes),
      updated_at: nowISO(),
    } });
    try {
      d1.prepare(`UPDATE appointments SET status = ?, appointment_date = ?, appointment_time = ?, updated_at = ? WHERE id = ?`)
        .bind(status, date, time, nowISO(), id).run();
    } catch (e) {
      console.error("D1 booking patch error:", e.message);
    }
    const updated = await bookings.findOne({ id });
    const isNewConfirmation = (status === "confirmed" && row.status !== "confirmed");
    const isRejectionOrCancel = (status === "cancelled" && row.status !== "cancelled");
    const isRescheduled = (date !== row.date || time !== row.time);

    if (isNewConfirmation) {
      try {
        await dispatchWhatsAppAutomation({ event: "booking.confirmed", booking: updated });
      } catch (err) {
        console.error("WhatsApp dispatch error (confirmed):", err);
      }
    } else if (isRejectionOrCancel) {
      try {
        await dispatchWhatsAppAutomation({
          event: "booking.rejected",
          booking: updated,
          extra: { reason: body.rejectionReason || "Schedule conflict" }
        });
      } catch (err) {
        console.error("WhatsApp dispatch error (rejected):", err);
      }
    } else if (isRescheduled) {
      try {
        // Send reschedule alert to patient WhatsApp
        await dispatchWhatsAppAutomation({
          event: "booking.rescheduled",
          booking: updated
        });
        // Also send copy to clinic admin WhatsApp (+919345743409)
        const clinicAdminNum = (await readWhatsAppSettings()).clinicInternational || "+919345743409";
        const cleanAdminDigits = clinicAdminNum.replace(/\D/g, "");
        const adminRescheduleMsg = `🗓️ APPOINTMENT RESCHEDULED\n\nSri Saraswathi Dental Clinic\n\nAppointment ID: ${updated.ref}\nPatient: ${updated.patient_name} (${updated.patient_phone})\nTreatment: ${updated.service_label}\nNew Date: ${formatDate(updated.date)}\nNew Time: ${updated.time}\nDoctor: ${updated.dentist || "Dr. Kishore Kumar"}\n\nView in Admin Dashboard:\n${process.env.SITE_ORIGIN || "http://localhost:5173"}/dashboard/appointments`;
        
        const settings = await readWhatsAppSettings();
        if (settings.enabled && settings.provider === "green_api" && settings.greenApiInstanceId && settings.greenApiToken) {
          fetch(`https://api.green-api.com/waInstance${settings.greenApiInstanceId}/sendMessage/${settings.greenApiToken}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatId: `${cleanAdminDigits.startsWith("91") ? cleanAdminDigits : "91" + cleanAdminDigits}@c.us`,
              message: adminRescheduleMsg
            })
          }).catch(err => console.error("Admin reschedule notice error:", err));
        }
      } catch (err) {
        console.error("WhatsApp dispatch error (rescheduled):", err);
      }
    }

    res.json({ booking: bookingWithLinks(updated) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/summary", requireAdmin, async (_req, res, next) => {
  try {
    const today = todayISO();
    const week = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setDate(day.getDate() - offset);
      const iso = day.getFullYear() + "-" + String(day.getMonth() + 1).padStart(2, "0") + "-" + String(day.getDate()).padStart(2, "0");
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextIso = nextDay.getFullYear() + "-" + String(nextDay.getMonth() + 1).padStart(2, "0") + "-" + String(nextDay.getDate()).padStart(2, "0");
      const count = await bookings.countDocuments({
        created_at: { $gte: iso + "T00:00:00.000Z", $lt: nextIso + "T00:00:00.000Z" },
      });
      week.push({ date: iso, label: day.toLocaleDateString("en-IN", { weekday: "short" }), count });
    }

    const [todayRows, recentRows, recentPatients, recentLogins, pending, confirmed, checkedIn, completed, cancelled, patientCount, totalBookings] = await Promise.all([
      bookings.find({ date: today, status: { $ne: "cancelled" } }).toArray(),
      bookings.find({}).sort({ id: -1 }).limit(5).toArray(),
      users.find({ role: "patient" }).sort({ id: -1 }).limit(4).toArray(),
      users
        .find({ role: "patient", last_login_at: { $exists: true, $ne: null } })
        .sort({ last_login_at: -1 })
        .limit(3)
        .toArray(),
      bookings.countDocuments({ status: "pending" }),
      bookings.countDocuments({ status: "confirmed" }),
      bookings.countDocuments({ status: "checked_in" }),
      bookings.countDocuments({ status: "completed" }),
      bookings.countDocuments({ status: "cancelled" }),
      users.countDocuments({ role: "patient" }),
      bookings.countDocuments({}),
    ]);
    todayRows.sort((left, right) => slotIndex(left.time) - slotIndex(right.time));

    res.json({
      today,
      counts: {
        today: todayRows.length,
        pending,
        confirmed,
        checkedIn,
        completed,
        cancelled,
        patients: patientCount,
        totalBookings,
      },
      week,
      todaySchedule: todayRows.map(bookingWithLinks),
      queue: todayRows.filter((row) => row.status === "pending" || row.status === "confirmed").map(serializeBooking),
      recent: recentRows.map((row) => ({
        ...serializeBooking(row),
        whatsapp: { patient: waLink(row.patient_phone, patientText(row, "status")) },
      })),
      recentPatients: recentPatients.map((row) => ({
        id: row.id,
        name: row.first_name + " " + row.last_name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        joinedAt: row.created_at,
        lastLoginAt: row.last_login_at || null,
        loginCount: row.login_count || 0,
      })),
      recentLogins: recentLogins.map((row) => ({
        id: row.id,
        name: row.first_name + " " + row.last_name,
        email: row.email,
        phone: row.phone,
        lastLoginAt: row.last_login_at,
        loginCount: row.login_count || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/patients", requireAdmin, async (_req, res, next) => {
  try {
    const patientRows = await users.find({ role: "patient" }).sort({ id: -1 }).toArray();
    const patientIds = patientRows.map((row) => row.id);
    const patientBookings = patientIds.length ? await bookings.find({ user_id: { $in: patientIds } }).toArray() : [];
    const byUser = new Map();
    for (const booking of patientBookings) {
      const stats = byUser.get(booking.user_id) || { visits: 0, lastVisit: null };
      stats.visits += 1;
      if (booking.date <= todayISO() && (!stats.lastVisit || booking.date > stats.lastVisit)) stats.lastVisit = booking.date;
      byUser.set(booking.user_id, stats);
    }
    res.json({
      patients: patientRows.map((row) => {
        const stats = byUser.get(row.id) || { visits: 0, lastVisit: null };
        return {
          id: row.id,
          name: row.first_name + " " + row.last_name,
          email: row.email,
          phone: row.phone,
          role: row.role,
          visits: stats.visits,
          lastVisit: stats.lastVisit ? formatDate(stats.lastVisit) : null,
          joinedAt: row.created_at,
          lastLoginAt: row.last_login_at || null,
          loginCount: row.login_count || 0,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

const distDir = path.resolve(__dirname, "../dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(distDir, "index.html"));
    }
    return next();
  });
}

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: error.message || "Something went wrong." });
});

async function seed() {
  const adminEmail = "admin@srisaraswathidental.com";
  const existing = await users.find({ role: "admin" }).sort({ id: 1 }).limit(1).next();
  if (existing) {
    if (existing.email === "admin@smilecaredental.com") {
      await users.updateOne({ id: existing.id }, { $set: {
        first_name: "Dr. Kishore",
        last_name: "Kumar",
        email: adminEmail,
        phone: CLINIC.phone,
      } });
      console.log("Migrated admin account to: " + adminEmail);
    }
    return;
  }
  const password = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "Admin@12345");
  if (!password) {
    console.warn("No admin account was created. Set ADMIN_PASSWORD before the first production start.");
    return;
  }
  await users.insertOne({
    id: await nextId("clinic_users"),
    first_name: "Dr. Kishore",
    last_name: "Kumar",
    email: adminEmail,
    phone: CLINIC.phone,
    password_hash: hashPassword(password),
    role: "admin",
    created_at: nowISO(),
  });
  console.log("Seeded admin account: " + adminEmail);
}

await seed();

app.listen(PORT, () => {
  console.log(CLINIC.name + " API running on http://localhost:" + PORT);
});
