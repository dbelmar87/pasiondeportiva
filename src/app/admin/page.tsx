import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { cacheLife } from "next/cache";
import WeeklyPoll from "@/components/WeeklyPoll";
import Navbar from "@/components/Navbar/Navbar";
import TodayMatchesWidget from "@/components/TodayMatchesWidget";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  sport: string;
  section: string;
  cover_image: string;
  created_at: string;
}

async function getPublishedArticles(): Promise<Article[]> {
  "use cache";
  cacheLife("minutes");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(12);

  return data || [];
}

function getArticleCoverUrl(article: Article): string {
  if (article.cover_image) {
    return article.cover_image;
  }
  const params = new URLSearchParams({
    title: article.title,
    sport: article.sport || "football",
    tag: article.section || "noticias",
  });
  return `/api/og?${params.toString()}`;
}

export default async function HomePage() {
  const articles = await getPublishedArticles();
  const featuredArticle = articles[0];
  const restArticles = articles.slice(1);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <TodayMatchesWidget />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            {featuredArticle ? (
              <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                <Link href={`/noticia/${featuredArticle.slug}`}>
                  <div className="relative aspect-[1200/630] w-full bg-slate-900">
                    <img
                      src={getArticleCoverUrl(featuredArticle)}
                      alt={featuredArticle.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-6 sm:p-8">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase text-white">
                        Destacada
                      </span>
                      <span className="text-xs font-bold uppercase text-slate-500">
                        {featuredArticle.sport === "tennis" ? "Tenis" : "Fútbol"} •{" "}
                        {featuredArticle.section}
                      </span>
                    </div>
                    <h1 className="mb-3 text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
                      {featuredArticle.title}
                    </h1>
                    <p className="line-clamp-3 text-base text-slate-600">
                      {featuredArticle.content}
                    </p>
                  </div>
                </Link>
              </article>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <p className="text-slate-500">
                  Aún no hay noticias publicadas. Entra a <strong>/admin</strong> y publica tu primera noticia.
                </p>
              </div>
            )}

            {restArticles.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-bold text-slate-900">
                  Últimas Noticias
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {restArticles.map((article: Article) => (
                    <article
                      key={article.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                    >
                      <Link href={`/noticia/${article.slug}`} className="flex flex-1 flex-col">
                        <div className="aspect-[1200/630] w-full bg-slate-900">
                          <img
                            src={getArticleCoverUrl(article)}
                            alt={article.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col justify-between p-5">
                          <div>
                            <span className="mb-2 inline-block text-xs font-bold uppercase text-red-600">
                              {article.sport === "tennis" ? "Tenis" : "Fútbol"} • {article.section}
                            </span>
                            <h3 className="mb-2 text-lg font-bold leading-snug text-slate-900">
                              {article.title}
                            </h3>
                          </div>
                          <p className="line-clamp-2 text-sm text-slate-600">
                            {article.content}
                          </p>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <WeeklyPoll />

            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white">
              <span className="mb-2 inline-block rounded bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400">
                100% SIN HUMO
              </span>
              <h3 className="mb-2 text-lg font-bold">
                Información Deportiva Verificada
              </h3>
              <p className="text-sm text-slate-300">
                Seguimiento en tiempo real a futbolistas y tenistas chilenos en el extranjero y las grandes figuras del deporte mundial.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
