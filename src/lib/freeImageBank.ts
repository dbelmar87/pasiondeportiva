// Diccionario de nombres clave para detectar protagonistas en el titular
const KNOWN_ENTITIES = [
    // Tenistas chilenos y Top ATP/WTA
    "Alejandro Tabilo",
    "Nicolás Jarry",
    "Cristian Garin",
    "Tomás Barrios",
    "Matías Soto",
    "Carlos Alcaraz",
    "Jannik Sinner",
    "Alexander Zverev",
    "Novak Djokovic",
    "Daniil Medvedev",
    "Aryna Sabalenka",
    "Iga Swiatek",
    "Coco Gauff",
    // Futbolistas y clubes chilenos
    "Alexis Sánchez",
    "Ben Brereton",
    "Darío Osorio",
    "Arturo Vidal",
    "Guillermo Maripán",
    "Gabriel Suazo",
    "Erick Pulgar",
    "Colo-Colo",
    "Universidad de Chile",
    "Universidad Católica",
    "Selección de fútbol de Chile",
    // Superestrellas y clubes europeos/internacionales
    "Real Madrid",
    "FC Barcelona",
    "Lamine Yamal",
    "Kylian Mbappé",
    "Vinícius Júnior",
    "Jude Jude Bellingham",
    "Erling Haaland",
    "Lionel Messi",
    "Cristiano Ronaldo",
    "Inter Miami",
    "Al-Nassr",
    "Manchester City",
    "Liverpool FC",
    "Arsenal FC",
    "Bayern Munich",
    "Inter Milan",
    "Juventus",
    "Paris Saint-Germain",
  ];
  
  // Fotos deportivas libres de derechos (Unsplash / Wikimedia) como respaldo temático
  const FALLBACK_SPORTS_PHOTOS = {
    tennis: [
      "https://unsplash.com",
      "https://unsplash.com",
      "https://unsplash.com",
    ],
    football: [
      "https://unsplash.com",
      "https://unsplash.com",
      "https://unsplash.com",
    ],
  };
  
  function normalizeStr(text: string) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
  
  function detectEntityFromTitle(title: string): string | null {
    const normTitle = normalizeStr(title);
  
    // Alias comunes en titulares chilenos
    if (normTitle.includes("la roja") || normTitle.includes("seleccion chilena")) {
      return "Selección de fútbol de Chile";
    }
    if (normTitle.includes("alcaraz")) return "Carlos Alcaraz";
    if (normTitle.includes("sinner")) return "Jannik Sinner";
    if (normTitle.includes("zverev")) return "Alexander Zverev";
    if (normTitle.includes("djokovic")) return "Novak Djokovic";
    if (normTitle.includes("tabilo")) return "Alejandro Tabilo";
    if (normTitle.includes("jarry")) return "Nicolás Jarry";
    if (normTitle.includes("garin")) return "Cristian Garin";
    if (normTitle.includes("barrios")) return "Tomás Barrios";
    if (normTitle.includes("alexis")) return "Alexis Sánchez";
    if (normTitle.includes("brereton")) return "Ben Brereton";
    if (normTitle.includes("osorio")) return "Darío Osorio";
    if (normTitle.includes("vidal")) return "Arturo Vidal";
    if (normTitle.includes("mbappe")) return "Kylian Mbappé";
    if (normTitle.includes("vinicius")) return "Vinícius Júnior";
    if (normTitle.includes("barcelona")) return "FC Barcelona";
  
    for (const entity of KNOWN_ENTITIES) {
      if (normTitle.includes(normalizeStr(entity))) {
        return entity;
      }
    }
  
    return null;
  }
  
  async function searchWikimediaCommonsPhoto(query: string): Promise<string | null> {
    try {
      const apiUrl = new URL("https://wikimedia.org");
      apiUrl.searchParams.set("action", "query");
      apiUrl.searchParams.set("generator", "search");
      apiUrl.searchParams.set("gsrsearch", `filetype:bitmap ${query}`);
      apiUrl.searchParams.set("gsrnamespace", "6"); // Namespace File:
      apiUrl.searchParams.set("gsrlimit", "5");
      apiUrl.searchParams.set("prop", "imageinfo");
      apiUrl.searchParams.set("iiprop", "url|size|extmetadata");
      apiUrl.searchParams.set("iiurlwidth", "1000");
      apiUrl.searchParams.set("format", "json");
      apiUrl.searchParams.set("origin", "*");
  
      const res = await fetch(apiUrl.toString(), {
        headers: {
          "User-Agent": "PasionDeportivaBot/1.0 (contacto@pasiondeportiva.cl)",
        },
        cache: "no-store",
      });
  
      if (!res.ok) return null;
      const data = await res.json();
      const pages = data?.query?.pages;
      if (!pages) return null;
  
      // Filtrar imágenes reales (evitar logos SVG, mapas o gráficos estadísticos)
      for (const page of Object.values(pages) as any[]) {
        const titleLower = (page.title || "").toLowerCase();
        if (
          titleLower.includes("evolution") ||
          titleLower.includes("chart") ||
          titleLower.includes("logo") ||
          titleLower.includes("flag") ||
          titleLower.includes("map") ||
          titleLower.endsWith(".svg") ||
          titleLower.endsWith(".png")
        ) {
          continue;
        }
  
        const info = page.imageinfo?.[0];
        const imageUrl = info?.thumburl || info?.url;
        if (imageUrl && info?.width >= 500) {
          return imageUrl;
        }
      }
  
      return null;
    } catch {
      return null;
    }
  }
  
  export async function getFreeNewsImage(
    title: string,
    sport: "football" | "tennis"
  ): Promise<string> {
    const entity = detectEntityFromTitle(title);
  
    if (entity) {
      const wikiPhoto = await searchWikimediaCommonsPhoto(entity);
      if (wikiPhoto) return wikiPhoto;
    }
  
    // Si no hay foto del protagonista en Wikimedia, usar foto libre temática aleatoria
    const pool =
      sport === "tennis"
        ? FALLBACK_SPORTS_PHOTOS.tennis
        : FALLBACK_SPORTS_PHOTOS.football;
  
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  }
  