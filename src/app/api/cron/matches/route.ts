import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  { slug: "eng.1", id: 39, name: "Premier League", country: "Inglaterra", isImportant: true, filterBigClubs: true },
  { slug: "esp.1", id: 140, name: "La Liga", country: "España", isImportant: true, filterBigClubs: true },
  { slug: "ita.1", id: 135, name: "Serie A", country: "Italia", isImportant: true, filterBigClubs: true },
  { slug: "ger.1", id: 78, name: "Bundesliga", country: "Alemania", isImportant: true, filterBigClubs: true },

  // Ligas secundarias: solo clubes destacados (Al-Nassr, Inter Miami) o favoritos de usuarios
  { slug: "ksa.1", id: 307, name: "Saudi Pro League", country: "Arabia Saudita", isImportant: false, filterBigClubs: true },
  { slug: "usa.1", id: 253, name: "MLS", country: "Estados Unidos", isImportant: false, filterBigClubs: true },
  { slug: "arg.1", id: 128, name: "Liga Profesional Argentina", country: "Argentina", isImportant: false, filterBigClubs: true },
];

// Clubes grandes + equipos con chilenos en el extranjero + superestrellas
const FEATURED_AND_CHILEAN_CLUBS = [
  "al-nassr", "al nassr", "inter miami",
  "real madrid", "barcelona", "atletico", "athletic", "betis", "sevilla", "villarreal", "real sociedad",
  "manchester", "liverpool", "arsenal", "chelsea", "tottenham", "aston villa", "newcastle", "norwich",
  "bayern", "dortmund", "leverkusen", "leipzig",
  "inter", "milan", "juventus", "roma", "lazio", "napoli", "atalanta", "udinese", "torino", "bologna", "parma",
  "psg", "paris", "monaco", "marseille", "lyon", "toulouse",
  "porto", "benfica", "sporting", "ajax", "psv", "feyenoord",
  "midtjylland", "galatasaray", "fenerbahce",
  "colo", "universidad", "catolica", "boca", "river", "racing", "independiente", "flamengo", "palmeiras",
  "chile"
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
            },
          });

          if (!res.ok) return;

          const data = await res.json();
          const leagueLogo = data?.leagues?.[0]?.logos?.[0]?.href || "";
          const events = data?.events || [];
          totalFetched += events.length;

          for (const ev of events) {
            const matchIso = new Date(ev.date).toISOString();
            if (matchIso < startOfDay || matchIso > endOfDay) continue;

            const comp = ev.competitions?.[0];
            const competitors = comp?.competitors || [];
            const home =
              competitors.find((c: any) => c.homeAway === "home") || competitors[0];
            const away =
              competitors.find((c: any) => c.homeAway === "away") || competitors[1];

            if (!home || !away) continue;

            const homeName =
              home.team?.shortDisplayName || home.team?.displayName || "Local";
            const awayName =
              away.team?.shortDisplayName || away.team?.displayName || "Visita";
            const homeLower = homeName.toLowerCase();
            const awayLower = awayName.toLowerCase();

            const isFeaturedClub = FEATURED_AND_CHILEAN_CLUBS.some(
              (club) => homeLower.includes(club) || awayLower.includes(club)
            );
            const isFollowedClub = Array.from(followedTeams).some(
              (fav) => homeLower.includes(fav) || awayLower.includes(fav)
            );

            // Si la liga requiere filtro de clubes (ej. Europa League) o es secundaria, solo guardamos partidos destacados/seguidos
            if (league.filterBigClubs && !isFeaturedClub && !isFollowedClub) {
              continue;
            }

            const state = ev.status?.type?.state; // "pre" | "in" | "post"
            const statusName = ev.status?.type?.name || "";
            let statusShort = "NS";
            if (state === "in") {
              statusShort = ev.status?.type?.shortDetail === "HT" ? "HT" : "LIVE";
            } else if (state === "post") {
              if (statusName.includes("POSTPONED")) statusShort = "PST";
              else if (statusName.includes("CANCELED")) statusShort = "CANC";
              else statusShort = "FT";
            }

            const clockStr = String(ev.status?.displayClock || "");
            const elapsedMatch = clockStr.match(/^(\d+)/);
            const elapsed =
              state === "in" && elapsedMatch ? Number(elapsedMatch[1]) : null;

            const numericId = Number(String(ev.id).replace(/\D/g, ""));
            if (!numericId) continue;

            rowsToUpsert.push({
              home_logo: home.team?.logo || "",
              away_logo: away.team?.logo || "",
              league_logo: leagueLogo,
              id: numericId,
              league_id: league.id,
              league_name: league.name,
              league_country: league.country,
              match_date: matchIso,
              status_short: statusShort,
              elapsed,
              home_team: homeName,
              home_short: (home.team?.abbreviation || makeShortName(homeName))
                .slice(0, 4)
                .toUpperCase(),
              home_score: state === "pre" ? null : Number(home.score ?? 0),
              away_team: awayName,
              away_short: (away.team?.abbreviation || makeShortName(awayName))
                .slice(0, 4)
                .toUpperCase(),
              away_score: state === "pre" ? null : Number(away.score ?? 0),
              is_important: league.isImportant,
              updated_at: nowIso,
            });
          }
        } catch {
          // Ignorar error individual de una liga para no detener las demás
        }
      })
    );

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
    }

    return NextResponse.json({
      ok: true,
      provider: "ESPN",
      mode: needsDailySync ? "daily" : "live",
      date: todayStr,
      leaguesChecked: leaguesToFetch.length,
      totalFetched,
      savedMatches: rowsToUpsert.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

