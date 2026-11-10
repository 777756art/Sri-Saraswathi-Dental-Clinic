import { ArrowRight, Sparkles } from "lucide-react";
import { ContentManager, type ContentDraft } from "@/components/dashboard/ContentManager";
import { resolveApiAsset } from "@/lib/api";

function OfferPreview({ draft }: { draft: ContentDraft }) {
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[18px] bg-[#eaf4f1]">
        {draft.mediaUrl && <img src={resolveApiAsset(draft.mediaUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#f3f2e9]/95 via-[#f3f2e9]/85 to-[#f3f2e9]/0" />
        <div className="relative flex min-h-[180px] flex-col items-start justify-center p-5 text-[#15343a] sm:min-h-[220px] sm:p-7">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#22585d]"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{draft.badgeText || "Limited time smile offer"}</span>
          <h3 className="mt-3 max-w-[70%] font-display text-[22px] font-semibold leading-tight sm:text-[28px]">{draft.title || "Your dream smile starts here"}</h3>
          {draft.subtitle && <p className="mt-2 max-w-[62%] text-[12px] leading-relaxed text-[#526c6d]">{draft.subtitle}</p>}
          {draft.excerpt && <p className="mt-2 max-w-[62%] text-[11px] leading-relaxed text-[#526c6d]">{draft.excerpt}</p>}
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#173c42] px-4 py-2 text-[11px] font-semibold text-white">{draft.ctaLabel || "Book your appointment"} <ArrowRight className="h-3 w-3" aria-hidden="true" /></span>
        </div>
      </div>
      <p className="text-[11.5px] text-muted-foreground">
        {draft.published
          ? draft.startDate || draft.endDate
            ? "Shown on the public site only within the configured dates."
            : "No dates set — the banner stays visible until you unpublish it."
          : "Draft offers never appear on the public site."}
      </p>
    </div>
  );
}

export default function OffersPage() {
  return (
    <ContentManager
      type="offer"
      heading="Offer banner"
      description="Manage promotional banners, images, offer dates and homepage visibility."
      addLabel="Add offer banner"
      fields={[
        "title",
        "subtitle",
        "excerpt",
        "badgeText",
        "mediaUrl",
        "ctaLabel",
        "linkUrl",
        "ratingScore",
        "reviewCount",
        "trustBadgeText",
        "startDate",
        "endDate",
        "displayOrder",
        "published",
      ]}
      requiredMedia={["mediaUrl"]}
      preview={(draft) => <OfferPreview draft={draft} />}
    />
  );
}
