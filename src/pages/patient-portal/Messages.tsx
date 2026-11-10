import { useState } from "react";
import { CheckCircle2, Mail, MessageSquareText, Phone, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { PortalHeader } from "@/components/patient-portal/PortalHeader";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api";

export default function MessagesPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("sending");
    setError("");
    try {
      await api.post("/api/contact-enquiries", {
        name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
        phone: user?.phone ?? "",
        email: user?.email ?? "",
        message: message.trim(),
      });
      setMessage("");
      setState("sent");
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error ? cause.message : "Your message could not be sent. Please contact the clinic directly.");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <PortalHeader eyebrow="Patient portal" title="Contact the clinic" description="Send an enquiry using the contact information on your account." />
      <section className="container-x py-10 md:py-12">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <aside className="rounded-3xl border border-border/70 bg-secondary-50/60 p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-primary-700 shadow-soft"><MessageSquareText className="h-5 w-5" /></span>
            <h2 className="mt-5 font-display text-2xl font-medium text-foreground">Clinic contact</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">For appointment changes or urgent concerns, call the clinic directly.</p>
            <a href="tel:+914244272494" className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary-800"><Phone className="h-4 w-4" />0424 427 2494</a>
            {user?.email && <p className="mt-3 flex items-center gap-2 break-all text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5 shrink-0" />{user.email}</p>}
            <Link to="/contact" className="mt-5 inline-flex text-sm font-semibold text-primary-800 underline underline-offset-4">View address and map</Link>
            <p className="mt-6 border-t border-border/70 pt-4 text-xs leading-5 text-muted-foreground">Please do not use this form for emergencies or send highly sensitive health information. For urgent help, call the clinic.</p>
          </aside>

          <section className="rounded-3xl border border-border/70 bg-card p-6 shadow-card md:p-8">
            {state === "sent" ? (
              <div className="flex min-h-72 flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                <h2 className="mt-4 font-display text-2xl font-medium text-foreground">Enquiry sent</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Your message is in the clinic enquiry list. If you need a timely response, please call the clinic.</p>
                <button type="button" onClick={() => setState("idle")} className="mt-5 text-sm font-semibold text-primary-800">Send another enquiry</button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl font-medium text-foreground">Write a message</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">This will be added to the clinic’s enquiry list with your account contact details.</p>
                <form onSubmit={send} className="mt-6 space-y-4">
                  <label className="block text-sm font-medium text-foreground/80">Your message<textarea value={message} onChange={(event) => setMessage(event.target.value)} required minLength={5} maxLength={4000} rows={7} className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10" placeholder="How can the clinic help?" /></label>
                  {state === "error" && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
                  <button type="submit" disabled={state === "sending"} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary-800 px-5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-wait disabled:opacity-70">{state === "sending" ? "Sending…" : "Send enquiry"}{state !== "sending" && <Send className="h-4 w-4" />}</button>
                </form>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
