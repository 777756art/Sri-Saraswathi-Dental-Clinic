import { ContentManager, type ContentDraft } from "@/components/dashboard/ContentManager";
import { resolveApiAsset } from "@/lib/api";

function GalleryPreview({ draft }: { draft: ContentDraft }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Before", src: draft.beforeImage },
          { label: "After", src: draft.afterImage },
        ].map((panel) => (
          <div key={panel.label} className="overflow-hidden rounded-xl border border-border/60 bg-card">
            <div className="relative aspect-[4/3] bg-secondary-50">
              {panel.src ? (
                <img src={resolveApiAsset(panel.src)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-[11px] text-muted-foreground">
                  {panel.label} image
                </div>
              )}
              <span className="absolute bottom-2 left-2 rounded-md bg-ink-950/70 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-white">
                {panel.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div>
        <p className="font-display text-[15px] font-medium text-foreground">{draft.title || "Smile caption"}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
          {draft.badgeText || "Treatment category"}
          <span className="mx-1.5">·</span>
          {draft.published ? "Published" : "Draft"}
        </p>
      </div>
    </div>
  );
}

export default function SmileGalleryPage() {
  return (
    <ContentManager
      type="gallery"
      heading="Smile gallery"
      description="Before-and-after transformations shown on the public website. Only publish photos where the patient has given written consent."
      addLabel="Add transformation"
      requiredMedia={["beforeImage", "afterImage"]}
      fields={["title", "badgeText", "subtitle", "beforeImage", "afterImage", "displayOrder", "published"]}
      preview={(draft) => <GalleryPreview draft={draft} />}
    />
  );
}
