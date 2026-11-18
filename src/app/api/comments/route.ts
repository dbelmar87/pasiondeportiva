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

    // 1. Exigir usuario autenticado
    if (!userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión en Zona del Hincha para comentar." },
        { status: 401 }
      );
    }

    const cleanContent = String(content || "").trim();

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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Verificar que el usuario tenga su Carnet Digital creado en fan_profiles
    const { data: fanProfile } = await supabaseAdmin
      .from("fan_profiles")
      .select("id, nickname, avatar_id, favorite_teams, verification_status")
      .eq("id", userId)
      .maybeSingle();

    if (!fanProfile) {
      return NextResponse.json(
        {
          error:
            "Debes crear tu Carnet de Hincha en /hincha para poder comentar.",
        },
        { status: 403 }
      );
    }

    // 3. Filtro IA de respeto
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

    // 4. Guardar comentario aprobado usando los datos reales del Carnet
    const verifiedName = (fanProfile.nickname || authorName || "Hincha").slice(
      0,
      40
    );
    const verifiedTeam = (
      fanProfile.favorite_teams?.[0] ||
      authorTeam ||
      ""
    ).slice(0, 40);

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("article_comments")
      .insert({
        article_id: articleId,
        user_id: userId,
        author_name: verifiedName,
        author_team: verifiedTeam || null,
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
