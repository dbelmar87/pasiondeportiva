import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CHILEAN_PLAYERS = [
  "tabilo",
  "jarry",
  "garin",
  "barrios",
  "soto",
  "lama",
  "nunez",
];

const STAR_PLAYERS = [
  "alcaraz",
  "sinner",
  "zverev",
  "djokovic",
  "medvedev",
  "fritz",
  "shelton",
  "ruud",
  "rublev",
  "tiafoe",
  "cobolli",
  "fils",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isChilean(name: string, countryCode?: string): boolean {
  const code = countryCode?.toUpperCase();
  if (code === "CHL" || code === "CHI") return true;
  const lower = name.toLowerCase();
  return CHILEAN_PLAYERS.some((p) => lower.includes(p));
}

function isStar(name: string): boolean {
  const lower = name.toLowerCase();
  return STAR_PLAYERS.some((p) => lower.includes(p));
}

function mapEventToRow(ev: any, nowIso: string) {
  const p1Name = ev.homeTeam?.name || "";
  const p2Name = ev.awayTeam?.name || "";
  const p1Country = ev.homeTeam?.country?.alpha3 || "";
  const p2Country = ev.awayTeam?.country?.alpha3 || "";

  const hasChilean =
    isChilean(p1Name, p1Country) || isChilean(p2Name, p2Country);
  const hasStar = isStar(p1Name) || isStar(p2Name);

  const statusType = ev.status?.type;
  let statusShort = "NS";
  if (statusType === "inprogress") statusShort = "LIVE";
  else if (statusType === "finished" || statusType === "canceled")
    statusShort = "FT";

  const sets = Array.from({ length: 5 }, (_, i) => i + 1);

  const p1Games = sets
    .map((s) => ev.homeScore?.[`period${s}`])
    .filter((v) => v !== undefined && v !== null)
    .join(" ");

  const p2Games = sets
    .map((s) => ev.awayScore?.[`period${s}`])
    .filter((v) => v !== undefined && v !== null)
    .join(" ");

  return {
    id: `atp-${ev.id}`,
    tournament_name:
      ev.tournament?.uniqueTournament?.name ||
      ev.tournament?.name ||
      "ATP Tour",
    round_name: ev.roundInfo?.name || "",
    match_date: new Date((ev.startTimestamp || 0) * 1000).toISOString(),
    status_short: statusShort,
    player1_name: p1Name,
    player1_country: p1Country === "CHL" ? "CHI" : p1Country || "ATP",
    player1_sets: Number(ev.homeScore?.current ?? 0),
    player1_score: p1Games,
    player2_name: p2Name,
    player2_country: p2Country === "CHL" ? "CHI" : p2Country || "ATP",
    player2_sets: Number(ev.awayScore?.current ?? 0),
    player2_score: p2Games,
    has_chilean: hasChilean,
    is_star_match: hasStar,
    updated_at: nowIso,
  };
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

  const rapidApiKey = process.env.RAPIDAPI_KEY?.trim();
  if (!rapidApiKey) {
    return NextResponse.json(
      { error: "Falta la variable RAPIDAPI_KEY en .env.local" },
      { status: 500 }
    );
  }

  const mode = request.nextUrl.searchParams.get("mode") || "live";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const apiHost = ["tennisapi1", ".p.", "rapidapi.com"].join("");
    const baseUrl = `https://${apiHost}/api/tennis`;

    const rapidHeaders = {
      "x-rapidapi-key": rapidApiKey,
      "x-rapidapi-host": apiHost,
    };

    const nowIso = new Date().toISOString();
    let requestsUsed = 0;
    const rowsToUpsert = new Map<string, any>();

    // 1. Revisar si quedaron partidos en "LIVE" en Supabase para verificar si ya terminaron
    const { data: pendingLive } = await supabase
      .from("tennis_matches")
      .select("id")
      .eq("status_short", "LIVE");

    for (const row of pendingLive || []) {
      const numericId = String(row.id).replace("atp-", "");
      if (!numericId) continue;

      if (requestsUsed > 0) await sleep(1200);
      const evRes = await fetch(`${baseUrl}/event/${numericId}`, {
        headers: rapidHeaders,
        cache: "no-store",
      });
      requestsUsed++;

      if (evRes.status === 200) {
        const evJson = await evRes.json().catch(() => ({}));
        const ev = evJson.event || evJson;
        if (ev?.id) {
          const mapped = mapEventToRow(ev, nowIso);
          rowsToUpsert.set(mapped.id, mapped);
        }
      }
    }

    // 2. Consultar partidos en vivo actuales (1 petición)
    if (mode === "live" || mode === "all") {
      if (requestsUsed > 0) await sleep(1200);
      const liveRes = await fetch(`${baseUrl}/events/live`, {
        headers: rapidHeaders,
        cache: "no-store",
      });
      requestsUsed++;

      if (liveRes.status === 200) {
        const liveJson = await liveRes.json().catch(() => ({}));
        for (const ev of liveJson.events || []) {
          if (!ev?.id) continue;
          const mapped = mapEventToRow(ev, nowIso);
          if (mapped.has_chilean || mapped.is_star_match) {
            rowsToUpsert.set(mapped.id, mapped);
          }
        }
      }
    }

    // 3. Consultar cartelera del día SOLO en modo "all"
    if (mode === "all") {
      if (requestsUsed > 0) await sleep(1200);
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Santiago",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).formatToParts(new Date());

      const day = parts.find((p) => p.type === "day")?.value;
      const month = parts.find((p) => p.type === "month")?.value;
      const year = parts.find((p) => p.type === "year")?.value;

      const todayRes = await fetch(`${baseUrl}/events/${day}/${month}/${year}`, {
        headers: rapidHeaders,
        cache: "no-store",
      });
      requestsUsed++;

      if (todayRes.status === 200) {
        const todayJson = await todayRes.json().catch(() => ({}));
        for (const ev of todayJson.events || []) {
          if (!ev?.id) continue;
          const mapped = mapEventToRow(ev, nowIso);
          if (
            (mapped.has_chilean || mapped.is_star_match) &&
            !rowsToUpsert.has(mapped.id)
          ) {
            rowsToUpsert.set(mapped.id, mapped);
          }
        }
      }
    }

    const finalMatches = Array.from(rowsToUpsert.values());
    if (finalMatches.length > 0) {
      const { error: matchErr } = await supabase
        .from("tennis_matches")
        .upsert(finalMatches, { onConflict: "id" });

      if (matchErr) {
        throw new Error(`Error Supabase matches: ${matchErr.message}`);
      }
    }

    // 4. Consultar Ranking ATP SOLO en modo "ranking" o "all"
    let rankingsSaved = 0;
    if (mode === "ranking" || mode === "all") {
      if (requestsUsed > 0) await sleep(1200);

      const rankingRes = await fetch(`${baseUrl}/rankings/atp`, {
        headers: rapidHeaders,
        cache: "no-store",
      });
      requestsUsed++;

      if (rankingRes.status === 200) {
        const rankingJson = await rankingRes.json().catch(() => ({}));
        const rawRankings = rankingJson.rankingRows || [];

        const rankingsToSave = rawRankings
          .filter((r: any) => {
            const name = r.team?.name || r.rowName || "";
            const country = r.country?.alpha3 || r.team?.country?.alpha3 || "";
            const rank = Number(r.ranking ?? r.team?.ranking ?? 9999);
            return rank <= 10 || isChilean(name, country);
          })
          .map((r: any) => {
            const name = r.team?.name || r.rowName || "";
            const country = r.country?.alpha3 || r.team?.country?.alpha3 || "";
            const rank = Number(r.ranking ?? r.team?.ranking ?? 0);

            return {
              player_name: name,
              rank,
              country: country === "CHL" ? "CHI" : country || "ATP",
              points: Number(r.points) || 0,
              is_chilean: isChilean(name, country),
              updated_at: nowIso,
            };
          });

        if (rankingsToSave.length > 0) {
          await supabase.from("atp_rankings").delete().neq("rank", -1);
          const { error: rankErr } = await supabase
            .from("atp_rankings")
            .upsert(rankingsToSave, { onConflict: "player_name" });

          if (rankErr) {
            throw new Error(`Error Supabase rankings: ${rankErr.message}`);
          }
          rankingsSaved = rankingsToSave.length;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      mode,
      requestsUsed,
      matchesUpdated: finalMatches.length,
      rankingsSaved,
      matches: finalMatches,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
