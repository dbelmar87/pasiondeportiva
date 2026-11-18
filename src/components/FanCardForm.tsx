"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import TeamAutocomplete from "./TeamAutocomplete";
import { FAN_AVATARS, FanAvatar } from "./FanAvatar";

export interface FanProfileData {
  id: string;
  nickname: string;
  avatar_id?: string | null;
  favorite_teams: string[];
  favorite_player: string;
  memorable_match: string;
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
    initialData?.avatar_id || "escudo-roja"
  );
  const [avatarTab, setAvatarTab] = useState<
    "escudos" | "deportistas" | "personajes"
  >("escudos");

  const [favoriteTeams, setFavoriteTeams] = useState<string[]>(
    initialData?.favorite_teams?.filter(Boolean) || []
  );
  const [teamQuery, setTeamQuery] = useState("");

  const [favoritePlayer, setFavoritePlayer] = useState(
    initialData?.favorite_player || ""
  );
  const [memorableMatch, setMemorableMatch] = useState(
    initialData?.memorable_match || ""
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

    // Si dejó un equipo escrito en el input sin apretar "Agregar", lo incluimos
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
      memorable_match: memorableMatch.trim(),
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

  const filteredAvatars = FAN_AVATARS.filter((a) => a.category === avatarTab);

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-4">
        <FanAvatar avatarId={avatarId} nickname={nickname || "PD"} size="lg" />
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            {initialData ? "Editar Perfil de Hincha" : "Crea tu Carnet de Hincha"}
          </h2>
          <p className="text-sm text-slate-600">
            Elige tu avatar, tus camisetas y personaliza tus alertas.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Selector de Avatar sin subir fotos */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Elige tu Avatar de Perfil
            </label>
            <div className="flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-bold">
              {(
                [
                  { key: "escudos", label: "🛡️ Escudos" },
                  { key: "deportistas", label: "⚽ Deportistas" },
                  { key: "personajes", label: "🎬 Personajes" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAvatarTab(tab.key)}
                  className={`rounded-md px-2.5 py-1 transition ${
                    avatarTab === tab.key
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {filteredAvatars.map((item) => {
              const selected = avatarId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAvatarId(item.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 text-center transition ${
                    selected
                      ? "border-red-600 bg-red-50/60 shadow-sm"
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
                  <span>{team}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTeam(team)}
                    aria-label={`Quitar ${team}`}
                    className="ml-0.5 rounded-full px-1 text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {favoriteTeams.length < MAX_TEAMS && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <TeamAutocomplete
                  label=""
                  placeholder="Busca Colo-Colo, U. de Chile, Real Madrid..."
                  type="team"
                  value={teamQuery}
                  onChange={setTeamQuery}
                />
              </div>
              <button
                type="button"
                onClick={() => handleAddTeam()}
                disabled={!teamQuery.trim()}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                + Agregar equipo
              </button>
            </div>
          )}
                    <p className="mt-2 text-[11px] text-slate-500">
            El primer equipo será tu camiseta principal en el Carnet Digital. Todos aparecerán en tu feed y marcadores.
          </p>
        </div>

        {/* 4. Jugador o Tenista */}
        <div>
          <TeamAutocomplete
            label="4. Tu Jugador o Tenista Favorito"
            placeholder="Busca Tabilo, Alexis, Alcaraz..."
            type="player"
            value={favoritePlayer}
            onChange={setFavoritePlayer}
          />
        </div>

        {/* 5. Partido memorable */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            5. El partido que más recuerdas
          </label>
          <input
            type="text"
            maxLength={120}
            value={memorableMatch}
            onChange={(e) => setMemorableMatch(e.target.value)}
            placeholder="Ej: Final Copa América 2015 en el Nacional"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>

        {/* 6. Preferencias de Notificaciones */}
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
            6. Notificaciones Inteligentes
          </p>

          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm text-slate-700">
              Avisarme cuando haya <strong>noticias nuevas</strong> de mis favoritos
            </span>
            <input
              type="checkbox"
              checked={notifyNews}
              onChange={(e) => setNotifyNews(e.target.checked)}
              className="h-5 w-5 accent-red-600"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm text-slate-700">
              Alertas de <strong>marcador en vivo</strong> y partidos clave
            </span>
            <input
              type="checkbox"
              checked={notifyLiveScores}
              onChange={(e) => setNotifyLiveScores(e.target.checked)}
              className="h-5 w-5 accent-red-600"
            />
          </label>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Carnet"}
          </button>
        </div>
      </form>
    </div>
  );
}
