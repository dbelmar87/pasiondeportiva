"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import Navbar from "@/components/Navbar/Navbar";
import FanAuthForm from "@/components/FanAuthForm";
import FanCardForm, { FanProfileData } from "@/components/FanCardForm";
import FanDigitalCard from "@/components/FanDigitalCard";
import { FanAvatar } from "@/components/FanAvatar";
import TodayMatchesWidget from "@/components/TodayMatchesWidget";

interface Article {
  id: string;
  title: string;
  slug: string;
  sport: string;
  section: string;
  cover_image: string | null;
  tags?: string[];
  created_at: string;
}

type DashboardTab = "feed" | "editar" | "alertas";

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
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

export default function HinchaPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<FanProfileData | null>(null);
  const [myNews, setMyNews] = useState<Article[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("feed");
  const [loading, setLoading] = useState(true);
  const [updatingAlerts, setUpdatingAlerts] = useState(false);

  const loadProfileAndNews = useCallback(
    async (uid: string) => {
      const { data } = await supabase
        .from("fan_profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setActiveTab("feed");

        const rawKeywords: string[] = [
          ...(data.favorite_teams || []),
          ...(data.favorite_player ? [data.favorite_player] : []),
        ];
        const keywords = rawKeywords
          .map((k) => normalizeText(k))
          .filter((k) => k.length >= 3);

        const { data: articles } = await supabase
          .from("articles")
          .select("id, title, slug, sport, section, cover_image, tags, created_at")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(30);

        if (articles && keywords.length > 0) {
          const filtered = articles.filter((a) => {
            const normTitle = normalizeText(a.title);
            const normTags = (a.tags || []).map((t: string) => normalizeText(t));

            return keywords.some(
              (kw) =>
                normTitle.includes(kw) ||
                normTags.some((tag: string) => tag.includes(kw))
            );
          });
          setMyNews(filtered);
        } else {
          setMyNews([]);
        }
      } else {
        setActiveTab("editar");
      }
    },
    [supabase]
  );

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (session?.user) {
        setUserId(session.user.id);
        await loadProfileAndNews(session.user.id);
      }
      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUserId(session.user.id);
        await loadProfileAndNews(session.user.id);
      } else {
        setUserId(null);
        setProfile(null);
        setMyNews([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfileAndNews]);

  async function handleToggleAlert(field: "notify_news" | "notify_live_scores") {
    if (!profile || !userId) return;
    setUpdatingAlerts(true);
    const newValue = !profile[field];

    const { error } = await supabase
      .from("fan_profiles")
      .update({ [field]: newValue })
      .eq("id", userId);

    if (!error) {
      setProfile({ ...profile, [field]: newValue });
    }
    setUpdatingAlerts(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserId(null);
    setProfile(null);
    setMyNews([]);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  const followedSummary = [
    ...(profile?.favorite_teams || []),
    ...(profile?.favorite_player ? [profile.favorite_player] : []),
  ].join(", ");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <TodayMatchesWidget favoriteTeams={profile?.favorite_teams || []} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {!userId ? (
          <FanAuthForm
            onSuccess={async (uid) => {
              setUserId(uid);
              await loadProfileAndNews(uid);
            }}
          />
        ) : !profile ? (
          <FanCardForm
            userId={userId}
            initialData={null}
            onSaved={() => loadProfileAndNews(userId)}
          />
        ) : (
          <div className="space-y-6">
            {/* Barra de Menú Especial del Dashboard del Hincha */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3 pl-1">
                <FanAvatar
                  avatarId={profile.avatar_id}
                  nickname={profile.nickname}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    Hola, {profile.nickname}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">
                    Panel de Hincha •{" "}
                  {profile.favorite_teams && profile.favorite_teams.length > 0
                  ? profile.favorite_teams.join(" · ")
                  : "Sin equipos"}
                  </p>
                </div>
              </div>

              {/* Pestañas de navegación del Hincha */}
              <nav className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveTab("feed")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    activeTab === "feed"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  📰 Noticias Para Ti ({myNews.length})
                </button>
                <button
                  onClick={() => setActiveTab("editar")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    activeTab === "editar"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  🎨 Avatar y Perfil
                </button>
                <button
                  onClick={() => setActiveTab("alertas")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    activeTab === "alertas"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  🔔 Mis Alertas
                </button>
                <button
                  onClick={handleLogout}
                  className="ml-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  Salir
                </button>
              </nav>
            </div>

            {/* Contenido Principal del Dashboard */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Columna Izquierda: Carnet Digital siempre visible */}
              <div className="lg:col-span-5">
                <FanDigitalCard
                  profile={profile}
                  onEdit={() => setActiveTab("editar")}
                  onUpdated={() => loadProfileAndNews(userId)}
                />
              </div>

              {/* Columna Derecha: Vista dinámica según pestaña */}
              <div className="lg:col-span-7">
                {activeTab === "feed" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-900">
                          Noticias Para Ti
                        </h2>
                        <p className="text-xs text-slate-500">
                          Siguiendo: {followedSummary || "Sin favoritos"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          profile.notify_news
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {profile.notify_news ? "🔔 Alertas Activas" : "🔕 Pausadas"}
                      </span>
                    </div>
                    {myNews.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                        <p className="mb-1 text-sm font-semibold text-slate-700">
                          Aún no hay noticias recientes sobre{" "}
                          {followedSummary || "tus favoritos"}
                        </p>
                        <p className="mb-4 text-xs text-slate-500">
                          Cuando se publiquen notas con tus etiquetas favoritas,
                          aparecerán aquí al instante.
                        </p>
                        <button
                          onClick={() => setActiveTab("editar")}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                        >
                          Cambiar equipo o deportista seguido
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myNews.map((art) => (
                          <Link
                            key={art.id}
                            href={`/noticia/${art.slug}`}
                            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md sm:flex-row"
                          >
                            <div className="aspect-[1200/630] w-full shrink-0 bg-slate-900 sm:w-64">
                              <img
                                src={getArticleCoverUrl(art)}
                                alt={art.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                            <div className="flex flex-col justify-center p-4">
                              <span className="mb-1 text-[10px] font-bold uppercase text-red-600">
                                {art.sport === "tennis" ? "Tenis" : "Fútbol"} •{" "}
                                {art.section}
                              </span>
                              <h3 className="text-base font-bold leading-snug text-slate-900 group-hover:text-red-600">
                                {art.title}
                              </h3>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "editar" && (
                  <FanCardForm
                    userId={userId}
                    initialData={profile}
                    onSaved={() => loadProfileAndNews(userId)}
                    onCancel={() => setActiveTab("feed")}
                  />
                )}

                {activeTab === "alertas" && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="mb-1 text-xl font-extrabold text-slate-900">
                      Centro de Alertas del Hincha
                    </h2>
                    <p className="mb-6 text-sm text-slate-600">
                      Controla qué notificaciones recibes en la campana superior
                      sobre <strong>{followedSummary || "tus favoritos"}</strong>.
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Noticias de última hora
                          </p>
                          <p className="text-xs text-slate-500">
                            Avisos cuando nuestro equipo publique notas sobre{" "}
                            {profile.favorite_teams?.[0] || "tu club"}.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={updatingAlerts}
                          onClick={() => handleToggleAlert("notify_news")}
                          className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                            profile.notify_news
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {profile.notify_news ? "Activado" : "Pausado"}
                        </button>
                      </div>

                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Marcadores en vivo y partidos clave
                          </p>
                          <p className="text-xs text-slate-500">
                            Alertas de inicio de partido, goles y resultados
                            finales.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={updatingAlerts}
                          onClick={() => handleToggleAlert("notify_live_scores")}
                          className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                            profile.notify_live_scores
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {profile.notify_live_scores ? "Activado" : "Pausado"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
