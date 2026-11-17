"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { api, type ThemeColors, DEFAULT_THEME_COLORS } from "@/lib/api";

const THEME_STORAGE_KEY = "sri_saraswathi_theme_colors";

export function hexToHsl(hex: string): { h: number; s: number; l: number; str: string } | null {
  if (!hex || typeof hex !== "string") return null;
  const clean = hex.replace("#", "").trim();
  let r = 0;
  let g = 0;
  let b = 0;

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return {
    h: hDeg,
    s: sPct,
    l: lPct,
    str: `${hDeg} ${sPct}% ${lPct}%`,
  };
}

export function applyThemeToDom(colors: ThemeColors) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // 1. Set standard CSS Variables
  root.style.setProperty("--theme-primary", colors.primary);
  root.style.setProperty("--theme-secondary", colors.secondary);
  root.style.setProperty("--theme-accent", colors.accent);
  root.style.setProperty("--theme-background", colors.background);
  root.style.setProperty("--theme-text", colors.text);
  root.style.setProperty("--theme-header", colors.header);
  root.style.setProperty("--theme-footer", colors.footer);

  // 2. Set Tailwind HSL variables for compatibility with bg-background, text-foreground, etc.
  const primaryHsl = hexToHsl(colors.primary);
  if (primaryHsl) {
    root.style.setProperty("--primary", primaryHsl.str);
    root.style.setProperty("--ring", primaryHsl.str);
  }

  const secondaryHsl = hexToHsl(colors.secondary);
  if (secondaryHsl) {
    root.style.setProperty("--secondary", secondaryHsl.str);
  }

  const accentHsl = hexToHsl(colors.accent);
  if (accentHsl) {
    root.style.setProperty("--accent", accentHsl.str);
  }

  const bgHsl = hexToHsl(colors.background);
  if (bgHsl) {
    root.style.setProperty("--background", bgHsl.str);
  }

  const textHsl = hexToHsl(colors.text);
  if (textHsl) {
    root.style.setProperty("--foreground", textHsl.str);
  }

  // 3. Inject or update dynamic stylesheet overrides for global immediate coverage
  let styleEl = document.getElementById("sri-dynamic-theme-overrides") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "sri-dynamic-theme-overrides";
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    :root {
      --theme-primary: ${colors.primary};
      --theme-secondary: ${colors.secondary};
      --theme-accent: ${colors.accent};
      --theme-background: ${colors.background};
      --theme-text: ${colors.text};
      --theme-header: ${colors.header};
      --theme-footer: ${colors.footer};
    }

    body {
      background-color: var(--theme-background, #F5F2EB) !important;
      color: var(--theme-text, #15191B) !important;
    }

    /* Top fixed header background */
    header.fixed {
      background-color: var(--theme-header, rgba(255, 255, 255, 0.95)) !important;
    }

    /* Main website footer */
    footer.relative.overflow-hidden {
      background-color: var(--theme-footer, #1F6878) !important;
    }

    /* Primary brand text & icons */
    .text-\\[\\#1F6878\\] {
      color: var(--theme-primary, #1F6878) !important;
    }
    .bg-\\[\\#1F6878\\] {
      background-color: var(--theme-primary, #1F6878) !important;
    }
    .border-\\[\\#1F6878\\] {
      border-color: var(--theme-primary, #1F6878) !important;
    }

    /* Secondary surface tints */
    .bg-\\[\\#E4F0F2\\] {
      background-color: var(--theme-secondary, #E4F0F2) !important;
    }

    /* Accent CTAs, badges and highlights */
    .bg-\\[\\#E95A35\\] {
      background-color: var(--theme-accent, #E95A35) !important;
    }
    .text-\\[\\#E95A35\\] {
      color: var(--theme-accent, #E95A35) !important;
    }
    .border-\\[\\#E95A35\\] {
      border-color: var(--theme-accent, #E95A35) !important;
    }
  `;
}

interface ThemeContextType {
  colors: ThemeColors;
  savedColors: ThemeColors;
  loading: boolean;
  saveColors: (newColors: ThemeColors) => Promise<void>;
  resetToDefault: () => Promise<void>;
  applyPreview: (newColors: ThemeColors) => void;
  revertPreview: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getInitialColors(): ThemeColors {
  if (typeof window === "undefined") return DEFAULT_THEME_COLORS;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          primary: parsed.primary || DEFAULT_THEME_COLORS.primary,
          secondary: parsed.secondary || DEFAULT_THEME_COLORS.secondary,
          accent: parsed.accent || DEFAULT_THEME_COLORS.accent,
          background: parsed.background || DEFAULT_THEME_COLORS.background,
          text: parsed.text || DEFAULT_THEME_COLORS.text,
          header: parsed.header || DEFAULT_THEME_COLORS.header,
          footer: parsed.footer || DEFAULT_THEME_COLORS.footer,
        };
      }
    }
  } catch {
    // Ignore local storage read errors
  }
  return DEFAULT_THEME_COLORS;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(getInitialColors);
  const [savedColors, setSavedColors] = useState<ThemeColors>(getInitialColors);
  const [loading, setLoading] = useState(true);

  // Apply initial theme immediately to prevent any flicker
  useEffect(() => {
    applyThemeToDom(colors);
  }, []);

  // Fetch from server API
  useEffect(() => {
    let mounted = true;
    api
      .getThemeColors()
      .then((res) => {
        if (!mounted || !res?.colors) return;
        const normalized: ThemeColors = {
          primary: res.colors.primary || DEFAULT_THEME_COLORS.primary,
          secondary: res.colors.secondary || DEFAULT_THEME_COLORS.secondary,
          accent: res.colors.accent || DEFAULT_THEME_COLORS.accent,
          background: res.colors.background || DEFAULT_THEME_COLORS.background,
          text: res.colors.text || DEFAULT_THEME_COLORS.text,
          header: res.colors.header || DEFAULT_THEME_COLORS.header,
          footer: res.colors.footer || DEFAULT_THEME_COLORS.footer,
        };
        setSavedColors(normalized);
        setColors(normalized);
        applyThemeToDom(normalized);
        try {
          localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(normalized));
        } catch {}
      })
      .catch(() => {
        // Fallback to initial colors
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const saveColors = useCallback(async (newColors: ThemeColors) => {
    const res = await api.updateThemeColors(newColors);
    const updated = res.colors || newColors;
    setSavedColors(updated);
    setColors(updated);
    applyThemeToDom(updated);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }, []);

  const resetToDefault = useCallback(async () => {
    await api.resetThemeColors();
    setSavedColors(DEFAULT_THEME_COLORS);
    setColors(DEFAULT_THEME_COLORS);
    applyThemeToDom(DEFAULT_THEME_COLORS);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(DEFAULT_THEME_COLORS));
    } catch {}
  }, []);

  const applyPreview = useCallback((previewColors: ThemeColors) => {
    setColors(previewColors);
    applyThemeToDom(previewColors);
  }, []);

  const revertPreview = useCallback(() => {
    setColors(savedColors);
    applyThemeToDom(savedColors);
  }, [savedColors]);

  const value = useMemo(
    () => ({
      colors,
      savedColors,
      loading,
      saveColors,
      resetToDefault,
      applyPreview,
      revertPreview,
    }),
    [colors, savedColors, loading, saveColors, resetToDefault, applyPreview, revertPreview]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
