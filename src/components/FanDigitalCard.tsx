"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { FanProfileData } from "./FanCardForm";
import { FanAvatar } from "./FanAvatar";

interface FanDigitalCardProps {
  profile: FanProfileData;
  onEdit: () => void;
  onUpdated: () => void;
}

export default function FanDigitalCard({
  profile,
  onEdit,
  onUpdated,
}: FanDigitalCardProps) {
  const supabase = createClient();
  const [instagram, setInstagram] = useState(profile.instagram_handle || "");
  const [xHandle, setXHandle] = useState(profile.x_handle || "");
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestVerification(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    await supabase
      .from("fan_profiles")
      .update({
        instagram_handle: instagram.replace("@", "").trim(),
        x_handle: xHandle.replace("@", "").trim(),
        verification_status: "pending",
      })
      .eq("id", profile.id);

    setSubmitting(false);
    onUpdated();
  }

  return (
    <div className="space-y-6">
      {/* Tarjeta Visual del Hincha */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-red-600 px-2 py-0.5 text-xs font-black">
              PD
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
              Carnet Oficial
            </span>
          </div>

          {profile.verification_status === "verified" ? (
            <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-bold text-blue-300">
              ✓ Verificado
            </span>
          ) : (
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              ● Activo
            </span>
          )}
        </div>

        {/* Avatar + Identidad */}
        <div className="mb-5 flex items-center gap-4">
          <FanAvatar
            avatarId={profile.avatar_id}
            nickname={profile.nickname}
            size="md"
          />
          <div>
            <h2 className="text-xl font-black leading-tight sm:text-2xl">
              {profile.nickname}
            </h2>
            <p className="text-sm font-semibold text-red-400">
              Hincha de {profile.favorite_teams?.[0] || "Sin equipo"}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-slate-700/80 pt-4 text-xs">
          {profile.favorite_player && (
            <div className="flex justify-between">
              <span className="text-slate-400">Ídolo / Jugador:</span>
              <span className="font-bold">{profile.favorite_player}</span>
            </div>
          )}
        </div>

        {/* Redes Sociales desbloqueadas solo tras verificar identidad */}
        {profile.verification_status === "verified" && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-700/80 pt-4 text-xs">
            {profile.instagram_handle && (
              <span className="rounded-lg bg-white/10 px-2.5 py-1">
                IG: @{profile.instagram_handle}
              </span>
            )}
            {profile.x_handle && (
              <span className="rounded-lg bg-white/10 px-2.5 py-1">
                X: @{profile.x_handle}
              </span>
            )}
          </div>
        )}

        <button
          onClick={onEdit}
          className="mt-6 w-full rounded-xl bg-white/10 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
        >
          Cambiar avatar o editar carnet
        </button>
      </div>

      {/* Solicitud de Verificación para mostrar Redes Sociales */}
      {profile.verification_status !== "verified" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-bold text-slate-900">
            Desbloquea tus Redes Sociales
          </h3>
          <p className="mb-4 text-xs text-slate-600">
            Para evitar suplantaciones, los enlaces a tus redes se muestran al validar tu identidad real.
          </p>

          {profile.verification_status === "pending" ? (
            <div className="rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-800">
              Solicitud recibida. Tu perfil está en revisión para activar la insignia azul y tus redes.
            </div>
          ) : (
            <form onSubmit={handleRequestVerification} className="space-y-3">
              <input
                type="text"
                placeholder="Usuario de Instagram (sin @)"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                type="text"
                placeholder="Usuario de X / Twitter (sin @)"
                value={xHandle}
                onChange={(e) => setXHandle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                disabled={submitting || (!instagram.trim() && !xHandle.trim())}
                className="w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Enviando..." : "Solicitar Verificación de Identidad"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
