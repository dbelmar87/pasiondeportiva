"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

interface ArticleAlert {
  id: string;
  title: string;
  slug: string;
  section: string | null;
  tags: string[] | null;
  created_at: string;
  isPersonalized?: boolean;
}

const STORAGE_KEY = "pd_last_seen_notifications";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<ArticleAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadNotifications() {
      try {
        const {
          data: { session },
        } = await supabase!.auth.getSession();

        let userKeywords: string[] = [];

        if (session?.user) {
          const { data: profile } = await supabase!
            .from("fan_profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile) {
            const rawValues = [
              profile.favorite_team,
              profile.team,
              ...(Array.isArray(profile.favorite_tags)
                ? profile.favorite_tags
                : []),
              ...(Array.isArray(profile.interests) ? profile.interests : []),
            ].filter(Boolean);

            userKeywords = rawValues.map((v) => String(v).toLowerCase());
          }
        }

        const { data: articles } = await supabase!
          .from("articles")
          .select("id, title, slug, section, tags, created_at")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(8);

        if (!isMounted || !articles) return;

        const enriched: ArticleAlert[] = articles.map((art) => {
          const titleLower = art.title.toLowerCase();
          const tagsLower = Array.isArray(art.tags)
            ? art.tags.map((t: string) => t.toLowerCase())
            : [];

          const matchesFan =
            userKeywords.length > 0 &&
            userKeywords.some(
              (kw) =>
                titleLower.includes(kw) ||
                tagsLower.some((tag) => tag.includes(kw))
            );

          return {
            ...art,
            isPersonalized: matchesFan,
          };
        });

        // Priorizar notas personalizadas arriba si el hincha tiene preferencias
        enriched.sort(
          (a, b) =>
            Number(Boolean(b.isPersonalized)) - Number(Boolean(a.isPersonalized))
        );

        const topAlerts = enriched.slice(0, 6);
        setAlerts(topAlerts);

        const lastSeen = localStorage.getItem(STORAGE_KEY);
        if (!lastSeen) {
          setUnreadCount(topAlerts.length);
        } else {
          const lastSeenTime = new Date(lastSeen).getTime();
          const unread = topAlerts.filter(
            (a) => new Date(a.created_at).getTime() > lastSeenTime
          ).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error("Error cargando notificaciones:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  function handleToggle() {
    const nextState = !open;
    setOpen(nextState);
    if (nextState) {
      setUnreadCount(0);
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notificaciones deportivas"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <svg
          xmlns="http://w3.org"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Alertas Pasión Deportiva
            </span>
            <Link
              href="/hincha"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Personalizar
            </Link>
          </div>

          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-400">
                Buscando novedades...
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No hay alertas recientes por ahora.
              </div>
            ) : (
              alerts.map((item) => (
                <Link
                  key={item.id}
                  href={`/noticia/${item.slug}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 transition hover:bg-slate-50"
                >
                  <div className="mb-1 flex items-center gap-2">
                    {item.isPersonalized ? (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">
                        Para ti
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                        {item.section || "Actualidad"}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.created_at).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800">
                    {item.title}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
