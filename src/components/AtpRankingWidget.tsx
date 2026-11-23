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

const ALPHA3_TO_ALPHA2: Record<string, string> = {
  CHI: "cl", CHL: "cl",
  ESP: "es", ITA: "it", GER: "de", DEU: "de",
  SRB: "rs", USA: "us", RUS: "ru", NOR: "no",
  AUS: "au", BUL: "bg", GBR: "gb", FRA: "fr",
  ARG: "ar", BRA: "br", CAN: "ca", GRE: "gr",
  POL: "pl", DEN: "dk", NED: "nl", SUI: "ch",
};

function getFlagUrl(countryCode?: string): string | null {
  if (!countryCode) return null;
  const upper = countryCode.trim().toUpperCase();
  const iso2 =
    ALPHA3_TO_ALPHA2[upper] || (upper.length === 2 ? upper.toLowerCase() : null);
  if (!iso2) return null;
  return ["https://", "flagcdn.com", "/w40/", iso2, ".png"].join("");
}

function PlayerAvatarWithFlag({
  name,
  avatarUrl,
  country,
}: {
  name: string;
  avatarUrl?: string | null;
  country: string;
}) {
  const [imgError, setImgError] = useState(false);
  const flagUrl = getFlagUrl(country);

  const initials = (name || "ATP")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative h-10 w-10 shrink-0">
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="h-10 w-10 rounded-full border-2 border-slate-700 bg-slate-800 object-cover object-top"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-800 text-xs font-extrabold text-emerald-400">
          {initials}
        </div>
      )}

      {/* Bandera pequeña superpuesta abajo a la derecha (estilo ATP Tour) */}
      {flagUrl && (
        <img
          src={flagUrl}
          alt={country}
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-5 rounded-[2px] border border-slate-950 object-cover shadow-sm"
        />
      )}
    </div>
  );
}

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

  const isChile = (country?: string) => {
    const code = (country || "").trim().toUpperCase();
    return code === "CHI" || code === "CHL";
  };

  const filtered = players
    .filter((p) => (tab === "chile" ? isChile(p.country) : p.rank <= 10))
    .sort((a, b) => a.rank - b.rank);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-white">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-400">
          Ranking ATP Oficial
        </h3>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Singles
        </span>
      </div>

      {/* Pestañas */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-950 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab("chile")}
          className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 transition ${
            tab === "chile"
              ? "bg-emerald-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <img
            src="https://flagcdn.com/w40/cl.png"
            alt="Chile"
            className="h-3 w-4 rounded-[2px] object-cover"
          />
          Chilenos ATP
        </button>
        <button
          type="button"
          onClick={() => setTab("top10")}
          className={`rounded-md py-1.5 transition ${
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
          <p className="py-4 text-center text-xs text-slate-400">
            Cargando ranking ATP...
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            Sin datos cargados aún.
          </p>
        ) : (
          filtered.map((player) => (
            <div
              key={`${player.rank}-${player.player_name}`}
              className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2 transition hover:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 text-xs font-extrabold text-emerald-400">
                  #{player.rank}
                </span>

                <PlayerAvatarWithFlag
                  name={player.player_name}
                  avatarUrl={player.avatar_url}
                  country={player.country}
                />

                <div>
                  <p className="text-xs font-bold leading-tight text-white">
                    {player.player_name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                    {player.country} •{" "}
                    {typeof player.points === "number"
                      ? `${player.points.toLocaleString("es-CL")} pts`
                      : "Puntos por confirmar"}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
