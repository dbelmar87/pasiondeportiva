"use client";

export interface AvatarOption {
  id: string;
  label: string;
  initials?: string;
  primaryColor: string;
  secondaryColor: string;
  textColor?: string;
  sportIcon?: string;
}

export const FAN_AVATARS: AvatarOption[] = [
  // Selección Nacional
  { id: "cl-roja", label: "La Roja", initials: "CL", primaryColor: "#dc2626", secondaryColor: "#1d4ed8", textColor: "#ffffff" },

  // Liga Chilena (Primera División)
  { id: "cl-cc", label: "Colo-Colo", initials: "CC", primaryColor: "#ffffff", secondaryColor: "#0f172a", textColor: "#0f172a" },
  { id: "cl-uch", label: "U. de Chile", initials: "UCH", primaryColor: "#1d4ed8", secondaryColor: "#ef4444", textColor: "#ffffff" },
  { id: "cl-uc", label: "U. Católica", initials: "UC", primaryColor: "#ffffff", secondaryColor: "#0284c7", textColor: "#0284c7" },
  { id: "cl-coq", label: "Coquimbo Unido", initials: "COQ", primaryColor: "#facc15", secondaryColor: "#0f172a", textColor: "#0f172a" },
  { id: "cl-pal", label: "Palestino", initials: "PAL", primaryColor: "#15803d", secondaryColor: "#dc2626", textColor: "#ffffff" },
  { id: "cl-eve", label: "Everton", initials: "EVE", primaryColor: "#1e3a8a", secondaryColor: "#facc15", textColor: "#facc15" },
  { id: "cl-ue", label: "Unión Española", initials: "UE", primaryColor: "#dc2626", secondaryColor: "#facc15", textColor: "#facc15" },
  { id: "cl-iqu", label: "Dep. Iquique", initials: "CDI", primaryColor: "#38bdf8", secondaryColor: "#0f172a", textColor: "#0f172a" },
  { id: "cl-nub", label: "Ñublense", initials: "ÑUB", primaryColor: "#dc2626", secondaryColor: "#0f172a", textColor: "#ffffff" },
  { id: "cl-aud", label: "Audax Italiano", initials: "AUD", primaryColor: "#16a34a", secondaryColor: "#dc2626", textColor: "#ffffff" },
  { id: "cl-ohi", label: "O'Higgins", initials: "OHI", primaryColor: "#0ea5e9", secondaryColor: "#ffffff", textColor: "#ffffff" },
  { id: "cl-hua", label: "Huachipato", initials: "HUA", primaryColor: "#1d4ed8", secondaryColor: "#0f172a", textColor: "#ffffff" },
  { id: "cl-cob", label: "Cobresal", initials: "CSL", primaryColor: "#ea580c", secondaryColor: "#15803d", textColor: "#ffffff" },
  { id: "cl-ulc", label: "U. La Calera", initials: "ULC", primaryColor: "#dc2626", secondaryColor: "#ffffff", textColor: "#ffffff" },
  { id: "cl-ser", label: "Dep. La Serena", initials: "DLS", primaryColor: "#991b1b", secondaryColor: "#ffffff", textColor: "#ffffff" },
  { id: "cl-lim", label: "Dep. Limache", initials: "CDL", primaryColor: "#dc2626", secondaryColor: "#0f172a", textColor: "#ffffff" },

  // Grandes Ligas de Europa y Destacados Mundiales
  { id: "eu-rm", label: "Real Madrid", initials: "RM", primaryColor: "#ffffff", secondaryColor: "#eab308", textColor: "#1e3a8a" },
  { id: "eu-fcb", label: "FC Barcelona", initials: "FCB", primaryColor: "#1e3a8a", secondaryColor: "#b91c1c", textColor: "#facc15" },
  { id: "eu-atm", label: "Atlético Madrid", initials: "ATM", primaryColor: "#dc2626", secondaryColor: "#ffffff", textColor: "#1e3a8a" },
  { id: "eu-bet", label: "Real Betis", initials: "BET", primaryColor: "#16a34a", secondaryColor: "#ffffff", textColor: "#ffffff" },
  { id: "eu-sev", label: "Sevilla FC", initials: "SEV", primaryColor: "#ffffff", secondaryColor: "#dc2626", textColor: "#dc2626" },
  { id: "eu-mci", label: "Manchester City", initials: "MCI", primaryColor: "#38bdf8", secondaryColor: "#1e3a8a", textColor: "#0f172a" },
  { id: "eu-mun", label: "Manchester Utd", initials: "MUN", primaryColor: "#dc2626", secondaryColor: "#facc15", textColor: "#ffffff" },
  { id: "eu-liv", label: "Liverpool", initials: "LIV", primaryColor: "#b91c1c", secondaryColor: "#facc15", textColor: "#ffffff" },
  { id: "eu-ars", label: "Arsenal", initials: "ARS", primaryColor: "#dc2626", secondaryColor: "#ffffff", textColor: "#ffffff" },
  { id: "eu-che", label: "Chelsea", initials: "CHE", primaryColor: "#1d4ed8", secondaryColor: "#ffffff", textColor: "#ffffff" },
  { id: "eu-tot", label: "Tottenham", initials: "TOT", primaryColor: "#ffffff", secondaryColor: "#0f172a", textColor: "#0f172a" },
  { id: "eu-bha", label: "Brighton", initials: "BHA", primaryColor: "#0284c7", secondaryColor: "#ffffff", textColor: "#ffffff" },
  { id: "eu-bay", label: "Bayern Múnich", initials: "BAY", primaryColor: "#dc2626", secondaryColor: "#1d4ed8", textColor: "#ffffff" },
  { id: "eu-bvb", label: "B. Dortmund", initials: "BVB", primaryColor: "#facc15", secondaryColor: "#0f172a", textColor: "#0f172a" },
  { id: "eu-b04", label: "B. Leverkusen", initials: "B04", primaryColor: "#0f172a", secondaryColor: "#dc2626", textColor: "#ffffff" },
  { id: "eu-int", label: "Inter de Milán", initials: "INT", primaryColor: "#1d4ed8", secondaryColor: "#0f172a", textColor: "#ffffff" },
  { id: "eu-mil", label: "AC Milan", initials: "ACM", primaryColor: "#dc2626", secondaryColor: "#0f172a", textColor: "#ffffff" },
  { id: "eu-juv", label: "Juventus", initials: "JUV", primaryColor: "#0f172a", secondaryColor: "#ffffff", textColor: "#ffffff" },
  { id: "eu-nap", label: "Napoli", initials: "NAP", primaryColor: "#0ea5e9", secondaryColor: "#ffffff", textColor: "#ffffff" },
  { id: "eu-rom", label: "AS Roma", initials: "ROM", primaryColor: "#881337", secondaryColor: "#f59e0b", textColor: "#facc15" },
  { id: "eu-udi", label: "Udinese", initials: "UDI", primaryColor: "#ffffff", secondaryColor: "#0f172a", textColor: "#0f172a" },
  { id: "eu-tor", label: "Torino", initials: "TOR", primaryColor: "#7f1d1d", secondaryColor: "#ffffff", textColor: "#ffffff" },
  { id: "eu-psg", label: "Paris SG", initials: "PSG", primaryColor: "#1e3a8a", secondaryColor: "#dc2626", textColor: "#ffffff" },
  { id: "eu-fcm", label: "Midtjylland", initials: "FCM", primaryColor: "#0f172a", secondaryColor: "#dc2626", textColor: "#dc2626" },
  { id: "wd-boc", label: "Boca Juniors", initials: "CABJ", primaryColor: "#1e3a8a", secondaryColor: "#facc15", textColor: "#facc15" },
  { id: "wd-riv", label: "River Plate", initials: "CARP", primaryColor: "#ffffff", secondaryColor: "#dc2626", textColor: "#dc2626" },
  { id: "wd-fla", label: "Flamengo", initials: "FLA", primaryColor: "#dc2626", secondaryColor: "#0f172a", textColor: "#ffffff" },
  { id: "wd-aln", label: "Al-Nassr", initials: "ALN", primaryColor: "#facc15", secondaryColor: "#1d4ed8", textColor: "#1d4ed8" },
  { id: "wd-mia", label: "Inter Miami", initials: "MIA", primaryColor: "#f472b6", secondaryColor: "#0f172a", textColor: "#0f172a" },

  // Deportes Populares
  { id: "sp-futbol", label: "Fútbol", sportIcon: "⚽", primaryColor: "#059669", secondaryColor: "#ffffff" },
  { id: "sp-tenis", label: "Tenis", sportIcon: "🎾", primaryColor: "#65a30d", secondaryColor: "#fef08a" },
  { id: "sp-basket", label: "Básquetbol", sportIcon: "🏀", primaryColor: "#ea580c", secondaryColor: "#0f172a" },
  { id: "sp-motor", label: "Motor / F1", sportIcon: "🏎️", primaryColor: "#dc2626", secondaryColor: "#0f172a" },
  { id: "sp-ciclismo", label: "Ciclismo", sportIcon: "🚴", primaryColor: "#0284c7", secondaryColor: "#facc15" },
  { id: "sp-atletismo", label: "Running", sportIcon: "🏃", primaryColor: "#7c3aed", secondaryColor: "#ffffff" },
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
    sm: "h-10 w-10 text-base",
    md: "h-16 w-16 text-2xl",
    lg: "h-24 w-24 text-4xl",
  }[size];

  // Si es ícono de deporte popular
  if (avatar.sportIcon) {
    return (
      <div
        style={{
          backgroundColor: avatar.primaryColor,
          borderColor: avatar.secondaryColor,
        }}
        className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-2xl border-2 shadow-sm`}
        title={avatar.label}
      >
        <span className="leading-none">{avatar.sportIcon}</span>
      </div>
    );
  }

  // Escudo SVG con iniciales y colores del club
  const labelText = avatar.initials || nickname.slice(0, 2).toUpperCase();
  const fontSize = labelText.length >= 4 ? "13" : labelText.length === 3 ? "15" : "18";

  return (
    <div
      className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 p-1 shadow-sm`}
      title={avatar.label}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-sm">
        <defs>
          <clipPath id={`club-shield-${avatar.id}`}>
            <path d="M32 4 L54 12 V30 C54 45 43 55 32 60 C21 55 10 45 10 30 V12 L32 4 Z" />
          </clipPath>
        </defs>

        <g clipPath={`url(#club-shield-${avatar.id})`}>
          <rect width="64" height="64" fill={avatar.primaryColor} />
          {/* Franja inferior decorativa con el color secundario */}
          <polygon points="0,42 64,34 64,64 0,64" fill={avatar.secondaryColor} opacity="0.28" />
        </g>

        {/* Borde del blasón con color secundario */}
        <path
          d="M32 4 L54 12 V30 C54 45 43 55 32 60 C21 55 10 45 10 30 V12 L32 4 Z"
          fill="none"
          stroke={avatar.secondaryColor}
          strokeWidth="3.5"
        />

        {/* Iniciales del club */}
        <text
          x="32"
          y="36"
          textAnchor="middle"
          fill={avatar.textColor || "#ffffff"}
          fontSize={fontSize}
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.5"
        >
          {labelText}
        </text>
      </svg>
    </div>
  );
}
