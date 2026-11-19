"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";

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

const CHILE_LEAGUE_IDS = new Set([265, 266, 267]);
const TOP_LEAGUE_IDS = new Set([2, 3, 11, 13, 39, 78, 135, 140]);

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

function getPriorityScore(match: MatchItem, normalizedFavs: string[]): number {
  const home = match.home_team.toLowerCase();
  const away = match.away_team.toLowerCase();

  if (normalizedFavs.some((fav) => home.includes(fav) || away.includes(fav))) {
    return 100;
  }
  if (
    CHILE_LEAGUE_IDS.has(match.league_id) ||
    home.includes("chile") ||
    away.includes("chile")
  ) {
    return 90;
  }
  if (
    home.includes("nassr") ||
    away.includes("nassr") ||
    home.includes("inter miami") ||
    away.includes("inter miami")
  ) {
    return 80;
  }
  if (TOP_LEAGUE_IDS.has(match.league_id)) {
    return 70;
  }
  return 50;
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
      <span className="inline-flex h-6 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-extrabold text-slate-700">
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
}: TodayMatchesWidgetProps) {
  const supabase = useMemo(() => createClient(), []);
  const sliderRef = useRef<HTMLDivElement>(null);

  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>("ALL");

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

    const interval = setInterval(fetchTodayMatches, 45_000);
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
    return [...matches].sort((a, b) => {
      const aLive = LIVE_STATUSES.has(a.status_short) ? 1 : 0;
      const bLive = LIVE_STATUSES.has(b.status_short) ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive;

      const aScore = getPriorityScore(a, normalizedFavs);
      const bScore = getPriorityScore(b, normalizedFavs);
      if (aScore !== bScore) return bScore - aScore;

      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
    });
  }, [matches, normalizedFavs]);

  // Pestañas solo para ligas con 2 o más partidos hoy (los independientes quedan sin categorizar en "Todos")
  const leagueTabs = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();

    for (const m of sortedMatches) {
      const key = String(m.league_id);
      const current = counts.get(key);
      if (current) {
        current.count += 1;
      } else {
        counts.set(key, { name: m.league_name, count: 1 });
      }
    }

    return Array.from(counts.entries())
      .filter(([, info]) => info.count >= 2)
      .map(([id, info]) => ({
        id,
        name: info.name,
        count: info.count,
      }));
  }, [sortedMatches]);

  const liveCount = useMemo(
    () => sortedMatches.filter((m) => LIVE_STATUSES.has(m.status_short)).length,
    [sortedMatches]
  );

  const displayedMatches = useMemo(() => {
    if (selectedLeague === "ALL") return sortedMatches;
    if (selectedLeague === "LIVE") {
      return sortedMatches.filter((m) => LIVE_STATUSES.has(m.status_short));
    }
    return sortedMatches.filter((m) => String(m.league_id) === selectedLeague);
  }, [sortedMatches, selectedLeague]);

  function scrollSlider(direction: "left" | "right") {
    if (!sliderRef.current) return;
    const distance = direction === "left" ? -320 : 320;
    sliderRef.current.scrollBy({ left: distance, behavior: "smooth" });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Cabecera + Flechas */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            {title}
          </h2>
          {!loading && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              {matches.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400">
            Hora Chile
          </span>
          {displayedMatches.length > 1 && (
            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => scrollSlider("left")}
                aria-label="Anterior"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 transition hover:bg-slate-900 hover:text-white"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scrollSlider("right")}
                aria-label="Siguiente"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 transition hover:bg-slate-900 hover:text-white"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pestañas dinámicas por liga (solo si tienen 2+ partidos) */}
      {!loading && !fetchError && sortedMatches.length > 0 && (
        <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
            type="button"
            onClick={() => setSelectedLeague("ALL")}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition ${
              selectedLeague === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todos ({sortedMatches.length})
          </button>

          {liveCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedLeague("LIVE")}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition ${
                selectedLeague === "LIVE"
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              🔴 En Vivo ({liveCount})
            </button>
          )}

          {leagueTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedLeague(tab.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition ${
                selectedLeague === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </div>
      )}

      {/* Contenido del Slider */}
      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 w-64 shrink-0 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : fetchError ? (
        <div className="p-4 text-center text-xs font-semibold text-red-600">
          Error cargando partidos: {fetchError}
        </div>
      ) : displayedMatches.length === 0 ? (
        <div className="p-4 text-center text-sm text-slate-500">
          No hay encuentros destacados programados para hoy.
        </div>
      ) : (
        <div
          ref={sliderRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 scroll-smooth"
        >
          {displayedMatches.map((match) => {
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
                className={`w-64 shrink-0 snap-start rounded-xl border p-3 transition ${
                  isFollowed
                    ? "border-amber-300 bg-amber-50/40"
                    : "border-slate-200 bg-slate-50/50 hover:bg-white"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-[10px]">
                  <span className="truncate font-bold uppercase text-slate-500">
                    {match.league_name}
                  </span>
                  {isLive ? (
                    <span className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 font-extrabold text-white">
                      {match.status_short === "HT"
                        ? "ENTRET."
                        : `EN VIVO ${match.elapsed ? `${match.elapsed}'` : ""}`}
                    </span>
                  ) : isFinished ? (
                    <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 font-bold text-slate-700">
                      FINAL
                    </span>
                  ) : (
                    <span className="shrink-0 font-extrabold text-slate-800">
                      {formatSantiagoTime(match.match_date)}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <TeamBadge
                        logo={match.home_logo}
                        shortName={match.home_short}
                        alt={match.home_team}
                      />
                      <span className="truncate font-bold text-slate-900">
                        {match.home_team}
                      </span>
                    </div>
                    <span className="font-extrabold text-slate-900">
                      {hasScore && match.home_score !== null
                        ? match.home_score
                        : "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <TeamBadge
                        logo={match.away_logo}
                        shortName={match.away_short}
                        alt={match.away_team}
                      />
                      <span className="truncate font-bold text-slate-900">
                        {match.away_team}
                      </span>
                    </div>
                    <span className="font-extrabold text-slate-900">
                      {hasScore && match.away_score !== null
                        ? match.away_score
                        : "-"}
                    </span>
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
