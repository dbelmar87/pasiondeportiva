import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchEspnStandings, TRACKED_LEAGUES } from "@/lib/espnStandings";

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

  const singleSlug = request.nextUrl.searchParams.get("league");
  const leaguesToUpdate = singleSlug
    ? TRACKED_LEAGUES.filter((l) => l.slug === singleSlug)
    : TRACKED_LEAGUES;

  const results = [];

  for (const league of leaguesToUpdate) {
    try {
      const teams = await fetchEspnStandings(league.slug);

      if (teams.length > 0) {
        const { error } = await supabase.from("league_standings").upsert(
          {
            slug: league.slug,
            label: league.label,
            flag: league.flag,
            teams,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "slug" }
        );

        if (error) throw new Error(error.message);
        results.push({ slug: league.slug, status: "ok", count: teams.length });
      }
    } catch (err: any) {
      results.push({ slug: league.slug, status: "error", message: err.message });
    }
  }

  return NextResponse.json({ updated: results });
}
