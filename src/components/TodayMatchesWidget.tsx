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

function MiniBadge({
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
      <span className="inline-flex h-4 w-5 shrink-0 items-center justify-center rounded bg-slate-200 text-[9px] font-extrabold text-slate-700">
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
      className="h-4 w-4 shrink-0 object-contain"
    />
  );
}

export default function TodayMatchesWidget({
  favoriteTeams = [],
}: TodayMatchesWidgetProps) {
  const supabase = useMemo(() => createClient(), []);
  const stripRef = useRef<HTMLDivElement>(null);

  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
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

      const { data } = await supabase
        .from("matches")
        .select("*")
        .gte("match_date", start)
        .lte("match_date", end)
        .order("match_date", { ascending: true });

      if (isMounted) {
        setMatches((data as MatchItem[]) || []);
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

  // Selector compacto: solo agrupa ligas con 2+ partidos; los independientes quedan en "Todos"
  const leagueOptions = useMemo(() => {
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

  function scrollStrip(direction: "left" | "right") {
    if (!stripRef.current) return;
    stripRef.current.scrollBy({
      left: direction === "left" ? -420 : 420,
      behavior: "smooth",
    });
  }

  if (!loading && matches.length === 0) {
    return null;
  }

  return (
    <div className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-stretch">
        {/* Columna Izquierda Fija: Selector compacto de torneo (estilo Scoreboard ESPN) */}
        <div className="flex shrink-0 flex-col justify-center border-r border-slate-200 bg-slate-50 px-3 py-2">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Marcadores
            </span>
          </div>

          <select
            aria-label="Filtrar por torneo"
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className="max-w-[140px] cursor-pointer rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-extrabold text-slate-900 focus:border-slate-900 focus:outline-none sm:max-w-[175px]"
          >
            <option value="ALL">Todos ({sortedMatches.length})</option>
            {liveCount > 0 && (
              <option value="LIVE">🔴 En Vivo ({liveCount})</option>
            )}
            {leagueOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name} ({opt.count})
              </option>
            ))}
          </select>
        </div>

        {/* Botón Izquierdo */}
        <button
          type="button"
          onClick={() => scrollStrip("left")}
          aria-label="Desplazar izquierda"
          className="hidden shrink-0 items-center justify-center border-r border-slate-200 bg-white px-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 md:flex"
        >
          ‹
        </button>

        {/* Cinta Horizontal de Partidos (sin bordes redondeados flotantes, separados por líneas finas) */}
        <div
          ref={stripRef}
          className="flex flex-1 divide-x divide-slate-200 overflow-x-auto scroll-smooth"
        >
          {loading
            ? [1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="flex h-[74px] w-44 shrink-0 flex-col justify-center gap-2 px-3"
                >
                  <div className="h-2.5 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
                </div>
              ))
            : displayedMatches.map((match) => {
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
                    className={`flex w-44 shrink-0 flex-col justify-between px-3 py-2 transition hover:bg-slate-50 ${
                      isFollowed ? "bg-amber-50/60" : "bg-white"
                    }`}
                  >
                    {/* Línea superior: Liga abreviada + Hora/Estado */}
                    <div className="mb-1 flex items-center justify-between gap-1 text-[10px]">
                      <span className="truncate font-semibold text-slate-400">
                        {match.league_name}
                      </span>
                      {isLive ? (
                        <span className="shrink-0 font-extrabold text-red-600">
                          {match.status_short === "HT"
                            ? "ENT"
                            : `${match.elapsed ?? ""}'`}
                        </span>
                      ) : isFinished ? (
                        <span className="shrink-0 font-bold text-slate-500">
                          FINAL
                        </span>
                      ) : (
                        <span className="shrink-0 font-bold text-slate-700">
                          {formatSantiagoTime(match.match_date)}
                        </span>
                      )}
                    </div>

                    {/* Fila Equipo Local */}
                    <div className="flex items-center justify-between gap-1.5 text-xs">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <MiniBadge
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

                    {/* Fila Equipo Visita */}
                    <div className="mt-0.5 flex items-center justify-between gap-1.5 text-xs">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <MiniBadge
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
                );
              })}
        </div>

        {/* Botón Derecho */}
        <button
          type="button"
          onClick={() => scrollStrip("right")}
          aria-label="Desplazar derecha"
          className="hidden shrink-0 items-center justify-center border-l border-slate-200 bg-white px-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 md:flex"
        >
          ›
        </button>
      </div>
    </div>
  );
}