import "./globals.css";
import Image from "next/image";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-black text-white">
        
        {/* 🔥 NAVBAR */}
        <header className="w-full border-b border-orange-500/10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            
            {/* LOGO */}
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/branding/logo-horizontal.png"
                alt="La Mesa Familiar"
                width={200}
                height={50}
                priority
                className="h-10 w-auto transition-opacity hover:opacity-80"
              />
            </Link>

            {/* MENU */}
            <nav className="hidden md:flex gap-8 text-zinc-400">
              <a href="#" className="hover:text-white">Juegos</a>
              <a href="#" className="hover:text-white">Cómo funciona</a>
              <a href="#" className="hover:text-white">Funciones</a>
            </nav>

          </div>
        </header>

        {/* CONTENIDO */}
        {children}

      </body>
    </html>
  );
}
