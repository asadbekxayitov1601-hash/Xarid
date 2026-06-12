"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";
import { Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function AuthClient({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/auth/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        phone: phone.trim(),
        password,
        name: mode === "signup" ? name.trim() : undefined,
      }),
    }).catch(() => null);

    if (res?.ok) {
      router.push("/catalog");
      router.refresh();
      return;
    }

    const data = await res?.json().catch(() => null);
    setError(
      data?.error === "taken"
        ? t(locale, "auth_taken")
        : data?.error === "phone"
        ? t(locale, "auth_bad_phone")
        : t(locale, "auth_invalid")
    );
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16 relative overflow-hidden">
      {/* Ambient blobs */}
      {[
        { color: "rgba(16,185,129,0.15)", x: "-10%", y: "-10%", size: 500, delay: 0 },
        { color: "rgba(124,58,237,0.1)", x: "60%", y: "50%", size: 400, delay: 3 },
        { color: "rgba(245,158,11,0.08)", x: "20%", y: "70%", size: 350, delay: 6 },
      ].map((b, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.15, 1], x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 10 + i * 3, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
          className="absolute rounded-full blur-3xl pointer-events-none"
          style={{ background: b.color, width: b.size, height: b.size, left: b.x, top: b.y }}
        />
      ))}

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div
          className="rounded-3xl p-8 shadow-2xl border border-border-primary bg-bg-secondary/75 backdrop-blur-3xl"
        >
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                boxShadow: "0 0 20px rgba(16,185,129,0.4)",
              }}
            >
              <span className="text-white font-black text-lg" style={{ fontFamily: "Outfit, sans-serif" }}>X</span>
            </div>
            <span className="text-lg font-bold text-text-primary" style={{ fontFamily: "Outfit, sans-serif" }}>arid</span>
          </div>

          {/* Mode Switcher */}
          <div
            className="relative flex mb-8 rounded-full p-1 border border-border-primary/50 bg-bg-secondary/40"
          >
            <motion.div
              animate={{ x: mode === "signin" ? 0 : "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute top-1 bottom-1 rounded-full"
              style={{ width: "calc(50% - 4px)", left: 4, background: "#10b981" }}
            />
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className="relative z-10 flex-1 py-2 text-sm font-bold rounded-full transition-colors duration-200 cursor-pointer"
                style={{
                  color: mode === m ? "#0c0a09" : "var(--text-secondary)",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {m === "signin" ? t(locale, "auth_signin") : t(locale, "auth_signup")}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {mode === "signup" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label
                    className="block text-xs font-semibold mb-1.5 text-text-secondary"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {t(locale, "ph_person_name")}
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={locale === "uz" ? "Cafe Gulbahor" : "Кафе Гульбахор"}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none border border-border-primary bg-bg-secondary/80 text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder-text-secondary/40"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label
                className="block text-xs font-semibold mb-1.5 text-text-secondary"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {locale === "uz" ? "Telefon raqami" : "Номер телефона"}
              </label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none border border-border-primary bg-bg-secondary/80 text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder-text-secondary/40"
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1.5 text-text-secondary"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {locale === "uz" ? "Parol" : "Пароль"}
              </label>
              <div className="relative">
                <input
                  required
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none border border-border-primary bg-bg-secondary/80 text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder-text-secondary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary/60 hover:text-text-primary transition-colors cursor-pointer"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/25 px-3 py-2 text-sm text-red-400 font-semibold"
              >
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(16,185,129,0.5)" }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base mt-2 disabled:opacity-50 select-none cursor-pointer"
              style={{
                background: "#10b981",
                color: "#0c0a09",
                fontFamily: "Outfit, sans-serif",
                boxShadow: "0 0 20px rgba(16,185,129,0.4)",
              }}
            >
              {busy ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? t(locale, "auth_signin") : t(locale, "auth_signup")}
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-sm transition-colors text-text-secondary hover:text-emerald-500 cursor-pointer"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {mode === "signin"
                ? t(locale, "auth_no_account")
                : t(locale, "auth_have_account")}{" "}
              <span className="font-bold text-emerald-400 hover:text-emerald-300">
                {t(locale, mode === "signin" ? "auth_signup" : "auth_signin")}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
