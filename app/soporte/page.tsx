// 📍 Ruta del archivo: app/soporte/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import HomeFooter from "@/components/site/HomeFooter";
import { createClient } from "@/lib/supabase/client";
import {
  getPlayerIdentity,
  type PlayerIdentity,
} from "@/lib/profile/getPlayerIdentity";

type SupportCategory =
  | "cuenta-login"
  | "cuenta-registro"
  | "sala"
  | "juego"
  | "visual"
  | "puntos"
  | "sugerencia"
  | "jugador"
  | "otro";

type SupportOption = {
  id: SupportCategory;
  icon: string;
  title: string;
  label: string;
  description: string;
  template: string;
  priority: "Normal" | "Media" | "Alta";
};

const SUPPORT_EMAIL = "soporte@zamgelcore.com";

const SUPPORT_OPTIONS: SupportOption[] = [
  {
    id: "cuenta-login",
    icon: "🔐",
    title: "No puedo iniciar sesión",
    label: "Cuenta / Login",
    description:
      "Problemas para entrar, sesión que se cierra, pantalla que no avanza o error de acceso.",
    priority: "Alta",
    template:
      "Estoy teniendo problemas para iniciar sesión.\n\nQué ocurre:\n- Intento entrar a mi cuenta pero no puedo completar el acceso.\n- El problema aparece antes o después de iniciar sesión.\n\nQué necesito revisar:\n- Si mi cuenta está activa.\n- Si el enlace de acceso o redirección está funcionando bien.",
  },
  {
    id: "cuenta-registro",
    icon: "📝",
    title: "No puedo registrarme",
    label: "Cuenta / Registro",
    description:
      "Errores al crear cuenta, confirmar correo, recuperar contraseña o verificar email.",
    priority: "Alta",
    template:
      "Estoy teniendo problemas para registrarme o confirmar mi cuenta.\n\nQué ocurre:\n- Intento crear una cuenta o verificar mi correo, pero no puedo terminar el proceso.\n\nQué necesito revisar:\n- Registro.\n- Confirmación de correo.\n- Recuperación de contraseña.",
  },
  {
    id: "sala",
    icon: "🚪",
    title: "Problema con una sala",
    label: "Sala / Lobby",
    description:
      "No puedes crear sala, unirte, ver jugadores, cambiar listo o iniciar partida.",
    priority: "Media",
    template:
      "Estoy teniendo problemas con una sala.\n\nQué ocurre:\n- No puedo crear, entrar, ver jugadores o iniciar la partida correctamente.\n\nDatos útiles:\n- Código de sala si lo tengo:\n- Juego seleccionado:\n- Si estaba como host o invitado:",
  },
  {
    id: "juego",
    icon: "🎮",
    title: "Error dentro de un juego",
    label: "Partida / Juego",
    description:
      "Turnos trabados, resultados incorrectos, realtime lento, overlay o puntos que no aparecen.",
    priority: "Media",
    template:
      "Encontré un error dentro de un juego.\n\nQué ocurre:\n- La partida no avanzó como esperaba o algo se quedó trabado.\n\nDatos útiles:\n- Nombre del juego:\n- Variante si aplica:\n- Qué jugador era host:\n- En qué momento ocurrió:",
  },
  {
    id: "visual",
    icon: "📱",
    title: "Problema visual o móvil",
    label: "Diseño / Mobile",
    description:
      "Texto cortado, botones fuera de pantalla, overflow horizontal o algo raro en celular.",
    priority: "Normal",
    template:
      "Encontré un problema visual.\n\nQué ocurre:\n- Algo se ve cortado, demasiado grande, fuera de lugar o difícil de usar.\n\nDatos útiles:\n- Pantalla donde pasa:\n- Celular o navegador que uso:\n- Si ocurre vertical u horizontal:",
  },
  {
    id: "puntos",
    icon: "🪙",
    title: "Problema con puntos o XP",
    label: "Puntos / Progreso",
    description:
      "No recibiste puntos, XP, recompensa diaria o una estadística no se actualizó.",
    priority: "Media",
    template:
      "Tengo un problema con mis puntos, XP o estadísticas.\n\nQué ocurre:\n- Gané o jugué una partida, pero mi progreso no parece actualizarse correctamente.\n\nDatos útiles:\n- Juego jugado:\n- Resultado de la partida:\n- Puntos o XP que esperaba recibir:",
  },
  {
    id: "sugerencia",
    icon: "💡",
    title: "Tengo una sugerencia",
    label: "Idea / Mejora",
    description:
      "Ideas para juegos, funciones sociales, tienda, perfil, cosméticos o mejoras de experiencia.",
    priority: "Normal",
    template:
      "Tengo una sugerencia para La Mesa Familiar.\n\nMi idea es:\n- \n\nCreo que ayudaría porque:",
  },
  {
    id: "jugador",
    icon: "🛡️",
    title: "Reportar jugador",
    label: "Comunidad",
    description:
      "Reportes de comportamiento, nombres ofensivos, spam o problemas con otro jugador.",
    priority: "Alta",
    template:
      "Quiero reportar una situación con otro jugador.\n\nQué ocurrió:\n- \n\nDatos útiles:\n- Nombre del jugador:\n- Sala o juego donde pasó:\n- Fecha aproximada:",
  },
  {
    id: "otro",
    icon: "🧩",
    title: "Otro problema",
    label: "General",
    description:
      "Cualquier cosa que no encaje en las categorías anteriores.",
    priority: "Normal",
    template:
      "Necesito ayuda con algo de La Mesa Familiar.\n\nQué ocurre:\n- \n\nDetalles adicionales:",
  },
];

