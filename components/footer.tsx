import { Users } from "lucide-react"

export function Footer() {
  return (
    <footer className="py-12 px-4 sm:px-6 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">La Mesa Familiar</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Uniendo familias a través de la alegría de los juegos clásicos, sin importar la distancia.
            </p>
          </div>

          {/* Games */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Juegos</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Lotería</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dominó</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Trivia</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pictionary</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Ayuda</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Centro de ayuda</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contáctanos</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preguntas frecuentes</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Política de privacidad</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Términos de servicio</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Política de cookies</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 La Mesa Familiar. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Twitter
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Instagram
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Facebook
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
