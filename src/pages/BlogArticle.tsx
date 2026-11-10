import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, LoaderCircle, MapPin, PhoneCall, UserRound } from "lucide-react";
import { LiveChat } from "@/components/home/LiveChat";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { api, resolveApiAsset, type SiteContent } from "@/lib/api";
import { formatArticleDate, readingMinutes } from "@/lib/blog";
import { clinicImages } from "@/lib/images";
import { Button } from "@/components/ui/Button";

const slugHeading = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

export default function BlogArticlePage() {
  const { slug = "" } = useParams();
  const [article, setArticle] = useState<SiteContent | null>(null);
  const [related, setRelated] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    api
      .get<{ item: SiteContent; related: SiteContent[] }>(`/api/blog/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!active) return;
        setArticle(data.item);
        setRelated(Array.isArray(data.related) ? data.related : []);
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!article) return;
    const previousTitle = document.title;
    const descriptionTag = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionTag?.getAttribute("content") ?? "";
    document.title = article.seoTitle || `${article.title} · Sri Saraswathi Dental Clinic`;
    const description = article.seoDescription || article.excerpt;
    if (description) {
      if (descriptionTag) descriptionTag.setAttribute("content", description);
      else {
        const tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        tag.setAttribute("content", description);
        document.head.appendChild(tag);
      }
    }
    return () => {
      document.title = previousTitle;
      if (descriptionTag) descriptionTag.setAttribute("content", previousDescription);
    };
  }, [article]);

  const minutes = useMemo(() => (article ? readingMinutes(article.body) : 1), [article]);
  const titleWords = article?.title.trim().split(/\s+/) ?? [];
  const titleSplit = Math.max(1, Math.ceil(titleWords.length * 0.55));
  const outline = useMemo(() => article?.body.split("\n").flatMap((line) => {
    const match = line.trim().match(/^#{2,3}\s+(.+)$/);
    if (!match) return [];
    const level = line.trim().startsWith("###") ? 3 : 2;
    const title = match[1].replace(/[*_]/g, "").trim();
    return [{ title, level, id: slugHeading(title) }];
  }) ?? [], [article]);

  if (loading) return <main className="grid min-h-[70vh] place-items-center bg-[#fbfaf7]"><LoaderCircle className="h-7 w-7 animate-spin text-[#ed2f79]" /></main>;

  if (notFound || !article) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] pb-24 pt-[125px]">
        <div className="container-x">
          <div className="mx-auto max-w-lg rounded-3xl border border-[#eee5e8] bg-white px-6 py-14 text-center shadow-sm">
            <h1 className="font-display text-3xl font-semibold text-[#253044]">Article not available</h1>
            <p className="mt-3 text-sm leading-relaxed text-[#77818d]">This article may have been unpublished or the link is incorrect.</p>
            <Button asChild className="mt-6 bg-[#ed2f79] text-white hover:bg-[#d91d68]"><Link to="/blog"><ArrowLeft className="h-4 w-4" /> Back to the journal</Link></Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#fbfaf7]">
        <article>
          <header className="bg-[#fbfaf7] pb-8 pt-[112px] md:pb-10 md:pt-[128px]">
            <div className="container-x">
              <div className="mx-auto max-w-[1080px]">
                <Link to="/blog" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#60777a] transition hover:text-[#ed2f79]"><ArrowLeft className="h-3.5 w-3.5" /> All clinic journals</Link>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[.16em] text-[#ed2f79]">
                  <span>{article.category || "Dental care"}</span><span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#b9a7aa]" /><span>{minutes} min read</span>
                </div>
                <h1 className="mt-2 max-w-[920px] font-display text-[34px] font-semibold leading-[1.08] tracking-[-.04em] text-[#18545a] sm:text-[48px] lg:text-[56px]">
                  {titleWords.slice(0, titleSplit).join(" ")} {titleWords.length > titleSplit && <span className="italic text-[#ed2f79]">{titleWords.slice(titleSplit).join(" ")}</span>}
                </h1>
                {article.excerpt && <p className="mt-4 max-w-[780px] text-[14px] leading-7 text-[#6f7975] sm:text-[15px]">{article.excerpt}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] text-[#84908b]">
                  <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-[#159b8c]" /> {article.author || "Sri Saraswathi Dental Clinic"}</span>
                  {article.publishedAt && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-[#159b8c]" /> {formatArticleDate(article.publishedAt)}</span>}
                </div>
              </div>
            </div>
          </header>

          <div className="container-x">
            <div className="mx-auto max-w-[1080px] overflow-hidden rounded-[22px] border border-[#e8e4db] bg-[#dfe9e3] shadow-[0_22px_54px_-36px_rgba(36,52,47,.42)]">
              <div className="relative aspect-[2.8/1] min-h-[230px] max-h-[420px]">
                <img src={article.mediaUrl ? resolveApiAsset(article.mediaUrl) : clinicImages.blogSmileCare} alt={article.title} loading="eager" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#14383b]/80 via-[#14383b]/10 to-transparent" />
                <div className="absolute left-5 top-5 rounded-full border border-white/25 bg-[#153f42]/70 px-3 py-1.5 text-[8px] font-bold uppercase tracking-[.16em] text-white backdrop-blur sm:left-7 sm:top-7">{article.category || "Preventive oral care"}</div>
                <div className="absolute bottom-5 left-5 max-w-[680px] text-white sm:bottom-7 sm:left-7">
                  <p className="text-[8px] font-bold uppercase tracking-[.18em] text-[#b4f2e3]">A guide from Sri Saraswathi Dental Clinic</p>
                  <p className="mt-1.5 font-display text-[18px] italic leading-snug text-white/95 sm:text-[24px]">{article.subtitle || "Everyday guidance for a healthier, more confident smile."}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="container-x py-9 md:py-14">
            <div className="mx-auto grid max-w-[1280px] gap-7 lg:grid-cols-[210px_minmax(0,1fr)_230px] lg:gap-9">
              <aside className="hidden lg:block">
                <div className="sticky top-28 rounded-[16px] border border-[#eee7e4] bg-white p-4 shadow-[0_8px_24px_-20px_rgba(48,35,48,.42)]">
                  <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#ed2f79]">In this article</p>
                  {outline.length ? <ol className="mt-3 space-y-2.5 border-l border-[#f1d7e1] pl-3">
                    {outline.map((item) => <li key={item.id} className={item.level === 3 ? "pl-2" : ""}><a href={`#${item.id}`} className="block text-[10px] leading-[1.5] text-[#66717d] transition hover:text-[#ed2f79]">{item.title}</a></li>)}
                  </ol> : <p className="mt-3 text-[10px] leading-relaxed text-[#87919a]">A practical guide from the clinic team.</p>}
                  <div className="mt-5 border-t border-[#f0ebe8] pt-4">
                    <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#8b949d]">Share this guide</p>
                    <a href={`https://wa.me/?text=${encodeURIComponent(article.title + " " + window.location.href)}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#159b8c]">WhatsApp <ArrowRight className="h-3 w-3" /></a>
                  </div>
                </div>
              </aside>

              <div className="min-w-0">
                {article.body ? <ArticleBody body={article.body} /> : <p className="text-[15px] leading-relaxed text-[#687582]">This article will be updated shortly.</p>}
                <div className="mt-11 flex flex-col gap-4 rounded-[18px] border border-[#e9e4dc] bg-white p-4 shadow-[0_12px_30px_-24px_rgba(36,52,47,.45)] sm:flex-row sm:items-center sm:p-5">
                  <img src={clinicImages.dentistPortrait} alt="Dr. Kishore Kumar" loading="lazy" className="h-14 w-14 rounded-full border-2 border-[#f5e9ed] object-cover object-top" />
                  <div className="min-w-0 flex-1"><p className="text-[8px] font-bold uppercase tracking-[.15em] text-[#ed2f79]">About the clinic author</p><p className="mt-1 text-[12px] font-bold text-[#273444]">{article.author || "Sri Saraswathi Dental Clinic"}</p><p className="mt-1 text-[10px] leading-relaxed text-[#818b96]">Dental care team · Practical guidance from Erode</p></div>
                  <div className="flex flex-wrap gap-2"><Link to="/booking" className="inline-flex h-8 items-center gap-1 rounded-full bg-[#ed2f79] px-3 text-[9px] font-bold text-white">Book a visit <ArrowRight className="h-3 w-3" /></Link><Link to="/dentists" className="inline-flex h-8 items-center gap-1 rounded-full border border-[#e7e8e3] px-3 text-[9px] font-semibold text-[#536b6c]">Meet the dentist</Link></div>
                </div>
              </div>

              <aside className="lg:block">
                <div className="sticky top-28 overflow-hidden rounded-[18px] border border-[#eee7e4] bg-white shadow-[0_8px_24px_-20px_rgba(48,35,48,.42)]">
                  <div className="p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#ed2f79]">Need a consultation?</p>
                    <div className="mt-3 flex items-center gap-2.5">
                      <img src={clinicImages.dentistPortrait} alt="Dr. Kishore Kumar" loading="lazy" className="h-10 w-10 rounded-full object-cover object-top" />
                      <div><p className="text-[11px] font-bold text-[#273444]">Dr. Kishore Kumar</p><p className="text-[9px] text-[#818b96]">Dental surgeon</p></div>
                    </div>
                    <p className="mt-3 text-[10px] leading-relaxed text-[#75808b]">Talk through your concerns and the next step for your dental care.</p>
                    <Link to="/booking" className="mt-4 flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#ed2f79] px-3 text-[10px] font-bold text-white transition hover:bg-[#d91d68]">Book an appointment <ArrowRight className="h-3 w-3" /></Link>
                    <a href="tel:+914244272494" className="mt-2 flex items-center justify-center gap-1.5 rounded-full border border-[#dfe9e7] py-2 text-[10px] font-semibold text-[#168b7d]"><PhoneCall className="h-3 w-3" /> Call the clinic</a>
                    <p className="mt-3 flex items-center gap-1 text-[9px] text-[#8c969f]"><MapPin className="h-3 w-3" /> Erode, Tamil Nadu</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <section className="border-t border-[#eee8e4] bg-[#f3f2ec] py-12 md:py-16">
            <div className="container-x">
              <div className="flex items-end justify-between gap-4">
                <div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#ed2f79]">Recommended reading</p><h2 className="mt-2 font-display text-[26px] font-semibold text-[#18545a]">Keep exploring your smile</h2></div>
                <Link to="/blog" className="text-[11px] font-bold text-[#159b8c] hover:text-[#ed2f79]">Browse all articles <ArrowRight className="inline h-3 w-3" /></Link>
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <article key={item.id} className="group overflow-hidden rounded-[16px] border border-[#e8e5e0] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <Link to={`/blog/${item.slug}`}>
                      {item.mediaUrl ? <img src={resolveApiAsset(item.mediaUrl)} alt={item.title} loading="lazy" decoding="async" className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="aspect-[16/9] bg-[#eaf3f1]" />}
                      <div className="p-4"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#ed2f79]">{item.category || "Dental care"}</p><h3 className="mt-2 font-display text-[16px] font-semibold leading-snug text-[#18545a]">{item.title}</h3>{item.excerpt && <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-[#7e8995]">{item.excerpt}</p>}</div>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <LiveChat />
    </>
  );
}
