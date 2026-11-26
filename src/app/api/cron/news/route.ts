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
    .replace(/&apos;/g, "'")
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

const BLOCKED_KEYWORDS = [
  // Espectáculos y TV
  "teleserie", "telenovela", "farandula", "reality", "gran hermano",
  "palabras al cierre", "matinal", "espectaculos", "romance", "polola",
  "quiebre amoroso", "infidelidad", "festival de vina", "mega", "chilevision",
  "canal 13", "tvn", "rating", "capitulo", "actor", "actriz", "cantante",
  // Guías de TV, horarios y previas clickbait sin noticia real
  "donde ver", "a que hora", "que canal transmite", "transmision en vivo",
  "ver en vivo", "ver online", "minuto a minuto", "posible formacion",
  "probable formacion", "pronostico", "apuestas", "cuotas"
];

function isValidFeaturedNews(item: RssItem): boolean {
  const titleNorm = normalizeText(item.title);
  const fullText = normalizeText(`${item.title} ${item.description}`);

  // 1. Bloquear farándula y guías de "dónde ver / a qué hora"
  if (BLOCKED_KEYWORDS.some((word) => fullText.includes(word))) {
    return false;
  }

  // 2. Evitar titulares en forma de pregunta clickbait ("¿Dónde ver...?", "¿A qué hora...?")
  if (titleNorm.startsWith("donde ") || titleNorm.startsWith("¿donde ") || titleNorm.startsWith("a que hora") || titleNorm.startsWith("¿a que hora")) {
    return false;
  }

  // 3. Exigir un mínimo de contexto en la descripción para que la IA no escriba notas vacías
  if (item.description.trim().length < 45) {
    return false;
  }

  return true;
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
  // Excluimos TV, farándula y notas de "dónde ver / a qué hora" directamente en Google News
  const cleanQuery = `${query} -farandula -teleserie -reality -espectaculos -"donde ver" -"a que hora" -pronostico when:1d`;
  url.searchParams.set("q", cleanQuery);
  url.searchParams.set("hl", "es-419");
  url.searchParams.set("gl", "CL");
  url.searchParams.set("ceid", "CL:es-419");
  return url.toString();
}

const RSS_FEEDS = [
  {
    name: "Legión Chilena y Fútbol Nacional",
    url: buildGoogleNewsUrl(
      '("Alexis Sánchez" OR "Ben Brereton" OR "Darío Osorio" OR "Guillermo Maripán" OR "Gabriel Suazo" OR "Erick Pulgar" OR "Paulo Díaz" OR "Marcelino Núñez" OR "Felipe Loyola" OR "Selección Chilena" OR "La Roja" OR "Colo-Colo" OR "Universidad de Chile" OR "Universidad Católica")'
    ),
    sport: "football",
    defaultSection: "chilenos",
  },
  {
    name: "Élite Tenis Mundial y Chilenos",
    url: buildGoogleNewsUrl(
      '("Alejandro Tabilo" OR "Nicolás Jarry" OR "Cristian Garin" OR "Tomás Barrios" OR "Carlos Alcaraz" OR "Jannik Sinner" OR "Alexander Zverev" OR "Novak Djokovic" OR "Aryna Sabalenka" OR "Elena Rybakina" OR "Iga Swiatek" OR "Coco Gauff")'
    ),
    sport: "tennis",
    defaultSection: "chilenos",
  },
  {
    name: "Superestrellas y Grandes Torneos",
    url: buildGoogleNewsUrl(
      '("Real Madrid" OR "FC Barcelona" OR "Lamine Yamal" OR "Kylian Mbappé" OR "Vinicius" OR "Erling Haaland" OR "Lionel Messi" OR "Cristiano Ronaldo" OR "Champions League" OR "Copa Libertadores")'
    ),
    sport: "football",
    defaultSection: "superestrellas",
  },
];

