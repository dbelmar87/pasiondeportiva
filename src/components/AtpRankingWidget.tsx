"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";

export interface AtpPlayerRank {
  player_name: string;
  rank: number;
  country: string;
  points?: number | null;
  is_chilean: boolean;
  avatar_url?: string | null;
}

const COUNTRY_FLAGS: Record<string, string> = {
  CHI: "🇨🇱",
  ITA: "🇮🇹",
  GER: "🇩🇪",
  ESP: "🇪🇸",
  SRB: "🇷🇸",
  USA: "🇺🇸",
  RUS: "🇷🇺",
  NOR: "🇳🇴",
  AUS: "🇦🇺",
  BUL: "🇧🇬",
  GBR: "🇬🇧",
  FRA: "🇫🇷",
  ARG: "🇦🇷",
};

export default function AtpRankingWidget({
  players: initialPlayers = [],
}: {
  players?: AtpPlayerRank[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [players, setPlayers] = useState<AtpPlayerRank[]>(initialPlayers);
  const [loading, setLoading] = useState(initialPlayers.length === 0);
  const [tab, setTab] = useState<"chile" | "top10">("chile");

  useEffect(() => {
    let isMounted = true;

    async function fetchRankings() {
      const { data, error } = await supabase
        .from("atp_rankings")
        .select("*")
        .order("rank", { ascending: true });

      if (isMounted) {
        if (!error && data) {
          setPlayers(data as AtpPlayerRank[]);
        }
        setLoading(false);
      }
    }

    fetchRankings();
  }, [supabase]);

  const filtered = players
    .filter((p) => (tab === "chile" ? p.is_chilean : p.rank <= 10))
    .sort((a, b) => a.rank - b.rank);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm tracking-wide uppercase text-emerald-400">
          Circuito ATP en Vivo
        </h3>
      </div>

      {/* Pestañas */}
      <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg mb-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab("chile")}
          className={`py-1.5 rounded-md transition ${
            tab === "chile"
              ? "bg-emerald-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          🇨🇱 Chilenos ATP
        </button>
        <button
          type="button"
          onClick={() => setTab("top10")}
          className={`py-1.5 rounded-md transition ${
            tab === "top10"
              ? "bg-emerald-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          ⭐ Top 10 Mundial
        </button>
      </div>

      {/* Lista de jugadores */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Cargando ranking ATP...
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Sin datos cargados aún.
          </p>
        ) : (
          filtered.map((player) => {
            const initials = (player.player_name || "ATP")
              .split(" ")
              .map((n) => n)
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={`${player.rank}-${player.player_name}`}
                className="flex items-center justify-between bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700/50"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-emerald-400 w-6">
                    #{player.rank}
                  </span>

                  {player.avatar_url ? (
                    <img
                      src={player.avatar_url}
                      alt={player.player_name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-600"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 border border-slate-600">
                      {initials}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold leading-tight">
                      {COUNTRY_FLAGS[player.country] || "🎾"}{" "}
                      {player.player_name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {typeof player.points === "number"
                        ? `${player.points.toLocaleString("es-CL")} pts`
                        : "Puntos por confirmar"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
