import { Link } from "react-router-dom";
import { ArrowRight, BookOpenText, Calendar, Clock } from "lucide-react";
import { clinicImages } from "@/lib/images";
import { useSiteContent } from "@/components/home/SiteContentSections";
import { resolveApiAsset } from "@/lib/api";

interface BlogCard {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  readTime: string;
  image: string;
}

const defaultBlogs: BlogCard[] = [
  {
    slug: "the-importance-of-regular-dental-checkups-for-a-healthy-smile",
    title: "The Importance of Regular Dental Checkups for a Healthy Smile",
    category: "General Dentistry",
    excerpt: "Visiting your dentist regularly helps identify hidden cavities, protects gum health, and prevents complex dental procedures down the road.",
    date: "Nov 10, 2026",
    readTime: "5 min read",
    image: clinicImages.blogSmileCare,
  },
  {
    slug: "everyday-habits-for-strong-teeth-and-healthy-enamel",
    title: "Everyday Habits That Protect Your Enamel & Keep Teeth Bright",
    category: "Preventative",
    excerpt: "Practical guidance on dietary acidity, proper flossing techniques, and the optimal brushing angles recommended by dentists.",
    date: "Oct 28, 2026",
    readTime: "4 min read",
    image: clinicImages.patientSmile,
  },
  {
    slug: "what-to-know-about-modern-root-canal-therapy",
    title: "What to Expect During Modern Pain-Free Root Canal Treatment",
    category: "Restorative",
    excerpt: "Demystifying root canal therapy. How advanced local anesthesia and precision rotary tools make treatment quick, gentle, and comfortable.",
    date: "Oct 15, 2026",
    readTime: "6 min read",
    image: clinicImages.treatmentRoom,
  },
];

export function LatestDentalBlogs() {
  const { items } = useSiteContent("blog");
  const publishedBlogs = items.filter((item) => item.published);

  const blogs: BlogCard[] = publishedBlogs.length > 0
    ? publishedBlogs.slice(0, 3).map((item, idx) => ({
        slug: item.slug || `blog-${item.id}`,
        title: item.title,
        category: item.category || "Oral Health",
        excerpt: item.excerpt || item.subtitle || (item.description ? item.description.slice(0, 140) + "..." : defaultBlogs[idx % defaultBlogs.length].excerpt),
        date: item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Nov 10, 2026",
        readTime: item.readTime || "5 min read",
        image: item.mediaUrl ? resolveApiAsset(item.mediaUrl) : defaultBlogs[idx % defaultBlogs.length].image,
      }))
    : defaultBlogs;

  return (
    <section className="bg-[#F5F2EB] px-4 py-16 sm:py-20 lg:py-24" aria-label="Latest Dental Blogs">
      <div className="container-x">
        {/* Centered Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">
            <BookOpenText className="h-3.5 w-3.5 text-white" /> Latest Dental Blogs
          </span>
          <h2 className="mt-3 font-sans text-[32px] font-bold leading-tight tracking-[-0.035em] text-[#1F6878] sm:text-[42px]">
            Knowledge Today,
            <br className="hidden sm:inline" />{" "}
            <span className="text-[#1F6878]">Healthier Smiles Tomorrow</span>.
          </h2>
          <div className="mx-auto mt-3.5 h-1 w-14 rounded-full bg-[#1F6878]" />
          <p className="mx-auto mt-3.5 max-w-xl text-[14px] leading-relaxed text-[#707574] sm:text-[15px]">
            Helpful guidance, clinical insights, and practical oral care tips written to keep your teeth strong and your smile confident.
          </p>
        </div>

        {/* 3-Column Blog Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <article
              key={blog.slug}
              className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#dce4e5] bg-white shadow-[0_8px_25px_-18px_rgba(31,104,120,0.18)] transition duration-300 hover:-translate-y-1.5 hover:border-[#1F6878]/35 hover:shadow-[0_18px_40px_-20px_rgba(31,104,120,0.28)]"
            >
              {/* Thumbnail */}
              <Link to={`/blog/${blog.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-[#E4F0F2]">
                <img
                  src={blog.image}
                  alt={blog.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                />
                <span className="absolute left-3.5 top-3.5 rounded-full bg-[#E4F0F2]/95 px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#1F6878] shadow-sm backdrop-blur-md">
                  {blog.category}
                </span>
              </Link>

              {/* Content */}
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="flex items-center gap-3 text-[11px] text-[#707574]">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[#1F6878]" /> {blog.date}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-[#1F6878]" /> {blog.readTime}
                  </span>
                </div>

                <h3 className="mt-3 font-sans text-[17px] font-bold leading-snug text-[#15191B] transition group-hover:text-[#1F6878]">
                  <Link to={`/blog/${blog.slug}`}>
                    {blog.title}
                  </Link>
                </h3>

                <p className="mt-2.5 line-clamp-3 flex-1 text-[13px] leading-relaxed text-[#707574]">
                  {blog.excerpt}
                </p>

                {/* Read More Link */}
                <div className="mt-5 border-t border-[#dce4e5] pt-4">
                  <Link
                    to={`/blog/${blog.slug}`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#E95A35] transition hover:translate-x-0.5 hover:text-[#D14824]"
                  >
                    Read Full Article <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* View All CTA */}
        <div className="mt-10 text-center">
          <Link
            to="/blogs"
            className="inline-flex h-[48px] items-center gap-2 rounded-full border border-[#1F6878] px-7 text-[13px] font-bold text-[#1F6878] transition hover:bg-[#1F6878] hover:text-white"
          >
            Explore All Journal Articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
