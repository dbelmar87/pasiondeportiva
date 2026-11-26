import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchEspnStandings, TRACKED_LEAGUES } from '@/lib/espnStandings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const singleSlug = searchParams.get('league'); // Opcional: actualizar solo 1 liga

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const leaguesToUpdate = singleSlug
    ? TRACKED_LEAGUES.filter((l) => l.slug === singleSlug)
    : TRACKED_LEAGUES;

  const results = [];

  for (const league of leaguesToUpdate) {
    try {
      const teams = await fetchEspnStandings(league.slug);

      if (teams.length > 0) {
        const { error } = await supabase.from('league_standings').upsert(
          {
            slug: league.slug,
            label: league.label,
            flag: league.flag,
            teams,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        );

        if (error) throw error;
        results.push({ slug: league.slug, status: 'ok', count: teams.length });
      }
    } catch (err: any) {
      results.push({ slug: league.slug, status: 'error', message: err.message });
    }
  }

  return NextResponse.json({ updated: results });
}
