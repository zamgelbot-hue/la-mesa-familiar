import "./globals.css";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-black text-white">
        {/* NAVBAR */}
        <header className="w-full border-b border-orange-500/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
            {/* LOGO */}
            <Link href="/" className="flex items-center gap-3 shrink-0 min-w-fit">
              {/* ICONO */}
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff7a00]">
                <img
                  src="/branding/logo-icono.png?v=3"
                  alt="Logo icono"
                  className="h-7 w-7 object-contain"
                />
              </div>

              {/* TEXTO */}
              <img
                src="/branding/logo-texto.png?v=3"
                alt="La Mesa Familiar"
                className="h-8 w-auto object-contain"
              />
            </Link>

            {/* MENU */}
            <nav className="hidden md:flex items-center gap-8 text-zinc-400">
              <a href="#" className="transition hover:text-white">
                Juegos
              </a>
              <a href="#" className="transition hover:text-white">
                Cómo funciona
              </a>
              <a href="#" className="transition hover:text-white">
                Funciones
              </a>
            </nav>
          </div>
        </header>

        {/* CONTENIDO */}
        {children}
      </body>
    </html>
  );
}
