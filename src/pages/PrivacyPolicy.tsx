import { SEOHead } from "@/components/seo/SEOHead";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Mail, Phone, MapPin } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <>
      <SEOHead
        title="Privacy Policy · Sri Saraswathi Dental Clinic"
        description="Privacy policy and data collection transparency for Sri Saraswathi Dental Clinic, Erode."
      />

      <main className="min-h-screen bg-[#F5F2EB] pt-28 pb-16">
        <div className="container-x max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-[#1F6878] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F6878] text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1F6878] sm:text-3xl">
                  Privacy Policy & Data Protection
                </h1>
                <p className="text-[13px] text-muted-foreground">
                  Sri Saraswathi Dental Clinic · Last updated: November 2026
                </p>
              </div>
            </div>
          </div>

          {/* Policy Card */}
          <div className="rounded-3xl border border-border/80 bg-white p-6 shadow-sm sm:p-10 space-y-8 text-foreground leading-relaxed text-[14.5px]">
            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">1. Introduction & Overview</h2>
              <p className="mt-2 text-muted-foreground">
                Sri Saraswathi Dental Clinic (&quot;we&quot;, &quot;our&quot;, or &quot;the Clinic&quot;), led by Dr. Kishore Kumar, MDS, is committed to safeguarding the privacy and personal data of our patients, visitors, and users of our digital platforms at <strong>https://drkishoredentist.com</strong>. This Privacy Policy details the types of information we collect, how it is processed and protected, and your rights concerning your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">2. Information We Collect</h2>
              <p className="mt-2 text-muted-foreground">We collect personal information necessary to deliver high-quality dental care, appointment scheduling, and secure account access:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Patient Profile Information:</strong> First name, last name, phone number, and email address provided during registration or appointment booking.
                </li>
                <li>
                  <strong className="text-foreground">Google OAuth Authentication Data:</strong> When you choose to sign in or register with Google (&quot;Continue with Google&quot;), we receive your verified email address, full name, and profile picture directly from Google via OpenID Connect (scopes: <code className="bg-muted px-1.5 py-0.5 rounded text-[13px]">openid email profile</code>). We do <strong>not</strong> access your Google Drive, contacts, private emails, or any sensitive Google account data.
                </li>
                <li>
                  <strong className="text-foreground">Clinical & Appointment Details:</strong> Preferred dates, treatment preferences, medical history provided voluntarily for diagnosis, and appointment notes.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">3. How We Use Your Information</h2>
              <p className="mt-2 text-muted-foreground">We utilize collected data strictly for clinic operations and patient convenience:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                <li>To authenticate your identity and grant access to the secure Patient Portal and Admin Dashboard.</li>
                <li>To confirm, reschedule, or send reminders regarding your scheduled dental consultations and follow-up visits.</li>
                <li>To maintain accurate patient dental records and treatment progress history.</li>
                <li>To deliver emergency dental assistance and telehealth consultations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">4. Google User Data Policy & Zero Data Selling</h2>
              <div className="rounded-2xl border border-primary-200 bg-[#E4F0F2]/40 p-4">
                <p className="text-[13.5px] font-medium text-[#1F6878]">
                  Sri Saraswathi Dental Clinic strictly adheres to the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements.
                </p>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  We do <strong>NOT</strong> sell, rent, lease, or monetize personal information or Google user data to any third-party advertisers, data brokers, or marketing networks. All Google data is solely used to verify your identity and prefill your clinic account.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">5. Data Security & Storage</h2>
              <p className="mt-2 text-muted-foreground">
                Your data is stored in enterprise-grade Cloudflare D1 relational databases with end-to-end encryption in transit (HTTPS / TLS 1.3) and at rest. Authenticated sessions use cryptographically signed HMAC-SHA256 HTTP-only cookies (<code className="bg-muted px-1.5 py-0.5 rounded text-[13px]">clinic_session</code>) with <code className="bg-muted px-1.5 py-0.5 rounded text-[13px]">SameSite=Lax</code> security attributes to prevent cross-site request forgery and data interception.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">6. Data Retention & Your Rights (Data Deletion)</h2>
              <p className="mt-2 text-muted-foreground">
                You retain complete control over your personal information. You have the right to inspect, update, or request permanent deletion of your account and personal data at any time. To request data deletion, simply email our clinical administration at <a href="mailto:contact@srisaraswathidental.com" className="text-[#1F6878] font-semibold underline">contact@srisaraswathidental.com</a> or call us directly. Requests are fulfilled within 48 business hours.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">7. Contact Clinic Administration</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/80 p-3.5 bg-muted/20">
                  <Mail className="h-4 w-4 text-[#1F6878] mb-1" />
                  <p className="text-[12px] font-semibold text-foreground">Email</p>
                  <p className="text-[12px] text-muted-foreground truncate">karthikeyanr359@gmail.com</p>
                </div>
                <div className="rounded-xl border border-border/80 p-3.5 bg-muted/20">
                  <Phone className="h-4 w-4 text-[#1F6878] mb-1" />
                  <p className="text-[12px] font-semibold text-foreground">Phone</p>
                  <p className="text-[12px] text-muted-foreground">+91 94437 28989</p>
                </div>
                <div className="rounded-xl border border-border/80 p-3.5 bg-muted/20">
                  <MapPin className="h-4 w-4 text-[#1F6878] mb-1" />
                  <p className="text-[12px] font-semibold text-foreground">Location</p>
                  <p className="text-[12px] text-muted-foreground">Erode, Tamil Nadu, India</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
