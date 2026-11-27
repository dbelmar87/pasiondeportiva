import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchEspnStandings, TRACKED_LEAGUES } from "@/lib/espnStandings";

const ESPN_LEAGUES = [
  // Torneos donde entran TODOS los partidos del día
  { slug: "chi.1", id: 265, name: "Primera División de Chile", country: "Chile", isImportant: true, filterBigClubs: false },
  { slug: "chi.copa_chi", id: 267, name: "Copa Chile", country: "Chile", isImportant: true, filterBigClubs: false },
  { slug: "conmebol.libertadores", id: 13, name: "CONMEBOL Libertadores", country: "Sudamérica", isImportant: true, filterBigClubs: false },
  { slug: "conmebol.sudamericana", id: 11, name: "CONMEBOL Sudamericana", country: "Sudamérica", isImportant: true, filterBigClubs: false },
  { slug: "fifa.worldq.conmebol", id: 34, name: "Eliminatorias Sudamericanas", country: "Sudamérica", isImportant: true, filterBigClubs: false },
  { slug: "fifa.friendly", id: 10, name: "Amistosos Internacionales", country: "Mundo", isImportant: true, filterBigClubs: false },
  { slug: "conmebol.america", id: 9, name: "Copa América", country: "Sudamérica", isImportant: true, filterBigClubs: false },
  { slug: "fifa.world", id: 1, name: "Mundial", country: "Mundo", isImportant: true, filterBigClubs: false },
  { slug: "uefa.champions", id: 2, name: "UEFA Champions League", country: "Europa", isImportant: true, filterBigClubs: false },

  // Torneos europeos con muchos partidos simultáneos: filtramos clubes grandes + chilenos
  { slug: "uefa.europa", id: 3, name: "UEFA Europa League", country: "Europa", isImportant: true, filterBigClubs: true },
  { slug: "uefa.europa.conf", id: 848, name: "UEFA Conference League", country: "Europa", isImportant: true, filterBigClubs: true },
  { slug: "eng.1", id: 39, name: "Premier League", country: "Inglaterra", isImportant: true, filterBigClubs: true },
  { slug: "esp.1", id: 140, name: "La Liga", country: "España", isImportant: true, filterBigClubs: true },
  { slug: "ita.1", id: 135, name: "Serie A", country: "Italia", isImportant: true, filterBigClubs: true },
  { slug: "ger.1", id: 78, name: "Bundesliga", country: "Alemania", isImportant: true, filterBigClubs: true },
  { slug: "fra.1", id: 61, name: "Ligue 1", country: "Francia", isImportant: true, filterBigClubs: true },

  // Ligas secundarias: solo clubes destacados (Al-Nassr, Inter Miami) o favoritos de usuarios
  { slug: "ksa.1", id: 307, name: "Saudi Pro League", country: "Arabia Saudita", isImportant: false, filterBigClubs: true },
  { slug: "usa.1", id: 253, name: "MLS", country: "Estados Unidos", isImportant: false, filterBigClubs: true },
  { slug: "arg.1", id: 128, name: "Liga Profesional Argentina", country: "Argentina", isImportant: false, filterBigClubs: true },
];

// Todos los clubes de las 5 Grandes Ligas (Premier, LaLiga, Serie A, Bundesliga, Ligue 1) + Chilenos
const FEATURED_AND_CHILEAN_CLUBS = [
  // Clubes estrella globales
  "al-nassr", "al nassr", "inter miami",

  // Premier League (Inglaterra)
  "arsenal", "aston villa", "bournemouth", "brentford", "brighton", "chelsea",
  "crystal palace", "everton", "fulham", "ipswich", "leicester", "liverpool",
  "manchester city", "man city", "manchester united", "man utd", "newcastle",
  "nottingham", "southampton", "tottenham", "west ham", "wolves", "wolverhampton",
  "norwich", "sheffield", "watford", "blackburn",

  // LaLiga (España)
  "real madrid", "barcelona", "atletico", "athletic", "real sociedad", "betis",
  "villarreal", "sevilla", "valencia", "girona", "celta", "osasuna", "mallorca",
  "rayo vallecano", "getafe", "alaves", "espanyol", "las palmas", "leganes", "valladolid",

  // Serie A (Italia)
  "inter", "milan", "juventus", "napoli", "atalanta", "roma", "lazio",
  "fiorentina", "bologna", "torino", "udinese", "genoa", "monza", "verona",
  "lecce", "cagliari", "parma", "como", "empoli", "venezia",

  // Bundesliga (Alemania)
  "bayern", "leverkusen", "dortmund", "leipzig", "stuttgart", "frankfurt",
  "freiburg", "hoffenheim", "heidenheim", "werder", "bremen", "wolfsburg",
  "augsburg", "mainz", "gladbach", "monchengladbach", "union berlin", "bochum", "st. pauli",

  // Ligue 1 (Francia)
  "psg", "paris", "monaco", "brest", "lille", "nice", "lyon", "lens",
  "marseille", "reims", "rennes", "toulouse", "strasbourg", "montpellier",
  "nantes", "auxerre", "angers", "le havre", "saint-etienne",

  // Otros equipos europeos con chilenos + grandes de Portugal/Países Bajos/Sudamérica
  "midtjylland", "porto", "benfica", "sporting", "ajax", "psv", "feyenoord",
  "galatasaray", "fenerbahce", "colo", "universidad", "catolica",
  "boca", "river", "racing", "independiente", "flamengo", "palmeiras", "chile"
];

