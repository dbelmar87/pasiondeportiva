"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { TRACKED_LEAGUES, TeamStanding } from "@/lib/espnStandings";

interface LeagueStandingsRow {
  slug: string;
  label: string;
  flag: string;
  teams: TeamStanding[];
  updated_at: string;
}

export default function StandingsWidget() {
  const [leagues, setLeagues] = useState<LeagueStandingsRow[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>("chi.1");
  const [expanded, setExpanded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchStandings() {
      const { data, error } = await supabase
        .from("league_standings")
        .select("slug, label, flag, teams, updated_at");

      if (!error && data && data.length > 0) {
        const orderMap = new Map(TRACKED_LEAGUES.map((l, idx) => [l.slug, idx]));
        const sorted = (data as LeagueStandingsRow[]).sort(
          (a, b) => (orderMap.get(a.slug) ?? 99) - (orderMap.get(b.slug) ?? 99)
        );
        setLeagues(sorted);
        setActiveSlug(sorted[0].slug);
      }
      setLoading(false);
    }

    fetchStandings();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 animate-pulse space-y-3">
        <div className="h-5 w-40 bg-slate-800 rounded" />
        <div className="flex gap-2">
          <div className="h-7 w-16 bg-slate-800 rounded-full" />
          <div className="h-7 w-16 bg-slate-800 rounded-full" />
          <div className="h-7 w-16 bg-slate-800 rounded-full" />
        </div>
        <div className="space-y-2 pt-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-800/70 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (leagues.length === 0) return null;

  const currentLeague =
    leagues.find((l) => l.slug === activeSlug) || leagues[0];
  const visibleTeams = expanded
    ? currentLeague.teams
    : currentLeague.teams.slice(0, 8);

  return (
    <section className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
      {/* Cabecera y Pestañas */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Tablas de Posiciones
          </h2>
          <span className="text-[11px] font-medium text-slate-400">
            Temporada actual
          </span>
        </div>

        {/* Pestañas deslizables por liga */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {leagues.map((league) => {
            const isActive = league.slug === activeSlug;
            return (
              <button
                key={league.slug}
                onClick={() => {
                  setActiveSlug(league.slug);
                  setExpanded(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-950"
                    : "bg-slate-800/90 text-slate-300 hover:bg-slate-700/80 hover:text-white"
                }`}
              >
                <span>{league.flag}</span>
                <span>{league.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla compacta */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[11px] uppercase text-slate-400 border-b border-slate-800/80 bg-slate-950/40">
              <th className="py-2.5 pl-4 pr-1 w-8">#</th>
              <th className="py-2.5 px-2">Club</th>
              <th className="py-2.5 px-1.5 text-center">PJ</th>
              <th className="py-2.5 px-1.5 text-center">DG</th>
              <th className="py-2.5 pl-1.5 pr-4 text-right font-bold text-slate-200">
                Pts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-xs">
            {visibleTeams.map((team) => {
              const isTop = team.rank <= 4;
              const isBottom =
              !["uefa.champions", "uefa.europa", "uefa.europa.conf"].includes(currentLeague.slug) &&
              team.rank >= currentLeague.teams.length - 1;

              return (
                <tr
                  key={team.teamId}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 pl-4 pr-1 relative font-semibold text-slate-400">
                    <span
                      className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${
                        isTop
                          ? "bg-emerald-500"
                          : isBottom
                          ? "bg-rose-500"
                          : "bg-transparent"
                      }`}
                    />
                    {team.rank}
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      {team.logo && (
                        <img
                          src={team.logo}
                          alt={team.shortName}
                          className="w-5 h-5 object-contain shrink-0"
                          loading="lazy"
                        />
                      )}
                      <span className="font-medium text-slate-100 truncate max-w-[140px]">
                        {team.shortName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-1.5 text-center text-slate-400">
                    {team.played}
                  </td>
                  <td
                    className={`py-2.5 px-1.5 text-center font-medium ${
                      team.goalDiff > 0
                        ? "text-emerald-400"
                        : team.goalDiff < 0
                        ? "text-rose-400"
                        : "text-slate-500"
                    }`}
                  >
                    {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                  </td>
                  <td className="py-2.5 pl-1.5 pr-4 text-right font-bold text-white">
                    {team.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Botón expandir / colapsar */}
      {currentLeague.teams.length > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2.5 text-xs font-semibold text-emerald-400 hover:bg-slate-800/60 border-t border-slate-800/80 transition-colors cursor-pointer"
        >
          {expanded
            ? "Ver menos ↑"
            : `Ver tabla completa (${currentLeague.teams.length}) ↓`}
        </button>
      )}
    </section>
  );
}
