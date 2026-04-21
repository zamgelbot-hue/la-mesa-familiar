"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type LegalType = "terms" | "privacy" | null;

function LegalModal({
  open,
  type,
  onClose,
}: {
  open: boolean;
  type: LegalType;
  onClose: () => void;
}) {
  const content = useMemo(() => {
    if (type === "terms") {
      return {
        title: "Términos y Condiciones",
        body: (
          <>
            <p>
              Bienvenido a <strong>La Mesa Familiar</strong>. Al acceder y usar
              esta plataforma, aceptas los presentes términos y condiciones.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-white">
              1. Uso de la plataforma
            </h3>
            <p className="mt-2">
              La Mesa Familiar ofrece una experiencia de juegos en línea pensada
              para compartir con familia y amigos. El usuario se compromete a
              usar la plataforma de manera respetuosa, legal y sin afectar la
              experiencia de otros jugadores.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-white">
              2. Cuentas y acceso
            </h3>
            <p className="mt-2">
              Algunas funciones pueden requerir inicio de sesión o ingreso a
              salas privadas. El usuario es responsable del uso de su cuenta y
              de mantener segura su información de acceso.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-white">
              3. Conducta del usuario
            </h3>
            <p className="mt-2">
              No está permitido usar lenguaje ofensivo, intentar vulnerar la
              seguridad del sistema, interferir con partidas, automatizar el uso
              de la plataforma o realizar actividades fraudulentas.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-white">
              4. Disponibilidad del servicio
            </h3>
            <p className="mt-2">
              Nos esforzamos por mantener la plataforma disponible y estable,
              pero no garantizamos funcionamiento ininterrumpido en todo
              momento. Algunas funciones pueden cambiar, mejorarse o retirarse
              sin previo aviso.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-white">
              5. Propiedad intelectual
            </h3>
            <p className="mt-2">
              El diseño, identidad visual, textos, interfaz, logotipos y
              elementos de marca de La Mesa Familiar pertenecen a sus
              respectivos titulares y no pueden reproducirse sin autorización.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-white">
              6. Enlaces externos y patrocinadores
            </h3>
            <p className="mt-2">
              La plataforma puede incluir referencias o enlaces a marcas,
              servicios o sitios externos, como parte de colaboraciones,
              publicidad o patrocinio. El acceso a esos servicios externos queda
              sujeto a sus propios términos y políticas.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-white">
              7. Limitación de responsabilidad
            </h3>
            <p className="mt-2">
              La Mesa Familiar no será responsable por pérdidas indirectas,
              interrupciones, problemas técnicos de terceros, fallas de conexión
              o usos indebidos realizados por los usuarios.
            </p>

            <h3 className="mt-6 text-lg font-semibold text-white">
              8. Cambios a estos términos
            </h3>
            <p className="mt-2">
              Estos términos pueden actualizarse en cualquier momento. El uso
              continuo de la plataforma después de una modificación implica la
              aceptación de los cambios.
            </p>
          </>
        ),
      };
    }

    return {
      title: "Política de Privacidad",
      body: (
        <>
          <p>
            En <strong>La Mesa Familiar</strong> valoramos tu privacidad. Esta
            política explica, de forma general, cómo se maneja la información
            dentro de la plataforma.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-white">
            1. Información que podemos recopilar
          </h3>
          <p className="mt-2">
            Podemos recopilar información básica de uso, como nombre de perfil,
            datos de acceso, identificadores técnicos, actividad dentro de la
            plataforma y preferencias relacionadas con la experiencia de juego.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-white">
            2. Uso de la información
          </h3>
          <p className="mt-2">
            La información se utiliza para permitir el acceso, mejorar la
            experiencia del usuario, mantener la seguridad, habilitar funciones
            como salas privadas, ranking, estadísticas y soporte técnico.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-white">
            3. Protección de datos
          </h3>
          <p className="mt-2">
            Se aplican medidas razonables para proteger la información del
            usuario. Sin embargo, ningún sistema en línea puede garantizar
            seguridad absoluta.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-white">
            4. Compartición con terceros
          </h3>
          <p className="mt-2">
            No vendemos información personal. En ciertos casos, algunos datos
            pueden ser procesados por servicios de infraestructura, analítica,
            autenticación o alojamiento necesarios para operar la plataforma.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-white">
            5. Cookies y tecnologías similares
          </h3>
          <p className="mt-2">
            Podemos usar cookies o tecnologías similares para mantener sesiones,
            recordar preferencias y analizar el funcionamiento general del
            servicio.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-white">
            6. Enlaces externos
          </h3>
          <p className="mt-2">
            Algunos enlaces pueden dirigir al usuario a servicios externos,
            incluyendo marcas patrocinadoras o asociadas. Cada sitio externo
            maneja su propia política de privacidad.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-white">
            7. Cambios a esta política
          </h3>
          <p className="mt-2">
            Esta política puede actualizarse para reflejar mejoras del servicio
            o cambios operativos. El uso continuo de la plataforma implica
            aceptación de dichas actualizaciones.
          </p>
        </>
      ),
    };
  }, [type]);

  if (!open || !type) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-orange-500/20 bg-[#060606] shadow-[0_0_40px_rgba(249,115,22,0.12)]">
        <div className="flex items-center justify-between border-b border-orange-500/10 px-6 py-4">
          <h2 className="text-xl font-bold text-white">{content.title}</h2>

          <button
            onClick={onClose}
            className="rounded-full border border-orange-500/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:border-orange-500/40 hover:bg-orange-500/10"
          >
            Cerrar
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 text-sm leading-7 text-white/75">
          {content.body}
        </div>
      </div>
    </div>
  );
}

