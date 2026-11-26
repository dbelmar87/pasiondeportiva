export interface TeamStanding {
    rank: number;
    teamId: string;
    name: string;
    shortName: string;
    logo: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalDiff: number;
    points: number;
  }
  
  export const TRACKED_LEAGUES = [
    { slug: "chi.1", label: "Chile", flag: "🇨🇱" },
    { slug: "eng.1", label: "Premier", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { slug: "esp.1", label: "LaLiga", flag: "🇪🇸" },
    { slug: "ita.1", label: "Serie A", flag: "🇮🇹" },
    { slug: "ger.1", label: "Bundesliga", flag: "🇩🇪" },
    { slug: "fra.1", label: "Ligue 1", flag: "🇫🇷" },
    { slug: "uefa.champions", label: "Champions", flag: "🏆" },
    { slug: "uefa.europa", label: "Europa League", flag: "🟠" },
    { slug: "uefa.europa.conf", label: "Conference", flag: "🟢" },
    { slug: "ksa.1", label: "Saudí", flag: "🇸🇦" },
    { slug: "usa.1", label: "MLS (Este)", flag: "🇺🇸" },
  ];
  
  export async function fetchEspnStandings(slug: string): Promise<TeamStanding[]> {
    const hostMain = ["site", "api", "espn", "com"].join(".");
    const hostWeb = ["site", "web", "api", "espn", "com"].join(".");
  
    const endpoints = [
      `https://${hostMain}/apis/v2/sports/soccer/${slug}/standings`,
      `https://${hostWeb}/apis/v2/sports/soccer/${slug}/standings`,
    ];
  
    let data: any = null;
    let lastError = "";
  
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          cache: "no-store",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; PasionDeportiva/1.0)",
            Accept: "application/json",
          },
        });
  
        if (!res.ok) {
          lastError = `HTTP ${res.status}`;
          continue;
        }
  
        data = await res.json();
        break;
      } catch (err: any) {
        const host = err?.cause?.hostname || "";
        const code = err?.cause?.code || "";
        lastError = `${err.message} (${code} ${host})`.trim();
      }
    }
  
    if (!data) {
      throw new Error(lastError || `No se pudo obtener standings para ${slug}`);
    }
  
    let targetGroup = data.children?.[0];
  
    if (slug === "usa.1" && Array.isArray(data.children)) {
      const eastConf = data.children.find((c: any) =>
        c.name?.toLowerCase().includes("east")
      );
      if (eastConf) targetGroup = eastConf;
    }
  
    const entries = targetGroup?.standings?.entries || [];
  
    return entries
      .map((entry: any) => {
        const getStat = (name: string) =>
          entry.stats?.find((s: any) => s.name === name)?.value ?? 0;
  
        return {
          rank: getStat("rank"),
          teamId: String(entry.team?.id || ""),
          name: entry.team?.displayName || "",
          shortName: entry.team?.shortDisplayName || entry.team?.name || "",
          logo: entry.team?.logos?.[0]?.href || "",
          played: getStat("gamesPlayed"),
          won: getStat("wins"),
          drawn: getStat("ties"),
          lost: getStat("losses"),
          goalDiff: getStat("pointDifferential"),
          points: getStat("points"),
        };
      })
      .sort((a: TeamStanding, b: TeamStanding) => a.rank - b.rank);
  }
  