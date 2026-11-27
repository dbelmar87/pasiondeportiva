import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

function cleanSecret(val?: string) {
  if (!val) return "";
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

// 1. Obtener comentarios para moderar en /admin (desde article_comments)
export async function GET(req: NextRequest) {
  const authError = getAuthError(req);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("article_comments")
    .select("id, author_name, content, status, created_at, articles(title, slug)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: `Error Supabase: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ comments: data || [] });
}

// 2. Aprobar o eliminar comentarios desde /admin
export async function PATCH(req: NextRequest) {
  const authError = getAuthError(req);
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const { id, action } = await req.json();
  const supabase = getAdminSupabase();

  if (action === "approve") {
    const { error } = await supabase
      .from("article_comments")
      .update({ status: "approved" })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const { error } = await supabase
      .from("article_comments")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}

// 3. Moderación automática (Filtro rápido + Gemini IA)
const TOXIC_WORDS = [
  "estupido", "estupida", "idiota", "imbecil", "aweonao", "hueon", "weon",
  "conchetumare", "ctm", "maricon", "maraca", "perra", "bastardo", "culiao",
  "ql", "hdp", "hijo de puta", "mierda", "basura humana", "muerte a", "matate"
];

function hasBasicToxicity(text: string): boolean {
  const norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return TOXIC_WORDS.some((word) => new RegExp(`\\b${word}\\b`, "i").test(norm));
}

async function moderateCommentWithAI(
  commentText: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (hasBasicToxicity(commentText)) {
    return {
      allowed: false,
      reason:
        "Tu comentario contiene descalificaciones o lenguaje ofensivo. En Pasión Deportiva debatimos con respeto.",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { allowed: true };

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `
      Eres el moderador de "La Tribuna" del portal deportivo chileno Pasión Deportiva.
      Evalúa el siguiente comentario de un hincha.
      - PERMITE críticas deportivas duras hacia el juego, tácticas, dirigentes o rendimiento (ej: "jugó muy mal", "pésimo planteamiento", "no estuvo a la altura").
      - RECHAZA insultos personales, descalificaciones ofensivas ("es muy estúpido", "inútil", "muerto"), garabatos, xenofobia, racismo o incitación a la violencia.

      Comentario: "${commentText.replace(/"/g, "'")}"

      Responde ÚNICAMENTE con un JSON válido:
      {
        "allowed": true o false,
        "reason": "Mensaje breve y respetuoso en español de Chile explicando por qué se rechazó (solo si allowed es false)"
      }
    `;

    const result = await model.generateContent(prompt);
    const raw = result.response
      .text()
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(raw);

    if (parsed.allowed === false) {
      return {
        allowed: false,
        reason:
          parsed.reason ||
          "Tu comentario no cumple con las normas de respeto de La Tribuna.",
      };
    }

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

// 4. Publicar comentario de hincha con validación y filtro IA
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const articleId = String(body.articleId || body.article_id || "").trim();
    const userId = body.userId ? String(body.userId).trim() : null;
    const authorName = String(body.authorName || body.author_name || "").trim();
    const authorTeam = body.authorTeam ? String(body.authorTeam).trim() : null;
    const content = String(body.content || "").trim();

    if (!articleId || !authorName || !content) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios para publicar el comentario." },
        { status: 400 }
      );
    }

    if (content.length > 600) {
      return NextResponse.json(
        { error: "El comentario no puede superar los 600 caracteres." },
        { status: 400 }
      );
    }

    const moderation = await moderateCommentWithAI(content);
    if (!moderation.allowed) {
      return NextResponse.json(
        { error: moderation.reason },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    const { data: insertedComment, error } = await supabase
      .from("article_comments")
      .insert({
        article_id: articleId,
        user_id: userId,
        author_name: authorName,
        author_team: authorTeam,
        content,
        status: "approved",
      })
      .select("id, user_id, author_name, author_team, content, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Error guardando comentario: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      comment: insertedComment,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error inesperado al procesar el comentario." },
      { status: 500 }
    );
  }
}
