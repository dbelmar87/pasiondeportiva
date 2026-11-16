"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import TeamAutocomplete from "./TeamAutocomplete";

export interface FanProfileData {
  id: string;
  nickname: string;
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

export default function FanCardForm({
  userId,
  initialData,
  onSaved,
  onCancel,
}: FanCardFormProps) {
  const supabase = createClient();

  const [nickname, setNickname] = useState(initialData?.nickname || "");
  const [favoriteTeam, setFavoriteTeam] = useState(
    initialData?.favorite_teams?.[0] || ""
  );
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      id: userId,
      nickname: nickname.trim(),
      favorite_teams: favoriteTeam ? [favoriteTeam.trim()] : [],
      favorite_player: favoritePlayer.trim(),
      memorable_match: memorableMatch.trim(),
      notify_news: notifyNews,
      notify_live_scores: notifyLiveScores,
    };

    const { error: upsertError } = await supabase
      .from("fan_profiles")
      .upsert(payload);

    if (upsertError) {
      setError("No se pudo guardar tu carnet. Intenta nuevamente.");
    } else {
      onSaved();
    }

    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="mb-1 text-2xl font-extrabold text-slate-900">
        {initialData ? "Edita tu Carnet de Hincha" : "Personaliza tu Carnet de Hincha"}
      </h2>
      <p className="mb-6 text-sm text-slate-600">
        Completa estos datos para activar tu voz en la comunidad y recibir alertas de tus favoritos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            1. Tu Apodo o Nickname en la comunidad *
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TeamAutocomplete
            label="2. Tu Equipo Favorito *"
            placeholder="Busca Colo-Colo, Real Madrid..."
            type="team"
            value={favoriteTeam}
            onChange={setFavoriteTeam}
          />

          <TeamAutocomplete
            label="3. Tu Jugador o Tenista Favorito"
            placeholder="Busca Tabilo, Alexis, Alcaraz..."
            type="player"
            value={favoritePlayer}
            onChange={setFavoritePlayer}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            4. El partido que más recuerdas
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

        {/* Preferencias de Notificaciones */}
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
            5. Notificaciones Inteligentes
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
          <p className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !nickname.trim() || !favoriteTeam.trim()}
            className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Guardando Carnet..." : "Guardar mi Carnet de Hincha"}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