const FAQ_ITEMS = [
  {
    question: "No puedo iniciar sesión",
    answer:
      "Revisa que estés usando el correo correcto. Si vienes de un enlace externo, vuelve a lamesafamiliar.net/acceso e intenta entrar de nuevo.",
  },
  {
    question: "Mi sala no actualiza jugadores",
    answer:
      "Actualiza la página una vez. Si usas Brave, prueba desactivar Shields para La Mesa Familiar o abrir desde Chrome, ya que puede afectar realtime.",
  },
  {
    question: "No recibí puntos o XP",
    answer:
      "Algunas recompensas pueden tardar unos segundos. Si no aparece después de refrescar, manda el reporte con el juego y resultado.",
  },
  {
    question: "Algo se ve mal en celular",
    answer:
      "Manda el reporte de problema visual e incluye tu modelo de celular o una captura. Eso ayuda muchísimo a pulir mobile.",
  },
];

function buildDeviceInfo() {
  if (typeof window === "undefined") {
    return {
      browser: "No disponible",
      screen: "No disponible",
      path: "/soporte",
    };
  }

  return {
    browser: navigator.userAgent,
    screen: `${window.innerWidth}x${window.innerHeight}`,
    path: `${window.location.pathname}${window.location.search}`,
  };
}

export default function SupportPage() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [playerIdentity, setPlayerIdentity] = useState<PlayerIdentity | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory>("cuenta-login");
  const [comment, setComment] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedOption =
    SUPPORT_OPTIONS.find((option) => option.id === selectedCategory) ??
    SUPPORT_OPTIONS[0];

  const deviceInfo = useMemo(() => buildDeviceInfo(), [pathname]);

  useEffect(() => {
    let active = true;

    async function loadIdentity() {
      const identity = await getPlayerIdentity();
      if (!active) return;
      setPlayerIdentity(identity);
      setContactEmail(identity?.email ?? "");
    }

    void loadIdentity();

    return () => {
      active = false;
    };
  }, []);

  const reportText = useMemo(() => {
    const playerBlock = playerIdentity
      ? `Jugador: ${playerIdentity.name}\nTipo: ${playerIdentity.is_guest ? "Invitado" : "Usuario registrado"}\nCorreo de cuenta: ${playerIdentity.email ?? "No disponible"}`
      : "Jugador: No identificado\nTipo: Visitante sin sesión\nCorreo de cuenta: No disponible";

    return `Hola equipo de soporte,\n\nCategoría: ${selectedOption.label}\nPrioridad sugerida: ${selectedOption.priority}\n\n${selectedOption.template}\n\nComentario adicional del usuario:\n${comment.trim() || "Sin comentario adicional."}\n\nContacto para responder:\n${contactEmail.trim() || playerIdentity?.email || "No proporcionado"}\n\nInformación automática:\n${playerBlock}\nRuta actual: ${deviceInfo.path}\nPantalla: ${deviceInfo.screen}\nNavegador/dispositivo: ${deviceInfo.browser}\n\nGracias.`;
  }, [selectedOption, comment, contactEmail, playerIdentity, deviceInfo]);

  const mailtoHref = useMemo(() => {
    const subject = `[LMF Soporte] ${selectedOption.title}`;
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reportText)}`;
  }, [selectedOption.title, reportText]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();

      if (typeof window !== "undefined") {
        localStorage.removeItem("lmf:guest-profile");
        sessionStorage.removeItem("lmf:guest-profile");
      }

      setPlayerIdentity(null);
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeader
        playerIdentity={playerIdentity}
        onSignOut={playerIdentity ? handleSignOut : undefined}
        signingOut={signingOut}
        showHomeButton
        showProfileButton={!!playerIdentity}
        showLoginButton={!playerIdentity}
      />

      <section className="relative overflow-hidden px-4 pb-14 pt-8 sm:px-6 lg:pt-12">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute left-1/2 top-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute -left-24 top-40 h-56 w-56 rounded-full bg-cyan-500/5 blur-3xl" />
          <div className="absolute -right-20 top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/80 transition hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-200"
            >
              ← Volver
            </button>

            <Link
              href="/tutoriales"
              className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/15"
            >
              Ver tutoriales
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-orange-500/15 bg-gradient-to-br from-zinc-950 via-[#070707] to-[#160b05] p-5 shadow-[0_0_45px_rgba(249,115,22,0.10)] sm:p-7 lg:p-9">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-cyan-400/5 blur-3xl" />

            <div className="relative grid gap-7 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-orange-200">
                  Centro de soporte
                </div>

                <h1 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
                  ¿Algo falló en la mesa?
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                  Reporta problemas de cuenta, salas, juegos, puntos o errores
                  visuales. El formulario arma el mensaje por ti para que no
                  tengas que batallar explicando todo desde cero.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/60">
                    📱 Mobile-first
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/60">
                    🔐 Cuenta y acceso
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/60">
                    🎮 Juegos y salas
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-orange-500/15 bg-black/35 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-200">
                  Contacto oficial
                </p>
                <p className="mt-3 text-2xl font-black text-white">
                  {SUPPORT_EMAIL}
                </p>
                <p className="mt-3 text-sm leading-6 text-white/55">
                  Primera versión con correo prellenado. Más adelante podemos
                  convertirlo en tickets reales con folio, historial y panel de
                  administración.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-[2rem] border border-white/10 bg-zinc-950/85 p-4 shadow-[0_0_35px_rgba(0,0,0,0.25)] sm:p-5">
              <div className="mb-4 px-1">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                  Paso 1
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Elige el tipo de problema
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {SUPPORT_OPTIONS.map((option) => {
                  const active = option.id === selectedCategory;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedCategory(option.id)}
                      className={`group rounded-3xl border p-4 text-left transition ${
                        active
                          ? "border-orange-500/45 bg-orange-500/10 shadow-[0_0_28px_rgba(249,115,22,0.12)]"
                          : "border-white/10 bg-white/[0.03] hover:border-orange-500/25 hover:bg-orange-500/[0.06]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${
                            active
                              ? "bg-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.18)]"
                              : "bg-white/5"
                          }`}
                        >
                          {option.icon}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block font-black text-white">
                            {option.title}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-white/55">
                            {option.description}
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-orange-500/15 bg-gradient-to-br from-zinc-950 via-[#080808] to-[#100804] p-4 shadow-[0_0_40px_rgba(249,115,22,0.08)] sm:p-5 lg:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                    Paso 2
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    Mensaje preparado
                  </h2>
                </div>

                <span className="w-fit rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-200">
                  {selectedOption.priority}
                </span>
              </div>

              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white/45">
                    Correo para responderte
                  </span>
                  <input
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="tu-correo@email.com"
                    className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-orange-500/40 focus:bg-orange-500/[0.04]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-white/45">
                    Comentario adicional
                  </span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Agrega aquí lo que pasó, cuándo ocurrió o cualquier detalle que ayude..."
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-orange-500/40 focus:bg-orange-500/[0.04]"
                  />
                </label>

                <div className="rounded-3xl border border-white/10 bg-black/35 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                      Vista previa
                    </p>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-white/70 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-100"
                    >
                      {copied ? "Copiado ✓" : "Copiar"}
                    </button>
                  </div>

                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-black/45 p-4 text-xs leading-6 text-white/62">
                    {reportText}
                  </pre>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <a
                    href={mailtoHref}
                    className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-black shadow-[0_0_24px_rgba(249,115,22,0.25)] transition hover:scale-[1.01] hover:bg-orange-400"
                  >
                    Enviar por correo
                  </a>

                  <Link
                    href="/tutoriales"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:border-orange-500/30 hover:bg-orange-500/10"
                  >
                    Buscar tutorial
                  </Link>
                </div>

                <p className="text-xs leading-5 text-white/38">
                  Nota: el botón abre la app de correo del dispositivo con el
                  mensaje listo. Si no abre, usa “Copiar” y mándalo manualmente
                  a {SUPPORT_EMAIL}.
                </p>
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-[2rem] border border-cyan-400/10 bg-cyan-400/[0.03] p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                  Ayuda rápida
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Problemas frecuentes
                </h2>
              </div>
              <span className="text-sm font-bold text-white/45">
                Antes de reportar, quizá esto te ayude.
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {FAQ_ITEMS.map((item) => (
                <article
                  key={item.question}
                  className="rounded-3xl border border-white/10 bg-black/35 p-4"
                >
                  <h3 className="font-black text-white">{item.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    {item.answer}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}
