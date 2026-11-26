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
    { slug: 'chi.1', label: 'Chile', flag: '🇨🇱' },
    { slug: 'eng.1', label: 'Premier', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { slug: 'esp.1', label: 'LaLiga', flag: '🇪🇸' },
    { slug: 'ita.1', label: 'Serie A', flag: '🇮🇹' },
    { slug: 'ger.1', label: 'Bundesliga', flag: '🇩🇪' },
    { slug: 'uefa.champions', label: 'Champions', flag: '🏆' },
    { slug: 'ksa.1', label: 'Saudí', flag: '🇸🇦' },
    { slug: 'usa.1', label: 'MLS (Este)', flag: '🇺🇸' },
  ];
  
  export async function fetchEspnStandings(slug: string): Promise<TeamStanding[]> {
    const res = await fetch(
      `https://espn.com{slug}/standings`,
      { cache: 'no-store' }
    );
  
    if (!res.ok) {
      throw new Error(`Error consultando ESPN standings para ${slug}`);
    }
  
    const data = await res.json();
  
    // En MLS (usa.1), children contiene Conferencia Este y Conferencia Oeste.
    // Buscamos la Conferencia Este (donde juega Inter Miami) o tomamos el primer bloque por defecto.
    let targetGroup = data.children?.[0];
    if (slug === 'usa.1' && Array.isArray(data.children)) {
      const eastConf = data.children.find((c: any) =>
        c.name?.toLowerCase().includes('east')
      );
      if (eastConf) targetGroup = eastConf;
    }
  
    const entries = targetGroup?.standings?.entries || [];
  
    return entries
      .map((entry: any) => {
        const getStat = (name: string) =>
          entry.stats?.find((s: any) => s.name === name)?.value ?? 0;
  
        return {
          rank: getStat('rank'),
          teamId: String(entry.team?.id || ''),
          name: entry.team?.displayName || '',
          shortName: entry.team?.shortDisplayName || entry.team?.name || '',
          logo: entry.team?.logos?.[0]?.href || '',
          played: getStat('gamesPlayed'),
          won: getStat('wins'),
          drawn: getStat('ties'),
          lost: getStat('losses'),
          goalDiff: getStat('pointDifferential'),
          points: getStat('points'),
        };
      })
      .sort((a: TeamStanding, b: TeamStanding) => a.rank - b.rank);
  }
  