function getTodaySantiago(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function makeShortName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words[0].length > 0 && words[1].length > 0) {
    return `${words[0][0]}${words[1].slice(0, 2)}`.toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase() || "CLB";
}

function mapEspnStatus(state?: string, detail?: string): { short: string; long: string } {
  const s = (state || "").toLowerCase();
  const d = (detail || "").toLowerCase();
  if (s === "post") {
    if (d.includes("pen")) return { short: "PEN", long: "Finalizado (Penales)" };
    if (d.includes("aet") || d.includes("extra")) return { short: "AET", long: "Finalizado (Prórroga)" };
    return { short: "FT", long: "Finalizado" };
  }
  if (s === "in") {
    if (d.includes("halftime") || d === "ht") return { short: "HT", long: "Entretiempo" };
    return { short: "LIVE", long: detail || "En juego" };
  }
  if (d.includes("postponed")) return { short: "PST", long: "Pospuesto" };
  if (d.includes("canceled") || d.includes("cancelled")) return { short: "CANC", long: "Cancelado" };
  return { short: "NS", long: "Programado" };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")?.trim();
  const secretParam = request.nextUrl.searchParams.get("secret")?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}` &&
    secretParam !== cronSecret
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const mode = request.nextUrl.searchParams.get("mode");
  const todayStr = getTodaySantiago();

  try {
    const startOfDay = `${todayStr}T00:00:00-03:00`;
    const endOfDay = `${todayStr}T23:59:59-03:00`;

    const { count: todayCount, error: countError } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .gte("match_date", startOfDay)
      .lte("match_date", endOfDay);

    if (countError) {
      return NextResponse.json(
        { error: `Error leyendo tabla matches en Supabase: ${countError.message}` },
        { status: 500 }
      );
    }

    const needsDailySync = mode === "daily" || !todayCount || todayCount === 0;

    // Ventana en vivo: desde 5 min antes del inicio hasta 180 min después
    const upcomingLimit = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const maxElapsedLimit = new Date(Date.now() - 180 * 60 * 1000).toISOString();

    const { data: activeMatches } = await supabase
      .from("matches")
      .select("id, league_id")
      .gte("match_date", maxElapsedLimit)
      .lte("match_date", upcomingLimit)
      .not("status_short", "in", '("FT","AET","PEN","PST","CANC","SUSP","INT","ABD")');

    if (!needsDailySync && (!activeMatches || activeMatches.length === 0)) {
      return NextResponse.json({
        ok: true,
        apiCallsUsed: 0,
        message: "Sin partidos en curso en este minuto. Cero consultas realizadas.",
      });
    }

    const activeLeagueIds = new Set(
      (activeMatches || []).map((m) => m.league_id)
    );
    const previouslyActiveIds = new Set(
      (activeMatches || []).map((m) => m.id)
    );

    const leaguesToFetch = needsDailySync
      ? ESPN_LEAGUES
      : ESPN_LEAGUES.filter((l) => activeLeagueIds.has(l.id));

    const { data: fans } = await supabase
      .from("fan_profiles")
      .select("favorite_teams");

    const followedTeams = new Set<string>();
    (fans || []).forEach((f) => {
      (f.favorite_teams || []).forEach((t: string) => {
        if (t && t.trim().length >= 3) {
          followedTeams.add(t.toLowerCase().trim());
        }
      });
    });

    const espnDate = todayStr.replace(/-/g, "");
    const espnHost = ["site", "api", "espn", "com"].join(".");
    const nowIso = new Date().toISOString();
    const rowsToUpsert: any[] = [];
    let totalFetched = 0;

    await Promise.all(
      leaguesToFetch.map(async (league) => {
        try {
          const url = `https://${espnHost}/apis/site/v2/sports/soccer/${league.slug}/scoreboard?dates=${espnDate}`;
          const res = await fetch(url, {
            cache: "no-store",
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; PasionDeportiva/1.0)",
              Accept: "application/json",
            },
          });

          if (!res.ok) return;
          const json = await res.json();
          const events = json.events || [];
          totalFetched += events.length;

          for (const ev of events) {
            const comp = ev.competitions?.[0];
            const competitors = comp?.competitors || [];
            const home = competitors.find((c: any) => c.homeAway === "home");
            const away = competitors.find((c: any) => c.homeAway === "away");
            if (!home || !away) continue;

            const homeName: string = home.team?.displayName || home.team?.name || "";
            const awayName: string = away.team?.displayName || away.team?.name || "";

            if (league.filterBigClubs) {
              const hLow = homeName.toLowerCase();
              const aLow = awayName.toLowerCase();
              const isBig = FEATURED_AND_CHILEAN_CLUBS.some(
                (club) => hLow.includes(club) || aLow.includes(club)
              );
              const isFollowed = Array.from(followedTeams).some(
                (fav) => hLow.includes(fav) || aLow.includes(fav)
              );
              if (!isBig && !isFollowed) continue;
            }

            const statusType = comp?.status?.type || ev.status?.type || {};
            const mappedStatus = mapEspnStatus(
              statusType.state,
              statusType.shortDetail || statusType.detail
            );

            rowsToUpsert.push({
              id: Number(ev.id),
              league_id: league.id,
              league_name: league.name,
              league_country: league.country,
              match_date: ev.date,
              status_short: mappedStatus.short,
              status_long: mappedStatus.long,
              elapsed: comp?.status?.clock ? Math.floor(comp.status.clock / 60) : null,
              home_team: homeName,
              home_short: home.team?.abbreviation || makeShortName(homeName),
              home_logo: home.team?.logo || "",
              home_goals:
                statusType.state === "pre" ? null : Number(home.score ?? 0),
              away_team: awayName,
              away_short: away.team?.abbreviation || makeShortName(awayName),
              away_logo: away.team?.logo || "",
              away_goals:
                statusType.state === "pre" ? null : Number(away.score ?? 0),
              is_important: league.isImportant,
              updated_at: nowIso,
            });
          }
        } catch {
          // Ignorar fallo individual de liga para no detener las demás
        }
      })
    );

    const updatedStandings: string[] = [];

    if (rowsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("matches")
        .upsert(rowsToUpsert, { onConflict: "id" });

      if (upsertError) {
        return NextResponse.json(
          { error: `Error guardando en Supabase: ${upsertError.message}` },
          { status: 500 }
        );
      }

      // Detectar qué ligas tuvieron partidos que acaban de finalizar en esta ronda
      const finishedLeagueSlugs = new Set<string>();

      for (const row of rowsToUpsert) {
        const isNowFinished = ["FT", "AET", "PEN"].includes(row.status_short);
        if (isNowFinished && previouslyActiveIds.has(row.id)) {
          const leagueMeta = ESPN_LEAGUES.find((l) => l.id === row.league_id);
          if (
            leagueMeta &&
            TRACKED_LEAGUES.some((t) => t.slug === leagueMeta.slug)
          ) {
            finishedLeagueSlugs.add(leagueMeta.slug);
          }
        }
      }

      // Actualizar únicamente las tablas de las ligas con partidos recién terminados
      for (const slug of finishedLeagueSlugs) {
        try {
          const leagueInfo = TRACKED_LEAGUES.find((t) => t.slug === slug);
          const teams = await fetchEspnStandings(slug);
          if (leagueInfo && teams.length > 0) {
            await supabase.from("league_standings").upsert(
              {
                slug: leagueInfo.slug,
                label: leagueInfo.label,
                flag: leagueInfo.flag,
                teams,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "slug" }
            );
            updatedStandings.push(slug);
          }
        } catch {
          // Silencioso para no afectar la respuesta del cron de partidos
        }
      }
    }

    return NextResponse.json({
      ok: true,
      apiCallsUsed: leaguesToFetch.length,
      totalEventsScanned: totalFetched,
      matchesUpserted: rowsToUpsert.length,
      updatedStandings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error inesperado en cron de partidos" },
      { status: 500 }
    );
  }
}
