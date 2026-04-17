type AvatarData = {
  emoji?: string;
  image?: string;
  label?: string;
};

type FrameData = {
  className?: string;
  image?: string;
  label?: string;
};

type PlayerAvatarProps = {
  avatar: AvatarData;
  frame: FrameData;
  size?: "sm" | "md" | "lg";
};

export default function PlayerAvatar({
  avatar,
  frame,
  size = "md",
}: PlayerAvatarProps) {
  const wrapperSize =
    size === "sm" ? "h-10 w-10" : size === "lg" ? "h-24 w-24" : "h-16 w-16";

  const avatarSize =
    size === "sm" ? "h-7 w-7" : size === "lg" ? "h-14 w-14" : "h-10 w-10";

  const textSize =
    size === "sm" ? "text-lg" : size === "lg" ? "text-4xl" : "text-2xl";

  const borderSize =
    size === "sm" ? "border-2" : size === "lg" ? "border-4" : "border-4";

  return (
    <div
      className={`relative flex ${wrapperSize} items-center justify-center rounded-full bg-black`}
    >
      {frame.image ? (
        <img
          src={frame.image}
          alt={frame.label ?? "Frame"}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div
          className={`absolute inset-0 rounded-full ${borderSize} ${frame.className ?? ""}`}
        />
      )}

      {avatar.image ? (
        <img
          src={avatar.image}
          alt={avatar.label ?? "Avatar"}
          className={`relative z-10 ${avatarSize} object-contain`}
        />
      ) : (
        <span className={`relative z-10 ${textSize}`}>{avatar.emoji}</span>
      )}
    </div>
  );
}
