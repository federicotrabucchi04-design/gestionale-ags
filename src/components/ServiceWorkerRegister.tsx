"use client";

import { useEffect } from "react";

/** Registers the PWA service worker in production only. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration failures (private mode, etc.) */
    });
  }, []);
  return null;
}
