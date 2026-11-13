import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
    // ✅ Ponlas aquí adentro de GET:
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Palabras clave para filtrar (Chilenos, Selección, Superestrellas y Tenis)
const KEYWORDS = [
  "tabilo", "jarry", "garin", "barrios", "alexis", "sanchez", "brereton",
  "osorio", "maripan", "suazo", "pulgar", "vidal", "alcaraz", "sinner",
  "djokovic", "yamal", "mbappe", "real madrid", "barcelona", "chile",
  "la roja", "colo colo", "universidad de chile", "catolica", "atp", "champions",
  "eduardo vargas", "pellegrini", "nations league", "italia", "francia", "espana",
  "argentina", "brasil", "messi", "vinicius", "bellingham"
];

// Endpoints JSON oficiales y abiertos (no devuelven HTML ni requieren XML)
const HOST = "site.api.espn.com";
const PATH = "apis/site/v2/sports";
const ESPN_BASE = `https://${HOST}/${PATH}`;

const NEWS_SOURCES = [
  {
    url: `${ESPN_BASE}/soccer/chi.1/news`,
    sport: "football",
  },
  {
    url: `${ESPN_BASE}/soccer/uefa.champions/news`,
    sport: "football",
  },
  {
    url: `${ESPN_BASE}/tennis/atp/news`,
    sport: "tennis",
  },
];



interface EspnArticle {
  headline?: string;
  description?: string;
  links?: {
    web?: {
      href?: string;
    };
  };
}

// 1. Solo modelos Flash de respuesta rápida (2 a 4 segundos)
async function generateSafeContent(prompt: string) {
    const modelsToTry = [
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.6-flash",
      ];
    let lastError: unknown;
  
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }
  

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const authHeader = request.headers.get("authorization");

  if (
    secret !== process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let createdCount = 0;
  let scannedCount = 0;
  const errors: string[] = [];

  const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

  for (const source of NEWS_SOURCES) {
    if (createdCount >= 1) {
      break;
    }

    try {
      const response = await fetch(source.url, { cache: "no-store" });
      if (!response.ok) {
        errors.push(`Error HTTP ${response.status} en ${source.url}`);
        continue;
      }

      const data = await response.json();
      const articles: EspnArticle[] = data.articles || [];

      for (const item of articles.slice(0, 10)) {
        scannedCount++;
        const title = item.headline || "";
        const snippet = item.description || "";
        const link = item.links?.web?.href || "";
        const fullText = normalizeText(`${title} ${snippet}`);

        const isRelevant = KEYWORDS.some((kw) => fullText.includes(kw));
        if (!isRelevant || !link) {
          continue;
        }

        // Evitar duplicados en Supabase
        const { data: existing } = await supabaseAdmin
          .from("articles")
          .select("id")
          .eq("source_url", link)
          .maybeSingle();

        if (existing) {
          continue;
        }

        const prompt = `
          Eres un editor deportivo chileno moderno para el portal "Pasión Deportiva".
          Basándote EXCLUSIVAMENTE en la siguiente información real, redacta una noticia original en español de Chile.
          Si el texto base viene en inglés, tradúcelo y adáptalo al español de Chile manteniendo 100% la exactitud de los hechos.
          NO inventes datos, marcadores, fechas ni declaraciones que no aparezcan en el texto base.

          Título original: ${title}
          Resumen base: ${snippet}

          Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta (sin bloques markdown):
          {
            "title": "Titular atractivo, claro y sin humo en español (máximo 85 caracteres)",
            "section": "chilenos",
            "content": "Cuerpo de la noticia en 3 párrafos cortos, claros y directos en español."
          }
          Nota: En "section" usa solo uno de estos tres valores exactos: "chilenos", "superestrellas" o "torneos".
        `;

        const responseText = await generateSafeContent(prompt);
        const rawText = responseText.replace(/```json|```/g, "").trim();
        const aiData = JSON.parse(rawText);

        const slug = normalizeText(aiData.title)
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");

        const validSections = ["chilenos", "superestrellas", "torneos"];
        const finalSection = validSections.includes(aiData.section)
          ? aiData.section
          : "torneos";

        const coverImage = `/api/og?title=${encodeURIComponent(aiData.title)}&sport=${encodeURIComponent(source.sport)}&tag=${encodeURIComponent(finalSection)}`;

        const { error: insertError } = await supabaseAdmin.from("articles").insert({
          title: aiData.title,
          slug: `${slug}-${Date.now().toString().slice(-4)}`,
          content: aiData.content,
          sport: source.sport,
          section: finalSection,
          cover_image: coverImage,
          source_url: link,
          status: "draft",
          featured: false,
        });

        if (insertError) {
          errors.push(`Error DB: ${insertError.message}`);
        } else {
          createdCount++;
        }

        if (createdCount >= 1) {
          break;
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Fuente ${source.url}: ${msg}`);
    }
  }

  return NextResponse.json({
    success: true,
    noticias_escaneadas: scannedCount,
    borradores_creados: createdCount,
    errores: errors,
  });
}
