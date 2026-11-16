import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

async function moderateCommentWithAI(text: string, apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `
    Eres el moderador de comunidad de "Pasión Deportiva", un portal deportivo chileno.
    Evalúa si el siguiente comentario de un hincha cumple con las reglas de respeto básico.

    Reglas:
    - PERMITIR (approved: true): Pasión futbolera, críticas duras al rendimiento de jugadores, técnicos o árbitros, debate entre hinchas y chilenismos coloquiales sin odio (ej: "malo el planteamiento", "se perdió un gol solo", "vamos la roja").
    - BLOQUEAR (approved: false): Insultos graves o garabatos directos contra personas/usuarios, discriminación, xenofobia, racismo, amenazas de violencia, acoso o spam/enlaces publicitarios.

    Comentario del hincha: "${text}"

    Responde ÚNICAMENTE con este JSON exacto:
    {
      "approved": true,
      "reason": "Breve explicación en español de Chile si fue bloqueado, o vacío si fue aprobado"
    }
  `;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().replace(/```json|```/g, "").trim();
  return JSON.parse(raw) as { approved: boolean; reason?: string };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { articleId, userId, authorName, authorTeam, content } = body;

    const cleanContent = String(content || "").trim();
    const cleanAuthor = String(authorName || "").trim() || "Hincha Anónimo";

    if (!articleId || cleanContent.length < 3) {
      return NextResponse.json(
        { error: "Escribe un comentario de al menos 3 caracteres." },
        { status: 400 }
      );
    }

    if (cleanContent.length > 600) {
      return NextResponse.json(
        { error: "El comentario no puede superar los 600 caracteres." },
        { status: 400 }
      );
    }

    // 1. Filtro IA de respeto
    const moderation = await moderateCommentWithAI(
      cleanContent,
      process.env.GEMINI_API_KEY!
    );

    if (!moderation.approved) {
      return NextResponse.json(
        {
          blocked: true,
          error:
            moderation.reason ||
            "Tu comentario no cumple con nuestras normas de respeto en la tribuna.",
        },
        { status: 422 }
      );
    }

    // 2. Guardar comentario aprobado en Supabase
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("article_comments")
      .insert({
        article_id: articleId,
        user_id: userId || null,
        author_name: cleanAuthor.slice(0, 40),
        author_team: authorTeam ? String(authorTeam).slice(0, 40) : null,
        content: cleanContent,
        status: "approved",
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Error al guardar: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, comment: inserted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
