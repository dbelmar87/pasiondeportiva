import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  rejectArticle,
  createManualArticle,
  deleteReportedComment,
  dismissCommentReport,
} from "./actions";

interface AdminPageProps {
  searchParams: Promise<{ pass?: string }>;
}

async function AdminContent({ searchParams }: AdminPageProps) {
  const { pass } = await searchParams;

  if (pass !== process.env.ADMIN_PASSWORD) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-md">
          <h1 className="mb-2 text-xl font-bold text-slate-900">
            Acceso Restringido
          </h1>
          <p className="mb-4 text-sm text-slate-600">
            Ingresa tu clave de administrador para gestionar Pasión Deportiva.
          </p>
          <form method="GET" className="space-y-3">
            <input
              type="password"
              name="pass"
              placeholder="Contraseña de administrador"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Entrar al Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Últimas noticias publicadas (control rápido de lo que sube la IA o manual)
  const { data: recentPublished } = await supabaseAdmin
    .from("articles")
    .select("id, title, sport, section, created_at, source_url")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(10);

  // 2. Obtener denuncias de comentarios pendientes
  const { data: reports } = await supabaseAdmin
    .from("comment_reports")
    .select(
      "id, reason, created_at, comment:article_comments(id, author_name, content)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Panel de Control — Pasión Deportiva
            </h1>
            <p className="text-sm text-slate-600">
              Publicación rápida, control de portada y moderación de tribuna
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              {recentPublished?.length || 0} publicadas recientes
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
              {reports?.length || 0} denuncias
            </span>
          </div>
        </div>

        {/* Sección 1: Publicación Rápida Manual */}
        <section className="mb-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">
            Publicar Noticia Rápida (Manual)
          </h2>
          <form action={createManualArticle} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Titular
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="Ej: Alejandro Tabilo avanza a semifinales tras gran triunfo"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Deporte
                </label>
                <select
                  name="sport"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="football">Fútbol</option>
                  <option value="tennis">Tenis</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Sección
                </label>
                <select
                  name="section"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="chilenos">Chilenos por el Mundo</option>
                  <option value="superestrellas">Superestrellas</option>
                  <option value="torneos">Torneos</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Contenido de la noticia
              </label>
              <textarea
                name="content"
                rows={4}
                required
                placeholder="Escribe los detalles verificados del partido o noticia..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              Publicar Ahora
            </button>
          </form>
        </section>

        {/* Sección 2: Últimas Noticias Publicadas (Control rápido) */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              Últimas Noticias Publicadas ({recentPublished?.length || 0})
            </h2>
            <span className="text-xs text-slate-500">
              Publicación automática y manual
            </span>
          </div>

          {!recentPublished || recentPublished.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              Aún no hay noticias publicadas.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {recentPublished.map((article) => (
                <div
                  key={article.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                        Publicada
                      </span>
                      <span className="text-[11px] font-bold uppercase text-slate-500">
                        {article.sport === "tennis" ? "Tenis" : "Fútbol"} •{" "}
                        {article.section}
                      </span>
                      {article.source_url && (
                        <a
                          href={article.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 hover:underline"
                        >
                          Fuente ↗
                        </a>
                      )}
                    </div>
                    <p className="truncate text-sm font-bold text-slate-900">
                      {article.title}
                    </p>
                  </div>

                  <form
                    action={async () => {
                      "use server";
                      await rejectArticle(article.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sección 3: Denuncias de Comentarios Pendientes */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              Comentarios Denunciados por Hinchas
            </h2>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
              {reports?.length || 0} pendientes
            </span>
          </div>

          {!reports || reports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              No hay comentarios denunciados pendientes de revisión.
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((rep: any) => {
                const commentData = Array.isArray(rep.comment)
                  ? rep.comment[0]
                  : rep.comment;

                return (
                  <div
                    key={rep.id}
                    className="rounded-xl border border-red-100 bg-red-50/40 p-4"
                  >
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-red-700">
                        Motivo: {rep.reason}
                      </span>
                      <span className="text-slate-500">
                        Autor: {commentData?.author_name || "Desconocido"}
                      </span>
                    </div>

                    <p className="mb-3 text-sm text-slate-800">
                      “{commentData?.content || "Comentario eliminado"}”
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {commentData?.id && (
                        <form
                          action={async () => {
                            "use server";
                            await deleteReportedComment(commentData.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                          >
                            Eliminar comentario
                          </button>
                        </form>
                      )}

                      <form
                        action={async () => {
                          "use server";
                          await dismissCommentReport(rep.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Mantener comentario (Desestimar)
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminPage(props: AdminPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
          Cargando panel de administración...
        </div>
      }
    >
      <AdminContent {...props} />
    </Suspense>
  );
}


