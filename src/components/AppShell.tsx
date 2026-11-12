"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { ETICHETTE_RUOLO } from "@/lib/ruoli";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import SwapVertOutlined from "@mui/icons-material/SwapVertOutlined";
import CelebrationOutlined from "@mui/icons-material/CelebrationOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import { anniDisponibili } from "@/lib/calcoli";
import { useGestionale } from "./Gestionale";
import RicercaGlobale from "./RicercaGlobale";

const VOCI = [
  { href: "/", etichetta: "Home", icona: <HomeOutlined /> },
  { href: "/movimenti", etichetta: "Movimenti", icona: <SwapVertOutlined /> },
  { href: "/eventi", etichetta: "Eventi", icona: <CelebrationOutlined /> },
  { href: "/prezziario", etichetta: "Prezziario", icona: <MenuBookOutlined /> },
  { href: "/inventario", etichetta: "Inventario", icona: <Inventory2Outlined /> },
];

const ALTRE = [
  { href: "/analisi", etichetta: "Analisi", icona: <InsightsOutlined /> },
  { href: "/storico", etichetta: "Storico anni", icona: <HistoryOutlined /> },
  { href: "/impostazioni", etichetta: "Impostazioni", icona: <SettingsOutlined /> },
];

/** Mobile bottom bar: keep primary paths + Altro for Analisi and the rest. */
const VOCI_MOBILE = [
  { href: "/", etichetta: "Home", icona: <HomeOutlined /> },
  { href: "/movimenti", etichetta: "Movimenti", icona: <SwapVertOutlined /> },
  { href: "/eventi", etichetta: "Eventi", icona: <CelebrationOutlined /> },
  { href: "/inventario", etichetta: "Inventario", icona: <Inventory2Outlined /> },
];

const ALTRO_MOBILE = [
  { href: "/prezziario", etichetta: "Prezziario", icona: <MenuBookOutlined /> },
  ...ALTRE,
];

const LARGHEZZA = 248;

