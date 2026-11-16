"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

interface CommentItem {
  id: string;
  author_name: string;
  author_team: string | null;
  content: string;
  created_at: string;
}

interface ArticleCommentsProps {
  articleId: string;
}

export default function ArticleComments({ articleId }: ArticleCommentsProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [authorTeam, setAuthorTeam] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [content, setContent] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    async function init() {
      const {
        data: { session },
      } = await supabase!.auth.getSession();

      if (session?.user) {
        setIsLoggedIn(true);
        setUserId(session.user.id);

        const { data: profile } = await supabase!
          .from("fan_profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        const name =
          profile?.display_name ||
          profile?.full_name ||
          session.user.user_metadata?.full_name ||
          session.user.email?.split("@")[0] ||
          "Socio Hincha";

        setAuthorName(name);
        setAuthorTeam(profile?.favorite_team || profile?.team || null);
      }

      const { data } = await supabase!
        .from("article_comments")
        .select("id, author_name, author_team, content, created_at")
        .eq("article_id", articleId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (data) setComments(data);
      setLoading(false);
    }

    init();
  }, [supabase, articleId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          userId,
          authorName: authorName || "Hincha Invitado",
          authorTeam,
          content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          type: "error",
          text: data.error || "No se pudo publicar tu comentario.",
        });
        return;
      }

      if (data.comment) {
        setComments((prev) => [data.comment, ...prev]);
        setContent("");
        setFeedback({
          type: "success",
          text: "¡Comentario publicado en la tribuna!",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Error de conexión al enviar tu opinión.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReport(commentId: string, reason: string) {
    if (!supabase || reportedIds.includes(commentId)) return;

    await supabase.from("comment_reports").insert({
      comment_id: commentId,
      reason,
      status: "pending",
    });

    setReportedIds((prev) => [...prev, commentId]);
    setReportingId(null);
  }

  return (
    <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            La Tribuna ({comments.length})
          </h2>
          <p className="text-xs text-slate-500">
            Debate futbolero con respeto • Moderado automáticamente por IA
          </p>
        </div>

        {!isLoggedIn && (
          <Link
            href="/hincha"
            className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
          >
            Inicia sesión para mostrar tu club →
          </Link>
        )}
      </div>

      {/* Formulario de nuevo comentario */}
      <form onSubmit={handleSubmit} className="mb-8 space-y-3">
        {!isLoggedIn ? (
          <div>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Tu nombre o apodo (ej: Matías del Bulla)"
              required
              maxLength={40}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none sm:w-72"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>Comentando como</span>
            <span className="font-bold text-slate-900">{authorName}</span>
            {authorTeam && (
              <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                {authorTeam}
              </span>
            )}
          </div>
        )}

        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="¿Qué opinas de esta noticia? Comparte tu análisis con respeto..."
          required
          maxLength={600}
          className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 focus:border-red-500 focus:outline-none"
        />

        {feedback && (
          <div
            className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${
              feedback.type === "error"
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {content.length}/600 caracteres
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? "Verificando con IA..." : "Publicar opinión"}
          </button>
        </div>
      </form>

      {/* Lista de comentarios */}
      {loading ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Cargando comentarios...
        </p>
      ) : comments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
          Sé el primero en dejar tu opinión sobre esta nota.
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {comment.author_name}
                  </span>
                  {comment.author_team && (
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                      {comment.author_team}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400">
                    {new Date(comment.created_at).toLocaleDateString("es-CL", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {reportedIds.includes(comment.id) ? (
                  <span className="text-[11px] font-semibold text-amber-600">
                    Denunciado ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setReportingId(
                        reportingId === comment.id ? null : comment.id
                      )
                    }
                    className="text-[11px] font-medium text-slate-400 hover:text-red-600"
                  >
                    Denunciar
                  </button>
                )}
              </div>

              <p className="text-sm leading-relaxed text-slate-700">
                {comment.content}
              </p>

              {reportingId === comment.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2.5">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Motivo:
                  </span>
                  {["Insultos / Agresión", "Spam", "Odio / Discriminación"].map(
                    (reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => handleReport(comment.id, reason)}
                        className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        {reason}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}