async function generateSafeContent(prompt: string, apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTry = [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
  ];
  let lastError: unknown;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text) return text;
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

  const offset = new Date().getUTCHours() % RSS_FEEDS.length;
  const rotatedFeeds = [
    ...RSS_FEEDS.slice(offset),
    ...RSS_FEEDS.slice(0, offset),
  ];

  let createdCount = 0;
  let scannedCount = 0;
  let aiAttempts = 0;
  const MAX_AI_ATTEMPTS = 2;
  const publishedTitles: string[] = [];
  const errors: string[] = [];
  const MAX_AGE_MS = 8 * 60 * 60 * 1000;
  const now = Date.now();

  for (const feed of rotatedFeeds) {
    if (createdCount >= 1 || aiAttempts >= MAX_AI_ATTEMPTS) {
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

      for (const item of recentItems.slice(0, 10)) {
        if (createdCount >= 1 || aiAttempts >= MAX_AI_ATTEMPTS) break;

        if (!isValidFeaturedNews(item)) continue;

        scannedCount++;

        const { data: existingByUrl } = await supabaseAdmin
          .from("articles")
          .select("id")
          .eq("source_url", item.link)
          .maybeSingle();

        if (existingByUrl) continue;

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

          if (existingBySlug) continue;
        }

        const prompt = `
        Eres el editor jefe del portal deportivo chileno "Pasión Deportiva" (exclusivo de FÚTBOL y TENIS de alto impacto).
        Evalúa el despacho informativo y recházalo respondiendo ÚNICAMENTE {"reject": true} si cumple CUALQUIERA de estas condiciones:
        - Trata de farándula, TV, teleseries o vida privada/amorosa.
        - Es una nota de guía de televisión, horarios o "dónde ver el partido" (ej. "Dónde ver...", "A qué hora juega...", "Qué canal transmite...").
        - Es una noticia menor, relleno, rumor sin sustancia o no aporta un hecho noticioso concreto (resultado relevante, gol/actuación destacada, lesión oficial, fichaje, clasificación o declaración importante).

        Si SÍ es una noticia deportiva destacada con hechos concretos, redacta una nota periodística completa, atractiva y 100% original en español de Chile basándote ÚNICAMENTE en los datos del despacho.

        Reglas editoriales estrictas:
        1. NUNCA uses titulares tipo "Dónde ver..." ni preguntas clickbait. El titular debe ir directo al hecho noticioso.
        2. NO copies frases literales del texto original; reescribe todo con estilo periodístico ágil.
        3. NO inventes marcadores, lesiones, canales de TV ni declaraciones que no estén en el contexto.
        4. Cita de forma natural al medio de origen (${item.sourceName || "prensa deportiva"}) si aporta el reporte.

        Titular de referencia: ${item.title}
        Contexto disponible: ${item.description}
        Medio de origen: ${item.sourceName || "No especificado"}
        Fecha de publicación: ${item.pubDate}

        Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
        {
          "reject": false,
          "title": "Titular directo, informativo y atractivo en español de Chile (máximo 85 caracteres)",
          "section": "${feed.defaultSection}",
          "content": "Desarrollo completo de la noticia en 3 párrafos claros y bien redactados en español de Chile (mínimo 90 palabras en total)."
        }
        Nota: En "section" usa solo uno de estos tres valores exactos: "chilenos", "superestrellas" o "torneos".
      `;

        aiAttempts++;

        try {
          const responseText = await generateSafeContent(
            prompt,
            process.env.GEMINI_API_KEY!
          );
          const rawText = responseText.replace(/```json|```/g, "").trim();
          const aiData = JSON.parse(rawText);

          if (aiData.reject === true || !aiData.title || !aiData.content) {
            continue;
          }

          let finalSlug = normalizeText(aiData.title)
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");

          const { data: duplicateSlug } = await supabaseAdmin
            .from("articles")
            .select("id")
            .eq("slug", finalSlug)
            .maybeSingle();

          if (duplicateSlug) {
            finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
          }

          const validSections = ["chilenos", "superestrellas", "torneos"];
          const finalSection = validSections.includes(aiData.section)
            ? aiData.section
            : feed.defaultSection;

          const coverImage = `/api/og?title=${encodeURIComponent(
            aiData.title
          )}&sport=${encodeURIComponent(feed.sport)}&tag=${encodeURIComponent(
            finalSection
          )}`;

          const { error: insertError } = await supabaseAdmin
            .from("articles")
            .insert({
              title: aiData.title,
              slug: finalSlug,
              content: aiData.content,
              sport: feed.sport,
              section: finalSection,
              cover_image: coverImage,
              source_url: item.link,
              status: "published",
            });

          if (insertError) {
            errors.push(`Error insertando en Supabase: ${insertError.message}`);
            continue;
          }

          createdCount++;
          publishedTitles.push(aiData.title);
        } catch (itemErr) {
          errors.push(
            `Error procesando "${item.title.slice(0, 40)}..." en ${feed.name}: ${
              itemErr instanceof Error ? itemErr.message : "desconocido"
            }`
          );
          continue;
        }
      }
    } catch (err) {
      errors.push(
        `Error en feed ${feed.name}: ${
          err instanceof Error ? err.message : "desconocido"
        }`
      );
    }
  }

  if (createdCount === 0 && errors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        created: 0,
        scanned: scannedCount,
        published: [],
        errors,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    created: createdCount,
    scanned: scannedCount,
    published: publishedTitles,
    errors: errors.length > 0 ? errors : undefined,
  });
}


