import { Link } from "react-router-dom";
import { ArrowRight, MessageCircleHeart, Star } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

export default function ReviewsPage() {
  const { items, loading } = useSiteContent("testimonial");
  const stories = [...items].sort((a, b) => a.displayOrder - b.displayOrder || b.id - a.id);

  return (
    <main className="min-h-screen bg-background">
      <PageHero
        eyebrow="Patient stories"
        align="center"
        title={<>Thoughtful care, told <span className="italic text-primary-700">in their own words.</span></>}
        description="Stories and feedback shared with the clinic’s permission. Every story shown here is selected by the clinic team."
        actions={<Link to="/booking" className="inline-flex h-11 items-center gap-2 rounded-full bg-primary-800 px-5 text-sm font-semibold text-white transition hover:bg-primary-700">Book a visit <ArrowRight className="h-4 w-4" /></Link>}
      />

      <section className="section-pad">
        <div className="container-x">
          {loading ? (
            <div className="grid min-h-40 place-items-center rounded-3xl border border-border/70 bg-card text-sm text-muted-foreground">Loading patient stories…</div>
          ) : stories.length ? (
            <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((story) => {
                const rating = Number(story.ratingScore);
                const showRating = story.ratingVerified && Number.isFinite(rating) && rating > 0 && rating <= 5;
                return (
                  <article key={story.id} className="flex min-h-64 flex-col rounded-[24px] border border-border/70 bg-card p-6 shadow-soft">
                    <div className="flex items-center justify-between gap-3">
                      {showRating ? (
                        <span className="flex items-center gap-1 text-amber-500" aria-label={`Rated ${rating} out of 5`}>
                          {Array.from({ length: Math.round(rating) }, (_, index) => <Star key={index} className="h-3.5 w-3.5 fill-current" />)}
                          <span className="ml-1 text-xs font-semibold text-foreground">{rating}</span>
                        </span>
                      ) : <MessageCircleHeart className="h-5 w-5 text-primary-700" />}
                      {story.category && <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-primary-700">{story.category}</span>}
                    </div>
                    <h2 className="mt-4 font-display text-xl font-medium leading-tight text-foreground">{story.title}</h2>
                    <blockquote className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">“{story.body || story.excerpt}”</blockquote>
                    <div className="mt-6 flex items-center gap-3 border-t border-border/70 pt-4">
                      {story.mediaUrl ? <img src={resolveApiAsset(story.mediaUrl)} alt="" loading="lazy" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-50 text-sm font-semibold text-primary-800">{(story.author || "P").slice(0, 1).toUpperCase()}</span>}
                      <div>
                        <p className="text-sm font-semibold text-foreground">{story.author || "Clinic patient"}</p>
                        {story.publishedAt && <p className="mt-0.5 text-xs text-muted-foreground">{new Date(story.publishedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <MessageCircleHeart className="mx-auto h-8 w-8 text-primary-700" />
              <h2 className="mt-4 font-display text-2xl font-medium text-foreground">Patient stories will appear here</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">The clinic has not published any approved stories yet.</p>
              <Link to="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-800">Contact the clinic <ArrowRight className="h-4 w-4" /></Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
