import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import WeeklyPoll from "@/components/WeeklyPoll";
import ArticleComments from "@/components/ArticleComments";
import Navbar from "@/components/Navbar/Navbar";

async function ArticleContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!article) {
    notFound();
  }

  const paragraphs = article.content
    .split("\n")
    .filter((p: string) => p.trim() !== "");

  return (
    <div className="lg:col-span-8">
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-700">
            {article.sport === "tennis" ? "Tenis" : "Fútbol"}
          </span>
          <span className="text-xs font-semibold uppercase text-slate-500">
            {article.section}
          </span>
        </div>

        <h1 className="mb-6 text-2xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          {article.title}
        </h1>

        <div className="mb-6 overflow-hidden rounded-2xl bg-slate-900">
          <img
            src={
              article.cover_image ||
              `/api/og?title=${encodeURIComponent(article.title)}&sport=${
                article.sport
              }&tag=${article.section}`
            }
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="space-y-4 text-base leading-relaxed text-slate-700 sm:text-lg">
          {paragraphs.map((paragraph: string, index: number) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="text-xs font-medium text-slate-500">
            ● Nota redactada y verificada por el equipo editorial de Pasión
            Deportiva.
          </p>
        </div>
      </article>

      {/* La Tribuna de comentarios con filtro IA */}
      <ArticleComments articleId={article.id} />
    </div>
  );
}

export default function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-red-600"
          >
            ← Volver a portada
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <Suspense
            fallback={
              <div className="h-96 animate-pulse rounded-3xl bg-white p-8 lg:col-span-8" />
            }
          >
            <ArticleContent params={params} />
          </Suspense>

          <aside className="lg:col-span-4">
            <WeeklyPoll />
          </aside>
        </div>
      </main>
    </div>
  );
}
