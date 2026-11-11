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
          <div key={panel.label} className="overflow-hidden rounded-xl border border-[#1F6878]/15 bg-white">
            <div className="relative aspect-[4/3] bg-[#F5F2EB]">
              {panel.src ? (
                <img src={resolveApiAsset(panel.src)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-[11px] text-[#707574]">
                  {panel.label} image
                </div>
              )}
              <span className="absolute bottom-2 left-2 rounded-md bg-[#1F6878]/85 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-white">
                {panel.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div>
        <p className="font-display text-[15px] font-bold text-[#1F6878]">{draft.title || "Smile caption"}</p>
        <p className="mt-0.5 text-[11.5px] text-[#707574]">
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
