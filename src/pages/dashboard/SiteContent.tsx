import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ContentManagerPanel, type ContentField } from "@/components/dashboard/ContentManager";
import type { SiteContentType } from "@/lib/api";

const groups: {
  type: SiteContentType;
  label: string;
  description: string;
  addLabel: string;
  fields: ContentField[];
}[] = [
  {
    type: "image",
    label: "Clinic Photos",
    description: "Manage real clinic spaces, rooms and equipment photographs.",
    addLabel: "Add photo",
    fields: ["title", "subtitle", "category", "mediaUrl", "displayOrder", "homepageHighlight", "published"],
  },
  {
    type: "badge",
    label: "Treatment Highlights",
    description: "Highlight treatments and the benefits patients will see on the homepage.",
    addLabel: "Add highlight",
    fields: ["title", "category", "subtitle", "body", "mediaUrl", "badgeText", "displayOrder", "homepageHighlight", "published"],
  },
  {
    type: "achievement",
    label: "Doctors’ Achievements",
    description: "Publish verified awards, certifications and professional milestones.",
    addLabel: "Add achievement",
    fields: ["title", "category", "subtitle", "body", "mediaUrl", "publishedAt", "displayOrder", "homepageHighlight", "published"],
  },
  {
    type: "testimonial",
    label: "Patient Testimonials",
    description: "Publish only patient stories and reviews with permission to share.",
    addLabel: "Add testimonial",
    fields: ["author", "title", "category", "ratingScore", "ratingVerified", "excerpt", "body", "mediaUrl", "publishedAt", "displayOrder", "homepageHighlight", "patientConsent", "published"],
  },
];

export default function WebsiteContentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get("type") as SiteContentType | null;
  const [active, setActive] = useState<SiteContentType>(() => groups.find((item) => item.type === requestedType)?.type ?? "image");
  useEffect(() => {
    if (groups.some((item) => item.type === requestedType)) setActive(requestedType!);
  }, [requestedType]);
  if (requestedType === "reel" || requestedType === "video") {
    return <Navigate to="/dashboard/reels" replace />;
  }
  const group = groups.find((item) => item.type === active) ?? groups[0];

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-border/70 bg-card p-1.5">
        {groups.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => {
              setActive(item.type);
              setSearchParams({ type: item.type }, { replace: true });
            }}
            aria-pressed={active === item.type}
            className={
              "rounded-lg px-3.5 py-2 text-[12.5px] font-medium transition " +
              (active === item.type
                ? "bg-ink-950 text-white"
                : "text-muted-foreground hover:bg-secondary-50 hover:text-foreground")
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <ContentManagerPanel
        key={group.type}
        type={group.type}
        heading={group.label}
        description={group.description}
        addLabel={group.addLabel}
        fields={group.fields}
        requiredMedia={group.type === "image" || group.type === "badge" || group.type === "reel" || group.type === "video" || group.type === "achievement" ? ["mediaUrl"] : []}
      />
    </DashboardLayout>
  );
}
