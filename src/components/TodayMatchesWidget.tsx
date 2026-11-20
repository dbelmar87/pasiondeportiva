"use client";

import { useEffect, useState, useMemo, useRef  } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

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

type UnifiedEvent =
  | {
      sport: "football";
      sortTime: number;
      isPriority: boolean;
      isLive: boolean;
      isFinished: boolean;
      data: MatchItem;
    }
  | {
      sport: "tennis";
      sortTime: number;
      isPriority: boolean;
      isLive: boolean;
      isFinished: boolean;
      data: TennisMatchItem;
    };

interface TodayMatchesWidgetProps {
  favoriteTeams?: string[];
  favoritePlayers?: string[];
  title?: string;
  maxItems?: number;
}

const FOOTBALL_LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
const FOOTBALL_FINISHED = new Set(["FT", "AET", "PEN"]);

const TENNIS_LIVE = new Set(["LIVE", "IN_PROGRESS", "1S", "2S", "3S", "4S", "5S"]);
const TENNIS_FINISHED = new Set(["FT", "FINISHED", "RET", "WO"]);

// Conversión de código de 3 letras (ATP/FIFA) a ISO 2 letras para banderas SVG
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  CHI: "cl", CHL: "cl",
  ESP: "es", ITA: "it", GER: "de", DEU: "de",
  SRB: "rs", USA: "us", RUS: "ru", NOR: "no",
  AUS: "au", BUL: "bg", GBR: "gb", FRA: "fr",
  ARG: "ar", BRA: "br", CAN: "ca", GRE: "gr",
  POL: "pl", DEN: "dk", NED: "nl", SUI: "ch",
  JPN: "jp", KOR: "kr", KAZ: "kz", CZE: "cz",
};

function getFlagUrl(countryCode?: string): string | null {
  if (!countryCode) return null;
  const upper = countryCode.trim().toUpperCase();
  const iso2 =
    ALPHA3_TO_ALPHA2[upper] || (upper.length === 2 ? upper.toLowerCase() : null);
  if (!iso2) return null;
  return ["https://", "flagcdn.com", "/w40/", iso2, ".png"].join("");
}

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

