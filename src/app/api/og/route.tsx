import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get("title") || "Últimas noticias del deporte chileno";
  const sport = searchParams.get("sport") || "football";
  const tag = searchParams.get("tag") || "CHILENOS POR EL MUNDO";

  const accentColor =
    sport.toLowerCase() === "tennis" || sport.toLowerCase() === "tenis"
      ? "#ea580c"
      : "#16a34a";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0f172a",
          backgroundImage: `radial-gradient(circle at 85% 20%, ${accentColor}55 0%, transparent 55%)`,
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              backgroundColor: accentColor,
              color: "white",
              padding: "10px 24px",
              borderRadius: "9999px",
              fontSize: "22px",
              fontWeight: "bold",
            }}
          >
            {tag.toUpperCase()}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                backgroundColor: "#ef4444",
                color: "white",
                fontWeight: "bold",
                fontSize: "26px",
                padding: "8px 16px",
                borderRadius: "12px",
              }}
            >
              PD
            </div>
            <span style={{ color: "white", fontSize: "28px", fontWeight: "bold" }}>
              Pasión Deportiva
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <h1
            style={{
              color: "white",
              fontSize: title.length > 70 ? "46px" : "56px",
              fontWeight: "bold",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {title}
          </h1>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            borderTop: "2px solid #1e293b",
            paddingTop: "24px",
            color: "#94a3b8",
            fontSize: "22px",
          }}
        >
          <span>● INFORMACIÓN VERIFICADA</span>
          <span>pasiondeportiva.cl</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
