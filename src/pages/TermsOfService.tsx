import { SEOHead } from "@/components/seo/SEOHead";
import { Link } from "react-router-dom";
import { FileText, ArrowLeft, Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <>
      <SEOHead
        title="Terms of Service · Sri Saraswathi Dental Clinic"
        description="Terms of service, patient care guidelines, and platform policies for Sri Saraswathi Dental Clinic, Erode."
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
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1F6878] sm:text-3xl">
                  Terms of Service & Care Policies
                </h1>
                <p className="text-[13px] text-muted-foreground">
                  Sri Saraswathi Dental Clinic · Last updated: November 2026
                </p>
              </div>
            </div>
          </div>

          {/* Terms Card */}
          <div className="rounded-3xl border border-border/80 bg-white p-6 shadow-sm sm:p-10 space-y-8 text-foreground leading-relaxed text-[14.5px]">
            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">1. Acceptance of Terms</h2>
              <p className="mt-2 text-muted-foreground">
                By accessing or using the website at <strong>https://drkishoredentist.com</strong>, booking appointments, or registering for our Patient Portal, you agree to comply with and be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our online services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">2. Medical Advice & Clinical Disclaimer</h2>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-[13.5px] font-medium text-amber-900">
                  Educational Information Only
                </p>
                <p className="mt-1.5 text-[13px] text-amber-800">
                  Content, articles, video demonstrations, and virtual AI assistant responses provided on this website are for educational and informational purposes only. They do not constitute formal dental diagnosis or professional medical advice. Always consult our licensed dental surgeons (led by Dr. Kishore Kumar, MDS) in person for diagnostic evaluation and customized treatment plans.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">3. User Accounts & Google Authentication</h2>
              <p className="mt-2 text-muted-foreground">
                When you create an account or sign in with Google (&quot;Continue with Google&quot;):
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                <li>You agree to provide accurate and truthful contact information for medical records and appointment coordination.</li>
                <li>You are responsible for maintaining the confidentiality of your credentials and devices.</li>
                <li>We do not request or store passwords for accounts created via Google OAuth 2.0; authentication is managed securely by Google's identity infrastructure.</li>
                <li>Clinic administrators retain the right to suspend or disable accounts that engage in fraudulent bookings or misuse of clinic services.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">4. Appointment Scheduling, Rescheduling & Cancellations</h2>
              <div className="mt-3 space-y-2.5">
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1F6878] mt-0.5" />
                  <span><strong>Appointments:</strong> Online booking requests are verified and confirmed by our clinic reception team based on doctor availability.</span>
                </div>
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1F6878] mt-0.5" />
                  <span><strong>Cancellations:</strong> If you need to cancel or reschedule, please notify us at least 2 hours prior to your scheduled time so we can accommodate other patients needing urgent care.</span>
                </div>
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1F6878] mt-0.5" />
                  <span><strong>Emergency Care:</strong> Patients experiencing acute dental trauma or severe pain are prioritized during working hours.</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">5. Intellectual Property</h2>
              <p className="mt-2 text-muted-foreground">
                All clinic trademarks, branding, clinical case photographs, Before &amp; After smile transformations, educational articles, and UI designs featured on <strong>https://drkishoredentist.com</strong> are the exclusive intellectual property of Sri Saraswathi Dental Clinic. Any unauthorized reproduction, scraping, or commercial distribution is strictly prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">6. Governing Law & Jurisdiction</h2>
              <p className="mt-2 text-muted-foreground">
                These terms shall be governed by and construed in accordance with the laws of India. Any legal disputes arising out of the use of our website or dental services shall be subject to the exclusive jurisdiction of the competent courts in Erode, Tamil Nadu, India.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1F6878]">7. Questions & Contact Information</h2>
              <p className="mt-2 text-muted-foreground">
                For questions regarding our clinic policies, terms of service, or dental treatments, please reach out to our team:
              </p>
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
                  <p className="text-[12px] font-semibold text-foreground">Clinic Address</p>
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
