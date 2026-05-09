// 📍 Ruta del archivo: data/tutorials.ts

export type TutorialStep = {
  label: string;
  detail: string;
};

export type TutorialGuide = {
  id: string;
  title: string;
  emoji: string;
  short: string;
  difficulty: "Muy fácil" | "Fácil" | "Medio";
  time: string;
  steps: TutorialStep[];
  tip?: string;
};

export type TutorialSection = {
  id: string;
  title: string;
  description: string;
  color: string;
  guides: TutorialGuide[];
};

export const tutorialSections: TutorialSection[] = [
  {
    id: "primeros-pasos",
    title: "Primeros pasos",
    description: "Aprende lo básico para entrar, guardar tu progreso y usar tu perfil.",
    color: "from-orange-500/20 to-orange-900/5",
    guides: [
      {
        id: "crear-cuenta",
        title: "Cómo crear una cuenta",
        emoji: "🧑‍💻",
        short: "Guarda tus puntos, avatar y progreso.",
        difficulty: "Muy fácil",
        time: "2 min",
        steps: [
          { label: "Abre el menú", detail: "Toca el botón de menú o el botón de cuenta en la parte superior." },
          { label: "Elige entrar", detail: "Selecciona iniciar sesión o crear cuenta." },
          { label: "Escribe tus datos", detail: "Usa un correo y contraseña que puedas recordar." },
          { label: "Listo", detail: "Cuando entres, tu perfil queda guardado para futuras partidas." },
        ],
        tip: "Una cuenta ayuda a no perder tus puntos, racha diaria ni cosméticos.",
      },
      {
        id: "jugar-invitado",
        title: "Cómo jugar como invitado",
        emoji: "🙂",
        short: "Entra rápido sin crear cuenta.",
        difficulty: "Muy fácil",
        time: "1 min",
        steps: [
          { label: "Entra a la página", detail: "Abre La Mesa Familiar desde tu celular, tablet o computadora." },
          { label: "Usa perfil invitado", detail: "El sistema puede asignarte un nombre temporal." },
          { label: "Crea o únete", detail: "Puedes crear una sala o escribir un código para entrar a una." },
          { label: "Juega", detail: "Participa normalmente con familia o amigos." },
        ],
        tip: "Invitado sirve para probar rápido; una cuenta es mejor para guardar puntos.",
      },
      {
        id: "personalizar-perfil",
        title: "Cómo personalizar tu perfil",
        emoji: "🎨",
        short: "Cambia cómo te ven los demás.",
        difficulty: "Fácil",
        time: "2 min",
        steps: [
          { label: "Toca tu avatar", detail: "En móvil aparece arriba junto al botón de crear y el menú." },
          { label: "Entra a Perfil", detail: "Ahí verás tus puntos, nivel, avatar y marco." },
          { label: "Abre personalización", detail: "Busca la zona donde aparecen tus cosméticos." },
          { label: "Equipa algo", detail: "Elige un avatar o marco desbloqueado y toca equipar." },
        ],
        tip: "Tu avatar se ve en salas, juegos y rankings.",
      },
      {
        id: "avatar-marco",
        title: "Cómo cambiar avatar y marco",
        emoji: "🖼️",
        short: "Equipa un estilo nuevo.",
        difficulty: "Fácil",
        time: "2 min",
        steps: [
          { label: "Abre Perfil", detail: "Toca tu avatar o entra desde el menú." },
          { label: "Elige categoría", detail: "Puedes revisar avatares o marcos disponibles." },
          { label: "Selecciona uno", detail: "Toca el que más te guste." },
          { label: "Presiona Equipar", detail: "El cambio se mostrará en tu perfil y partidas." },
        ],
        tip: "Algunos cosméticos se consiguen con puntos, tienda o códigos especiales.",
      },
    ],
  },
  {
    id: "salas",
    title: "Salas y multiplayer",
    description: "Crea partidas, comparte códigos y juega con otras personas.",
    color: "from-cyan-500/20 to-cyan-900/5",
    guides: [
      {
        id: "crear-sala",
        title: "Cómo crear una sala",
        emoji: "➕",
        short: "Abre una partida nueva.",
        difficulty: "Muy fácil",
        time: "1 min",
        steps: [
          { label: "Toca +", detail: "En móvil está arriba. En desktop puedes usar Crear sala." },
          { label: "Escoge juego", detail: "Elige el juego que quieres probar." },
          { label: "Elige opciones", detail: "Selecciona jugadores, variante y tipo de sala." },
          { label: "Crea la sala", detail: "Comparte el código con quien quieras invitar." },
        ],
        tip: "Crear sala es la forma más rápida de empezar una partida familiar.",
      },
      {
        id: "publica-privada",
        title: "Salas públicas vs privadas",
        emoji: "🔒",
        short: "Decide quién puede entrar.",
        difficulty: "Fácil",
        time: "1 min",
        steps: [
          { label: "Privada", detail: "Solo entra quien tenga el código de sala." },
          { label: "Pública", detail: "Puede aparecer para otros jugadores cuando esté disponible." },
          { label: "Amigos", detail: "Más adelante servirá para invitar contactos directamente." },
        ],
        tip: "Para familia, usa privada y manda el código por mensaje.",
      },
      {
        id: "compartir-codigo",
        title: "Cómo compartir código",
        emoji: "📨",
        short: "Invita a otro jugador.",
        difficulty: "Muy fácil",
        time: "1 min",
        steps: [
          { label: "Crea sala", detail: "Al crearla aparecerá un código corto." },
          { label: "Copia el código", detail: "También puedes tomar captura si te resulta más fácil." },
          { label: "Envíalo", detail: "Mándalo por WhatsApp, Messenger o mensaje." },
          { label: "Que se una", detail: "La otra persona entra a Unirse a sala y escribe el código." },
        ],
        tip: "El código debe escribirse igual como aparece.",
      },
      {
        id: "iniciar-partida",
        title: "Cómo iniciar una partida",
        emoji: "🚀",
        short: "Cuando todos estén listos.",
        difficulty: "Fácil",
        time: "1 min",
        steps: [
          { label: "Espera jugadores", detail: "Revisa que todos estén dentro de la sala." },
          { label: "Listos", detail: "Cada jugador debe marcarse como listo si el juego lo pide." },
          { label: "Host inicia", detail: "Normalmente quien creó la sala puede iniciar." },
          { label: "A jugar", detail: "La sala manda a todos al juego automáticamente." },
        ],
        tip: "Si alguien no avanza, recargar la página suele reconectar la sala.",
      },
    ],
  },
  {
    id: "juegos",
    title: "Juegos",
    description: "Reglas simples para entender cada juego antes de entrar a la partida.",
    color: "from-violet-500/20 to-violet-900/5",
    guides: [
      {
        id: "ppt",
        title: "Cómo jugar PPT",
        emoji: "✊",
        short: "Piedra, papel o tijera.",
        difficulty: "Muy fácil",
        time: "1 min",
        steps: [
          { label: "Elige", detail: "Toca piedra, papel o tijera." },
          { label: "Compara", detail: "Piedra gana a tijera, tijera gana a papel y papel gana a piedra." },
          { label: "Rondas", detail: "Gana quien consiga las rondas necesarias." },
        ],
        tip: "Es el juego más rápido para probar puntos y partidas.",
      },
      {
        id: "loteria",
        title: "Cómo jugar Lotería Mexicana",
        emoji: "🎴",
        short: "Marca cartas y completa el objetivo.",
        difficulty: "Fácil",
        time: "3 min",
        steps: [
          { label: "Recibe tablero", detail: "Cada jugador tiene su propio cartón." },
          { label: "Escucha carta", detail: "El sistema canta cartas durante la partida." },
          { label: "Marca", detail: "Si tienes esa carta, tócala en tu tablero." },
          { label: "Completa", detail: "Gana con línea, esquinas o cartón lleno según variante." },
        ],
        tip: "Revisa bien tu tablero para no dejar pasar cartas llamadas.",
      },
      {
        id: "memorama",
        title: "Cómo jugar Memorama",
        emoji: "🧠",
        short: "Encuentra pares iguales.",
        difficulty: "Fácil",
        time: "4 min",
        steps: [
          { label: "Voltea 2", detail: "En tu turno toca dos cartas." },
          { label: "Busca par", detail: "Si son iguales, ganas ese par." },
          { label: "Recuerda", detail: "Si no son iguales, memoriza dónde estaban." },
          { label: "Suma pares", detail: "Gana quien junte más pares." },
        ],
        tip: "No corras; memorizar es la clave.",
      },
      {
        id: "pregunta",
        title: "Cómo jugar Pregunta Pregunta",
        emoji: "❓",
        short: "Responde y suma puntos.",
        difficulty: "Fácil",
        time: "5 min",
        steps: [
          { label: "Lee", detail: "Mira la pregunta con calma." },
          { label: "Responde", detail: "Elige la opción que creas correcta." },
          { label: "Espera", detail: "Las respuestas se revelan cuando termina la ronda." },
          { label: "Gana", detail: "Quien tenga más puntos al final gana." },
        ],
        tip: "Responder bien y rápido ayuda, pero lo principal es acertar.",
      },
      {
        id: "gato",
        title: "Cómo jugar Gato",
        emoji: "⭕",
        short: "Conecta una línea.",
        difficulty: "Muy fácil",
        time: "2 min",
        steps: [
          { label: "Turnos", detail: "Cada jugador coloca su símbolo en una casilla vacía." },
          { label: "Haz línea", detail: "Busca línea horizontal, vertical o diagonal." },
          { label: "Bloquea", detail: "Si el rival casi gana, pon tu ficha para detenerlo." },
          { label: "Gana", detail: "Gana quien complete la línea primero." },
        ],
        tip: "En 5x5 se gana conectando 4; en 7x7 conectando 5.",
      },
      {
        id: "personaje",
        title: "Cómo jugar Personaje Secreto",
        emoji: "🕵️",
        short: "Pregunta y adivina.",
        difficulty: "Medio",
        time: "6 min",
        steps: [
          { label: "Piensa personaje", detail: "Puede ser real, ficticio, famoso o de una categoría." },
          { label: "Pregunta", detail: "Haz preguntas que se respondan con sí, no o probablemente." },
          { label: "Descarta", detail: "Usa respuestas para eliminar posibilidades." },
          { label: "Adivina", detail: "Cuando estés seguro, intenta decir el personaje." },
        ],
        tip: "Empieza con preguntas grandes: ¿es humano?, ¿es de película?, ¿es real?",
      },
      {
        id: "guerra",
        title: "Cómo jugar Guerra Total",
        emoji: "💥",
        short: "Coloca unidades y ataca.",
        difficulty: "Medio",
        time: "8 min",
        steps: [
          { label: "Coloca unidades", detail: "Antes de iniciar, acomoda todas tus piezas en el tablero." },
          { label: "Confirma", detail: "Cuando estés listo, confirma tu formación." },
          { label: "Ataca", detail: "En tu turno toca una casilla del rival." },
          { label: "Destruye", detail: "Gana quien destruya todas las unidades enemigas." },
        ],
        tip: "No pongas todas tus unidades juntas; reparte para confundir al rival.",
      },
      {
        id: "secuencia",
        title: "Cómo jugar Secuencia Oculta",
        emoji: "🔢",
        short: "Encuentra números en orden.",
        difficulty: "Fácil",
        time: "4 min",
        steps: [
          { label: "Mira oculto", detail: "Los números están tapados y mezclados." },
          { label: "Busca orden", detail: "Debes encontrar 1, luego 2, luego 3 y así." },
          { label: "Si fallas", detail: "Las cartas se vuelven a ocultar." },
          { label: "Memoriza", detail: "Recuerda posiciones para el siguiente intento." },
        ],
        tip: "No es tocar números al azar; siempre sigue la secuencia.",
      },
      {
        id: "domino",
        title: "Cómo jugar Dominó",
        emoji: "🎲",
        short: "Conecta fichas y vacía tu mano.",
        difficulty: "Medio",
        time: "8 min",
        steps: [
          { label: "Recibe fichas", detail: "Cada jugador recibe fichas para comenzar." },
          { label: "Conecta", detail: "Juega una ficha que coincida con un extremo de la mesa." },
          { label: "Come", detail: "Si no tienes jugada, toma del pozo si hay fichas." },
          { label: "Gana", detail: "Gana quien se quede sin fichas o tenga menos puntos si se bloquea." },
        ],
        tip: "Los dobles pueden abrir o cerrar jugadas importantes.",
      },
    ],
  },
  {
    id: "sistema",
    title: "Sistema y ajustes",
    description: "Opciones de sonido, recompensas, códigos y consejos para jugar mejor.",
    color: "from-emerald-500/20 to-emerald-900/5",
    guides: [
      {
        id: "sonidos",
        title: "Cómo desactivar sonidos",
        emoji: "🔇",
        short: "Juega en silencio.",
        difficulty: "Muy fácil",
        time: "1 min",
        steps: [
          { label: "Abre menú", detail: "Toca el botón ☰." },
          { label: "Ajustes", detail: "Entra a ajustes cuando esté disponible." },
          { label: "Sonido", detail: "Activa o desactiva sonidos según prefieras." },
        ],
        tip: "Ideal para jugar de noche o en lugares tranquilos.",
      },
      {
        id: "recompensa-diaria",
        title: "Cómo reclamar recompensa diaria",
        emoji: "🏆",
        short: "Gana puntos por volver.",
        difficulty: "Muy fácil",
        time: "1 min",
        steps: [
          { label: "Inicia sesión", detail: "Usa tu cuenta para guardar la recompensa." },
          { label: "Abre menú", detail: "Toca ☰ en la parte superior." },
          { label: "Reclama", detail: "Si está disponible, toca reclamar recompensa diaria." },
        ],
        tip: "Volver seguido puede ayudarte a juntar puntos para cosméticos.",
      },
      {
        id: "codigos",
        title: "Cómo usar códigos de recompensa",
        emoji: "🎁",
        short: "Canjea puntos o cosméticos.",
        difficulty: "Fácil",
        time: "1 min",
        steps: [
          { label: "Busca canjear", detail: "Puede estar en tienda o en el menú." },
          { label: "Escribe código", detail: "Ponlo exactamente como lo recibiste." },
          { label: "Canjea", detail: "Si es válido, recibes la recompensa." },
        ],
        tip: "Algunos códigos tienen límite de usos o fecha de expiración.",
      },
      {
        id: "mejor-experiencia",
        title: "Cómo mejorar tu experiencia",
        emoji: "📱",
        short: "Consejos para evitar fallos.",
        difficulty: "Fácil",
        time: "2 min",
        steps: [
          { label: "Buena conexión", detail: "Usa WiFi estable o buena señal móvil." },
          { label: "Recarga", detail: "Si algo no actualiza, recarga la página." },
          { label: "Chrome", detail: "Si Brave da problemas, prueba Chrome o desactiva Shields." },
          { label: "Código correcto", detail: "Asegúrate de compartir el código de sala correcto." },
        ],
        tip: "La Mesa Familiar usa realtime; una conexión estable ayuda muchísimo.",
      },
    ],
  },
];
