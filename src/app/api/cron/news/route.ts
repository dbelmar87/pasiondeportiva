import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function decodeXmlEntities(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  sourceName: string;
}

function parseGoogleNewsRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const itemXml of itemMatches) {
    const rawTitle = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
    const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || "";
    const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";
    const rawDesc = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "";
    const rawSource = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "";

    const cleanTitle = decodeXmlEntities(rawTitle).replace(/\s-\s[^-]+$/, "").trim();
    const sourceName = decodeXmlEntities(rawSource);
    const description = decodeXmlEntities(rawDesc);

    if (cleanTitle && link) {
      items.push({
        title: cleanTitle,
        link,
        pubDate,
        description,
        sourceName,
      });
    }
  }

  return items;
}

function buildGoogleNewsUrl(query: string) {
  const url = new URL("https://news.google.com");
  url.pathname = "/rss/search";
  url.searchParams.set("q", query + " when:1d");
  url.searchParams.set("hl", "es-419");
  url.searchParams.set("gl", "CL");
  url.searchParams.set("ceid", "CL:es-419");
  return url.toString();
}

const RSS_FEEDS = [
  {
    name: "Legión Chilena Fútbol",
    url: buildGoogleNewsUrl(
      '("Alexis Sánchez" OR "Ben Brereton" OR "Darío Osorio" OR "Guillermo Maripán" OR "Gabriel Suazo" OR "Erick Pulgar" OR "Paulo Díaz" OR "Marcelino Núñez" OR "Felipe Loyola" OR "La Roja")'
    ),
    sport: "football",
    defaultSection: "chilenos",
  },
  {
    name: "Tenis Chileno y ATP",
    url: buildGoogleNewsUrl(
      '("Alejandro Tabilo" OR "Nicolás Jarry" OR "Cristian Garin" OR "Tomás Barrios" OR "ATP")'
    ),
    sport: "tennis",
    defaultSection: "chilenos",
  },
  {
    name: "Superestrellas y Torneos",
    url: buildGoogleNewsUrl(
      '("Real Madrid" OR "FC Barcelona" OR "Lamine Yamal" OR "Kylian Mbappé" OR "Vinicius" OR "Champions League")'
    ),
    sport: "football",
    defaultSection: "superestrellas",
  },
];

async function generateSafeContent(prompt: string, apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTry = [
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
  ];
  let lastError: unknown;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });
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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let createdCount = 0;
  let scannedCount = 0;
  const errors: string[] = [];
  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // Últimas 24 horas
  const now = Date.now();

  for (const feed of RSS_FEEDS) {
    if (createdCount >= 1) {
      break;
    }

    try {
      const response = await fetch(feed.url, {
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PasionDeportivaBot/1.0)",
        },
      });

      if (!response.ok) {
        errors.push(`Error HTTP ${response.status} en ${feed.name}`);
        continue;
      }

      const xmlText = await response.text();
      const rawItems = parseGoogleNewsRss(xmlText);

      const recentItems = rawItems
        .sort((a, b) => {
          const timeA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
          const timeB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
          return timeB - timeA;
        })
        .filter((item) => {
          if (!item.pubDate) return true;
          const pubTime = new Date(item.pubDate).getTime();
          return !Number.isNaN(pubTime) && now - pubTime <= MAX_AGE_MS;
        });

      for (const item of recentItems.slice(0, 12)) {
        scannedCount++;

        // 1. Verificar duplicado por URL
        const { data: existingByUrl } = await supabaseAdmin
          .from("articles")
          .select("id")
          .eq("source_url", item.link)
          .maybeSingle();

        if (existingByUrl) {
          continue;
        }

        // 2. Verificar duplicado por titular similar generado hoy
        const slugPrefix = normalizeText(item.title)
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
          .slice(0, 35);

        if (slugPrefix.length >= 12) {
          const { data: existingBySlug } = await supabaseAdmin
            .from("articles")
            .select("id")
            .ilike("slug", `${slugPrefix}%`)
            .maybeSingle();

          if (existingBySlug) {
            continue;
          }
        }

        const prompt = `
          Eres un editor deportivo chileno moderno para el portal "Pasión Deportiva".
          Redacta una nota periodística breve, objetiva y 100% original en español de Chile basándote ÚNICAMENTE en los hechos del siguiente despacho informativo.

          Reglas editoriales estrictas:
          1. NO copies frases literales del titular o resumen original; reescribe todo con voz propia.
          2. NO inventes marcadores, lesiones, fechas ni declaraciones que no aparezcan en el texto base.
          3. Si el medio de origen (${item.sourceName || "prensa deportiva"}) aporta un dato o reporte específico, cítalo de forma natural (ej. "según informó ${item.sourceName}").

          Titular de referencia: ${item.title}
          Contexto disponible: ${item.description}
          Medio de origen: ${item.sourceName || "No especificado"}
          Fecha de publicación: ${item.pubDate}

          Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
          {
            "title": "Titular atractivo, claro y sin humo en español de Chile (máximo 85 caracteres)",
            "section": "${feed.defaultSection}",
            "content": "Cuerpo de la noticia en 3 párrafos cortos, claros y directos en español de Chile."
          }
          Nota: En "section" usa solo uno de estos tres valores exactos: "chilenos", "superestrellas" o "torneos".
        `;

        const responseText = await generateSafeContent(
          prompt,
          process.env.GEMINI_API_KEY!
        );
        const rawText = responseText.replace(/```json|```/g, "").trim();
        const aiData = JSON.parse(rawText);

        const finalSlug = normalizeText(aiData.title)
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");

        const validSections = ["chilenos", "superestrellas", "torneos"];
        const finalSection = validSections.includes(aiData.section)
          ? aiData.section
          : feed.defaultSection;

        const coverImage = `/api/og?title=${encodeURIComponent(aiData.title)}&sport=${encodeURIComponent(feed.sport)}&tag=${encodeURIComponent(finalSection)}`;

        const { error: insertError } = await supabaseAdmin.from("articles").insert({
          title: aiData.title,
          slug: `${finalSlug}-${Date.now().toString().slice(-4)}`,
          content: aiData.content,
          sport: feed.sport,
          section: finalSection,
          cover_image: coverImage,
          source_url: item.link,
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
      errors.push(`Feed ${feed.name}: ${msg}`);
    }
  }

  return NextResponse.json({
    success: true,
    noticias_escaneadas: scannedCount,
    borradores_creados: createdCount,
    errores: errors,
  });
}
