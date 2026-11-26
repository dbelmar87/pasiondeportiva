"use client";

export interface AvatarOption {
  id: string;
  label: string;
  category: "escudos" | "deportistas" | "personajes";
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  design?:
    | "diagonal"
    | "vertical"
    | "split"
    | "solid"
    | "crown"
    | "football-ball"
    | "tennis-ball";
  diceStyle?: "avataaars" | "notionists" | "open-peeps" | "bottts";
  diceSeed?: string;
  diceBg?: string;
}

export const FAN_AVATARS: AvatarOption[] = [
  // 1. Escudos de Clubes (Chile + Europa) e Íconos de Fútbol y Tenis (16 opciones)
  { id: "escudo-roja", label: "La Roja", category: "escudos", primaryColor: "#dc2626", secondaryColor: "#1d4ed8", design: "split" },
  { id: "escudo-albo", label: "Cacique", category: "escudos", primaryColor: "#ffffff", secondaryColor: "#0f172a", design: "vertical" },
  { id: "escudo-chuncho", label: "Romántico Viajero", category: "escudos", primaryColor: "#1d4ed8", secondaryColor: "#ef4444", design: "solid" },
  { id: "escudo-cruzado", label: "Cruzado", category: "escudos", primaryColor: "#ffffff", secondaryColor: "#0284c7", design: "diagonal" },
  { id: "escudo-cobre", label: "Minero", category: "escudos", primaryColor: "#ea580c", secondaryColor: "#0f172a", design: "vertical" },
  { id: "escudo-hispanos", label: "Hispano", category: "escudos", primaryColor: "#dc2626", secondaryColor: "#facc15", design: "diagonal" },
  { id: "escudo-italico", label: "Itálico", category: "escudos", primaryColor: "#16a34a", secondaryColor: "#ffffff", design: "vertical" },
  { id: "escudo-palestino", label: "Árabe", category: "escudos", primaryColor: "#15803d", secondaryColor: "#dc2626", design: "vertical" },
  { id: "escudo-madrid", label: "Merengue", category: "escudos", primaryColor: "#ffffff", secondaryColor: "#eab308", accentColor: "#1e3a8a", design: "crown" },
  { id: "escudo-barca", label: "Blaugrana", category: "escudos", primaryColor: "#1e3a8a", secondaryColor: "#b91c1c", design: "vertical" },
  { id: "escudo-city", label: "Citizen", category: "escudos", primaryColor: "#38bdf8", secondaryColor: "#0f172a", design: "diagonal" },
  { id: "escudo-liverpool", label: "Red Anfield", category: "escudos", primaryColor: "#b91c1c", secondaryColor: "#facc15", design: "solid" },
  { id: "escudo-inter", label: "Nerazzurro", category: "escudos", primaryColor: "#1d4ed8", secondaryColor: "#0f172a", design: "vertical" },
  { id: "escudo-bayern", label: "Bávaro", category: "escudos", primaryColor: "#dc2626", secondaryColor: "#ffffff", design: "diagonal" },
  { id: "sport-futbol", label: "Balón Fútbol", category: "escudos", primaryColor: "#ffffff", secondaryColor: "#0f172a", design: "football-ball" },
  { id: "sport-tenis", label: "Tenis Pro", category: "escudos", primaryColor: "#bef264", secondaryColor: "#3f6212", design: "tennis-ball" },

  // 2. Deportistas / Estilo Pro
  { id: "dep-goleador", label: "El 9 Goleador", category: "deportistas", diceStyle: "avataaars", diceSeed: "Goleador9", diceBg: "b6e3f4" },
  { id: "dep-arquero", label: "Muralla", category: "deportistas", diceStyle: "avataaars", diceSeed: "MurallaGK", diceBg: "c0aede" },
  { id: "dep-tenista", label: "Ace en Arcilla", category: "deportistas", diceStyle: "avataaars", diceSeed: "AceArcilla", diceBg: "ffd5dc" },
  { id: "dep-capitan", label: "Capitán", category: "deportistas", diceStyle: "avataaars", diceSeed: "CapitanCL", diceBg: "d1d4f9" },
  { id: "dep-dt", label: "Estratega DT", category: "deportistas", diceStyle: "notionists", diceSeed: "EstrategaDT", diceBg: "ffdfbf" },
  { id: "dep-raqueta", label: "Saque y Red", category: "deportistas", diceStyle: "notionists", diceSeed: "SaqueRed", diceBg: "c0aede" },

  // 3. Personajes Animados / Caricaturas
  { id: "char-hero", label: "Súper Hincha", category: "personajes", diceStyle: "open-peeps", diceSeed: "SuperHincha", diceBg: "b6e3f4" },
  { id: "char-robot", label: "VarBot 3000", category: "personajes", diceStyle: "bottts", diceSeed: "VarBot3000", diceBg: "0f172a" },
  { id: "char-ninja", label: "Crack Ninja", category: "personajes", diceStyle: "open-peeps", diceSeed: "CrackNinja", diceBg: "ffd5dc" },
  { id: "char-toon", label: "Animado 10", category: "personajes", diceStyle: "open-peeps", diceSeed: "Animado10", diceBg: "d1d4f9" },
  { id: "char-cyber", label: "Cyber Gol", category: "personajes", diceStyle: "bottts", diceSeed: "CyberGol", diceBg: "1e293b" },
  { id: "char-legend", label: "Leyenda Toon", category: "personajes", diceStyle: "bottts", diceSeed: "LeyendaToon", diceBg: "064e3b" },
];

