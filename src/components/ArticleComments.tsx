"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { FanAvatar } from "./FanAvatar";

interface FanSummary {
  id: string;
  nickname: string;
  avatar_id: string | null;
  favorite_teams: string[] | null;
  verification_status: string | null;
}

interface CommentItem {
  id: string;
  user_id: string | null;
  author_name: string;
  author_team: string | null;
  content: string;
  created_at: string;
  fan?: FanSummary | null;
}

interface ArticleCommentsProps {
  articleId: string;
}

export default function ArticleComments({ articleId }: ArticleCommentsProps) {
  const supabase = createClient();

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [currentFan, setCurrentFan] = useState<FanSummary | null>(null);

  const [content, setContent] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (session?.user) {
        setUserId(session.user.id);

        const { data: profile } = await supabase
          .from("fan_profiles")
          .select("id, nickname, avatar_id, favorite_teams, verification_status")
          .eq("id", session.user.id)
          .maybeSingle();

        if (isMounted && profile) {
          setCurrentFan(profile);
        }
      }

      // Cargar comentarios aprobados
      const { data: rawComments } = await supabase
        .from("article_comments")
        .select("id, user_id, author_name, author_team, content, created_at")
        .eq("article_id", articleId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (rawComments && rawComments.length > 0) {
        // Obtener avatares e insignias de los hinchas que comentaron
        const userIds = Array.from(
          new Set(rawComments.map((c) => c.user_id).filter(Boolean))
        ) as string[];

        let profilesMap: Record<string, FanSummary> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("fan_profiles")
            .select("id, nickname, avatar_id, favorite_teams, verification_status")
            .in("id", userIds);

          if (profiles) {
            profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
          }
        }

        const enriched = rawComments.map((c) => ({
          ...c,
          fan: c.user_id ? profilesMap[c.user_id] || null : null,
        }));
        setComments(enriched);
      } else {
        setComments([]);
      }

      setLoading(false);
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [supabase, articleId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !currentFan) return;

    setFeedback(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          userId,
          authorName: currentFan.nickname,
          authorTeam: currentFan.favorite_teams?.[0] || null,
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
        const newCommentWithFan: CommentItem = {
          ...data.comment,
          fan: currentFan,
        };
        setComments((prev) => [newCommentWithFan, ...prev]);
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
    if (reportedIds.includes(commentId)) return;

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
            Comunidad verificada • Moderado automáticamente por IA
          </p>
        </div>

        {!currentFan && (
          <Link
            href="/hincha"
            className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
          >
            Saca tu Carnet de Hincha →
          </Link>
        )}
      </div>

      {/* Formulario restringido solo a Hinchas con Carnet Digital */}
      {!userId || !currentFan ? (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="mb-1 text-base font-extrabold text-slate-900">
            Tribuna exclusiva para Hinchas Registrados
          </p>
          <p className="mb-4 text-sm text-slate-600">
            {userId
              ? "Completa tu Carnet Digital (elige tu avatar y equipo) para habilitar los comentarios."
              : "Inicia sesión y saca tu Carnet de Hincha gratuito en 30 segundos para opinar sin humo."}
          </p>
          <Link
            href="/hincha"
            className="inline-block rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
          >
            {userId ? "Completar mi Carnet →" : "Ingresar a Zona del Hincha →"}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mb-8 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <FanAvatar
              avatarId={currentFan.avatar_id}
              nickname={currentFan.nickname}
              size="sm"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Comentando como</span>
              <span className="font-extrabold text-slate-900">
                {currentFan.nickname}
              </span>
              {currentFan.verification_status === "verified" && (
                <span
                  title="Hincha Verificado"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white"
                >
                  ✓
                </span>
              )}
              {currentFan.favorite_teams?.[0] && (
                <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  {currentFan.favorite_teams[0]}
                </span>
              )}
            </div>
          </div>

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
                disabled={submitting || content.trim().length < 3}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Verificando con IA..." : "Publicar opinión"}
              </button>
            </div>
          </form>
        )}
  
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
            {comments.map((comment) => {
              const displayName = comment.fan?.nickname || comment.author_name;
              const displayTeam =
                comment.fan?.favorite_teams?.[0] || comment.author_team;
              const isVerified = comment.fan?.verification_status === "verified";
  
              return (
                <div
                  key={comment.id}
                  className="flex gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <FanAvatar
                    avatarId={comment.fan?.avatar_id}
                    nickname={displayName}
                    size="sm"
                  />
  
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">
                          {displayName}
                        </span>
  
                        {isVerified && (
                          <span
                            title="Hincha Verificado"
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white"
                          >
                            ✓
                          </span>
                        )}
  
                        {displayTeam && (
                          <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                            {displayTeam}
                          </span>
                        )}
  
                        <span className="text-[11px] text-slate-400">
                          •{" "}
                          {new Date(comment.created_at).toLocaleDateString(
                            "es-CL",
                            {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
  
                      {reportedIds.includes(comment.id) ? (
                        <span className="text-[11px] font-medium text-slate-400">
                          Reportado
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
  
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                      {comment.content}
                    </p>
  
                    {reportingId === comment.id && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs">
                        <span className="font-semibold text-slate-600">
                          Motivo:
                        </span>
                        {["Insultos / Agresión", "Spam", "Fuera de tema"].map(
                          (reason) => (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => handleReport(comment.id, reason)}
                              className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600"
                            >
                              {reason}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }
  
