import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function cleanSecret(val?: string) {
  if (!val) return "";
  // Elimina espacios y comillas dobles o simples al inicio/final
  return val.trim().replace(/^["']|["']$/g, "").trim();
}

function getAuthError(req: NextRequest): string | null {
  const rawAdmin = cleanSecret(process.env.ADMIN_PASSWORD);
  const rawCron = cleanSecret(process.env.CRON_SECRET);
  const validPass = rawAdmin || rawCron;

  if (!validPass) {
    return "El servidor no encuentra ADMIN_PASSWORD ni CRON_SECRET en las variables de entorno.";
  }

  const receivedPass = cleanSecret(req.headers.get("x-admin-password") || "");
  if (receivedPass !== validPass) {
    return `Contraseña incorrecta (el servidor espera ${validPass.length} caracteres y recibió ${receivedPass.length}).`;
  }

  return null;
}

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const authError = getAuthError(req);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("comments")
    .select("id, author_name, content, status, created_at, articles(title, slug)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: `Error Supabase: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ comments: data || [] });
}

export async function PATCH(req: NextRequest) {
  const authError = getAuthError(req);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const { id, action } = await req.json();
  const supabase = getAdminSupabase();

  if (action === "approve") {
    const { error } = await supabase
      .from("comments")
      .update({ status: "approved" })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
