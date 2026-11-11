import { ArrowRight, Sparkles } from "lucide-react";
import { ContentManager, type ContentDraft } from "@/components/dashboard/ContentManager";
import { resolveApiAsset } from "@/lib/api";

function OfferPreview({ draft }: { draft: ContentDraft }) {
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[18px] bg-[#E4F0F2]">
        {draft.mediaUrl && <img src={resolveApiAsset(draft.mediaUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#E4F0F2]/95 via-[#E4F0F2]/85 to-[#E4F0F2]/0" />
        <div className="relative flex min-h-[180px] flex-col items-start justify-center p-5 text-[#1F6878] sm:min-h-[220px] sm:p-7">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#1F6878]"><Sparkles className="h-3.5 w-3.5 text-[#1F6878]" aria-hidden="true" />{draft.badgeText || "Limited time smile offer"}</span>
          <h3 className="mt-3 max-w-[70%] font-display text-[22px] font-bold leading-tight text-[#1F6878] sm:text-[28px]">{draft.title || "Your dream smile starts here"}</h3>
          {draft.subtitle && <p className="mt-2 max-w-[62%] text-[12px] leading-relaxed text-[#707574]">{draft.subtitle}</p>}
          {draft.excerpt && <p className="mt-2 max-w-[62%] text-[11px] leading-relaxed text-[#707574]">{draft.excerpt}</p>}
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#E95A35] px-4 py-2 text-[11px] font-semibold text-white shadow-sm">{draft.ctaLabel || "Book your appointment"} <ArrowRight className="h-3 w-3" aria-hidden="true" /></span>
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
