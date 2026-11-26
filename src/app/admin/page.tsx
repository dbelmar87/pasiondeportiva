"use client";

import { useState } from "react";
import Link from "next/link";

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

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadComments(passToUse: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/comments", {
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
    const res = await fetch("/api/admin/comments", {
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
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Moderación de Comentarios
            </h1>
            <p className="text-xs text-slate-500">
              {pendingComments.length} pendientes por aprobar •{" "}
              {approvedComments.length} publicados
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadComments(password)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Actualizar
            </button>
            <Link
              href="/"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Ver Portal
            </Link>
          </div>
        </div>

        {/* Comentarios Pendientes */}
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

        {/* Últimos Aprobados */}
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
    </div>
  );
}
