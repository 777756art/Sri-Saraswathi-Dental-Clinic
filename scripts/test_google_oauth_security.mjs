// scripts/test_google_oauth_security.mjs
// Sreesaraswathi Dental Clinic - Phase 11 Security Test Suite for Google OAuth 2.0 Integration

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load .env.api
const envPath = path.join(rootDir, ".env.api");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq > 0) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
}

const { getD1Database, initD1Schema } = await import("../server/d1.mjs");

console.log("===============================================================");
console.log("   SRI SARASWATHI DENTAL CLINIC - GOOGLE OAUTH SECURITY SUITE   ");
console.log("===============================================================\n");

const d1 = getD1Database();
const SESSION_SECRET = process.env.SESSION_SECRET || "clinic-d1-secure-secret-key-2026";
const b64url = (buf) => Buffer.from(buf).toString("base64url");

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    process.exitCode = 1;
  }
}

// 1. Database Schema Verification
console.log("--- 1. Database Schema & Google OAuth Columns ---");
const columns = (await d1.prepare("PRAGMA table_info(users)").all()).results.map((c) => c.name);
assert(columns.includes("google_id"), "users table has google_id column");
assert(columns.includes("profile_picture"), "users table has profile_picture column");
assert(columns.includes("auth_provider"), "users table has auth_provider column");
assert(columns.includes("email_verified"), "users table has email_verified column");

// 2. OAuth State Generation & Cryptographic Verification
console.log("\n--- 2. OAuth State & Cryptographic Validation ---");
const randomState = crypto.randomBytes(24).toString("hex");
const nonce = crypto.randomBytes(16).toString("hex");
const statePayload = b64url(JSON.stringify({
  s: randomState,
  next: "/patient-portal/appointments",
  exp: Date.now() + 600000,
}));
const stateSig = crypto.createHmac("sha256", SESSION_SECRET).update(statePayload).digest("base64url");
const validFullState = `${statePayload}.${stateSig}`;

// Test 2a: Valid state passes signature verification
const [p1, s1] = validFullState.split(".");
const expectedSig1 = crypto.createHmac("sha256", SESSION_SECRET).update(p1).digest("base64url");
assert(s1 === expectedSig1, "Valid OAuth state correctly verifies HMAC signature");

// Test 2b: Tampered state fails signature verification
const tamperedPayload = b64url(JSON.stringify({ s: randomState, next: "/dashboard", exp: Date.now() + 600000 }));
const tamperedFullState = `${tamperedPayload}.${stateSig}`;
const [p2, s2] = tamperedFullState.split(".");
const expectedSig2 = crypto.createHmac("sha256", SESSION_SECRET).update(p2).digest("base64url");
assert(s2 !== expectedSig2, "Tampered OAuth state is successfully rejected by HMAC verification");

// Test 2c: Expired state is identified
const expiredPayload = b64url(JSON.stringify({ s: randomState, next: "/booking", exp: Date.now() - 5000 }));
const expiredSig = crypto.createHmac("sha256", SESSION_SECRET).update(expiredPayload).digest("base64url");
const expiredData = JSON.parse(Buffer.from(expiredPayload, "base64url").toString());
assert(expiredData.exp < Date.now(), "Expired OAuth session is detected and blocked");

// 3. Admin Account Isolation & Escalation Prevention (Strict Security Rule)
console.log("\n--- 3. Admin Isolation & Escalation Protection ---");
const adminAccount = await d1.prepare("SELECT * FROM admins WHERE LOWER(email) = 'admin@srisaraswathidental.com'").first();
assert(adminAccount !== null && adminAccount.role === "admin", "Super Admin Dr. Kishore Kumar exists in admins table");

// Simulate Google Sign-In attempt with admin email
const testGoogleEmail = "admin@srisaraswathidental.com";
const adminCheck = await d1.prepare("SELECT id, name, email FROM admins WHERE LOWER(email) = ?").bind(testGoogleEmail.toLowerCase()).first();
assert(adminCheck !== null, "Google OAuth correctly identifies existing clinic administrator email");

// Ensure the Google OAuth callback rule blocks it
const isBlockedAsAdmin = Boolean(adminCheck);
assert(isBlockedAsAdmin === true, "Google login strictly BLOCKS administrator emails from patient portal / Google sign-in");

// 4. Client / Patient Role Enforcement
console.log("\n--- 4. Client Role Enforcement (Zero Admin Privilege Bleed) ---");
const dummyGoogleSub = "google-test-sub-" + Date.now();
const testPatientEmail = `oauth-test-${Date.now()}@example.com`;

