// 📍 Ruta del archivo: components/social/FriendPresenceBadge.tsx

import {
  getFriendPresenceInfo,
  type FriendPresenceProfile,
} from "@/lib/social/friendPresence";

type Props = {
  profile: FriendPresenceProfile;
  compact?: boolean;
};

const toneStyles: Record<string, string> = {
  online: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  playing: "border-orange-500/35 bg-orange-500/10 text-orange-200",
  room: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  away: "border-yellow-500/25 bg-yellow-500/10 text-yellow-200",
  offline: "border-white/10 bg-white/[0.04] text-white/45",
};

const dotStyles: Record<string, string> = {
  online: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.75)]",
  playing: "bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.75)]",
  room: "bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.65)]",
  away: "bg-yellow-300",
  offline: "bg-white/25",
};

export default function FriendPresenceBadge({ profile, compact = false }: Props) {
  const presence = getFriendPresenceInfo(profile);

  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${
        toneStyles[presence.tone]
      }`}
      title={presence.detail}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotStyles[presence.tone]}`} />
      <span className="truncate">{presence.label}</span>
      {!compact && presence.tone !== "offline" && (
        <span className="hidden text-[10px] font-bold opacity-60 sm:inline">
          {presence.detail}
        </span>
      )}
    </div>
  );
}