function TeamBadge({ logo, shortName, alt }: { logo?: string; shortName: string; alt: string }) {
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

function CountryFlag({ countryCode }: { countryCode?: string }) {
  const [error, setError] = useState(false);
  const url = getFlagUrl(countryCode);

  if (!url || error) {
    return (
      <span className="inline-flex h-4 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-slate-600">
        {countryCode || "ATP"}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={countryCode || "Bandera"}
      onError={() => setError(true)}
      className="h-3.5 w-5 shrink-0 rounded-[2px] border border-slate-200 object-cover shadow-2xs"
    />
  );
}

export default function TodayMatchesWidget({
  favoriteTeams = [],
  favoritePlayers = [],
  title = "Top 20 Partidos del Día",
  maxItems = 20,
}: TodayMatchesWidgetProps) {
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState<"all" | "football" | "tennis">("all");
  const [footballMatches, setFootballMatches] = useState<MatchItem[]>([]);
  const [tennisMatches, setTennisMatches] = useState<TennisMatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [now, setNow] = useState<number>(0);

  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollSlider = (direction: "left" | "right") => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({
      left: direction === "left" ? -480 : 480,
      behavior: "smooth",
    });
  };


  useEffect(() => {
    let isMounted = true;

    async function fetchAll() {
      const todaySantiago = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const start = `${todaySantiago}T00:00:00-03:00`;
      const end = `${todaySantiago}T23:59:59-03:00`;

      const [fRes, tRes] = await Promise.all([
        supabase
          .from("matches")
          .select("*")
          .gte("match_date", start)
          .lte("match_date", end),
        supabase
          .from("tennis_matches")
          .select("*")
          .gte("match_date", start)
          .lte("match_date", end),
      ]);

      if (isMounted) {
        if (!fRes.error && fRes.data) setFootballMatches(fRes.data as MatchItem[]);
        if (!tRes.error && tRes.data) setTennisMatches(tRes.data as TennisMatchItem[]);
        setLoading(false);
      }
    }

    setNow(Date.now());
    fetchAll();

    const interval = setInterval(() => {
      setNow(Date.now());
      fetchAll();
    }, 60_000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [supabase]);


  const unifiedList = useMemo(() => {
    const favTeams = favoriteTeams
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length >= 3);
    const favPlayers = favoritePlayers
      .map((p) => p.toLowerCase().trim())
      .filter((p) => p.length >= 3);

    const items: UnifiedEvent[] = [];

    if (filter === "all" || filter === "football") {
      for (const m of footballMatches) {
        const startTime = new Date(m.match_date).getTime();
        const isFinished = FOOTBALL_FINISHED.has(m.status_short);
        const isLive =
          !isFinished &&
          (FOOTBALL_LIVE.has(m.status_short) ||
          (now > 0 && now >= startTime && now - startTime < 3 * 60 * 60 * 1000));

        const isFav = favTeams.some(
          (f) =>
            m.home_team.toLowerCase().includes(f) ||
            m.away_team.toLowerCase().includes(f)
        );
        items.push({
          sport: "football",
          sortTime: startTime,
          isPriority: isFav || m.is_important,
          isLive,
          isFinished,
          data: m,
        });
      }
    }

    if (filter === "all" || filter === "tennis") {
      for (const t of tennisMatches) {
        const startTime = new Date(t.match_date).getTime();
        const isFinished = TENNIS_FINISHED.has(t.status_short);
        const isLive =
          !isFinished &&
          (TENNIS_LIVE.has(t.status_short) ||
          (now > 0 && now >= startTime && now - startTime < 5 * 60 * 60 * 1000));

        const isFav =
          t.has_chilean ||
          favPlayers.some(
            (f) =>
              t.player1_name.toLowerCase().includes(f) ||
              t.player2_name.toLowerCase().includes(f)
          );
        items.push({
          sport: "tennis",
          sortTime: startTime,
          isPriority: isFav,
          isLive,
          isFinished,
          data: t,
        });
      }
    }

    return items
      .sort((a, b) => {
        // 1. Primero los partidos en curso (EN CURSO)
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        // 2. Enviar los partidos finalizados (FINAL) al final del slider
        if (a.isFinished !== b.isFinished) return a.isFinished ? 1 : -1;
        // 3. Ordenar cronológicamente del más próximo al más lejano
        return a.sortTime - b.sortTime;
      })
      .slice(0, maxItems);
  }, [
    footballMatches,
    tennisMatches,
    favoriteTeams,
    favoritePlayers,
    filter,
    maxItems,
    now,
  ]);


  const totalCount = footballMatches.length + tennisMatches.length;

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* 1. Barra superior compacta: Todo en una sola línea */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-4 py-2 text-white">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <h2 className="flex items-center gap-2 text-xs font-extrabold tracking-wider uppercase text-white">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            {title}
          </h2>

          {/* Filtros en línea junto al título */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                filter === "all"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setFilter("football")}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                filter === "football"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
              }`}
            >
              ⚽ Fútbol ({footballMatches.length})
            </button>
            <button
              onClick={() => setFilter("tennis")}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                filter === "tennis"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
              }`}
            >
              🎾 Tenis ({tennisMatches.length})
            </button>
          </div>
        </div>

        {/* Controles derechos + Botón "Ver todos" */}
        <div className="flex items-center gap-2.5">
          <span className="hidden md:inline text-[11px] text-slate-400">Hora Chile</span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => scrollSlider("left")}
              aria-label="Anterior"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
            >
              ‹
            </button>
            <button
              onClick={() => scrollSlider("right")}
              aria-label="Siguiente"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
            >
              ›
            </button>
          </div>

          <span className="h-3.5 w-[1px] bg-slate-700"></span>
          <Link
            href="/partidos"
            className="whitespace-nowrap text-xs font-semibold text-emerald-400 transition hover:text-emerald-300"
          >
            Ver todos →
          </Link>
        </div>
      </div>

      {/* 2. Slider horizontal de tarjetas compactas */}
      <div
        ref={sliderRef}
        className="flex divide-x divide-slate-100 overflow-x-auto scrollbar-none"
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[195px] shrink-0 animate-pulse space-y-2 px-3 py-2.5">
              <div className="h-2.5 w-24 rounded bg-slate-200"></div>
              <div className="h-3.5 w-36 rounded bg-slate-200"></div>
              <div className="h-3.5 w-32 rounded bg-slate-200"></div>
            </div>
          ))
        ) : unifiedList.length === 0 ? (
          <div className="w-full py-5 text-center text-xs text-slate-500">
            No hay partidos programados en esta categoría para hoy.
          </div>
        ) : (
          unifiedList.map((item) => {
            if (item.sport === "football") {
              const m = item.data;
              return (
                <div
                  key={`fb-${m.id}`}
                  className="w-[195px] shrink-0 px-3 py-2 transition hover:bg-slate-50/90"
                >
                  {/* Cabecera: Liga y Estado (solo EN CURSO o FINAL, sin minuto) */}
                  <div className="mb-1.5 flex items-center justify-between gap-1 text-[10px]">
                    <span className="truncate font-medium text-slate-400">
                      {m.league_name}
                    </span>
                    {item.isLive ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                        EN CURSO
                      </span>
                    ) : item.isFinished ? (
                      <span className="shrink-0 font-semibold text-slate-400">FINAL</span>
                    ) : (
                      <span className="shrink-0 font-semibold text-slate-600">
                        {formatSantiagoTime(m.match_date)}
                      </span>
                    )}
                  </div>

                  {/* Filas de equipos: marcador visible SOLO cuando finaliza */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <TeamBadge logo={m.home_logo} shortName={m.home_short} alt={m.home_team} />
                        <span className="truncate text-xs font-semibold text-slate-800">
                          {m.home_team}
                        </span>
                      </div>
                      {item.isFinished && (
                        <span className="shrink-0 text-xs font-bold text-slate-800">
                          {m.home_score ?? 0}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <TeamBadge logo={m.away_logo} shortName={m.away_short} alt={m.away_team} />
                        <span className="truncate text-xs font-semibold text-slate-800">
                          {m.away_team}
                        </span>
                      </div>
                      {item.isFinished && (
                        <span className="shrink-0 text-xs font-bold text-slate-800">
                          {m.away_score ?? 0}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }


            // Renderizado para Tenis
                        // Renderizado para Tenis
                        const t = item.data;
                        const hasScore = item.isLive || item.isFinished;
            
                        return (
                          <div
                            key={`tn-${t.id}`}
                            className={`${
                              hasScore ? "w-[225px]" : "w-[195px]"
                            } shrink-0 px-3 py-2 transition hover:bg-slate-50/90`}
                          >
                            {/* Cabecera: Torneo y Hora/Estado */}
                            <div className="mb-1.5 flex items-center justify-between gap-1 text-[10px]">
                              <span className="truncate font-medium text-slate-400">
                                {t.tournament_name}
                              </span>
                              {item.isLive ? (
                                <span className="shrink-0 rounded bg-emerald-100 px-1 font-bold text-emerald-700">
                                  VIVO
                                </span>
                              ) : item.isFinished ? (
                                <span className="shrink-0 font-semibold text-slate-400">FINAL</span>
                              ) : (
                                <span className="shrink-0 font-semibold text-slate-600">
                                  {formatSantiagoTime(t.match_date)}
                                </span>
                              )}
                            </div>
            
                            {/* Filas de tenistas con sets completos sin cortar */}
                            <div className="space-y-1">
                              {/* Jugador 1 */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <CountryFlag countryCode={t.player1_country} />
                                  <span className="truncate text-xs font-semibold text-slate-800">
                                    {t.player1_name}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs">
                                  {hasScore ? (
                                    <>
                                      {t.player1_score && (
                                        <span className="text-[11px] tracking-tight text-slate-500">
                                          {t.player1_score}
                                        </span>
                                      )}
                                      <span className="min-w-[14px] text-right font-extrabold text-slate-900">
                                        {t.player1_sets}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-bold text-slate-400">-</span>
                                  )}
                                </div>
                              </div>
            
                              {/* Jugador 2 */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <CountryFlag countryCode={t.player2_country} />
                                  <span className="truncate text-xs font-semibold text-slate-800">
                                    {t.player2_name}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs">
                                  {hasScore ? (
                                    <>
                                      {t.player2_score && (
                                        <span className="text-[11px] tracking-tight text-slate-500">
                                          {t.player2_score}
                                        </span>
                                      )}
                                      <span className="min-w-[14px] text-right font-extrabold text-slate-900">
                                        {t.player2_sets}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-bold text-slate-400">-</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
          })
        )}
      </div>
    </section>
  );
}



