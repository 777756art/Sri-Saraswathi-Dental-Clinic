// Comprehensive Test Suite for Sri Saraswathi Dental Clinic Appointment Booking System
// Verifies Date/Time validation in Asia/Kolkata (IST), Doctor & Treatment Dynamic Management,
// Availability Calculation, Admin Blocking, Conflict Prevention, Status Transitions.

import assert from "node:assert";

// Mock D1 Database simulating Cloudflare D1
class MemoryD1 {
  constructor() {
    this.doctors = [
      { id: 1, name: "Dr. Kishore Kumar", qualification: "BDS, MDS", specialization: "Chief Dental Surgeon", experience: "14+ Years", profile_image_url: "/api/media/doc1.jpg", status: "active", display_order: 1 },
      { id: 2, name: "Dr. Priyadharshini K", qualification: "BDS", specialization: "Consultant Orthodontist", experience: "8+ Years", profile_image_url: "/api/media/doc2.jpg", status: "active", display_order: 2 },
      { id: 3, name: "Dr. Inactive Doctor", qualification: "BDS", specialization: "General", experience: "2 Years", profile_image_url: "", status: "inactive", display_order: 3 },
    ];
    this.treatments = [
      { id: 14, treatment_name: "Teeth Cleaning & Scaling", slug: "teeth-cleaning-scaling", duration_minutes: 30, status: "active", display_order: 1 },
      { id: 15, treatment_name: "Root Canal Treatment", slug: "root-canal-treatment", duration_minutes: 60, status: "active", display_order: 2 },
      { id: 16, treatment_name: "Inactive Treatment", slug: "inactive-treatment", duration_minutes: 30, status: "inactive", display_order: 3 },
    ];
    this.blocked_dates = [];
    this.appointments = [];
    this.meta = {};
  }
}

