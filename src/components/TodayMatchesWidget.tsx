"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import TodayTenisWidget from "@/components/TodayTennisWidget";


export interface MatchItem {
  home_logo?: string;
  away_logo?: string;
  id: number;
  league_id: number;
  league_name: string;
  league_country?: string;
  match_date: string;
  status_short: string;
  elapsed: number | null;
  home_team: string;
  home_short: string;
  home_score: number | null;
  away_team: string;
  away_short: string;
  away_score: number | null;
  is_important: boolean;
}

interface TodayMatchesWidgetProps {
  favoriteTeams?: string[];
  title?: string;
  compact?: boolean;
}

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

function formatSantiagoTime(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("es-CL", {
      timeZone: "America/Santiago",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(isoDate));
  } catch {
    return "--:--";
  }
}

function TeamBadge({
    logo,
    shortName,
    alt,
  }: {
    logo?: string;
    shortName: string;
    alt: string;
  }) {
    const [imgError, setImgError] = useState(false);
  
    if (!logo || imgError) {
      return (
        <span className="inline-flex h-6 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-extrabold text-slate-700">
          {shortName}
        </span>
      );
    }
  
    return (
      <img
        src={logo}
        alt={alt}
        loading="lazy"
        onError={() => setImgError(true)}
        className="h-6 w-6 shrink-0 object-contain"
      />
    );
  }
  


export default function TodayMatchesWidget({
  favoriteTeams = [],
  title = "Partidos de Hoy",
  compact = false,
}: TodayMatchesWidgetProps) {
  const supabase = useMemo(() => createClient(), []);
  const [sportTab, setSportTab] = useState<"football" | "tennis">("football");
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchTodayMatches() {
      const todaySantiago = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const start = `${todaySantiago}T00:00:00-03:00`;
      const end = `${todaySantiago}T23:59:59-03:00`;

      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .gte("match_date", start)
        .lte("match_date", end)
        .order("match_date", { ascending: true });

      if (isMounted) {
        if (error) {
          setFetchError(error.message);
        } else {
          setFetchError(null);
          setMatches((data as MatchItem[]) || []);
        }
        setLoading(false);
      }
    }

    fetchTodayMatches();

    const interval = setInterval(fetchTodayMatches, 60_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [supabase]);

  const normalizedFavs = useMemo(
    () =>
      favoriteTeams
        .map((t) => t.toLowerCase().trim())
        .filter((t) => t.length >= 3),
    [favoriteTeams]
  );

  const sortedMatches = useMemo(() => {
    const isFavMatch = (m: MatchItem) =>
      normalizedFavs.some(
        (fav) =>
          m.home_team.toLowerCase().includes(fav) ||
          m.away_team.toLowerCase().includes(fav)
      );

    return [...matches].sort((a, b) => {
      const aFav = isFavMatch(a) ? 1 : 0;
      const bFav = isFavMatch(b) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      const aLive = LIVE_STATUSES.has(a.status_short) ? 1 : 0;
      const bLive = LIVE_STATUSES.has(b.status_short) ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive;

      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
    });
  }, [matches, normalizedFavs]);

  const visibleMatches = compact
    ? sortedMatches.slice(0, 5)
    : sortedMatches.slice(0, 8);

    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider">
              {title}
            </h2>
          </div>
  
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSportTab("football")}
                className={`rounded-md px-2.5 py-1 font-bold transition ${
                  sportTab === "football"
                    ? "bg-white text-slate-900"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Fútbol
              </button>
              <button
                type="button"
                onClick={() => setSportTab("tennis")}
                className={`rounded-md px-2.5 py-1 font-bold transition ${
                  sportTab === "tennis"
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Tenis
              </button>
            </div>
            <span className="hidden text-[11px] font-medium text-slate-400 sm:inline">
              Hora Chile
            </span>
          </div>
        </div>
  
        {sportTab === "tennis" ? (
          <TodayTenisWidget compact={compact} />
        ) : loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : fetchError ? (
          <div className="p-4 text-center text-xs font-semibold text-red-600">
            Error cargando partidos: {fetchError}
          </div>
        ) : visibleMatches.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No hay encuentros destacados programados para hoy.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleMatches.map((match) => {
              const isLive = LIVE_STATUSES.has(match.status_short);
              const isFinished = FINISHED_STATUSES.has(match.status_short);
              const hasScore = isLive || isFinished;
              const isFollowed = normalizedFavs.some(
                (fav) =>
                  match.home_team.toLowerCase().includes(fav) ||
                  match.away_team.toLowerCase().includes(fav)
              );
  
              return (
                <div
                  key={match.id}
                  className={`px-4 py-3 transition hover:bg-slate-50 ${
                    isFollowed ? "bg-amber-50/50" : ""
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="truncate font-semibold text-slate-500">
                      {match.league_name}
                    </span>
                    {isLive ? (
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {match.status_short === "HT"
                          ? "ENTRET."
                          : `EN VIVO ${match.elapsed ? `${match.elapsed}'` : ""}`}
                      </span>
                    ) : isFinished ? (
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                        FINAL
                      </span>
                    ) : (
                      <span className="font-bold text-slate-700">
                        {formatSantiagoTime(match.match_date)}
                      </span>
                    )}
                  </div>
  
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <TeamBadge
                        logo={match.home_logo}
                        shortName={match.home_short}
                        alt={match.home_team}
                      />
                      <span className="truncate font-semibold text-slate-900">
                        {match.home_team}
                      </span>
                    </div>
  
                    <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-extrabold text-white">
                      <span>
                        {hasScore && match.home_score !== null
                          ? match.home_score
                          : "-"}
                      </span>
                      <span className="text-slate-400">:</span>
                      <span>
                        {hasScore && match.away_score !== null
                          ? match.away_score
                          : "-"}
                      </span>
                    </div>
  
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
                      <span className="truncate font-semibold text-slate-900">
                        {match.away_team}
                      </span>
                      <TeamBadge
                        logo={match.away_logo}
                        shortName={match.away_short}
                        alt={match.away_team}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }
  