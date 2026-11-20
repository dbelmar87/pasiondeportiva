"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";

export interface TennisMatchItem {
  id: string;
  tournament_name: string;
  round_name: string;
  match_date: string;
  status_short: string;
  player1_name: string;
  player1_country: string;
  player1_sets: number;
  player1_score: string;
  player2_name: string;
  player2_country: string;
  player2_sets: number;
  player2_score: string;
  has_chilean: boolean;
  is_star_match: boolean;
}

interface TodayTennisWidgetProps {
  favoritePlayers?: string[];
  title?: string;
  compact?: boolean;
  embedded?: boolean;
}

const LIVE_STATUSES = new Set([
  "LIVE",
  "IN_PROGRESS",
  "1S",
  "2S",
  "3S",
  "4S",
  "5S",
]);
const FINISHED_STATUSES = new Set(["FT", "FINISHED", "RET", "WO"]);

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

function CountryBadge({ countryCode }: { countryCode?: string }) {
  return (
    <span className="inline-flex h-5 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-extrabold text-slate-700">
      {countryCode || "ATP"}
    </span>
  );
}

export default function TodayTennisWidget({
  favoritePlayers = [],
  title = "Tenis Hoy",
  compact = false,
  embedded = false,
}: TodayTennisWidgetProps) {
  const supabase = useMemo(() => createClient(), []);
  const [matches, setMatches] = useState<TennisMatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchTodayTennis() {
      const todaySantiago = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const start = `${todaySantiago}T00:00:00-03:00`;
      const end = `${todaySantiago}T23:59:59-03:00`;

      const { data, error } = await supabase
        .from("tennis_matches")
        .select("*")
        .gte("match_date", start)
        .lte("match_date", end)
        .order("match_date", { ascending: true });

      if (isMounted) {
        if (error) {
          setFetchError(error.message);
        } else {
          setFetchError(null);
          setMatches((data as TennisMatchItem[]) || []);
        }
        setLoading(false);
      }
    }

    fetchTodayTennis();

    const interval = setInterval(fetchTodayTennis, 60_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [supabase]);

  const normalizedFavs = useMemo(
    () =>
      favoritePlayers
        .map((p) => p.toLowerCase().trim())
        .filter((p) => p.length >= 3),
    [favoritePlayers]
  );

  const sortedMatches = useMemo(() => {
    const isFavMatch = (m: TennisMatchItem) =>
      m.has_chilean ||
      normalizedFavs.some(
        (fav) =>
          m.player1_name.toLowerCase().includes(fav) ||
          m.player2_name.toLowerCase().includes(fav)
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

  const content = loading ? (
    <div className="space-y-3 p-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  ) : fetchError ? (
    <div className="p-4 text-center text-xs font-semibold text-red-600">
      Error cargando partidos de tenis: {fetchError}
    </div>
  ) : visibleMatches.length === 0 ? (
    <div className="p-6 text-center text-sm text-slate-500">
      No hay partidos de tenis destacados programados para hoy.
    </div>
  ) : (
    <div className="divide-y divide-slate-100">
      {visibleMatches.map((match) => {
        const isLive = LIVE_STATUSES.has(match.status_short);
        const isFinished = FINISHED_STATUSES.has(match.status_short);
        const showFinalScore = isFinished;
        const p1Won = showFinalScore && match.player1_sets > match.player2_sets;
        const p2Won = showFinalScore && match.player2_sets > match.player1_sets;

        const isHighlighted =
          match.has_chilean ||
          normalizedFavs.some(
            (fav) =>
              match.player1_name.toLowerCase().includes(fav) ||
              match.player2_name.toLowerCase().includes(fav)
          );

        return (
          <div
            key={match.id}
            className={`px-4 py-3 transition hover:bg-slate-50 ${
              isHighlighted ? "bg-amber-50/50" : ""
            }`}
          >
            {/* Torneo y Estado */}
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <span className="truncate font-semibold text-slate-500">
                {match.tournament_name}
                {match.round_name ? ` • ${match.round_name}` : ""}
              </span>
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
                  EN CURSO
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

            <div className="space-y-1.5 text-sm">
              {/* Jugador 1 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <CountryBadge countryCode={match.player1_country} />
                  <span
                    className={`truncate text-slate-900 ${
                      p1Won ? "font-extrabold" : "font-medium"
                    }`}
                  >
                    {match.player1_name}
                  </span>
                </div>

                {showFinalScore ? (
                  <div className="flex shrink-0 items-center gap-2">
                    {match.player1_score && (
                      <span className="font-mono text-xs text-slate-500">
                        {match.player1_score}
                      </span>
                    )}
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-extrabold ${
                        p1Won
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {match.player1_sets}
                    </span>
                  </div>
                ) : (
                  <span className="px-2 text-xs font-semibold text-slate-400">
                    -
                  </span>
                )}
              </div>

              {/* Jugador 2 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <CountryBadge countryCode={match.player2_country} />
                  <span
                    className={`truncate text-slate-900 ${
                      p2Won ? "font-extrabold" : "font-medium"
                    }`}
                  >
                    {match.player2_name}
                  </span>
                </div>

                {showFinalScore ? (
                  <div className="flex shrink-0 items-center gap-2">
                    {match.player2_score && (
                      <span className="font-mono text-xs text-slate-500">
                        {match.player2_score}
                      </span>
                    )}
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-extrabold ${
                        p2Won
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {match.player2_sets}
                    </span>
                  </div>
                ) : (
                  <span className="px-2 text-xs font-semibold text-slate-400">
                    -
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-5 py-3.5 text-white">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <h2 className="text-sm font-extrabold uppercase tracking-wider">
            {title}
          </h2>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          Hora Chile
        </span>
      </div>
      {content}
    </section>
  );
}