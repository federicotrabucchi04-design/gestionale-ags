"use client";

import type { ReactNode } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import AppShell from "@/components/AppShell";
import { GestionaleProvider } from "@/components/Gestionale";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { theme } from "@/theme";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GestionaleProvider>
        <ServiceWorkerRegister />
        <AppShell>{children}</AppShell>
      </GestionaleProvider>
    </ThemeProvider>
  );
}
