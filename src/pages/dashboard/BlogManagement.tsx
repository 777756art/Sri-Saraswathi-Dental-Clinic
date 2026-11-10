import { CalendarDays, Clock3, UserRound } from "lucide-react";
import { ContentManager, type ContentDraft } from "@/components/dashboard/ContentManager";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { resolveApiAsset } from "@/lib/api";
import { formatArticleDate, readingMinutes } from "@/lib/blog";

function BlogPreview({ draft }: { draft: ContentDraft }) {
  return (
    <div className="space-y-4">
      <article className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        {draft.mediaUrl ? (
          <img src={resolveApiAsset(draft.mediaUrl)} alt="" className="aspect-[16/9] w-full object-cover" />
        ) : (
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50" />
        )}
        <div className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700">
            {draft.category || "Dental care"}
          </p>
          <h3 className="mt-2 font-display text-[21px] leading-snug text-foreground">{draft.title || "Article title"}</h3>
          {draft.excerpt && <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{draft.excerpt}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" /> {draft.author || "Sri Saraswathi Dental Clinic"}
            </span>
            {draft.publishedAt && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> {formatArticleDate(draft.publishedAt)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" /> {readingMinutes(draft.body)} min read
            </span>
          </div>
        </div>
      </article>
      {draft.body.trim() && (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-border/60 bg-background px-4 py-4">
          <ArticleBody body={draft.body} />
        </div>
      )}
      {draft.published && draft.slug && (
        <p className="text-[11.5px] text-muted-foreground">Public URL: /blog/{draft.slug}</p>
      )}
    </div>
  );
}

export default function BlogManagementPage() {
  return (
    <ContentManager
      type="blog"
      heading="Blog management"
      description="Write and publish clinic articles. Published articles appear on /blog and the homepage automatically."
      addLabel="New article"
      categoryFilter
      fields={[
        "title",
        "category",
        "author",
        "excerpt",
        "body",
        "mediaUrl",
        "slug",
        "publishedAt",
        "seoTitle",
        "seoDescription",
        "homepageHighlight",
        "published",
      ]}
      viewHref={(item) => (item.published && item.slug ? `/blog/${item.slug}` : null)}
      preview={(draft) => <BlogPreview draft={draft} />}
    />
  );
}
