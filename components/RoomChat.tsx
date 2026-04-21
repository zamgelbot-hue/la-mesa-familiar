"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RoomMessage = {
  id: string;
  room_code: string;
  context: "lobby" | "game";
  player_name: string;
  user_id: string | null;
  is_guest: boolean;
  message: string;
  created_at: string;
};

type RoomChatProps = {
  roomCode: string;
  context: "lobby" | "game";
  currentPlayerName: string;
  currentUserId?: string | null;
  isGuest?: boolean;
};

export default function RoomChat({
  roomCode,
  context,
  currentPlayerName,
  currentUserId = null,
  isGuest = true,
}: RoomChatProps) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const sendCooldownRef = useRef<number>(0);

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages]);

  useEffect(() => {
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("room_messages")
        .select("*")
        .eq("room_code", roomCode)
        .eq("context", context)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error cargando mensajes:", error);
        return;
      }

      const nextMessages = (data ?? []) as RoomMessage[];
      setMessages(nextMessages);

      const last = nextMessages[nextMessages.length - 1];
      if (last) {
        lastMessageIdRef.current = last.id;
      }
    };

    if (roomCode) {
      loadMessages();
    }
  }, [supabase, roomCode, context]);

  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase
      .channel(`room-chat-${roomCode}-${context}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          const next = payload.new as RoomMessage;

          if (next.context !== context) return;

          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === next.id);
            if (exists) return prev;
            return [...prev, next];
          });

          const isMine = next.player_name === currentPlayerName;
          const isNew = lastMessageIdRef.current !== next.id;

          if (!open && !isMine && isNew) {
            setUnreadCount((prev) => prev + 1);
          }

          lastMessageIdRef.current = next.id;
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, roomCode, context, open, currentPlayerName]);

  useEffect(() => {
    if (!open) return;
    setUnreadCount(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!scrollRef.current) return;

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [sortedMessages, open]);

  const handleSend = async () => {
    const normalized = text.trim();

    if (!normalized) return;
    if (!currentPlayerName) return;
    if (normalized.length > 200) return;

    const now = Date.now();
    if (now - sendCooldownRef.current < 1000) {
      return;
    }

    try {
      setSending(true);
      sendCooldownRef.current = now;

      const { error } = await supabase.from("room_messages").insert({
        room_code: roomCode,
        context,
        player_name: currentPlayerName,
        user_id: currentUserId,
        is_guest: isGuest,
        message: normalized,
      });

      if (error) {
        console.error("Error enviando mensaje:", error);
        return;
      }

      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-50 rounded-full border border-orange-500/20 bg-zinc-950/95 px-5 py-3 font-bold text-white shadow-[0_0_30px_rgba(249,115,22,0.15)] transition hover:bg-zinc-900"
      >
        💬 Chat
        {unreadCount > 0 && (
          <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-extrabold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[92vw] max-w-sm rounded-3xl border border-white/10 bg-zinc-950/95 shadow-[0_0_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-orange-300">Chat de sala</p>
              <p className="text-sm text-white/60">
                {context === "lobby" ? "Lobby" : "Partida"}
              </p>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Cerrar
            </button>
          </div>

          <div
            ref={scrollRef}
            className="max-h-[380px] min-h-[280px] space-y-3 overflow-y-auto px-4 py-4"
          >
            {sortedMessages.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                Aún no hay mensajes. Escribe el primero.
              </div>
            ) : (
              sortedMessages.map((msg) => {
                const isMine = msg.player_name === currentPlayerName;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        isMine
                          ? "bg-orange-500 text-black"
                          : "border border-white/10 bg-white/[0.05] text-white"
                      }`}
                    >
                      <p
                        className={`text-xs font-bold ${
                          isMine ? "text-black/70" : "text-orange-300"
                        }`}
                      >
                        {msg.player_name} {msg.is_guest ? "(Invitado)" : ""}
                      </p>
                      <p className="mt-1 break-words text-sm">{msg.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                maxLength={200}
                placeholder="Escribe un mensaje..."
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500/50"
              />

              <button
                onClick={handleSend}
                disabled={sending || !text.trim() || !currentPlayerName}
                className="rounded-2xl bg-orange-500 px-4 py-3 font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enviar
              </button>
            </div>

            <p className="mt-2 text-right text-xs text-white/40">
              {text.trim().length}/200
            </p>
          </div>
        </div>
      )}
    </>
  );
}
