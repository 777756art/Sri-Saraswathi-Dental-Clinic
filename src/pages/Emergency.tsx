import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Ambulance,
  CheckCircle,
  Clock,
  Phone,
  Shield,
  Zap,
} from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { LiveChat } from "@/components/home/LiveChat";
import { useClinicSettings } from "@/lib/clinic-settings";
import { api } from "@/lib/api";

const emergencies = [
  "Severe toothache",
  "Knocked-out tooth",
  "Broken or chipped tooth",
  "Lost filling or crown",
  "Abscess or infection",
  "Bleeding that won't stop",
  "Swollen jaw or face",
  "Injury to soft tissues",
  "Broken braces or wires",
  "Severe sensitivity",
];

export default function EmergencyPage() {
  const { settings } = useClinicSettings();
  const phone = settings.phone || "0424 427 2494";
  const cleanPhone = phone.replace(/\s+/g, "");
  const [submission, setSubmission] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmission("sending");
    setError("");
    try {
      await api.post("/api/contact-enquiries", {
        name: String(data.get("name") || ""),
        phone: String(data.get("phone") || ""),
        message: [
          "Urgent dental enquiry",
          `Concern: ${String(data.get("emergencyType") || "Not selected")}`,
          `Pain level: ${String(data.get("severity") || "Not selected")}`,
          `Details: ${String(data.get("details") || "Not provided")}`,
        ].join("\n"),
      });
      setSubmission("success");
    } catch (cause) {
      setSubmission("error");
      setError(cause instanceof Error ? cause.message : "Your enquiry could not be sent. Please call the clinic.");
    }
  };

  return (
    <>
      <main className="min-h-screen bg-background">
        <PageHero
          tone="ink"
          eyebrow="Urgent dental enquiries"
          title={
            <>
              Dental concern? <span className="text-[#E4F0F2]">Talk to the clinic.</span>
            </>
          }
          description="Call the clinic to discuss urgent dental concerns and ask about appointment availability. This form is for enquiries and is not monitored as an emergency service."
          actions={
            <>
              <Button asChild variant="danger" size="lg">
                <a href={`tel:${cleanPhone}`}>
                  <Phone className="h-4 w-4" /> Call {phone}
                </a>
              </Button>
              <Link
                to="/booking?service=emergency"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-medium text-white/80 transition-all hover:border-white/35 hover:text-white"
              >
                Request a callback
              </Link>
            </>
          }
          aside={
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md md:p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent-300">
                  <Zap className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[13px] font-medium text-white">Emergency line</p>
                <p className="text-[11px] text-white/45">Call to check current availability</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-5">
                <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Clinic phone</p>
                  <a href={`tel:${cleanPhone}`} className="mt-1 block font-display text-2xl font-medium text-white">{phone}</a>
                  <p className="mt-1 text-xs leading-5 text-white/55">Please call to ask about urgent care and available appointment times.</p>
                </div>
              </div>
              <div className="mt-6 flex items-start gap-2 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-[#E4F0F2]/65">
                <Ambulance className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E4F0F2]" />
                For a life-threatening emergency, contact local emergency services.
              </div>
            </div>
          }
        />

        <section className="section-pad">
          <div className="container-x">
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <span className="eyebrow">
                  <span className="eyebrow-dot" /> What we treat
                </span>
              <h2 className="mt-5 font-display text-2xl font-bold text-[#1F6878] sm:text-3xl text-balance">
                Tell us what is <span className="text-[#1F6878]">troubling you</span>
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#707574]">
                Common concerns include severe tooth pain, a damaged tooth or swelling. Call the clinic for urgent guidance and current availability.
              </p>

              <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
                {emergencies.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 rounded-xl border border-[#E95A35]/15 bg-[#E4F0F2]/60 px-3.5 py-3 text-[13px] font-medium text-[#1F6878]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#E95A35]" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-[#1F6878]/15 bg-white p-5 shadow-soft">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E4F0F2] text-[#1F6878]">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#1F6878]">
                      Check urgent appointment availability
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#707574]">
                      Availability can change during the day. Call the clinic to discuss your concern and ask about the next available time.
                    </p>
                    <Button asChild size="sm" className="mt-4">
                      <a href="tel:+914244272494">
                        <Phone className="h-3.5 w-3.5" /> Call the emergency line
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              {submission !== "success" ? (
                <div className="rounded-3xl border border-[#1F6878]/15 bg-white p-6 shadow-card md:p-8">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E4F0F2] text-[#E95A35]">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-display text-2xl font-bold text-[#1F6878]">
                        Request emergency care
                      </h3>
                      <p className="text-[12px] text-[#707574]">
                        Share your contact number and the clinic team can review your enquiry.
                      </p>
                    </div>
                  </div>

                    <form
                      className="mt-7"
                      onSubmit={handleSubmit}
                    >
                      <div className="space-y-4">
                        <Input name="name" label="Full name" required minLength={2} maxLength={120} placeholder="Your name" />
                        <Input name="phone" label="Phone number" type="tel" required minLength={7} maxLength={24} placeholder="98765 43210" />
                        <Select
                          name="emergencyType"
                          label="Emergency type"
                          required
                          placeholder="Select your emergency"
                          options={[
                            { value: "toothache", label: "Severe Toothache" },
                            { value: "knocked-out", label: "Knocked-out Tooth" },
                            { value: "broken", label: "Broken/Chipped Tooth" },
                            { value: "abscess", label: "Abscess/Infection" },
                            { value: "bleeding", label: "Uncontrolled Bleeding" },
                            { value: "swelling", label: "Swelling" },
                            { value: "injury", label: "Injury/Trauma" },
                            { value: "other", label: "Other Emergency" },
                          ]}
                        />
                        <Select
                          name="severity"
                          label="Pain severity"
                          required
                          placeholder="Rate your pain (1-10)"
                          options={Array.from({ length: 10 }, (_, i) => ({
                            value: String(i + 1),
                            label: `${i + 1} - ${i < 3 ? "Mild" : i < 7 ? "Moderate" : "Severe"}`,
                          }))}
                        />
                        <TextArea name="details" label="Brief description" maxLength={3000} placeholder="Describe your concern…" />
                        {submission === "error" && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
                        <Button type="submit" variant="primary" size="lg" fullWidth loading={submission === "sending"}>
                          {submission !== "sending" && <AlertTriangle className="h-4 w-4" />} {submission === "sending" ? "Sending enquiry…" : "Send urgent enquiry"}
                        </Button>
                        <p className="text-center text-[11px] text-[#707574]">
                          This form is not an emergency channel. For immediate help, call the clinic or local emergency services.
                        </p>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-[#1F6878]/20 bg-[#E4F0F2] p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#1F6878] shadow-sm">
                      <CheckCircle className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 font-display text-2xl font-bold text-[#1F6878]">
                      Request received
                    </h3>
                    <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-[#707574]">
                      Your enquiry was sent to the clinic team. If you need immediate help, call the clinic directly.
                    </p>
                    <Button asChild variant="primary" className="mt-6">
                      <a href="tel:+914244272494">
                        <Phone className="h-4 w-4" /> Call us directly
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <LiveChat />
    </>
  );
}
