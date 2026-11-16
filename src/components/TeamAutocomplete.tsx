"use client";

import { useState, useEffect, useRef } from "react";

interface Suggestion {
  name: string;
  subtitle: string;
}

interface TeamAutocompleteProps {
  label: string;
  placeholder: string;
  type: "team" | "player";
  value: string;
  onChange: (value: string) => void;
}

// Lista local instantánea (0ms de espera para los más buscados en Chile)
const POPULAR_TEAMS: Suggestion[] = [
  { name: "Colo-Colo", subtitle: "Fútbol • Chile" },
  { name: "Universidad de Chile", subtitle: "Fútbol • Chile" },
  { name: "Universidad Católica", subtitle: "Fútbol • Chile" },
  { name: "Selección Chilena (La Roja)", subtitle: "Selección • Chile" },
  { name: "Cobreloa", subtitle: "Fútbol • Chile" },
  { name: "Unión Española", subtitle: "Fútbol • Chile" },
  { name: "Palestino", subtitle: "Fútbol • Chile" },
  { name: "Huachipato", subtitle: "Fútbol • Chile" },
  { name: "Deportes Concepción", subtitle: "Fútbol • Chile" },
  { name: "Santiago Wanderers", subtitle: "Fútbol • Chile" },
  { name: "Everton de Viña del Mar", subtitle: "Fútbol • Chile" },
  { name: "Coquimbo Unido", subtitle: "Fútbol • Chile" },
  { name: "Cobresal", subtitle: "Fútbol • Chile" },
  { name: "Ñublense", subtitle: "Fútbol • Chile" },
  { name: "Real Madrid", subtitle: "LaLiga • España" },
  { name: "FC Barcelona", subtitle: "LaLiga • España" },
  { name: "Atlético de Madrid", subtitle: "LaLiga • España" },
  { name: "Manchester City", subtitle: "Premier League • Inglaterra" },
  { name: "Liverpool FC", subtitle: "Premier League • Inglaterra" },
  { name: "Arsenal FC", subtitle: "Premier League • Inglaterra" },
  { name: "Manchester United", subtitle: "Premier League • Inglaterra" },
  { name: "Bayern Múnich", subtitle: "Bundesliga • Alemania" },
  { name: "Inter de Milán", subtitle: "Serie A • Italia" },
  { name: "Boca Juniors", subtitle: "Liga Profesional • Argentina" },
  { name: "River Plate", subtitle: "Liga Profesional • Argentina" },
  { name: "Inter Miami CF", subtitle: "MLS • Estados Unidos" },
];

const POPULAR_PLAYERS: Suggestion[] = [
  { name: "Alejandro Tabilo", subtitle: "Tenis • ATP Tour" },
  { name: "Nicolás Jarry", subtitle: "Tenis • ATP Tour" },
  { name: "Cristian Garin", subtitle: "Tenis • ATP Tour" },
  { name: "Tomás Barrios", subtitle: "Tenis • ATP Tour" },
  { name: "Alexis Sánchez", subtitle: "Fútbol • Chile" },
  { name: "Arturo Vidal", subtitle: "Fútbol • Chile" },
  { name: "Ben Brereton Díaz", subtitle: "Fútbol • Chile" },
  { name: "Darío Osorio", subtitle: "Fútbol • Chile" },
  { name: "Carlos Alcaraz", subtitle: "Tenis • ATP Tour" },
  { name: "Jannik Sinner", subtitle: "Tenis • ATP Tour" },
  { name: "Novak Djokovic", subtitle: "Tenis • ATP Tour" },
  { name: "Lamine Yamal", subtitle: "Fútbol • FC Barcelona" },
  { name: "Kylian Mbappé", subtitle: "Fútbol • Real Madrid" },
  { name: "Lionel Messi", subtitle: "Fútbol • Inter Miami" },
];

export default function TeamAutocomplete({
  label,
  placeholder,
  type,
  value,
  onChange,
}: TeamAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Cerrar desplegable al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Búsqueda híbrida: primero filtra lista local y luego consulta TheSportsDB API
  useEffect(() => {
    const cleanQuery = query.trim().toLowerCase();
    const baseList = type === "team" ? POPULAR_TEAMS : POPULAR_PLAYERS;

    if (!cleanQuery) {
      setResults(baseList.slice(0, 6));
      return;
    }

    const localMatches = baseList.filter((item) =>
      item.name.toLowerCase().includes(cleanQuery)
    );
    setResults(localMatches.slice(0, 6));

    if (cleanQuery.length < 3) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const endpoint =
          type === "team"
            ? `https://thesportsdb.com{encodeURIComponent(cleanQuery)}`
            : `https://thesportsdb.com{encodeURIComponent(cleanQuery)}`;

        const res = await fetch(endpoint);
        const data = await res.json();

        const apiItems: Suggestion[] =
          type === "team"
            ? (data.teams || []).slice(0, 5).map((t: { strTeam: string; strLeague?: string; strCountry?: string }) => ({
                name: t.strTeam,
                subtitle: `${t.strLeague || "Club"} • ${t.strCountry || ""}`,
              }))
            : (data.player || []).slice(0, 5).map((p: { strPlayer: string; strSport?: string; strTeam?: string }) => ({
                name: p.strPlayer,
                subtitle: `${p.strSport || "Deportista"} • ${p.strTeam || ""}`,
              }));

        // Combinar resultados locales y de la API sin duplicados
        const merged = [...localMatches];
        for (const apiItem of apiItems) {
          if (!merged.some((m) => m.name.toLowerCase() === apiItem.name.toLowerCase())) {
            merged.push(apiItem);
          }
        }
        setResults(merged.slice(0, 7));
      } catch {
        // Si la API externa demora, mantenemos los resultados locales
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, type]);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-xs font-bold text-slate-700">{label}</label>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-red-500 focus:outline-none"
      />

      {isOpen && (results.length > 0 || loading) && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading && (
            <div className="px-3.5 py-2 text-xs text-slate-400">
              Buscando en base mundial...
            </div>
          )}
          {results.map((item, idx) => (
            <button
              key={`${item.name}-${idx}`}
              type="button"
              onClick={() => {
                setQuery(item.name);
                onChange(item.name);
                setIsOpen(false);
              }}
              className="flex w-full flex-col border-b border-slate-100 px-3.5 py-2.5 text-left transition last:border-none hover:bg-slate-50"
            >
              <span className="text-sm font-bold text-slate-900">{item.name}</span>
              <span className="text-[11px] text-slate-500">{item.subtitle}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
