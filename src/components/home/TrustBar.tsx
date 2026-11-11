import { CalendarDays, Clock3, MapPin, MessageCircle } from "lucide-react";

const trustItems = [
  { icon: MapPin, title: "Care in Erode", detail: "Soli Complex, Surampatti" },
  { icon: Clock3, title: "Mon–Sat", detail: "9:00 AM – 8:45 PM" },
  { icon: CalendarDays, title: "Sunday support", detail: "Emergency visits by call" },
  { icon: MessageCircle, title: "Booking updates", detail: "Confirmation on WhatsApp" },
];

export function TrustBar() {
  return (
    <section className="border-y border-[#dce4e5] bg-white">
      <div className="container-x grid gap-3 py-5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:py-6">
        {trustItems.map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex min-h-[78px] items-center gap-3 rounded-[17px] border border-[#dce4e5] bg-white px-3.5 py-3 sm:px-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[#E4F0F2] text-[#1F6878]"><Icon className="h-[18px] w-[18px]" /></span>
            <span className="min-w-0"><span className="block truncate text-[12px] font-bold text-[#15191B]">{title}</span><span className="mt-1 block truncate text-[10.5px] text-[#707574]">{detail}</span></span>
          </div>
        ))}
      </div>
    </section>
  );
}
