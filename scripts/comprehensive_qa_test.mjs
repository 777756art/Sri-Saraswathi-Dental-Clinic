// scripts/comprehensive_qa_test.mjs
// Comprehensive QA, Security & Functional Test Suite for Sri Saraswathi Dental Clinic

const TARGET_URL = process.env.TEST_URL || "https://sreesaraswathi.netlify.app";

console.log(`====================================================`);
console.log(`SRI SARASWATHI DENTAL CLINIC - QA AUTOMATED SUITE`);
console.log(`Target: ${TARGET_URL}`);
console.log(`Time: ${new Date().toISOString()}`);
console.log(`====================================================\n`);

let passed = 0;
let failed = 0;
const results = [];

function record(name, pass, details = "") {
  if (pass) {
    console.log(`✅ PASS: ${name} ${details ? "- " + details : ""}`);
    passed++;
    results.push({ name, status: "PASS", details });
  } else {
    console.error(`❌ FAIL: ${name} ${details ? "- " + details : ""}`);
    failed++;
    results.push({ name, status: "FAIL", details });
  }
}

async function fetchJson(path, init = {}) {
  const url = `${TARGET_URL}${path}`;
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, ok: res.ok, headers: res.headers, text, json };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

async function runQaSuite() {
  // 1. Technical Health & DB Connection
  console.log("\n--- SECTION 1: TECHNICAL & API HEALTH ---");
  const health = await fetchJson("/api/health");
  record("API Health Endpoint", health.status === 200 && health.json?.ok === true, `status=${health.status}, DB=${health.json?.database}`);

  const contentRes = await fetchJson("/api/content");
  record("Public Content API (/api/content)", contentRes.status === 200 && Array.isArray(contentRes.json?.items), `items count=${contentRes.json?.items?.length || 0}`);

  const heroRes = await fetchJson("/api/content?type=hero");
  record("Hero Banner Content API", heroRes.status === 200 && heroRes.json?.items?.length > 0, `hero items=${heroRes.json?.items?.length}`);

  const doctorRes = await fetchJson("/api/content?type=doctor");
  record("Doctors API", doctorRes.status === 200 && doctorRes.json?.items?.length > 0, `doctors=${doctorRes.json?.items?.length}`);

  const treatmentRes = await fetchJson("/api/content?type=treatment");
  record("Treatments API", treatmentRes.status === 200 && treatmentRes.json?.items?.length > 0, `treatments=${treatmentRes.json?.items?.length}`);

  const baSettings = await fetchJson("/api/before-after/settings");
  record("Before & After Settings API", baSettings.status === 200 && typeof baSettings.json?.settings?.enabled === "boolean", `enabled=${baSettings.json?.settings?.enabled}`);

  const availRes = await fetchJson("/api/availability?date=2026-11-28");
  record("Booking Availability API (/api/availability)", availRes.status === 200 && Array.isArray(availRes.json?.slots), `slots=${availRes.json?.slots?.length}`);

  // 2. Security Testing: Protected Routes & Authorization
  console.log("\n--- SECTION 2: SECURITY & ACCESS CONTROL ---");
  const unauthAppointments = await fetchJson("/api/admin/appointments");
  record("Unauthorized Access to Admin Appointments Blocked", unauthAppointments.status === 401, `status=${unauthAppointments.status}`);

  const unauthDoctors = await fetchJson("/api/admin/doctors");
  record("Unauthorized Access to Admin Doctors Blocked", unauthDoctors.status === 401, `status=${unauthDoctors.status}`);

  const unauthSettings = await fetchJson("/api/admin/before-after/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: false }),
  });
  record("Unauthorized Modification of Settings Blocked", unauthSettings.status === 401, `status=${unauthSettings.status}`);

  // Test SQL injection / malicious input on public APIs
  const sqlInjSlug = await fetchJson("/api/blog/'%20OR%201=1--");
  record("SQL Injection Sanitization on Blog Slug", sqlInjSlug.status === 404 || sqlInjSlug.status === 400, `status=${sqlInjSlug.status}`);

  const xssSearch = await fetchJson("/api/content?type=<script>alert(1)</script>");
  record("XSS Query Parameter Sanitization", xssSearch.status === 200 && (xssSearch.json?.items?.length === 0 || !xssSearch.text.includes("<script>alert(1)</script>")), `status=${xssSearch.status}`);

  // 3. Admin Authentication & Session Security
  console.log("\n--- SECTION 3: ADMIN AUTHENTICATION ---");
  const badLogin = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@srisaraswathidental.com", password: "wrong_password_test" }),
  });
  record("Rejection of Invalid Admin Password", badLogin.status === 401 || badLogin.status === 403, `status=${badLogin.status}`);

  // Authenticate with verified password
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";
  const loginRes = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@srisaraswathidental.com", password: adminPassword }),
  });

  const cookieHeader = loginRes.headers?.get?.("set-cookie");
  const authHeaders = {
    "Content-Type": "application/json",
    ...(cookieHeader ? { Cookie: cookieHeader.split(";")[0] } : {}),
  };

  record("Admin Login Authentication", loginRes.status === 200 && loginRes.json?.user?.role === "admin", `user=${loginRes.json?.user?.email}, role=${loginRes.json?.user?.role}`);

  // 4. Admin Operations with Valid Auth
  if (loginRes.status === 200) {
    console.log("\n--- SECTION 4: ADMIN DASHBOARD OPERATIONS ---");
    const authAppointments = await fetchJson("/api/admin/appointments", { headers: authHeaders });
    const bookingsList = authAppointments.json?.bookings || authAppointments.json?.items || authAppointments.json;
    record("Authorized Access to Admin Appointments", authAppointments.status === 200 && Array.isArray(bookingsList), `total bookings=${bookingsList?.length || 0}`);

    const authDoctors = await fetchJson("/api/admin/doctors", { headers: authHeaders });
    record("Authorized Access to Admin Doctors", authDoctors.status === 200, `status=${authDoctors.status}`);

    const authTreatments = await fetchJson("/api/admin/treatments", { headers: authHeaders });
    record("Authorized Access to Admin Treatments", authTreatments.status === 200, `status=${authTreatments.status}`);

    const authBlogs = await fetchJson("/api/admin/blogs", { headers: authHeaders });
    record("Authorized Access to Admin Blogs", authBlogs.status === 200, `status=${authBlogs.status}`);

    const authSettings = await fetchJson("/api/admin/before-after/settings", { headers: authHeaders });
    record("Authorized Access to Before & After Admin Settings", authSettings.status === 200, `status=${authSettings.status}`);
  }

  // 5. Appointment Booking Flow & WhatsApp Link Validation
  console.log("\n--- SECTION 5: APPOINTMENT FLOW & VALIDATION ---");
  // Test invalid booking missing required fields
  const invalidBooking = await fetchJson("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientName: "" }),
  });
  record("Validation Rejects Incomplete Booking", invalidBooking.status >= 400, `status=${invalidBooking.status}`);

  // Find an available slot on dummyDate
  const dummyDate = "2026-11-28";
  const openSlot = availRes.json?.slots?.find(s => s.remaining > 0)?.time || "9:00 AM";
  const dummyPhone = `9842${Math.floor(100000 + Math.random() * 900000)}`;

  const validBooking = await fetchJson("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patientName: "QA Automated Test Patient",
      patientPhone: dummyPhone,
      patientEmail: "qa.test.patient@example.com",
      service: "root-canal",
      date: dummyDate,
      time: openSlot,
      notes: "Automated QA Verification Booking - Safe for clinic preview testing.",
    }),
  });

  const bookingId = validBooking.json?.booking?.id || validBooking.json?.id;
  const bookingRef = validBooking.json?.booking?.ref || validBooking.json?.ref;
  const waUrl = validBooking.json?.booking?.whatsapp?.clinic || validBooking.json?.booking?.whatsapp?.patient || validBooking.json?.whatsappUrl;

  record("Appointment Booking Submission", validBooking.status === 201 || validBooking.status === 200, `ID=${bookingId}, Ref=${bookingRef}, Time=${openSlot}`);
  record("WhatsApp Notification Link Generated", Boolean(waUrl && (waUrl.includes("wa.me") || waUrl.includes("whatsapp.com"))), `URL=${waUrl ? "Valid WhatsApp Link (" + waUrl.slice(0, 30) + "...)" : "Missing"}`);

  // Verify booking can be reviewed and status updated in Admin panel
  if (bookingId && loginRes.status === 200) {
    const updateStatus = await fetchJson(`/api/admin/appointments/${bookingId}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ status: "confirmed" }),
    });
    record("Admin Appointment Status Update (Confirm)", updateStatus.status === 200, `status=${updateStatus.json?.booking?.status || updateStatus.json?.status}`);

    // Clean up test booking
    const deleteTest = await fetchJson(`/api/admin/appointments/${bookingId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    record("Test Appointment Cleanup", deleteTest.status === 200 || deleteTest.status === 204, `status=${deleteTest.status}`);
  }

  console.log("\n====================================================");
  console.log(`QA SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("====================================================");
}

runQaSuite().catch(err => {
  console.error("QA Suite Fatal Error:", err);
  process.exit(1);
});
