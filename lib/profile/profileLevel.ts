export type ProfileLevelInfo = {
  level: number;
  title: string;
  emblem: string;
  currentXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
  isMaxLevel: boolean;
};

const LEVELS = [
  { level: 1, xp: 0, title: "Nuevo jugador", emblem: "🎲" },
  { level: 2, xp: 100, title: "Aprendiz", emblem: "🃏" },
  { level: 3, xp: 250, title: "Jugador casual", emblem: "⭐" },
  { level: 4, xp: 500, title: "Jugador activo", emblem: "🔥" },
  { level: 5, xp: 900, title: "Competidor", emblem: "🥉" },
  { level: 6, xp: 1400, title: "Estratega", emblem: "🥈" },
  { level: 7, xp: 2000, title: "Veterano", emblem: "🥇" },
  { level: 8, xp: 3000, title: "Maestro", emblem: "💎" },
  { level: 9, xp: 4500, title: "Campeón", emblem: "👑" },
  { level: 10, xp: 6500, title: "Leyenda familiar", emblem: "🏆" },
];

export function getProfileLevelInfo(totalPointsEarned: number): ProfileLevelInfo {
  const currentXp = Math.max(0, totalPointsEarned);

  let currentLevel = LEVELS[0];

  for (const level of LEVELS) {
    if (currentXp >= level.xp) {
      currentLevel = level;
    }
  }

  const nextLevel = LEVELS.find((level) => level.xp > currentXp);

  if (!nextLevel) {
    return {
      level: currentLevel.level,
      title: currentLevel.title,
      emblem: currentLevel.emblem,
      currentXp,
      currentLevelXp: currentLevel.xp,
      nextLevelXp: currentLevel.xp,
      xpIntoLevel: currentXp - currentLevel.xp,
      xpNeededForNextLevel: 0,
      progressPercent: 100,
      isMaxLevel: true,
    };
  }

  const levelRange = nextLevel.xp - currentLevel.xp;
  const xpIntoLevel = currentXp - currentLevel.xp;
  const xpNeededForNextLevel = nextLevel.xp - currentXp;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    emblem: currentLevel.emblem,
    currentXp,
    currentLevelXp: currentLevel.xp,
    nextLevelXp: nextLevel.xp,
    xpIntoLevel,
    xpNeededForNextLevel,
    progressPercent: Math.round((xpIntoLevel / levelRange) * 100),
    isMaxLevel: false,
  };
}
