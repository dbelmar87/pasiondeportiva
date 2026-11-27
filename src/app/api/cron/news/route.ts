import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { getFreeNewsImage } from "@/lib/freeImageBank";

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
  "probable formacion", "pronostico", "apuestas", "cuotas",
  "todos los goles", "resumen de la fecha", "resumen de la jornada",
  "asi quedo la tabla", "resultados de la fecha", "resultados de la jornada", "compacto"
];

function isValidFeaturedNews(item: RssItem): boolean {
  const titleNorm = normalizeText(item.title);
  const fullText = normalizeText(`${item.title} ${item.description}`);

  if (BLOCKED_KEYWORDS.some((word) => fullText.includes(word))) {
    return false;
  }

  if (
    titleNorm.startsWith("donde ") ||
    titleNorm.startsWith("¿donde ") ||
    titleNorm.startsWith("a que hora") ||
    titleNorm.startsWith("¿a que hora")
  ) {
    return false;
  }

  if (item.description.trim().length < 85) {
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
    sport: "football" as const,
    defaultSection: "chilenos",
  },
  {
    name: "Élite Tenis Mundial y Chilenos",
    url: buildGoogleNewsUrl(
      '("Alejandro Tabilo" OR "Nicolás Jarry" OR "Cristian Garin" OR "Tomás Barrios" OR "Carlos Alcaraz" OR "Jannik Sinner" OR "Alexander Zverev" OR "Novak Djokovic" OR "Aryna Sabalenka" OR "Elena Rybakina" OR "Iga Swiatek" OR "Coco Gauff")'
    ),
    sport: "tennis" as const,
    defaultSection: "chilenos",
  },
  {
    name: "Superestrellas y Grandes Torneos",
    url: buildGoogleNewsUrl(
      '("Real Madrid" OR "FC Barcelona" OR "Lamine Yamal" OR "Kylian Mbappé" OR "Vinicius" OR "Erling Haaland" OR "Lionel Messi" OR "Cristiano Ronaldo" OR "Champions League" OR "Copa Libertadores")'
    ),
    sport: "football" as const,
    defaultSection: "superestrellas",
  },
];

async function generateSafeContent(prompt: string, apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
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
  const secret = searchParams.get("secret")?.trim();
  const authHeader = request.headers.get("authorization")?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (
    cronSecret &&
    secret !== cronSecret &&
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta GEMINI_API_KEY en variables de entorno" },
      { status: 500 }
    );
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

        // Bloque individual por artículo para evitar que un fallo detenga el flujo
        try {
          aiAttempts++;

          const prompt = `
          Eres el editor jefe del portal deportivo chileno "Pasión Deportiva" (100% SIN HUMO, exclusivo de FÚTBOL y TENIS).
          Evalúa el despacho informativo y recházalo respondiendo ÚNICAMENTE {"reject": true} si cumple CUALQUIERA de estas condiciones:
          - Trata de farándula, TV, teleseries o vida privada/amorosa.
          - Es una guía de TV, horarios o "dónde ver el partido".
          - Es un compilado o resumen genérico (ej. "Todos los goles de la fecha", "Resultados de la jornada", "Así quedó la tabla") donde el contexto disponible NO incluye los marcadores exactos ni los nombres de los equipos/jugadores protagonistas.
          - El texto base tiene tan poca información que te obligaría a rellenar con frases generales o lugares comunes sin datos duros.

          Si SÍ tiene datos concretos (nombres propios, resultado exacto, lesión, fichaje o declaración específica), redacta una nota periodística directa y 100% original en español de Chile basándote ÚNICAMENTE en los hechos entregados.

          Reglas editoriales estrictas:
          1. PROHIBIDO el relleno genérico (frases como "alta intensidad ofensiva", "mantuvo a los hinchas al borde del asiento" o "promete mantenerse al rojo vivo"). Cada oración debe aportar un dato concreto del despacho.
          2. Si el texto habla de un resultado o partido, incluye obligatoriamente los equipos y el marcador que aparecen en el contexto; si no aparecen en el contexto, rechaza la nota con {"reject": true}.
          3. NO copies frases literales ni inventes datos que no estén en el texto base.
          4. Si los hechos alcanzan solo para 2 párrafos concretos, escribe 2 párrafos contundentes en lugar de inventar un tercero de relleno.

          Titular de referencia: ${item.title}
          Contexto disponible: ${item.description}
          Medio de origen: ${item.sourceName || "No especificado"}
          Fecha de publicación: ${item.pubDate}

          Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
          {
            "reject": false,
            "title": "Titular directo con el hecho o resultado concreto en español de Chile (máximo 85 caracteres)",
            "sport": "${feed.sport}",
            "section": "${feed.defaultSection}",
            "content": "Desarrollo periodístico directo en 2 o 3 párrafos cortos, cargados de datos concretos y sin relleno."
          }
          Reglas de clasificación:
          - "sport": usa exactamente "football" (fútbol) o "tennis" (tenis).
          - "section": usa "chilenos" si la noticia menciona a algún futbolista, tenista, club o selección de Chile; de lo contrario usa "superestrellas" o "torneos".
        `;

        const aiRaw = await generateSafeContent(prompt, apiKey);
        const cleanedJson = aiRaw
          .replace(/^```json\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();

        const parsed = JSON.parse(cleanedJson);

        if (parsed.reject === true || !parsed.title || !parsed.content) {
          continue;
        }

        const finalSport: "football" | "tennis" =
          parsed.sport === "tennis" ? "tennis" : "football";
        const allowedSections = ["chilenos", "superestrellas", "torneos"];
        const finalSection = allowedSections.includes(parsed.section)
          ? parsed.section
          : feed.defaultSection;

        const slugPrefix = normalizeText(parsed.title)
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
          .slice(0, 60);

        const uniqueSlug = `${slugPrefix}-${Date.now().toString().slice(-4)}`;

        const coverImage = await getFreeNewsImage(parsed.title, finalSport);

        const { error: insertError } = await supabaseAdmin
          .from("articles")
          .insert({
            title: parsed.title.trim(),
            slug: uniqueSlug,
            content: parsed.content.trim(),
            sport: finalSport,
            section: finalSection,
            source_url: item.link,
            cover_image: coverImage,
            status: "published",
            featured: true,
          });

        if (insertError) {
          errors.push(`Error insertando en Supabase: ${insertError.message}`);
          continue;
        }

        createdCount++;
        publishedTitles.push(parsed.title.trim());
      } catch (itemErr: any) {
        errors.push(
          `Error procesando "${item.title.slice(0, 40)}...": ${itemErr?.message || "Error IA"}`
        );
      }
    }
  } catch (feedErr: any) {
    errors.push(`Fallo en feed ${feed.name}: ${feedErr?.message || "Error"}`);
  }
}

return NextResponse.json({
  ok: true,
  created: createdCount,
  scanned: scannedCount,
  aiAttempts,
  publishedTitles,
  errors,
});
}
