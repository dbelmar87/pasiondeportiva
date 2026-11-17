import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pasiondeportiva.vercel.app/';
const defaultOgImage = "/api/og?title=Pasión%20Deportiva%20%7C%20100%25%20Sin%20Humo&sport=football&tag=PORTADA%20OFICIAL";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pasión Deportiva | 100% Sin Humo",
    template: "%s | Pasión Deportiva",
  },
  description:
    "Seguimiento en tiempo real a futbolistas y tenistas chilenos en el extranjero y las grandes figuras del deporte mundial. Información deportiva verificada y 100% sin humo.",
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: siteUrl,
    siteName: "Pasión Deportiva",
    title: "Pasión Deportiva | 100% Sin Humo",
    description: "Noticias verificadas de chilenos por el mundo, Tenis ATP y fútbol internacional.",
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "Pasión Deportiva - 100% Sin Humo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pasión Deportiva | 100% Sin Humo",
    description: "Seguimiento en tiempo real al deporte chileno y mundial.",
    images: [defaultOgImage],
  },
};


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
