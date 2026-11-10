import { CalendarDays, Clock3, MapPin, MessageCircle } from "lucide-react";

const trustItems = [
  { icon: MapPin, title: "Care in Erode", detail: "Soli Complex, Surampatti" },
  { icon: Clock3, title: "Mon–Sat", detail: "9:00 AM – 8:45 PM" },
  { icon: CalendarDays, title: "Sunday support", detail: "Emergency visits by call" },
  { icon: MessageCircle, title: "Booking updates", detail: "Confirmation on WhatsApp" },
];

export function TrustBar() {
  return (
    <section className="border-y border-[#f1e9ec] bg-white">
      <div className="container-x grid gap-3 py-5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:py-6">
        {trustItems.map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex min-h-[78px] items-center gap-3 rounded-[17px] border border-[#f2e5e9] bg-white px-3.5 py-3 sm:px-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[#fff0f5] text-[#ed2f79]"><Icon className="h-[18px] w-[18px]" /></span>
            <span className="min-w-0"><span className="block truncate text-[12px] font-bold text-[#153744]">{title}</span><span className="mt-1 block truncate text-[10.5px] text-[#66717e]">{detail}</span></span>
          </div>
        ))}
      </div>
    </section>
  );
}