function CustomSportSvg({ avatar }: { avatar: AvatarOption }) {
  const p = avatar.primaryColor || "#dc2626";
  const s = avatar.secondaryColor || "#1d4ed8";

  if (avatar.design === "football-ball") {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full p-2">
        <circle cx="32" cy="32" r="24" fill={p} stroke={s} strokeWidth="3" />
        <polygon points="32,21 41,28 38,38 26,38 23,28" fill={s} />
        <line x1="32" y1="21" x2="32" y2="8" stroke={s} strokeWidth="2.5" />
        <line x1="41" y1="28" x2="54" y2="24" stroke={s} strokeWidth="2.5" />
        <line x1="38" y1="38" x2="46" y2="50" stroke={s} strokeWidth="2.5" />
        <line x1="26" y1="38" x2="18" y2="50" stroke={s} strokeWidth="2.5" />
        <line x1="23" y1="28" x2="10" y2="24" stroke={s} strokeWidth="2.5" />
      </svg>
    );
  }

  if (avatar.design === "tennis-ball") {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full p-2">
        <circle cx="32" cy="32" r="24" fill={p} stroke={s} strokeWidth="2.5" />
        <path d="M16 14 C28 24, 28 40, 16 50" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M48 14 C36 24, 36 40, 48 50" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className="h-full w-full p-1.5 drop-shadow-sm">
      <defs>
        <clipPath id={`shield-${avatar.id}`}>
          <path d="M32 4 L54 12 V30 C54 45 43 55 32 60 C21 55 10 45 10 30 V12 L32 4 Z" />
        </clipPath>
      </defs>

      <g clipPath={`url(#shield-${avatar.id})`}>
        <rect width="64" height="64" fill={p} />

        {avatar.design === "vertical" && (
          <>
            <rect x="20" y="0" width="8" height="64" fill={s} />
            <rect x="36" y="0" width="8" height="64" fill={s} />
          </>
        )}

        {avatar.design === "diagonal" && (
          <polygon points="0,20 64,34 64,48 0,34" fill={s} />
        )}

        {avatar.design === "split" && (
          <rect x="0" y="38" width="64" height="26" fill={s} />
        )}

        {avatar.design === "crown" && (
          <>
            <polygon points="0,18 64,32 64,44 0,30" fill={avatar.accentColor || "#1e3a8a"} />
            <polygon points="22,18 26,11 32,16 38,11 42,18" fill={s} />
          </>
        )}
      </g>

      <path
        d="M32 4 L54 12 V30 C54 45 43 55 32 60 C21 55 10 45 10 30 V12 L32 4 Z"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="2.5"
      />
    </svg>
  );
}

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
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  }[size];

  if (avatar.diceStyle && avatar.diceSeed) {
    const apiHost = ["api", "dicebear", "com"].join(".");
    const avatarSrc = `https://${apiHost}/9.x/${avatar.diceStyle}/svg?seed=${avatar.diceSeed}&backgroundColor=${avatar.diceBg || "b6e3f4"}`;

    return (
      <div
        className={`${sizeClasses} shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-slate-100 shadow-sm`}
      >
        <img
          src={avatarSrc}
          alt={nickname}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 shadow-sm`}
    >
      <CustomSportSvg avatar={avatar} />
    </div>
  );
}
