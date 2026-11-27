import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const adminPass = request.headers.get("x-admin-password")?.trim();
  const validPass =
    process.env.ADMIN_PASSWORD?.trim() || process.env.CRON_SECRET?.trim();

  if (!validPass || adminPass !== validPass) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const sport = String(body.sport || "football").trim();
    const section = String(body.section || "chilenos").trim();
    const content = String(body.content || "").trim();
    const uploadedImageUrl = String(body.cover_image || "").trim();

    if (!title || !content) {
      return NextResponse.json(
        { error: "El titular y el contenido son obligatorios" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const slugBase = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const uniqueSlug = `${slugBase}-${Date.now().toString().slice(-4)}`;

    const coverImage =
      uploadedImageUrl ||
      `/api/og?title=${encodeURIComponent(title)}&sport=${encodeURIComponent(
        sport
      )}&tag=${encodeURIComponent(section)}`;

    const { error: insertError } = await supabaseAdmin.from("articles").insert({
        title,
        slug: uniqueSlug,
        content,
        sport,
        section,
        cover_image: coverImage,
        status: "published",
        featured: true,
    });

    if (insertError) {
      return NextResponse.json(
        { error: `Error guardando noticia: ${insertError.message}` },
        { status: 500 }
      );
    }

    revalidatePath("/");
    return NextResponse.json({ ok: true, slug: uniqueSlug });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error inesperado en el servidor" },
      { status: 500 }
    );
  }
}
