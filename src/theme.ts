"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: "#1a73e8", light: "#e8f0fe", dark: "#1557b0" },
    secondary: { main: "#188038" },
    success: { main: "#188038" },
    error: { main: "#d93025" },
    warning: { main: "#f29900" },
    background: { default: "#f6f8fc", paper: "#ffffff" },
    text: { primary: "#1f1f1f", secondary: "#5f6368" },
    divider: "#e3e6ea",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "var(--font-roboto), Roboto, Arial, sans-serif",
    h4: { fontWeight: 500, letterSpacing: 0 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
    button: { textTransform: "none", fontWeight: 500 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 20, paddingInline: 18 } },
    },
    MuiFab: { styleOverrides: { root: { borderRadius: 16, textTransform: "none" } } },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: { root: { borderRadius: 16, borderColor: "#e3e6ea" } },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 16 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 24 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } } },
    MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, color: "#5f6368", backgroundColor: "#f8f9fb", whiteSpace: "nowrap" },
        root: { borderColor: "#eef0f3" },
      },
    },
    MuiTab: { styleOverrides: { root: { textTransform: "none", fontWeight: 500, minHeight: 48 } } },
    MuiListItemButton: { styleOverrides: { root: { borderRadius: 28 } } },
  },
});
