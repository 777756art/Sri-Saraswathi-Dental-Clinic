import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpenText, CalendarDays, LoaderCircle } from "lucide-react";
import { LiveChat } from "@/components/home/LiveChat";
import { Button } from "@/components/ui/Button";
import { api, resolveApiAsset, type SiteContent } from "@/lib/api";
import { formatArticleDate } from "@/lib/blog";

export default function BlogPage() {
  const [articles, setArticles] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    document.title = "Clinic journal · Sri Saraswathi Dental Clinic";
    let active = true;
    api
      .get<{ items: SiteContent[] }>("/api/blog")
      .then((data) => {
        if (active) setArticles(Array.isArray(data.items) ? data.items : []);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load articles.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(articles.map((item) => item.category).filter(Boolean)))],
    [articles],
  );
  const visible = category === "All" ? articles : articles.filter((item) => item.category === category);
  const gridClass =
    visible.length === 1
      ? "mx-auto max-w-xl"
      : visible.length === 2
        ? "mx-auto max-w-4xl sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <>
      <main className="min-h-screen bg-white">
        <section className="px-4 pb-11 pt-[118px] text-center sm:pb-14 sm:pt-[135px]">
          <div className="container-x">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#ed2f79]">Clinic journal</p>
            <h1 className="mx-auto mt-3 max-w-3xl font-sans text-[32px] font-bold leading-tight tracking-[-.035em] text-[#222d3e] sm:text-[42px]">
              A little more to know about <span className="text-[#ed2f79]">your smile.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-6 text-[#79828e]">
              Expert advice, helpful tips and the latest clinical insights to keep your teeth healthy and your smile confident.
            </p>
          </div>
        </section>

        <section className="section-pad">
          <div className="container-x">
            {categories.length > 2 && (
              <div className="mb-9 flex flex-wrap items-center gap-2">
                {categories.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCategory(value)}
                    className={
                      "rounded-full border px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] transition " +
                      (category === value
                        ? "border-ink-950 bg-ink-950 text-white"
                        : "border-border/80 bg-card text-muted-foreground hover:border-primary-300 hover:text-foreground")
                    }
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="grid min-h-52 place-items-center rounded-3xl border border-border/70 bg-card">
                <LoaderCircle className="h-6 w-6 animate-spin text-primary-700" />
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
                <p className="text-sm text-amber-900">{error}</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              </div>
            ) : visible.length ? (
              <div className={"grid gap-6 " + gridClass}>
                {visible.map((article) => (
                  <article
                    key={article.id}
                    className="group flex flex-col overflow-hidden rounded-[20px] border border-[#f2dce4] bg-white shadow-[0_8px_24px_-18px_rgba(48,35,48,.42)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_34px_-20px_rgba(48,35,48,.36)]"
                  >
                    <Link to={`/blog/${article.slug}`} className="block overflow-hidden">
                      {article.mediaUrl ? (
                        <img
                          src={resolveApiAsset(article.mediaUrl)}
                          alt={article.title}
                          loading="lazy"
                          decoding="async"
                          className="aspect-[16/8.8] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="grid aspect-[16/8.8] w-full place-items-center bg-gradient-to-br from-[#fff0f5] via-[#f7f7f4] to-[#e5f3f0]">
                          <BookOpenText className="h-8 w-8 text-primary-600/60" />
                        </div>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ed2f79]">
                        {article.category || "Dental care"}
                      </p>
                      <h2 className="mt-2.5 font-display text-[20px] font-semibold leading-snug tracking-tight text-[#18545a]">
                        <Link to={`/blog/${article.slug}`} className="transition-colors hover:text-[#ed2f79]">
                          {article.title}
                        </Link>
                      </h2>
                      {article.excerpt && (
                        <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-muted-foreground">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-[12px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatArticleDate(article.publishedAt)}
                        </span>
                        <Link
                          to={`/blog/${article.slug}`}
                          className="inline-flex items-center gap-1.5 font-bold text-[#ed2f79] transition-colors hover:text-[#b91c5a]"
                        >
                          Read article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mx-auto max-w-lg rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary-700">
                  <BookOpenText className="h-5 w-5" />
                </span>
                <h2 className="mt-4 font-display text-2xl font-medium text-foreground">No articles published yet</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  New notes from the clinic will appear here. In the meantime you can book a visit or ask us anything.
                </p>
                <Button asChild className="mt-5">
                  <Link to="/booking">Book an appointment</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

      </main>
      <LiveChat />
    </>
  );
}
