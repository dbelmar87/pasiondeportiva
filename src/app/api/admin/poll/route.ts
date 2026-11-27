import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isAuthorized(req: NextRequest) {
  const adminPass = req.headers.get("x-admin-password")?.trim();
  const validPass =
    process.env.ADMIN_PASSWORD?.trim() || process.env.CRON_SECRET?.trim();
  return Boolean(validPass && adminPass === validPass);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = getAdminClient();
  const [{ data: settings }, { data: candidates }] = await Promise.all([
    supabase.from("poll_settings").select("*").eq("id", "active").maybeSingle(),
    supabase.from("weekly_votes").select("*").order("votes", { ascending: false }),
  ]);

  return NextResponse.json({
    settings: settings || {
      question: "¿Quién fue el mejor chileno de la semana?",
      subtitle: "Elige al deportista nacional más destacado en el extranjero.",
      poll_version: 1,
    },
    candidates: candidates || [],
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { question, subtitle, candidates, resetVotes } = body;
    const supabase = getAdminClient();

    // Obtener versión actual para incrementarla si se reinician los votos
    const { data: currentSettings } = await supabase
      .from("poll_settings")
      .select("poll_version")
      .eq("id", "active")
      .maybeSingle();

    const nextVersion = resetVotes
      ? (currentSettings?.poll_version ?? 1) + 1
      : currentSettings?.poll_version ?? 1;

    await supabase.from("poll_settings").upsert({
      id: "active",
      question: String(question || "").trim(),
      subtitle: String(subtitle || "").trim(),
      poll_version: nextVersion,
      updated_at: new Date().toISOString(),
    });

    // Actualizar cada candidato (y opcionalmente poner votos en 0)
    for (const c of candidates || []) {
      await supabase
        .from("weekly_votes")
        .update({
          athlete_name: String(c.athlete_name || "").trim(),
          sport: String(c.sport || "FÚTBOL").trim(),
          achievement: String(c.achievement || "").trim(),
          avatar_url: String(c.avatar_url || "").trim(),
          votes: resetVotes ? 0 : Number(c.votes || 0),
        })
        .eq("id", c.id);
    }

    revalidatePath("/");
    return NextResponse.json({ ok: true, poll_version: nextVersion });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error actualizando encuesta" },
      { status: 500 }
    );
  }
}