export default function HomeFooter() {
  const [legalOpen, setLegalOpen] = useState<LegalType>(null);

  return (
    <>
      <footer className="relative border-t border-orange-500/10 bg-black">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(249,115,22,0.10),transparent_35%)]" />

        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1.2fr]">
            <div className="relative overflow-hidden rounded-3xl border border-orange-500/15 bg-gradient-to-br from-[#0a0a0a] via-[#080808] to-[#140b05] p-6 shadow-[0_0_35px_rgba(249,115,22,0.06)] transition hover:border-orange-500/25 hover:shadow-[0_0_50px_rgba(249,115,22,0.08)]">
              <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-28 w-28 rounded-full bg-amber-500/10 blur-3xl" />

              <div className="relative">
                <div className="mb-5 flex items-center gap-4">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent shadow-[0_0_25px_rgba(249,115,22,0.10)]">
                    <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle,rgba(249,115,22,0.18),transparent_70%)]" />
                    <img
                      src="/branding/logo_icono.png"
                      alt="Logo La Mesa Familiar"
                      className="relative z-10 h-12 w-12 object-contain"
                    />
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      La Mesa Familiar
                    </h3>
                    <p className="text-sm text-orange-200/80">
                      Juegos clásicos, experiencia moderna.
                    </p>
                  </div>
                </div>

                <p className="max-w-xl text-sm leading-7 text-white/72">
                  Una plataforma creada para reunir a familias y amigos en salas
                  privadas, partidas en tiempo real y momentos especiales
                  compartidos desde cualquier lugar.
                </p>

                <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">
                  Diseñada para que jugar en línea se sienta cercano, fácil y
                  cálido, como una verdadera noche de juegos en familia.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-full border border-orange-500/15 bg-white/[0.03] px-3 py-1 text-xs text-white/65">
                    Salas privadas
                  </span>
                  <span className="rounded-full border border-orange-500/15 bg-white/[0.03] px-3 py-1 text-xs text-white/65">
                    Tiempo real
                  </span>
                  <span className="rounded-full border border-orange-500/15 bg-white/[0.03] px-3 py-1 text-xs text-white/65">
                    Sin descargas
                  </span>
                  <span className="rounded-full border border-orange-500/15 bg-white/[0.03] px-3 py-1 text-xs text-white/65">
                    Para toda la familia
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-orange-500/10 bg-orange-500/[0.04] px-4 py-3 transition hover:border-orange-500/20 hover:bg-orange-500/[0.06]">
                    <p className="text-lg font-extrabold text-white">Online</p>
                    <p className="text-xs uppercase tracking-[0.15em] text-white/45">
                      Tiempo real
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-500/10 bg-orange-500/[0.04] px-4 py-3 transition hover:border-orange-500/20 hover:bg-orange-500/[0.06]">
                    <p className="text-lg font-extrabold text-white">Privado</p>
                    <p className="text-xs uppercase tracking-[0.15em] text-white/45">
                      Salas seguras
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-500/10 bg-orange-500/[0.04] px-4 py-3 transition hover:border-orange-500/20 hover:bg-orange-500/[0.06]">
                    <p className="text-lg font-extrabold text-white">Fácil</p>
                    <p className="text-xs uppercase tracking-[0.15em] text-white/45">
                      Sin descargas
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-500/10 bg-orange-500/[0.04] px-4 py-3 transition hover:border-orange-500/20 hover:bg-orange-500/[0.06]">
                    <p className="text-lg font-extrabold text-white">
                      Familiar
                    </p>
                    <p className="text-xs uppercase tracking-[0.15em] text-white/45">
                      Para todos
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-[#0a0a0a] via-[#090909] to-[#140b05] p-6 shadow-[0_0_40px_rgba(249,115,22,0.08)] transition hover:border-orange-500/30 hover:shadow-[0_0_55px_rgba(249,115,22,0.10)]">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl transition duration-500 group-hover:bg-orange-500/15" />
              <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl transition duration-500 group-hover:bg-orange-500/15" />

              <div className="relative">
                <div className="mb-4 inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                  Patrocinador oficial
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/20 bg-black/40 shadow-[0_0_25px_rgba(249,115,22,0.10)]">
                    <img
                      src="/branding/icon_santieltv.png"
                      alt="Logo Santiel TV"
                      className="h-12 w-12 rounded-xl object-contain"
                    />
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      Santiel TV
                    </h3>
                    <p className="text-sm text-orange-300/90">
                      Entretenimiento en línea para toda la familia
                    </p>
                  </div>
                </div>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/72">
                  Descubre una opción completa de entretenimiento con acceso a
                  películas, series y canales en vivo en múltiples dispositivos.
                  Una experiencia práctica, moderna y pensada para disfrutar en
                  casa.
                </p>

                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-orange-300/65">
                  Contenido disponible
                </p>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-orange-500/15 bg-orange-500/[0.05] px-4 py-3 text-center transition hover:border-orange-500/25 hover:bg-orange-500/[0.07]">
                    <p className="text-xl font-extrabold text-white">+18K</p>
                    <p className="text-xs uppercase tracking-[0.15em] text-white/50">
                      Películas
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-500/15 bg-orange-500/[0.05] px-4 py-3 text-center transition hover:border-orange-500/25 hover:bg-orange-500/[0.07]">
                    <p className="text-xl font-extrabold text-white">+4.5K</p>
                    <p className="text-xs uppercase tracking-[0.15em] text-white/50">
                      Series
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-500/15 bg-orange-500/[0.05] px-4 py-3 text-center transition hover:border-orange-500/25 hover:bg-orange-500/[0.07]">
                    <p className="text-xl font-extrabold text-white">+3K</p>
                    <p className="text-xs uppercase tracking-[0.15em] text-white/50">
                      TV en vivo
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    href="https://santieltv.com"
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-orange-400"
                  >
                    Conocer Santiel TV
                  </Link>

                  <Link
                    href="https://wa.me/13468847800"
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-full border border-orange-500/25 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-orange-500/50 hover:bg-orange-500/10"
                  >
                    Contactar por WhatsApp
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-orange-500/10 bg-white/[0.02] px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-white/45">
                © 2026 La Mesa Familiar. Todos los derechos reservados.
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <button
                  onClick={() => setLegalOpen("terms")}
                  className="text-white/60 transition hover:text-orange-300"
                >
                  Términos y Condiciones
                </button>

                <button
                  onClick={() => setLegalOpen("privacy")}
                  className="text-white/60 transition hover:text-orange-300"
                >
                  Política de Privacidad
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <LegalModal
        open={legalOpen !== null}
        type={legalOpen}
        onClose={() => setLegalOpen(null)}
      />
    </>
  );
}
