"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import FanAuthForm from "@/components/FanAuthForm";
import FanCardForm, { FanProfileData } from "@/components/FanCardForm";
import FanDigitalCard from "@/components/FanDigitalCard";

interface Article {
  id: string;
  title: string;
  slug: string;
  sport: string;
  section: string;
  cover_image: string;
}

export default function HinchaPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<FanProfileData | null>(null);
  const [myNews, setMyNews] = useState<Article[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadProfileAndNews(uid: string) {
    const { data } = await supabase
      .from("fan_profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setEditing(false);

      const team = (data.favorite_teams?.[0] || "").toLowerCase();
      const player = (data.favorite_player || "").toLowerCase();

      const { data: articles } = await supabase
        .from("articles")
        .select("id, title, slug, sport, section, cover_image, tags")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(20);

      if (articles) {
        const filtered = articles.filter((a) => {
          const inTitle =
            (team && a.title.toLowerCase().includes(team)) ||
            (player && a.title.toLowerCase().includes(player));
          const inTags = (a.tags || []).some(
            (t: string) =>
              (team && t.toLowerCase().includes(team)) ||
              (player && t.toLowerCase().includes(player))
          );
          return inTitle || inTags;
        });
        setMyNews(filtered);
      }
    } else {
      setEditing(true);
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        await loadProfileAndNews(session.user.id);
      }
      setLoading(false);
    }
    init();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserId(null);
    setProfile(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="rounded-lg bg-red-600 px-2 py-0.5 text-base font-black text-white">
              PD
            </span>
            <span className="text-lg font-extrabold text-slate-900">
              Pasión Deportiva
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              ← Volver a portada
            </Link>
            {userId && (
              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {!userId ? (
          <FanAuthForm
            onSuccess={async (uid) => {
              setUserId(uid);
              await loadProfileAndNews(uid);
            }}
          />
        ) : editing || !profile ? (
          <FanCardForm
            userId={userId}
            initialData={profile}
            onSaved={() => loadProfileAndNews(userId)}
            onCancel={profile ? () => setEditing(false) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <FanDigitalCard
                profile={profile}
                onEdit={() => setEditing(true)}
                onUpdated={() => loadProfileAndNews(userId)}
              />
            </div>

            <div className="space-y-4 lg:col-span-7">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Noticias Para Ti
                  </h2>
                  <p className="text-xs text-slate-500">
                    Novedades sobre {profile.favorite_teams?.[0]} y {profile.favorite_player || "tus favoritos"}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  {profile.notify_news ? "🔔 Alertas Activas" : "🔕 Pausadas"}
                </span>
              </div>

              {myNews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <p className="mb-1 text-sm font-semibold text-slate-700">
                    Aún no hay noticias recientes de {profile.favorite_teams?.[0]}
                  </p>
                  <p className="text-xs text-slate-500">
                    Cuando se publiquen notas con tus etiquetas favoritas, aparecerán aquí al instante.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myNews.map((art) => (
                    <Link
                      key={art.id}
                      href={`/noticia/${art.slug}`}
                      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md sm:flex-row"
                    >
                      <img
                        src={art.cover_image}
                        alt={art.title}
                        className="h-36 w-full object-cover sm:w-48"
                      />
                      <div className="flex flex-col justify-center p-4">
                        <span className="mb-1 text-[10px] font-bold uppercase text-red-600">
                          {art.sport === "tennis" ? "Tenis" : "Fútbol"} • {art.section}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {art.title}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
