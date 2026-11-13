import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { cacheLife } from "next/cache";
import WeeklyPoll from "@/components/WeeklyPoll";


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


export default async function HomePage() {
  const articles = await getPublishedArticles();
  const featuredArticle = articles[0];
  const restArticles = articles.slice(1);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="rounded-xl bg-red-600 px-2.5 py-1 text-lg font-black text-white">
              PD
            </span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Pasión Deportiva
            </span>
          </Link>

          <nav className="hidden gap-6 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/" className="text-slate-900 hover:text-red-600">
              Portada
            </Link>
            <Link href="#chilenos" className="hover:text-red-600">
              Chilenos por el Mundo
            </Link>
            <Link href="#tenis" className="hover:text-red-600">
              Tenis ATP
            </Link>
            <Link href="#superestrellas" className="hover:text-red-600">
              Superestrellas
            </Link>
          </nav>

          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            ● EN VIVO
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            {featuredArticle ? (
              <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                <Link href={`/noticia/${featuredArticle.slug}`}>
                  <div className="relative aspect-[1200/630] w-full bg-slate-900">
                  <img src={featuredArticle.cover_image || `/api/og?title=${encodeURIComponent(featuredArticle.title)}&sport=${featuredArticle.sport}&tag=${featuredArticle.section}`}
                  alt={featuredArticle.title} className="h-full w-full object-cover"/>
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
                  Aún no hay noticias publicadas. Entra a <strong>/admin</strong> y aprueba tu primer borrador.
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
                      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                      <Link href={`/noticia/${article.slug}`} className="flex flex-1 flex-col">
                        <div className="aspect-[1200/630] w-full bg-slate-900">
                        <img src={featuredArticle.cover_image || `/api/og?title=${encodeURIComponent(featuredArticle.title)}&sport=${featuredArticle.sport}&tag=${featuredArticle.section}`}
                        alt={featuredArticle.title} className="h-full w-full object-cover"/>
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
