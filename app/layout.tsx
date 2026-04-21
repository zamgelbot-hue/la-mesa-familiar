import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lamesafamiliar.net"),
  title: "La Mesa Familiar",
  description: "Juegos clásicos en línea para disfrutar con tu familia donde sea.",
  icons: {
    icon: "/branding/logo-icono.png",
    shortcut: "/branding/logo-icono.png",
    apple: "/branding/logo-icono.png",
  },
  openGraph: {
    title: "La Mesa Familiar",
    description: "Juegos clásicos en línea para disfrutar con tu familia donde sea.",
    url: "https://lamesafamiliar.net",
    siteName: "La Mesa Familiar",
    images: [
      {
        url: "/branding/og-image.png",
        width: 1200,
        height: 630,
        alt: "La Mesa Familiar",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "La Mesa Familiar",
    description: "Juegos clásicos en línea para disfrutar con tu familia donde sea.",
    images: ["/branding/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
