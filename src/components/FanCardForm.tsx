"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { FAN_AVATARS, FanAvatar } from "./FanAvatar";

export interface FanProfileData {
  id: string;
  nickname: string;
  avatar_id?: string | null;
  favorite_teams: string[];
  favorite_player: string;
  notify_news: boolean;
  notify_live_scores: boolean;
  instagram_handle?: string | null;
  x_handle?: string | null;
  verification_status?: "basic" | "pending" | "verified";
}

interface FanCardFormProps {
  userId: string;
  initialData?: FanProfileData | null;
  onSaved: () => void;
  onCancel?: () => void;
}

const MAX_TEAMS = 5;

export default function FanCardForm({
  userId,
  initialData,
  onSaved,
  onCancel,
}: FanCardFormProps) {
  const supabase = createClient();

  const [nickname, setNickname] = useState(initialData?.nickname || "");
  const [avatarId, setAvatarId] = useState(
    initialData?.avatar_id || "cl-roja"
  );
  const [avatarSearch, setAvatarSearch] = useState("");

  const [favoriteTeams, setFavoriteTeams] = useState<string[]>(
    initialData?.favorite_teams?.filter(Boolean) || []
  );
  const [teamQuery, setTeamQuery] = useState("");

  const [favoritePlayer, setFavoritePlayer] = useState(
    initialData?.favorite_player || ""
  );
  const [notifyNews, setNotifyNews] = useState(
    initialData?.notify_news ?? true
  );
  const [notifyLiveScores, setNotifyLiveScores] = useState(
    initialData?.notify_live_scores ?? true
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleAddTeam(selectedTeam?: string) {
    const clean = (selectedTeam ?? teamQuery).trim();
    if (!clean) return;

    const alreadyExists = favoriteTeams.some(
      (t) => t.toLowerCase() === clean.toLowerCase()
    );
    if (alreadyExists) {
      setTeamQuery("");
      return;
    }

    if (favoriteTeams.length >= MAX_TEAMS) {
      setError(`Puedes elegir hasta ${MAX_TEAMS} equipos favoritos.`);
      return;
    }

    setError("");
    setFavoriteTeams((prev) => [...prev, clean]);
    setTeamQuery("");
  }

  function handleRemoveTeam(teamToRemove: string) {
    setFavoriteTeams((prev) => prev.filter((t) => t !== teamToRemove));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let finalTeams = [...favoriteTeams];
    const pendingTeam = teamQuery.trim();
    if (
      pendingTeam &&
      finalTeams.length < MAX_TEAMS &&
      !finalTeams.some((t) => t.toLowerCase() === pendingTeam.toLowerCase())
    ) {
      finalTeams.push(pendingTeam);
    }

    if (finalTeams.length === 0) {
      setError("Agrega al menos un equipo favorito para crear tu Carnet.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "Tu sesión aún no está activa. Revisa si confirmaste tu correo o vuelve a iniciar sesión."
      );
      setSaving(false);
      return;
    }

    const payload = {
      id: user.id,
      nickname: nickname.trim(),
      avatar_id: avatarId,
      favorite_teams: finalTeams,
      favorite_player: favoritePlayer.trim(),
      notify_news: notifyNews,
      notify_live_scores: notifyLiveScores,
    };

    const { error: upsertError } = await supabase
      .from("fan_profiles")
      .upsert(payload, { onConflict: "id" });

    if (upsertError) {
      setError(`No se pudo guardar: ${upsertError.message}`);
    } else {
      onSaved();
    }

    setSaving(false);
  }

  const filteredAvatars = FAN_AVATARS.filter(
    (item) =>
      item.label.toLowerCase().includes(avatarSearch.toLowerCase()) ||
      (item.initials || "")
        .toLowerCase()
        .includes(avatarSearch.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-4">
        <FanAvatar avatarId={avatarId} nickname={nickname || "PD"} size="lg" />
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            {initialData ? "Editar Perfil de Hincha" : "Crea tu Carnet de Hincha"}
          </h2>
          <p className="text-sm text-slate-600">
            Elige tu escudo o deporte favorito, tus camisetas y personaliza tus alertas.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Selector único de Avatar */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Elige tu Escudo o Deporte Favorito
            </label>
            <input
              type="text"
              value={avatarSearch}
              onChange={(e) => setAvatarSearch(e.target.value)}
              placeholder="Buscar club o deporte (ej: Colo, RM, Tenis)..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-red-500 sm:w-64"
            />
          </div>

          <div className="grid max-h-64 grid-cols-3 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-6">
            {filteredAvatars.map((item) => {
              const selected = avatarId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAvatarId(item.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 text-center transition ${
                    selected
                      ? "border-red-600 bg-red-50/70 shadow-sm"
                      : "border-transparent bg-white hover:border-slate-300"
                  }`}
                >
                  <FanAvatar avatarId={item.id} size="sm" />
                  <span className="line-clamp-1 text-[10px] font-bold text-slate-700">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Apodo */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            2. Tu Apodo o Nickname en la comunidad *
          </label>
          <input
            type="text"
            required
            maxLength={30}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ej: El Tobi de Macul, TenisYAsado..."
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>

        {/* 3. Múltiples Equipos Favoritos */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              3. Tus Equipos Favoritos * (máx. {MAX_TEAMS})
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {favoriteTeams.length}/{MAX_TEAMS}
            </span>
          </div>

          {favoriteTeams.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {favoriteTeams.map((team, idx) => (
                <span
                  key={team}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white"
                >
                  {idx === 0 && (
                    <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] uppercase">
                      Principal
                    </span>
                  )}
                  {team}
                  <button
                    type="button"
                    onClick={() => handleRemoveTeam(team)}
                    className="ml-1 text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

{favoriteTeams.length < MAX_TEAMS && (
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  list="popular-teams-list"
                  value={teamQuery}
                  onChange={(e) => setTeamQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTeam();
                    }
                  }}
                  placeholder="Busca tu equipo (ej. Colo-Colo, Real Madrid...)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-red-500"
                />
                <datalist id="popular-teams-list">
                  <option value="Selección Chilena" />
                  <option value="Colo-Colo" />
                  <option value="Universidad de Chile" />
                  <option value="Universidad Católica" />
                  <option value="Coquimbo Unido" />
                  <option value="Palestino" />
                  <option value="Everton" />
                  <option value="Unión Española" />
                  <option value="Deportes Iquique" />
                  <option value="Ñublense" />
                  <option value="Audax Italiano" />
                  <option value="O'Higgins" />
                  <option value="Huachipato" />
                  <option value="Cobresal" />
                  <option value="Unión La Calera" />
                  <option value="Deportes La Serena" />
                  <option value="Deportes Limache" />
                  <option value="Real Madrid" />
                  <option value="FC Barcelona" />
                  <option value="Atlético Madrid" />
                  <option value="Real Betis" />
                  <option value="Sevilla FC" />
                  <option value="Manchester City" />
                  <option value="Manchester United" />
                  <option value="Liverpool" />
                  <option value="Arsenal" />
                  <option value="Chelsea" />
                  <option value="Tottenham" />
                  <option value="Brighton" />
                  <option value="Bayern Múnich" />
                  <option value="Borussia Dortmund" />
                  <option value="Bayer Leverkusen" />
                  <option value="Inter de Milán" />
                  <option value="AC Milan" />
                  <option value="Juventus" />
                  <option value="Napoli" />
                  <option value="AS Roma" />
                  <option value="Udinese" />
                  <option value="Torino" />
                  <option value="Paris Saint-Germain" />
                  <option value="Midtjylland" />
                  <option value="Boca Juniors" />
                  <option value="River Plate" />
                  <option value="Flamengo" />
                  <option value="Al-Nassr" />
                  <option value="Inter Miami" />
                </datalist>
              </div>
              <button
                type="button"
                onClick={() => handleAddTeam()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Agregar
              </button>
            </div>
          )}
        </div>

        {/* 4. Ídolo / Jugador */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            4. Tu Jugador o Tenista Favorito
          </label>
          <input
            type="text"
            maxLength={50}
            value={favoritePlayer}
            onChange={(e) => setFavoritePlayer(e.target.value)}
            placeholder="Ej: Alexis Sánchez, Carlos Alcaraz, Alejandro Tabilo..."
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>

        {/* 5. Preferencias de Notificaciones */}
        <div className="space-y-2 rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
            5. Alertas y Notificaciones
          </p>
          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={notifyNews}
              onChange={(e) => setNotifyNews(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-red-600"
            />
            Avisarme cuando publiquen noticias de mis equipos o jugadores
          </label>
          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={notifyLiveScores}
              onChange={(e) => setNotifyLiveScores(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-red-600"
            />
            Notificarme marcadores finales de mis equipos favoritos
          </label>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Carnet Oficial"}
          </button>
        </div>
      </form>
    </div>
  );
}

          