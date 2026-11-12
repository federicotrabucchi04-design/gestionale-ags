import { Suspense, type ReactNode } from "react";

export default function StampaLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div style={{ padding: 24 }}>Preparazione stampa...</div>}>{children}</Suspense>;
}
