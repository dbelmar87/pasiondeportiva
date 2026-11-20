import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 1. Ligas prioritarias (Chile, Copas Continentales y las 4 grandes de Europa)
const IMPORTANT_LEAGUE_IDS = new Set([
  265, // Primera División de Chile
  267, // Copa Chile
  13,  // CONMEBOL Libertadores
  11,  // CONMEBOL Sudamericana
  34,  // Eliminatorias Sudamericanas
  10,  // Amistosos Internacionales (La Roja)
  9,   // Copa América
  1,   // Mundial
  2,   // UEFA Champions League
  3,   // UEFA Europa League
  39,  // Premier League (Inglaterra)
  140, // La Liga (España)
  135, // Serie A (Italia)
  78,  // Bundesliga (Alemania)
]);

// 2. Clubes destacados fijos del portal (aunque jueguen ligas fuera de Europa/Chile)
const FEATURED_CLUBS = ["al-nassr", "al nassr", "inter miami"];


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

  const apiKey = process.env.API_FOOTBALL_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta configurar API_FOOTBALL_KEY en variables de entorno" },
      { status: 500 }
    );
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

    // Buscamos partidos iniciados en las últimas 4 horas que aún no tengan estado final
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    const { data: pendingMatches } = await supabase
      .from("matches")
      .select("id")
      .gte("match_date", sixHoursAgo)
      .lte("match_date", nowIso)
      .not("status_short", "in", '("FT","AET","PEN","PST","CANC")');

    if (!needsDailySync && (!pendingMatches || pendingMatches.length === 0)) {
      return NextResponse.json({
        ok: true,
        apiCallsUsed: 0,
        message: "Sin partidos en curso o pendientes de cierre. Cero peticiones consumidas.",
      });
    }

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

    const host = ["v3", "football", "api-sports", "io"].join(".");
    const baseUrl = `https://${host}/fixtures`;
  // En plan Free usamos siempre ?date= (1 sola petición trae programación y resultados en vivo/finales del día)
    const endpoint = `${baseUrl}?date=${todayStr}&timezone=America/Santiago`;
  
    const apiRes = await fetch(endpoint, {
      headers: {
        "x-apisports-key": apiKey,
      },
      cache: "no-store",
    });

    if (!apiRes.ok) {
      const errorBody = await apiRes.text();
      return NextResponse.json(
        {
          error: `Error HTTP de API-Football: ${apiRes.status}`,
          details: errorBody,
          sentDate: todayStr,
        },
        { status: 502 }
      );
    }

    const apiData = await apiRes.json();

    if (apiData.errors && Object.keys(apiData.errors).length > 0) {
      return NextResponse.json(
        { error: "API-Football devolvió un error", details: apiData.errors },
        { status: 400 }
      );
    }

    const fixtures = apiData.response || [];

    const relevantFixtures = fixtures.filter((item: any) => {
      const leagueId = item.league?.id;
      const homeName = (item.teams?.home?.name || "").toLowerCase();
      const awayName = (item.teams?.away?.name || "").toLowerCase();

      const isImportantLeague = IMPORTANT_LEAGUE_IDS.has(leagueId);
      const isFeaturedClub = FEATURED_CLUBS.some(
        (club) => homeName.includes(club) || awayName.includes(club)
      );
      const isFollowedClub = Array.from(followedTeams).some(
        (fav) => homeName.includes(fav) || awayName.includes(fav)
      );

      return isImportantLeague || isFeaturedClub || isFollowedClub;
    });


    if (relevantFixtures.length > 0) {
      const rows = relevantFixtures.map((item: any) => ({
        home_logo: item.teams.home.logo || "",
        away_logo: item.teams.away.logo || "",
        league_logo: item.league.logo || "",
        id: item.fixture.id,
        league_id: item.league.id,
        league_name: item.league.name,
        league_country: item.league.country || "",
        match_date: item.fixture.date,
        status_short: item.fixture.status.short,
        elapsed: item.fixture.status.elapsed,
        home_team: item.teams.home.name,
        home_short: makeShortName(item.teams.home.name),
        home_score: item.goals.home,
        away_team: item.teams.away.name,
        away_short: makeShortName(item.teams.away.name),
        away_score: item.goals.away,
        is_important: IMPORTANT_LEAGUE_IDS.has(item.league.id),
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from("matches")
        .upsert(rows, { onConflict: "id" });

      if (upsertError) {
        return NextResponse.json(
          { error: `Error guardando en Supabase: ${upsertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      mode: needsDailySync ? "daily" : "live",
      date: todayStr,
      apiCallsUsed: 1,
      totalFetched: fixtures.length,
      savedMatches: relevantFixtures.length,
    });
} catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    const cause =
      err instanceof Error && err.cause
        ? String((err.cause as any)?.message || err.cause)
        : undefined;
    return NextResponse.json({ error: msg, cause }, { status: 500 });
  }

}
