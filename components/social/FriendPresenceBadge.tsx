// 📍 Ruta del archivo: components/social/FriendPresenceBadge.tsx

import {
  getFriendPresenceInfo,
  type FriendPresenceProfile,
  type FriendPresenceTone,
} from "@/lib/social/friendPresence";

type Props = {
  profile: FriendPresenceProfile;
  compact?: boolean;
};

const toneStyles: Record<FriendPresenceTone, string> = {
  online:
    "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.10)]",
  playing:
    "border-orange-400/40 bg-orange-500/12 text-orange-100 shadow-[0_0_22px_rgba(249,115,22,0.16)]",
  room:
    "border-cyan-400/30 bg-cyan-500/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.10)]",
  away:
    "border-yellow-400/30 bg-yellow-500/10 text-yellow-100 shadow-[0_0_18px_rgba(234,179,8,0.10)]",
  offline: "border-white/10 bg-white/[0.04] text-white/45",
};

const dotStyles: Record<FriendPresenceTone, string> = {
  online: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]",
  playing: "bg-orange-400 shadow-[0_0_14px_rgba(251,146,60,0.85)]",
  room: "bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.70)]",
  away: "bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.55)]",
  offline: "bg-white/25",
};

export default function FriendPresenceBadge({ profile, compact = false }: Props) {
  const presence = getFriendPresenceInfo(profile);

  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${toneStyles[presence.tone]}`}
      title={`${presence.label} · ${presence.detail}`}
    >
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotStyles[presence.tone]}`} />

      {!compact && (
        <span className="shrink-0 text-[11px] leading-none">
          {presence.icon}
        </span>
      )}

      <span className="truncate">
        {presence.label}
      </span>

      {!compact && presence.detail && (
        <span className="hidden max-w-[130px] truncate text-[10px] font-black opacity-65 sm:inline">
          {presence.detail}
        </span>
      )}
    </div>
  );
}
