"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
  Instagram,
  ChevronDown,
  Link as LinkIcon,
} from "lucide-react";

type ShareRoomButtonProps = {
  roomCode: string;
  roomUrl?: string;
  gameName?: string;
  className?: string;
};

export default function ShareRoomButton({
  roomCode,
  roomUrl,
  gameName={game?.name ?? "La Mesa Familiar"}
  className = "",
}: ShareRoomButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedInstagram, setCopiedInstagram] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const finalUrl = useMemo(() => {
    if (roomUrl) return roomUrl;
    if (typeof window !== "undefined") {
      return `${window.location.origin}/sala/${roomCode}`;
    }
    return `/sala/${roomCode}`;
  }, [roomUrl, roomCode]);

  const shareText = useMemo(() => {
    return `¡Únete a mi sala de ${gameName} en La Mesa Familiar! 🎉\nCódigo: ${roomCode}\n${finalUrl}`;
  }, [gameName, roomCode, finalUrl]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  async function copyToClipboard(value: string, type: "link" | "invite" | "instagram" = "link") {
    try {
      await navigator.clipboard.writeText(value);

      if (type === "link") {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }

      if (type === "invite") {
        setCopiedInvite(true);
        setTimeout(() => setCopiedInvite(false), 1800);
      }

      if (type === "instagram") {
        setCopiedInstagram(true);
        setTimeout(() => setCopiedInstagram(false), 1800);
      }
    } catch (error) {
      console.error("No se pudo copiar:", error);
    }
  }

  async function handleNativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Sala de ${gameName}`,
          text: `Únete a mi sala en La Mesa Familiar. Código: ${roomCode}`,
          url: finalUrl,
        });
        return;
      }
      setOpen((prev) => !prev);
    } catch (error) {
      console.error("Error al compartir:", error);
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  // Messenger web share: funciona mejor con link directo.
  const messengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(
    finalUrl
  )}&app_id=2209284320&redirect_uri=${encodeURIComponent(finalUrl)}`;

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={handleNativeShare}
        className="inline-flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-sm font-semibold text-orange-200 transition hover:border-orange-400/50 hover:bg-orange-500/15 hover:text-white active:scale-[0.98]"
      >
        <Share2 className="h-4 w-4" />
        Compartir
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Compartir sala</p>
            <p className="mt-1 text-xs text-zinc-400">Código: {roomCode}</p>
          </div>

          <div className="space-y-2 p-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white transition hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4 text-green-400" />
              Compartir por WhatsApp
            </a>

            <a
              href={messengerUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white transition hover:bg-white/10"
            >
              <Send className="h-4 w-4 text-sky-400" />
              Compartir por Messenger
            </a>

            <button
              type="button"
              onClick={() => copyToClipboard(shareText, "instagram")}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white transition hover:bg-white/10"
            >
              <span className="flex items-center gap-3">
                <Instagram className="h-4 w-4 text-pink-400" />
                Copiar mensaje para Instagram
              </span>
              {copiedInstagram ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => copyToClipboard(finalUrl, "link")}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white transition hover:bg-white/10"
            >
              <span className="flex items-center gap-3">
                <LinkIcon className="h-4 w-4 text-orange-400" />
                Copiar link de sala
              </span>
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => copyToClipboard(shareText, "invite")}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white transition hover:bg-white/10"
            >
              <span className="flex items-center gap-3">
                <Copy className="h-4 w-4 text-violet-400" />
                Copiar invitación completa
              </span>
              {copiedInvite ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4 text-zinc-400" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
