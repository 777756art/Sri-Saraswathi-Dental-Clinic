import { CalendarDays, MapPin, MessageCircle, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/Button";

const steps = [
  { icon: MessageCircle, title: "Tell us what you need", description: "Use the Contact page or call the clinic with a short description of your question." },
  { icon: Phone, title: "Ask which next step fits", description: "The clinic team can explain whether a phone conversation may help or whether an in-person visit is needed." },
  { icon: CalendarDays, title: "Arrange a visit if needed", description: "If an appointment is appropriate, send a booking request and the clinic will confirm availability." },
];

export default function TeleDentistryPage() {
  return (
    <main className="min-h-screen bg-background">
      <PageHero
        eyebrow="Remote care enquiries"
        title={<>Start with a <span className="italic text-primary-700">conversation.</span></>}
        description="Not sure whether you need to visit in person? Call the clinic to ask about the right next step. Remote advice may not be suitable for every dental concern and does not replace an examination."
        actions={
          <>
            <Button asChild size="lg"><a href="tel:+914244272494"><Phone className="h-4 w-4" /> Call 0424 427 2494</a></Button>
            <Button asChild variant="outline" size="lg"><Link to="/contact">Contact the clinic</Link></Button>
          </>
        }
        aside={
          <div className="rounded-[26px] border border-border/70 bg-card p-6 shadow-lift sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary-700"><MapPin className="h-5 w-5" /></span>
            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.15em] text-primary-700">Clinic location</p>
            <h2 className="mt-2 font-display text-2xl font-medium text-foreground">Sri Saraswathi Dental Clinic</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">866, Soli Complex, Surampatti Four Road, Erode, Tamil Nadu 638009</p>
            <Link to="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-800">View map and contact details <MapPin className="h-4 w-4" /></Link>
          </div>
        }
      />

      <section className="section-pad">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow justify-center"><span className="eyebrow-dot" /> How to get help</span>
            <h2 className="mt-4 text-display-2 text-balance">A clear next step, guided by the clinic.</h2>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
                <div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700"><Icon className="h-5 w-5" /></span><span className="font-display text-2xl text-primary-700/35">0{index + 1}</span></div>
                <h3 className="mt-5 font-display text-xl font-medium text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-7 max-w-3xl text-center text-xs leading-5 text-muted-foreground">If symptoms are severe or life-threatening, contact local emergency services. This page does not provide diagnosis or urgent clinical monitoring.</p>
        </div>
      </section>
    </main>
  );
}
