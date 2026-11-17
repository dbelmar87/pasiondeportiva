"use client";

export interface AvatarOption {
  id: string;
  label: string;
  category: "escudos" | "deportistas" | "personajes";
  bg?: string;
  accent?: string;
  badge?: string;
  imageUrl?: string;
}

export const FAN_AVATARS: AvatarOption[] = [
  // 1. Escudos / Camisetas
  { id: "escudo-roja", label: "La Roja", category: "escudos", bg: "bg-red-600", accent: "border-blue-700", badge: "🇨🇱" },
  { id: "escudo-albo", label: "Cacique", category: "escudos", bg: "bg-slate-900", accent: "border-white", badge: "🏴🏳️" },
  { id: "escudo-chuncho", label: "Romántico Viajero", category: "escudos", bg: "bg-blue-700", accent: "border-red-500", badge: "🦉" },
  { id: "escudo-cruzado", label: "Cruzado", category: "escudos", bg: "bg-sky-600", accent: "border-white", badge: "🛡️" },
  { id: "escudo-cobre", label: "Minero", category: "escudos", bg: "bg-orange-600", accent: "border-slate-900", badge: "⛏️" },
  { id: "escudo-atp", label: "Tenis ATP", category: "escudos", bg: "bg-emerald-600", accent: "border-lime-300", badge: "🎾" },

  // 2. Deportistas / Estilo Pro
  { id: "dep-goleador", label: "El 9 Goleador", category: "deportistas", imageUrl: "https://dicebear.com" },
  { id: "dep-arquero", label: "Muralla", category: "deportistas", imageUrl: "https://dicebear.com" },
  { id: "dep-tenista", label: "Ace en Arcilla", category: "deportistas", imageUrl: "https://dicebear.com" },
  { id: "dep-capitan", label: "Capitán", category: "deportistas", imageUrl: "https://dicebear.com" },
  { id: "dep-dt", label: "Estratega DT", category: "deportistas", imageUrl: "https://dicebear.com" },
  { id: "dep-raqueta", label: "Saque y Red", category: "deportistas", imageUrl: "https://dicebear.com" },

  // 3. Personajes Animados / Caricaturas
  { id: "char-hero", label: "Súper Hincha", category: "personajes", imageUrl: "https://dicebear.com" },
  { id: "char-robot", label: "VarBot 3000", category: "personajes", imageUrl: "https://dicebear.com" },
  { id: "char-ninja", label: "Crack Ninja", category: "personajes", imageUrl: "https://dicebear.com" },
  { id: "char-toon", label: "Animado 10", category: "personajes", imageUrl: "https://dicebear.com" },
  { id: "char-cyber", label: "Cyber Gol", category: "personajes", imageUrl: "https://dicebear.com" },
  { id: "char-legend", label: "Leyenda Toon", category: "personajes", imageUrl: "https://dicebear.com" },
];

export function FanAvatar({
  avatarId,
  nickname = "PD",
  size = "md",
}: {
  avatarId?: string | null;
  nickname?: string;
  size?: "sm" | "md" | "lg";
}) {
  const avatar = FAN_AVATARS.find((a) => a.id === avatarId) || FAN_AVATARS[0];

  const sizeClasses = {
    sm: "h-10 w-10 text-lg",
    md: "h-16 w-16 text-2xl",
    lg: "h-24 w-24 text-4xl",
  }[size];

  if (avatar.imageUrl) {
    return (
      <div
        className={`${sizeClasses} shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-slate-100 shadow-sm`}
      >
        <img
          src={avatar.imageUrl}
          alt={nickname}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} ${avatar.bg || "bg-red-600"} ${
        avatar.accent || "border-white"
      } flex shrink-0 flex-col items-center justify-center rounded-2xl border-2 font-black text-white shadow-sm`}
    >
      <span>{avatar.badge || nickname.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}
