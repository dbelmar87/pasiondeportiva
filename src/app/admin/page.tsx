import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  publishArticle,
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

  // 1. Obtener borradores de la IA
  const { data: drafts } = await supabaseAdmin
    .from("articles")
    .select("*")
    .eq("status", "draft")
    .order("created_at", { ascending: false });

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
              Bandeja de visación rápida, publicación y moderación
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              {drafts?.length || 0} borradores
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
              {reports?.length || 0} denuncias
            </span>
          </div>
        </div>

        {/* Sección 1: Borradores generados por IA esperando aprobación */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-slate-800">
            Borradores por Aprobar (IA)
          </h2>

          {!drafts || drafts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No hay borradores pendientes. Cuando el Agente de IA detecte
              noticias nuevas, aparecerán aquí.
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map((article) => (
                <div
                  key={article.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      {article.sport}
                    </span>
                    <span className="text-xs font-medium uppercase text-slate-500">
                      {article.section}
                    </span>
                    {article.source_url && (
                      <a
                        href={article.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-xs text-blue-600 hover:underline"
                      >
                        Verificar fuente original ↗
                      </a>
                    )}
                  </div>

                  <form
                    action={async (formData) => {
                      "use server";
                      const newTitle = formData.get("title") as string;
                      await publishArticle(article.id, newTitle);
                    }}
                    className="space-y-3"
                  >
                    <input
                      type="text"
                      name="title"
                      defaultValue={article.title}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-900"
                    />
                    <p className="text-sm text-slate-600">{article.content}</p>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        ✓ Aprobar y Publicar
                      </button>
                    </div>
                  </form>

                  <form
                    action={async () => {
                      "use server";
                      await rejectArticle(article.id);
                    }}
                    className="mt-2"
                  >
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Descartar borrador
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sección 2: Publicación Rápida Manual */}
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
        {/* Sección 3: Moderación de Comentarios Denunciados */}
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


