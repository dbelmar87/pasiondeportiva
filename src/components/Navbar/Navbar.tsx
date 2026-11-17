"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import NotificationBell from "../NotificationBell";

const NAV_LINKS = [
  { label: "Portada", href: "/" },
  { label: "Chilenos por el Mundo", href: "/?section=chilenos" },
  { label: "Tenis ATP", href: "/?sport=tennis" },
  { label: "Superestrellas", href: "/?section=superestrellas" },
];

// 1. Subcomponente que lee la URL dentro de Suspense
function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return <>{children}</>;
}

// 2. Contenido visual e interactivo del Navbar (prerenderizable)
function NavbarContent() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fanLabel, setFanLabel] = useState<string | null>(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    async function checkFanSession() {
      const {
        data: { session },
      } = await supabase!.auth.getSession();

      if (!session?.user) {
        setFanLabel(null);
        return;
      }

      const { data: profile } = await supabase!
        .from("fan_profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      const name =
        profile?.display_name ||
        profile?.full_name ||
        session.user.user_metadata?.full_name ||
        session.user.email?.split("@")[0];

      setFanLabel(name || "Mi Carnet");
    }

    checkFanSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkFanSession();
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-sm font-black tracking-tighter text-white shadow-sm">
            PD
          </span>
          <div className="flex flex-col">
            <span className="text-base font-black leading-none tracking-tight text-slate-900">
              Pasión Deportiva
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-600">
              100% Sin Humo
            </span>
          </div>
        </Link>

        {/* Navegación Desktop */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-semibold text-slate-700 transition hover:text-red-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Acciones Derecha: Campana + Zona del Hincha */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <NotificationBell />

          <Link
            href="/hincha"
            className="flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-600 sm:px-4 sm:text-sm"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="max-w-[120px] truncate">
              {fanLabel ? fanLabel : "Zona del Hincha"}
            </span>
          </Link>

          {/* Botón menú móvil */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir menú"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
          >
            <svg
              xmlns="http://w3.org"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menú desplegable Móvil */}
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col space-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-red-600"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

// 3. Exportación principal con Suspense
export default function Navbar() {
  return (
    <Suspense fallback={<NavbarContent />}>
      <AdminRouteGuard>
        <NavbarContent />
      </AdminRouteGuard>
    </Suspense>
  );
}