function attiva(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { dati, anno, setAnno, utente, esci, locale, sync, ruolo, solaLettura } = useGestionale();
  const path = usePathname();
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [altro, setAltro] = useState<HTMLElement | null>(null);
  const anni = useMemo(() => {
    const a = anniDisponibili(dati);
    return a.includes(anno) ? a : [anno, ...a];
  }, [dati, anno]);

  const stampa = path.startsWith("/stampa");
  if (stampa) {
    return (
      <Box sx={{ minHeight: "100dvh", bgcolor: "#fff" }}>
        {children}
      </Box>
    );
  }

  const altroAttivo = ALTRO_MOBILE.some((v) => attiva(path, v.href));
  const bottomValue = altroAttivo ? VOCI_MOBILE.length : VOCI_MOBILE.findIndex((v) => attiva(path, v.href));

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", bgcolor: "background.default" }}>
      <AppBar
        position="fixed"
        elevation={0}
        color="inherit"
        sx={{ bgcolor: "background.default", borderBottom: 1, borderColor: "divider", zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <Box
            component={Link}
            href="/"
            sx={{ display: "flex", alignItems: "center", gap: 1.25, color: "inherit", textDecoration: "none", mr: "auto" }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "12px",
                bgcolor: "primary.main",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              AGS
            </Box>
            <Typography variant="h6" sx={{ fontSize: 20, display: { xs: "none", sm: "block" } }}>
              Gestionale
            </Typography>
          </Box>
          {locale && <Chip size="small" color="warning" label="Modalità locale" sx={{ display: { xs: "none", sm: "flex" } }} />}
          <RicercaGlobale />
          <Box
            title={sync === "online" ? "Sincronizzato" : sync === "offline" ? "Offline: le modifiche si invieranno al ritorno della rete" : sync === "sync" ? "Sincronizzazione in corso" : "Solo su questo browser"}
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: sync === "online" ? "success.main" : sync === "offline" ? "warning.main" : sync === "sync" ? "info.main" : "text.disabled",
              flexShrink: 0,
            }}
          />
          <Select
            size="small"
            value={anno}
            onChange={(e) => setAnno(e.target.value)}
            renderValue={(v) => `Anno ${v}`}
            sx={{ borderRadius: 20, bgcolor: "background.paper", "& .MuiSelect-select": { py: 0.75 } }}
          >
            {anni.map((a) => (
              <MenuItem key={a} value={a}>
                Anno sociale {a}
              </MenuItem>
            ))}
          </Select>
          <IconButton onClick={(e) => setMenu(e.currentTarget)} size="small">
            <Avatar src={utente?.foto} sx={{ width: 34, height: 34, bgcolor: "secondary.main", fontSize: 15 }}>
              {(utente?.nome ?? utente?.email ?? "A").charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)} slotProps={{ paper: { sx: { minWidth: 240 } } }}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {utente?.nome ?? "Utente"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {utente?.email}
              </Typography>
            </Box>
            <Divider />
            {ALTRE.map((v) => (
              <MenuItem key={v.href} component={Link} href={v.href} onClick={() => setMenu(null)}>
                <ListItemIcon>{v.icona}</ListItemIcon>
                {v.etichetta}
              </MenuItem>
            ))}
            {!locale && (
              <MenuItem
                onClick={() => {
                  setMenu(null);
                  esci();
                }}
              >
                <ListItemIcon>
                  <LogoutOutlined />
                </ListItemIcon>
                Esci
              </MenuItem>
            )}
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: LARGHEZZA,
          flexShrink: 0,
          display: { xs: "none", md: "block" },
          position: "fixed",
          top: 64,
          bottom: 0,
          overflowY: "auto",
          px: 1.5,
          py: 2,
        }}
      >
        <List sx={{ display: "grid", gap: 0.5 }}>
          {[...VOCI, ...ALTRE].map((v, i) => (
            <Box key={v.href}>
              {i === VOCI.length && <Divider sx={{ my: 1.5 }} />}
              <ListItemButton
                component={Link}
                href={v.href}
                selected={attiva(path, v.href)}
                sx={{
                  "&.Mui-selected": { bgcolor: "primary.light", color: "primary.dark", "& .MuiListItemIcon-root": { color: "primary.dark" } },
                  "&.Mui-selected:hover": { bgcolor: "#d2e3fc" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{v.icona}</ListItemIcon>
                <ListItemText primary={v.etichetta} slotProps={{ primary: { sx: { fontWeight: 500, fontSize: 14 } } }} />
              </ListItemButton>
            </Box>
          ))}
        </List>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          ml: { md: `${LARGHEZZA}px` },
          pt: { xs: 9, sm: 10 },
          pb: { xs: 12, md: 6 },
          px: { xs: 2, sm: 3, lg: 4 },
        }}
      >
        <Box sx={{ maxWidth: 1400, mx: "auto" }}>
          {solaLettura && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Accesso in sola lettura ({ETICHETTE_RUOLO[ruolo]}): puoi consultare i dati ma non modificarli.
            </Alert>
          )}
          {children}
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          display: { xs: "block", md: "none" },
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (t) => t.zIndex.appBar,
          borderTop: 1,
          borderColor: "divider",
          borderRadius: 0,
          pb: "env(safe-area-inset-bottom)",
        }}
      >
        <BottomNavigation showLabels value={bottomValue} sx={{ height: 64 }}>
          {VOCI_MOBILE.map((v) => (
            <BottomNavigationAction
              key={v.href}
              component={Link}
              href={v.href}
              label={v.etichetta}
              icon={v.icona}
              sx={{ minWidth: 0, px: 0.5, "& .MuiBottomNavigationAction-label": { fontSize: 11 } }}
            />
          ))}
          <BottomNavigationAction
            label="Altro"
            icon={<MoreHorizOutlined />}
            onClick={(e) => setAltro(e.currentTarget)}
            sx={{ minWidth: 0, px: 0.5, "& .MuiBottomNavigationAction-label": { fontSize: 11 } }}
          />
        </BottomNavigation>
        <Menu
          anchorEl={altro}
          open={!!altro}
          onClose={() => setAltro(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          {ALTRO_MOBILE.map((v) => (
            <MenuItem
              key={v.href}
              component={Link}
              href={v.href}
              selected={attiva(path, v.href)}
              onClick={() => setAltro(null)}
            >
              <ListItemIcon>{v.icona}</ListItemIcon>
              {v.etichetta}
            </MenuItem>
          ))}
        </Menu>
      </Paper>
    </Box>
  );
}