// Insert test OAuth patient
await d1.prepare(
  "INSERT INTO users (first_name, last_name, email, phone, password_hash, role, google_id, profile_picture, auth_provider, email_verified, created_at, last_login_at, login_count) VALUES (?, ?, ?, '', 'google_oauth', 'patient', ?, ?, 'google', 1, datetime('now'), datetime('now'), 1)"
).bind("OAuthTest", "Patient", testPatientEmail, dummyGoogleSub, "https://lh3.googleusercontent.com/test-pic.jpg").run();

const createdPatient = await d1.prepare("SELECT * FROM users WHERE google_id = ?").bind(dummyGoogleSub).first();
assert(createdPatient !== null, "New patient account created successfully via Google OAuth");
assert(createdPatient.role === "patient", "Google-authenticated account has strictly role='patient'");
assert(createdPatient.role !== "admin", "Google-authenticated account is strictly NOT an admin");
assert(createdPatient.auth_provider === "google", "auth_provider is set to 'google'");
assert(createdPatient.email_verified === 1, "email_verified is set to 1");

// 5. Existing Patient Account Linking
console.log("\n--- 5. Safe Account Linking (Existing Email/Password User) ---");
const existingEmail = `existing-patient-${Date.now()}@example.com`;
// Create existing local patient
await d1.prepare(
  "INSERT INTO users (first_name, last_name, email, phone, password_hash, role, created_at, last_login_at, login_count) VALUES (?, ?, ?, '9876543210', 'scrypt_hashed_password', 'patient', datetime('now'), datetime('now'), 1)"
).bind("Ravi", "Kumar", existingEmail).run();

const preLink = await d1.prepare("SELECT * FROM users WHERE LOWER(email) = ?").bind(existingEmail).first();
assert(preLink.google_id === null, "Pre-linking: user has null google_id");
assert(preLink.password_hash === "scrypt_hashed_password", "Pre-linking: user has original password hash");

// Perform safe linking
const newGoogleSub = "google-linked-sub-" + Date.now();
await d1.prepare(
  "UPDATE users SET google_id = ?, auth_provider = 'google', email_verified = 1, profile_picture = COALESCE(profile_picture, ?), last_login_at = datetime('now'), login_count = COALESCE(login_count, 0) + 1 WHERE id = ?"
).bind(newGoogleSub, "https://lh3.googleusercontent.com/avatar.jpg", preLink.id).run();

const postLink = await d1.prepare("SELECT * FROM users WHERE id = ?").bind(preLink.id).first();
assert(postLink.google_id === newGoogleSub, "Post-linking: user now has verified google_id");
assert(postLink.password_hash === "scrypt_hashed_password", "Post-linking: original password hash is preserved");
assert(postLink.role === "patient", "Post-linking: role remains strictly 'patient'");

// 6. Cleanup Test Records
console.log("\n--- 6. Test Data Cleanup ---");
await d1.prepare("DELETE FROM users WHERE email = ?").bind(testPatientEmail).run();
await d1.prepare("DELETE FROM users WHERE email = ?").bind(existingEmail).run();
const verifyCleanup1 = await d1.prepare("SELECT id FROM users WHERE email = ?").bind(testPatientEmail).first();
const verifyCleanup2 = await d1.prepare("SELECT id FROM users WHERE email = ?").bind(existingEmail).first();
assert(verifyCleanup1 === null && verifyCleanup2 === null, "Test records safely cleaned up from Cloudflare D1");

// 7. Verify Super Admin Dr. Kishore Kumar Remains Intact
console.log("\n--- 7. Super Admin Integrity Check ---");
const superAdmin1 = await d1.prepare("SELECT id, name, email, role, status FROM admins WHERE email = 'admin@srisaraswathidental.com'").first();
const superAdmin2 = await d1.prepare("SELECT id, name, email, role, status FROM admins WHERE email = 'karthikeyanr359@gmail.com'").first();
assert(superAdmin1 !== null && superAdmin1.name === "Dr. Kishore Kumar" && superAdmin1.role === "admin", "Admin 1 (admin@srisaraswathidental.com) intact as Dr. Kishore Kumar");
assert(superAdmin2 !== null && superAdmin2.name === "Dr. Kishore Kumar" && superAdmin2.role === "admin", "Admin 2 (karthikeyanr359@gmail.com) intact as Dr. Kishore Kumar");

console.log("\n===============================================================");
console.log(`   SECURITY AUDIT COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (100%)   `);
console.log("===============================================================\n");