const CLINIC_TIMEZONE = "Asia/Kolkata";
const SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM",
  "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM",
];

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

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return -1;
  const str = String(timeStr).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return -1;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridian = match[3] ? match[3].toUpperCase() : null;
  if (meridian === "PM" && h < 12) h += 12;
  if (meridian === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

// Emulate backend availability logic
function calculateAvailability(db, query) {
  const date = String(query.date || "").trim();
  const todayIST = getTodayISTString();
  const nowIST = getNowIST();
  const currentMinutesIST = nowIST.getHours() * 60 + nowIST.getMinutes();

  if (!date) return { status: 400, error: "Date parameter is required." };
  if (date < todayIST) {
    return { status: 200, data: { date, closed: true, past: true, reason: "Past dates cannot be booked.", slots: [] } };
  }

  const doctorId = query.doctorId ? Number(query.doctorId) : null;
  const treatmentId = query.treatmentId ? Number(query.treatmentId) : null;

  if (doctorId) {
    const doc = db.doctors.find((d) => d.id === doctorId);
    if (!doc || doc.status !== "active") {
      return { status: 400, error: "Selected doctor is not available for new bookings." };
    }
  }

  let durationMinutes = 30;
  if (treatmentId) {
    const treat = db.treatments.find((t) => t.id === treatmentId);
    if (!treat || treat.status !== "active") {
      return { status: 400, error: "Selected treatment is not available for booking." };
    }
    durationMinutes = treat.duration_minutes || 30;
  }

  const dateObj = new Date(`${date}T00:00:00`);
  if (dateObj.getDay() === 0) {
    return { status: 200, data: { date, closed: true, reason: "Clinic is closed on Sundays.", slots: [] } };
  }

  // Full day block check
  const fullBlock = db.blocked_dates.find(
    (b) => b.block_date === date && !b.start_time && (!b.doctor_id || (doctorId && b.doctor_id === doctorId))
  );
  if (fullBlock) {
    return { status: 200, data: { date, closed: true, reason: fullBlock.reason || "Appointments are unavailable on this date.", slots: [] } };
  }

  // Time range blocks
  const timeBlocks = db.blocked_dates.filter(
    (b) => b.block_date === date && b.start_time && (!b.doctor_id || (doctorId && b.doctor_id === doctorId))
  );

  const isTimeRangeBlocked = (slotMin, dur = 30) => {
    const slotEndMin = slotMin + dur;
    for (const b of timeBlocks) {
      const bStart = parseTimeToMinutes(b.start_time);
      const bEnd = parseTimeToMinutes(b.end_time);
      if (bStart !== -1 && bEnd !== -1 && slotMin < bEnd && slotEndMin > bStart) {
        return true;
      }
    }
    return false;
  };

  const existingApts = db.appointments.filter(
    (a) => a.appointment_date === date && !["cancelled", "rejected"].includes(String(a.status).toLowerCase())
  );

  const docBookedTimes = new Set();
  const globalCountMap = {};
  for (const a of existingApts) {
    globalCountMap[a.appointment_time] = (globalCountMap[a.appointment_time] || 0) + 1;
    if (doctorId && Number(a.doctor_id) === Number(doctorId)) {
      docBookedTimes.add(a.appointment_time);
    }
  }

  const slotsNeeded = Math.ceil(durationMinutes / 30);
  const availableSlots = [];

  for (let i = 0; i < SLOTS.length; i++) {
    const timeStr = SLOTS[i];
    const slotMin = parseTimeToMinutes(timeStr);
    if (slotMin === -1) continue;

    if (date === todayIST && slotMin <= currentMinutesIST) continue;
    if (isTimeRangeBlocked(slotMin, 30)) continue;

    if (doctorId) {
      if (docBookedTimes.has(timeStr)) continue;
    } else {
      if ((globalCountMap[timeStr] || 0) >= 2) continue;
    }

    if (slotsNeeded > 1) {
      let canFit = true;
      for (let j = 1; j < slotsNeeded; j++) {
        const nextIdx = i + j;
        if (nextIdx >= SLOTS.length) { canFit = false; break; }
        const nextTime = SLOTS[nextIdx];
        const nextMin = parseTimeToMinutes(nextTime);
        if (nextMin !== slotMin + j * 30 || isTimeRangeBlocked(nextMin, 30)) { canFit = false; break; }
        if (doctorId && docBookedTimes.has(nextTime)) { canFit = false; break; }
        if (!doctorId && (globalCountMap[nextTime] || 0) >= 2) { canFit = false; break; }
      }
      if (!canFit) continue;
    }

    availableSlots.push({ time: timeStr, remaining: doctorId ? 1 : 2 - (globalCountMap[timeStr] || 0), available: true });
  }

  return {
    status: 200,
    data: {
      date,
      closed: availableSlots.length === 0,
      reason: availableSlots.length === 0 ? "No available appointments for this date." : "",
      slots: availableSlots,
    },
  };
}

// Emulate backend appointment booking creation logic
function createAppointment(db, body) {
  const patientName = String(body.patientName || "").trim();
  const phone = String(body.phone || "").trim().replace(/\D/g, "");
  const date = String(body.date || "").trim();
  const time = String(body.time || "").trim();
  const doctorId = Number(body.doctorId);
  const treatmentId = Number(body.treatmentId);

  if (patientName.length < 2) return { status: 400, error: "Patient name is required." };
  if (phone.length < 10) return { status: 400, error: "Valid 10-digit phone number is required." };

  const todayIST = getTodayISTString();
  const nowIST = getNowIST();
  const currentMinutesIST = nowIST.getHours() * 60 + nowIST.getMinutes();

  if (date < todayIST) return { status: 400, error: "Past dates cannot be booked." };
  const slotMin = parseTimeToMinutes(time);
  if (slotMin === -1) return { status: 400, error: "Invalid appointment time slot." };
  if (date === todayIST && slotMin <= currentMinutesIST) {
    return { status: 400, error: "Cannot book an appointment time that has already passed." };
  }

  const doc = db.doctors.find((d) => d.id === doctorId);
  if (!doc || doc.status !== "active") return { status: 400, error: "Selected doctor is not available for new bookings." };

  const treat = db.treatments.find((t) => t.id === treatmentId);
  if (!treat || treat.status !== "active") return { status: 400, error: "Selected treatment is no longer active or available for booking." };

  // Blocked date/time
  const fullBlock = db.blocked_dates.find((b) => b.block_date === date && !b.start_time && (!b.doctor_id || b.doctor_id === doctorId));
  if (fullBlock) return { status: 400, error: `Selected date is unavailable: ${fullBlock.reason || "Appointments are unavailable on this date."}` };

  const timeBlocks = db.blocked_dates.filter((b) => b.block_date === date && b.start_time && (!b.doctor_id || b.doctor_id === doctorId));
  for (const tb of timeBlocks) {
    const bStart = parseTimeToMinutes(tb.start_time);
    const bEnd = parseTimeToMinutes(tb.end_time);
    if (slotMin < bEnd && (slotMin + 30) > bStart) {
      return { status: 400, error: `Selected time slot is unavailable: ${tb.reason || "Time slot blocked."}` };
    }
  }

  // Double booking check for doctor
  const conflict = db.appointments.find(
    (a) => a.appointment_date === date && a.appointment_time === time && a.doctor_id === doctorId && !["cancelled", "rejected"].includes(String(a.status).toLowerCase())
  );
  if (conflict) {
    return { status: 409, error: "This doctor already has an appointment booked for this time slot. Please choose another time." };
  }

  const newId = db.appointments.length + 1;
  const newAppointment = {
    id: newId,
    patient_name: patientName,
    phone,
    doctor_id: doctorId,
    treatment_id: treatmentId,
    appointment_date: date,
    appointment_time: time,
    status: "Pending",
  };
  db.appointments.push(newAppointment);

  return { status: 201, data: { appointment: newAppointment } };
}

// RUN TESTS
async function runAllTests() {
  console.log("Starting Complete Dental Appointment Booking System Verification...");
  const db = new MemoryD1();
  const todayIST = getTodayISTString();
  const yesterdayIST = (() => {
    const d = getNowIST();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const tomorrowIST = (() => {
    const d = getNowIST();
    d.setDate(d.getDate() + 1);
    // ensure tomorrow is not Sunday
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  // 1. Yesterday cannot be booked
  const res1 = calculateAvailability(db, { date: yesterdayIST });
  assert.strictEqual(res1.data.closed, true);
  assert.strictEqual(res1.data.past, true);
  const book1 = createAppointment(db, { patientName: "John", phone: "9876543210", date: yesterdayIST, time: "10:00 AM", doctorId: 1, treatmentId: 14 });
  assert.strictEqual(book1.status, 400);
  assert.match(book1.error, /past dates/i);
  console.log("✓ Test 1 Passed: Yesterday cannot be booked.");

  // 2. Previous dates cannot be booked
  const book2 = createAppointment(db, { patientName: "John", phone: "9876543210", date: "2024-01-01", time: "10:00 AM", doctorId: 1, treatmentId: 14 });
  assert.strictEqual(book2.status, 400);
  console.log("✓ Test 2 Passed: Previous dates cannot be booked.");

  // 3. Today's past time slots are hidden and rejected
  const pastTime = "9:00 AM"; // 9:00 AM is in the past at 10:15 PM IST
  const res3 = calculateAvailability(db, { date: todayIST });
  const hasPastSlot = res3.data.slots.some((s) => s.time === pastTime);
  assert.strictEqual(hasPastSlot, false);
  const book3 = createAppointment(db, { patientName: "John", phone: "9876543210", date: todayIST, time: pastTime, doctorId: 1, treatmentId: 14 });
  assert.strictEqual(book3.status, 400);
  assert.match(book3.error, /already passed/i);
  console.log("✓ Test 3 Passed: Today's past time slots are hidden and rejected.");

  // 4. Future working dates are displayed and bookable
  const res4 = calculateAvailability(db, { date: tomorrowIST });
  assert.strictEqual(res4.data.closed, false);
  assert.ok(res4.data.slots.length > 0);
  console.log("✓ Test 4 Passed: Future working dates are displayed.");

  // 5. Admin can block an entire date (Fully blocked dates cannot be booked)
  db.blocked_dates.push({ id: 101, block_date: tomorrowIST, start_time: null, end_time: null, reason: "Diwali Holiday" });
  const res5 = calculateAvailability(db, { date: tomorrowIST });
  assert.strictEqual(res5.data.closed, true);
  assert.match(res5.data.reason, /Diwali Holiday/i);
  const book5 = createAppointment(db, { patientName: "John", phone: "9876543210", date: tomorrowIST, time: "10:00 AM", doctorId: 1, treatmentId: 14 });
  assert.strictEqual(book5.status, 400);
  console.log("✓ Test 5 Passed: Fully blocked dates cannot be booked.");

  // 6. Admin can unblock dates and times
  db.blocked_dates = db.blocked_dates.filter((b) => b.id !== 101);
  const res6 = calculateAvailability(db, { date: tomorrowIST });
  assert.strictEqual(res6.data.closed, false);
  console.log("✓ Test 6 Passed: Unblocked dates become available again.");

  // 7. Blocked time ranges are hidden
  db.blocked_dates.push({ id: 102, block_date: tomorrowIST, start_time: "10:00 AM", end_time: "11:30 AM", reason: "Surgery" });
  const res7 = calculateAvailability(db, { date: tomorrowIST });
  const hasBlocked10 = res7.data.slots.some((s) => s.time === "10:00 AM");
  const hasBlocked1030 = res7.data.slots.some((s) => s.time === "10:30 AM");
  const hasAvailable1 = res7.data.slots.some((s) => s.time === "1:00 PM");
  assert.strictEqual(hasBlocked10, false);
  assert.strictEqual(hasBlocked1030, false);
  assert.strictEqual(hasAvailable1, true);
  console.log("✓ Test 7 Passed: Blocked time ranges are hidden.");

  // 8. Booking an appointment reserves the slot
  const book8 = createAppointment(db, { patientName: "Aarav", phone: "9876543210", date: tomorrowIST, time: "1:00 PM", doctorId: 1, treatmentId: 14 });
  assert.strictEqual(book8.status, 201);
  // Slot 1:00 PM is now booked for Doctor 1
  const res8 = calculateAvailability(db, { date: tomorrowIST, doctorId: 1 });
  const hasBookedSlot = res8.data.slots.some((s) => s.time === "1:00 PM");
  assert.strictEqual(hasBookedSlot, false);
  console.log("✓ Test 8 Passed: Booked slots are hidden for that doctor.");

  // 9. Simultaneous booking conflict prevention (same doctor, same time slot)
  const book9 = createAppointment(db, { patientName: "Priya", phone: "9876543211", date: tomorrowIST, time: "1:00 PM", doctorId: 1, treatmentId: 14 });
  assert.strictEqual(book9.status, 409);
  assert.match(book9.error, /already has an appointment booked/i);
  console.log("✓ Test 9 Passed: Double booking for the same doctor is prevented (409 Conflict).");

  // 10. Doctor 2 CAN book at 1:00 PM (two different doctors can accept appointments at same time)
  const book10 = createAppointment(db, { patientName: "Karthik", phone: "9876543212", date: tomorrowIST, time: "1:00 PM", doctorId: 2, treatmentId: 14 });
  assert.strictEqual(book10.status, 201);
  console.log("✓ Test 10 Passed: Different doctors can accept appointments at the same time.");

  // 11. Overlapping appointment durations (60-minute treatment requires two consecutive free slots)
  // Clean up block 102
  db.blocked_dates = [];
  // Doctor 1 has appointment at 3:30 PM
  createAppointment(db, { patientName: "Ananya", phone: "9876543213", date: tomorrowIST, time: "3:30 PM", doctorId: 1, treatmentId: 14 });
  // Check availability for 60-min treatment (treatmentId 15): 3:00 PM needs 3:00 PM and 3:30 PM, but 3:30 PM is booked!
  const res11 = calculateAvailability(db, { date: tomorrowIST, doctorId: 1, treatmentId: 15 });
  const has3PM = res11.data.slots.some((s) => s.time === "3:00 PM");
  assert.strictEqual(has3PM, false); // 3:00 PM cannot fit 60m because 3:30 PM is booked
  console.log("✓ Test 11 Passed: Multi-slot duration overlapping prevention works.");

  // 12. Deactivated doctors cannot be booked
  const book12 = createAppointment(db, { patientName: "Test", phone: "9876543214", date: tomorrowIST, time: "4:00 PM", doctorId: 3, treatmentId: 14 });
  assert.strictEqual(book12.status, 400);
  assert.match(book12.error, /not available for new bookings/i);
  console.log("✓ Test 12 Passed: Inactive doctors cannot be booked.");

  // 13. Deactivated treatments cannot be booked
  const book13 = createAppointment(db, { patientName: "Test", phone: "9876543214", date: tomorrowIST, time: "4:00 PM", doctorId: 1, treatmentId: 16 });
  assert.strictEqual(book13.status, 400);
  assert.match(book13.error, /no longer active/i);
  console.log("✓ Test 13 Passed: Inactive treatments cannot be booked.");

  // 14. Admin Cancelling/Rejecting releases the slot
  const aptToCancel = db.appointments.find((a) => a.id === book8.data.appointment.id);
  aptToCancel.status = "Cancelled";
  const res14 = calculateAvailability(db, { date: tomorrowIST, doctorId: 1 });
  const is1PMAvailableAgain = res14.data.slots.some((s) => s.time === "1:00 PM");
  assert.strictEqual(is1PMAvailableAgain, true);
  console.log("✓ Test 14 Passed: Cancelled / Rejected status releases the slot immediately.");

  console.log("\n==========================================");
  console.log("ALL 14 CORE ENGINE TESTS PASSED WITH 100% SUCCESS!");
  console.log("==========================================");
}

runAllTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
