import { BadgeIndianRupee, CalendarClock, CheckCircle2, Clock3, Stethoscope } from "lucide-react";
import { ContentManager, type ContentDraft } from "@/components/dashboard/ContentManager";
import { resolveApiAsset } from "@/lib/api";

function TreatmentPreview({ draft }: { draft: ContentDraft }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#1F6878]/15 bg-white sm:grid sm:grid-cols-[220px_minmax(0,1fr)]">
      <div className="min-h-40 bg-[#E4F0F2]">
        {draft.mediaUrl ? <img src={resolveApiAsset(draft.mediaUrl)} alt="" className="h-full min-h-40 w-full object-cover" /> : <div className="grid min-h-40 place-items-center text-[#1F6878]"><Stethoscope className="h-8 w-8" /></div>}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1F6878]">Clinic treatment</p><h3 className="mt-1 font-display text-xl font-bold text-[#1F6878]">{draft.title || "Treatment name"}</h3></div>
          {draft.availableForBooking && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F0F2] px-2.5 py-1 text-[10px] font-semibold text-[#1F6878]"><CheckCircle2 className="h-3 w-3 text-[#1F6878]" /> Available</span>}
        </div>
        {draft.excerpt && <p className="mt-2 text-[12px] leading-relaxed text-[#707574]">{draft.excerpt}</p>}
        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-[#707574]">
          {draft.price > 0 && <span className="inline-flex items-center gap-1.5"><BadgeIndianRupee className="h-3.5 w-3.5 text-[#1F6878]" />₹{Number(draft.price).toLocaleString("en-IN")}</span>}
          {draft.sessions && <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-[#1F6878]" />{draft.sessions}</span>}
          {draft.duration && <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-[#1F6878]" />{draft.duration}</span>}
        </div>
      </div>
    </article>
  );
}

export default function TreatmentsPage() {
  return (
    <ContentManager
      type="treatment"
      heading="Treatments"
      description="Create clear, patient-friendly treatment pages with pricing, appointment details and availability."
      addLabel="Add treatment"
      fields={["title", "category", "excerpt", "body", "mediaUrl", "price", "sessions", "duration", "availableForBooking", "homepageHighlight", "displayOrder", "published"]}
      requiredMedia={["mediaUrl"]}
      preview={(draft) => <TreatmentPreview draft={draft} />}
    />
  );
}
