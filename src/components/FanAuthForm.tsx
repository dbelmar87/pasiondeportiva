"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

interface FanAuthFormProps {
  onSuccess: (userId: string) => void;
}

export default function FanAuthForm({ onSuccess }: FanAuthFormProps) {
  const supabase = createClient();
  const [isRegister, setIsRegister] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setError("");
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/hincha`,
      },
    });

    if (googleError) {
      setError("No se pudo conectar con Google. Intenta nuevamente.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isRegister) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
      } else if (data.user) {
        onSuccess(data.user.id);
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("Correo o contraseña incorrectos.");
      } else if (data.user) {
        onSuccess(data.user.id);
      }
    }

    setLoading(false);
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
      {/* Beneficios */}
      <div className="flex flex-col justify-center space-y-5 md:col-span-6">
        <span className="w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-700">
          Comunidad Pasión Deportiva
        </span>
        <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          Saca tu Carnet de Hincha y haz escuchar tu voz.
        </h1>
        <p className="text-base text-slate-600">
          Regístrate en 45 segundos para acceder a la comunidad verificada:
        </p>
        <ul className="space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-2.5">
            <span className="font-bold text-emerald-600">✓</span>
            <span>
              <strong>Opinión con criterio:</strong> Comenta noticias y participa en el chat en vivo con tu camiseta.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="font-bold text-emerald-600">✓</span>
            <span>
              <strong>Alertas de tu equipo y jugador:</strong> Notificaciones de noticias y marcadores en vivo.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="font-bold text-emerald-600">✓</span>
            <span>
              <strong>Insignia Verificada:</strong> Enlaza tus redes sociales al validar tu identidad.
            </span>
          </li>
        </ul>
      </div>

      {/* Caja de Login / Registro */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 md:col-span-6">
        <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
              isRegister ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Crear Cuenta Nueva
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
              !isRegister ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Ya tengo cuenta
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          Continuar con Google
        </button>

        <div className="relative mb-4 flex items-center justify-center">
          <div className="w-full border-t border-slate-200" />
          <span className="bg-white px-3 text-xs text-slate-400">o con cualquier correo</span>
          <div className="w-full border-t border-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hincha@correo.cl"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Contraseña (mínimo 6 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading
              ? "Procesando..."
              : isRegister
              ? "Continuar y crear mi Carnet →"
              : "Ingresar a mi Zona"}
          </button>
        </form>
      </div>
    </div>
  );
}
