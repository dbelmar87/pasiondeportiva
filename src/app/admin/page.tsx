"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

interface CommentRow {
  id: string;
  author_name: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  articles?: {
    title: string;
    slug: string;
  } | null;
}

interface PollCandidate {
  id: string;
  athlete_name: string;
  sport: string;
  achievement: string;
  votes: number;
  avatar_url?: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<"publish" | "poll" | "comments">("publish");

  // Estados de comentarios
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Estados de publicación manual de noticias
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState<"football" | "tennis">("football");
  const [section, setSection] = useState<"chilenos" | "superestrellas" | "torneos">("chilenos");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  const [pollQuestion, setPollQuestion] = useState("");
  const [pollSubtitle, setPollSubtitle] = useState("");
  const [pollCandidates, setPollCandidates] = useState<PollCandidate[]>([]);
  const [loadingPoll, setLoadingPoll] = useState(false);
  const [savingPoll, setSavingPoll] = useState(false);
  const [uploadingAvatarId, setUploadingAvatarId] = useState<string | null>(null);
  const [pollFeedback, setPollFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  async function loadPollData() {
    setLoadingPoll(true);
    setPollFeedback(null);
    try {
      const res = await fetch("/api/admin/poll", {
        headers: { "x-admin-password": password },
      });
      const json = await res.json();
      if (res.ok) {
        setPollQuestion(json.settings?.question || "");
        setPollSubtitle(json.settings?.subtitle || "");
        setPollCandidates(json.candidates || []);
      }
    } finally {
      setLoadingPoll(false);
    }
  }

  async function handleAvatarUpload(candidateId: string, file: File | null) {
    if (!file) return;
    setUploadingAvatarId(candidateId);
    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `poll/${candidateId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("news-images")
        .upload(fileName, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("news-images")
        .getPublicUrl(fileName);

      setPollCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId ? { ...c, avatar_url: publicData.publicUrl } : c
        )
      );
    } catch (err: any) {
      setPollFeedback({
        type: "error",
        text: `Error subiendo avatar: ${err?.message || "Intenta nuevamente"}`,
      });
    } finally {
      setUploadingAvatarId(null);
    }
  }

  async function handleSavePoll(resetVotes = false) {
    setSavingPoll(true);
    setPollFeedback(null);
    try {
      const res = await fetch("/api/admin/poll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          question: pollQuestion,
          subtitle: pollSubtitle,
          candidates: pollCandidates,
          resetVotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPollFeedback({
          type: "error",
          text: json.error || "No se pudo guardar la encuesta",
        });
      } else {
        if (resetVotes) {
          setPollCandidates((prev) => prev.map((c) => ({ ...c, votes: 0 })));
        }
        setPollFeedback({
          type: "ok",
          text: resetVotes
            ? "¡Nueva encuesta publicada y votos reiniciados a 0!"
            : "¡Cambios guardados en la votación!",
        });
      }
    } catch {
      setPollFeedback({
        type: "error",
        text: "Error de conexión al guardar la encuesta",
      });
    } finally {
      setSavingPoll(false);
    }
  }




  async function loadComments(passToUse: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/comments", {
        headers: { "x-admin-password": passToUse },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Contraseña incorrecta");
        setAuthenticated(false);
      } else {
        setAuthenticated(true);
        setComments(json.comments || []);
      }
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: "approve" | "delete") {
    const res = await fetch("/api/comments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ id, action }),
    });

    if (res.ok) {
      if (action === "approve") {
        setComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "approved" } : c))
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== id));
      }
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  async function handlePublishNews(e: React.FormEvent) {
    e.preventDefault();
    setPublishing(true);
    setPublishFeedback(null);

    try {
      let coverImageUrl = "";

      // 1. Subir imagen directamente a Supabase Storage si se adjuntó archivo
      if (imageFile) {
        const supabase = createClient();
        const fileExt = imageFile.name.split(".").pop() || "jpg";
        const fileName = `manual/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("news-images")
          .upload(fileName, imageFile, {
            contentType: imageFile.type || "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Error subiendo imagen: ${uploadError.message}`);
        }

        const { data: publicData } = supabase.storage
          .from("news-images")
          .getPublicUrl(fileName);

        coverImageUrl = publicData.publicUrl;
      }

      // 2. Guardar la noticia en la base de datos vía API
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          title,
          sport,
          section,
          content,
          cover_image: coverImageUrl,
        }),
      });

      const rawText = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(`HTTP ${res.status}: ${rawText.slice(0, 120)}`);
      }

      if (!res.ok) {
        setPublishFeedback({
          type: "error",
          text: json.error || `No se pudo publicar la noticia (HTTP ${res.status})`,
        });
      } else {
        setPublishFeedback({
          type: "ok",
          text: "¡Noticia publicada exitosamente en la portada!",
        });
        setTitle("");
        setContent("");
        setImageFile(null);
        setPreviewUrl(null);
      }
    } catch (err: any) {
      setPublishFeedback({
        type: "error",
        text: err?.message || "Error de red al intentar publicar",
      });
    } finally {
      setPublishing(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadComments(password);
          }}
          className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl"
        >
          <h1 className="mb-1 text-xl font-extrabold text-emerald-400">
            Admin • Pasión Deportiva
          </h1>
          <p className="mb-5 text-xs text-slate-400">
            Ingresa tu clave de administrador (CRON_SECRET o ADMIN_PASSWORD)
          </p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña..."
            className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            required
          />

          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Entrar al Panel"}
          </button>
        </form>
      </div>
    );
  }

  const pendingComments = comments.filter((c) => c.status === "pending");
  const approvedComments = comments.filter((c) => c.status === "approved");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Barra superior */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Panel de Control • Pasión Deportiva
            </h1>
            <p className="text-xs text-slate-500">
              Publicación manual de noticias y moderación de comunidad
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("publish")}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                activeTab === "publish"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ✍️ Publicar Noticia
            </button>
            
            <button
              type="button"
              onClick={() => {
                setActiveTab("poll");
                if (pollCandidates.length === 0) loadPollData();
              }}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                activeTab === "poll"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              📊 Votación
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab("comments")}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                activeTab === "comments"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              💬 Comentarios ({pendingComments.length})
            </button>
            <Link
              href="/"
              className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Ver Portal
            </Link>
          </div>
        </div>

        {/* PESTAÑA 1: PUBLICAR NOTICIA MANUAL */}
        {activeTab === "publish" && (
          <form
            onSubmit={handlePublishNews}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Nueva Noticia Manual
              </h2>
              <p className="text-xs text-slate-500">
                Se publicará directamente en portada. Si no adjuntas foto, se generará una portada automática.
              </p>
            </div>

            {/* Titular */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-700">
                Titular de la noticia *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Alejandro Tabilo avanza a cuartos de final tras sólido triunfo..."
                maxLength={110}
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Clasificación: Deporte y Categoría */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-700">
                Deporte *
                </label>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value as "football" | "tennis")}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500"
                >
                  <option value="football">⚽ Fútbol</option>
                  <option value="tennis">🎾 Tenis</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-700">
                  Clasificación / Sección *
                </label>
                <select
                  value={section}
                  onChange={(e) =>
                    setSection(
                      e.target.value as "chilenos" | "superestrellas" | "torneos"
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500"
                >
                  <option value="chilenos">🇨🇱 Chilenos (Legión / Nacional)</option>
                  <option value="superestrellas">⭐ Superestrellas</option>
                  <option value="torneos">🏆 Grandes Torneos</option>
                </select>
              </div>
            </div>

            {/* Subida de imagen con vista previa */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-700">
                Imagen de portada (Opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-xs text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-xs file:font-bold file:text-emerald-700 hover:file:bg-emerald-100"
              />
              {previewUrl && (
                <div className="mt-3 relative inline-block">
                  <img
                    src={previewUrl}
                    alt="Vista previa"
                    className="h-44 w-auto rounded-xl border border-slate-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setPreviewUrl(null);
                    }}
                    className="mt-1.5 block text-xs font-semibold text-red-600 hover:underline"
                  >
                    Quitar imagen
                  </button>
                </div>
              )}
            </div>

            {/* Desarrollo */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-700">
                Cuerpo de la noticia *
              </label>
              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe los párrafos de la noticia..."
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500"
              />
            </div>

            {publishFeedback && (
              <div
                className={`rounded-xl p-3 text-xs font-semibold ${
                  publishFeedback.type === "ok"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {publishFeedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={publishing}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {publishing ? "Publicando noticia..." : "Publicar en Portada"}
            </button>
          </form>
        )}

                {/* PESTAÑA: EDITAR VOTACIÓN EN VIVO */}
                {activeTab === "poll" && (
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Editar Votación en Vivo
                </h2>
                <p className="text-xs text-slate-500">
                  Modifica la pregunta, sube las fotos de los deportistas o inicia una encuesta nueva.
                </p>
              </div>
              <button
                type="button"
                onClick={loadPollData}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Recargar
              </button>
            </div>

            {loadingPoll ? (
              <div className="py-10 text-center text-sm text-slate-500">
                Cargando encuesta actual...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                      Pregunta de la encuesta
                    </label>
                    <input
                      type="text"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                      Subtítulo / Bajada
                    </label>
                    <input
                      type="text"
                      value={pollSubtitle}
                      onChange={(e) => setPollSubtitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Lista de Candidatos */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Candidatos ({pollCandidates.length})
                  </h3>

                  {pollCandidates.map((candidate, index) => (
                    <div
                      key={candidate.id}
                      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center"
                    >
                      {/* Vista previa y subida de avatar */}
                      <div className="flex items-center gap-3 shrink-0">
                        {candidate.avatar_url ? (
                          <img
                            src={candidate.avatar_url}
                            alt={candidate.athlete_name}
                            className="h-14 w-14 rounded-full border border-slate-300 object-cover bg-white"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-sm font-extrabold text-emerald-700">
                            #{index + 1}
                          </div>
                        )}
                        <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100">
                          {uploadingAvatarId === candidate.id
                            ? "Subiendo..."
                            : "📷 Subir foto"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingAvatarId === candidate.id}
                            onChange={(e) =>
                              handleAvatarUpload(
                                candidate.id,
                                e.target.files?.[0] || null
                              )
                            }
                          />
                        </label>
                      </div>

                      {/* Campos editables del deportista */}
                      <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <input
                          type="text"
                          value={candidate.athlete_name}
                          onChange={(e) =>
                            setPollCandidates((prev) =>
                              prev.map((c) =>
                                c.id === candidate.id
                                  ? { ...c, athlete_name: e.target.value }
                                  : c
                              )
                            )
                          }
                          placeholder="Nombre deportista"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                        />

                        <select
                          value={candidate.sport}
                          onChange={(e) =>
                            setPollCandidates((prev) =>
                              prev.map((c) =>
                                c.id === candidate.id
                                  ? { ...c, sport: e.target.value }
                                  : c
                              )
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500"
                        >
                          <option value="FÚTBOL">FÚTBOL</option>
                          <option value="TENIS">TENIS</option>
                        </select>

                        <input
                          type="text"
                          value={candidate.achievement}
                          onChange={(e) =>
                            setPollCandidates((prev) =>
                              prev.map((c) =>
                                c.id === candidate.id
                                  ? { ...c, achievement: e.target.value }
                                  : c
                              )
                            )
                          }
                          placeholder="Logro destacado (ej: Gol en Europa)"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-500"
                        />
                      </div>

                      <span className="shrink-0 text-xs font-bold text-slate-500">
                        {candidate.votes} votos
                      </span>
                    </div>
                  ))}
                </div>

                {pollFeedback && (
                  <div
                    className={`rounded-xl p-3 text-xs font-semibold ${
                      pollFeedback.type === "ok"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {pollFeedback.text}
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={savingPoll}
                    onClick={() => handleSavePoll(false)}
                    className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {savingPoll
                      ? "Guardando..."
                      : "Guardar cambios (mantener votos)"}
                  </button>

                  <button
                    type="button"
                    disabled={savingPoll}
                    onClick={() => {
                      if (
                        confirm(
                          "¿Seguro que quieres reiniciar todos los votos a 0 y lanzar esta encuesta como nueva?"
                        )
                      ) {
                        handleSavePoll(true);
                      }
                    }}
                    className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                  >
                    🔄 Nueva encuesta (Reiniciar votos a 0)
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* PESTAÑA 2: MODERACIÓN DE COMENTARIOS */}
        {activeTab === "comments" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => loadComments(password)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Refrescar comentarios
              </button>
            </div>

            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-amber-600">
                Pendientes de aprobación ({pendingComments.length})
              </h2>

              {pendingComments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                  No hay comentarios pendientes por revisar.
                </div>
              ) : (
                pendingComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {comment.author_name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(comment.created_at).toLocaleString("es-CL")}
                        </span>
                      </div>
                      {comment.articles?.title && (
                        <p className="text-xs font-medium text-emerald-700">
                          Noticia: {comment.articles.title}
                        </p>
                      )}
                      <p className="text-sm text-slate-700">{comment.content}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAction(comment.id, "approve")}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(comment.id, "delete")}
                        className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>

            {approvedComments.length > 0 && (
              <section className="space-y-3 pt-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Aprobados recientes ({approvedComments.length})
                </h2>
                {approvedComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {comment.author_name}{" "}
                        <span className="font-normal text-slate-400">
                          • {comment.articles?.title || "Noticia"}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {comment.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAction(comment.id, "delete")}
                      className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

