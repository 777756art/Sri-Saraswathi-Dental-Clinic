import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MessageCircle, Minus, Plus, Search } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/Button";

const faqs = [
  {
    category: "Appointments",
    items: [
      { q: "How do I book an appointment?", a: "Use Book a Visit to send your preferred treatment, date and time. The clinic team will review availability and confirm the appointment with you." },
      { q: "Can I reschedule or cancel an appointment?", a: "Contact the clinic using the phone number on the Contact page and share your appointment details. The team can help check the available options." },
      { q: "Do you accept walk-ins?", a: "Availability can change during the day. Please call the clinic before travelling to ask whether a walk-in visit can be accommodated." },
      { q: "What should I bring to my first appointment?", a: "Bring any previous dental records or images you have and a list of medicines you currently take. Call the clinic if you need visit-specific guidance." },
    ],
  },
  {
    category: "Insurance & Payments",
    items: [
      { q: "What insurance plans do you accept?", a: "Coverage depends on your insurer and policy. Contact the clinic before your visit to check whether your plan can be used." },
      { q: "Do you offer payment plans?", a: "Please ask the clinic team about current payment options and any terms that may apply to your treatment." },
      { q: "What payment methods do you accept?", a: "Payment options may vary. Contact the clinic to confirm the methods available for your visit." },
    ],
  },
  {
    category: "Treatments",
    items: [
      { q: "How often should I visit the dentist?", a: "The right interval depends on your oral health and care needs. Your dentist can recommend a schedule after assessing you." },
      { q: "Are dental X-rays safe?", a: "Your dentist will explain why an image may be needed and discuss the appropriate approach for your situation before proceeding." },
      { q: "Does teeth whitening damage enamel?", a: "Suitability depends on your teeth and gums. Ask your dentist to assess your oral health and explain the options before deciding." },
    ],
  },
  {
    category: "Technology",
    items: [
      { q: "How can the website assistant help?", a: "The website assistant can point you to clinic information and booking steps. It does not diagnose symptoms or replace advice from your dentist." },
      { q: "How is my information handled?", a: "Use the contact details on this website if you have questions about information you share with the clinic. Avoid sending urgent or sensitive clinical details through a general enquiry." },
      { q: "Can I preview treatment results online?", a: "Treatment outcomes vary by person. Your dentist can discuss what may be suitable after examining your teeth and understanding your goals." },
    ],
  },
];

export default function FaqPage() {
  const [search, setSearch] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const filtered = faqs
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (i) =>
          i.q.toLowerCase().includes(search.toLowerCase()) ||
          i.a.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <main className="min-h-screen bg-background">
      <PageHero
        eyebrow="Help centre"
        align="center"
        title={
          <>
            Questions, answered <span className="italic text-[#1F6878]">plainly.</span>
          </>
        }
        description="Appointments, insurance, treatment and the technology behind your care. If it isn't here, our team is one message away."
        actions={
          <div className="relative mx-auto w-full max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions…"
              className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 text-[14px] text-foreground shadow-soft transition-all placeholder:text-muted-foreground/70 focus:border-primary-500/50 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
            />
          </div>
        }
      />

      <section className="section-pad">
        <div className="container-x">
          <div className="mx-auto max-w-3xl">
            {filtered.length === 0 && (
              <div className="rounded-3xl border border-border/70 bg-card p-10 text-center shadow-soft">
                <p className="font-display text-2xl font-medium text-[#1F6878]">No matches found</p>
                <p className="mt-2 text-[14px] text-muted-foreground">
                  Try a different phrase, or ask us directly.
                </p>
                <Button asChild variant="outline" className="mt-6">
                  <Link to="/contact">Contact the team</Link>
                </Button>
              </div>
            )}

            <div className="space-y-12">
              {filtered.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-2xl font-semibold text-[#1F6878]">
                      {cat.category}
                    </h2>
                    <span className="rounded-full border border-border/80 bg-secondary-50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {cat.items.length}
                    </span>
                  </div>

                  <div className="mt-5 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
                    {cat.items.map((item) => {
                      const key = `${cat.category}-${item.q}`;
                      const isOpen = openKey === key;
                      return (
                        <div key={item.q}>
                          <button
                            type="button"
                            onClick={() => setOpenKey(isOpen ? null : key)}
                            aria-expanded={isOpen}
                            className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left transition-colors hover:bg-secondary-50/60 md:px-6"
                          >
                            <span className="text-[15px] font-medium text-foreground">
                              {item.q}
                            </span>
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                isOpen
                                  ? "border-primary-700 bg-primary-700 text-white"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            </span>
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden"
                              >
                                <p className="px-5 pb-5 pr-12 text-[14px] leading-relaxed text-muted-foreground md:px-6">
                                  {item.a}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 flex flex-col items-center gap-4 rounded-3xl border border-border/70 bg-secondary-50/70 px-6 py-10 text-center md:flex-row md:justify-between md:text-left">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-primary-700 shadow-soft">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-lg font-medium text-foreground">
                    Still have a question?
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    Our front desk usually replies in under an hour.
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link to="/contact">
                  Ask us directly <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
