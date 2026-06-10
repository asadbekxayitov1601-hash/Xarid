"use client";

import Script from "next/script";
import { createContext, useCallback, useContext, useState } from "react";

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const TelegramContext = createContext<{ inTelegram: boolean }>({ inTelegram: false });

export const useTelegram = () => useContext(TelegramContext);

// Loads Telegram's Mini App bridge script. When the page is opened inside
// Telegram, authenticates the session via initData; in a normal browser it
// does nothing and the site works as a regular website.
export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [inTelegram, setInTelegram] = useState(false);

  const onScriptLoad = useCallback(() => {
    const wa = window.Telegram?.WebApp;
    if (!wa || !wa.initData) return;
    setInTelegram(true);
    wa.ready();
    wa.expand();
    fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: wa.initData }),
    }).catch(() => {});
  }, []);

  return (
    <TelegramContext.Provider value={{ inTelegram }}>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onLoad={onScriptLoad} />
      {children}
    </TelegramContext.Provider>
  );
}
