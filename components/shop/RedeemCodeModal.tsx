// 📍 Ruta del archivo: components/shop/RedeemCodeModal.tsx

"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  onRedeemed?: (points?: number) => void;
};

type RedeemResponse = {
  ok: boolean;
  message: string;
  points?: number;
  reward_type?: string;
  reward_key?: string | null;
};

export default function RedeemCodeModal({
  open,
  onClose,
  onRedeemed,
}: Props) {
  const supabase = createClient();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleRedeem = async () => {
    setMessage("");
    setSuccess(false);

    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setMessage("Escribe un código.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc("redeem_promo_code", {
        input_code: cleanCode,
      });

      if (error) throw error;

      const result = data as RedeemResponse;

      setMessage(result.message);
      setSuccess(result.ok);

      if (result.ok) {
        setCode("");
        onRedeemed?.(result.points);
      }
    } catch (error) {
      console.error("Error canjeando código:", error);
      setMessage("No se pudo canjear el código.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-[34px] border border-orange-500/25 bg-zinc-950 shadow-[0_0_70px_rgba(249,115,22,0.25)]">
        <div className="relative p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.25),transparent_45%)]" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                  Código promocional
                </p>

                <h2 className="mt-2 text-3xl font-black text-white">
                  🎁 Canjear recompensa
                </h2>

                <p className="mt-2 text-sm text-white/55">
                  Ingresa un código para recibir puntos, avatares o marcos
                  exclusivos.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/55 p-5">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                Código
              </label>

              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleRedeem();
                  }
                }}
                placeholder="EJ: MESA50"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-center text-xl font-black uppercase tracking-[0.18em] text-white outline-none focus:border-orange-500"
              />

              <button
                type="button"
                disabled={loading}
                onClick={handleRedeem}
                className="mt-4 w-full rounded-2xl bg-orange-500 px-5 py-4 font-black text-black hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Canjeando..." : "Canjear código"}
              </button>
            </div>

            {message && (
              <div
                className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold ${
                  success
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                    : "border-red-500/25 bg-red-500/10 text-red-200"
                }`}
              >
                {message}
              </div>
            )}

            <p className="mt-5 text-center text-xs text-white/35">
              Los códigos solo pueden canjearse una vez por cuenta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}