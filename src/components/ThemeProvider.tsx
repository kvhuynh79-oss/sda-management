"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getThemeKey(): string {
  try {
    const raw = localStorage.getItem("sda_user");
    if (raw) {
      const user = JSON.parse(raw);
      if (user.organizationId) {
        return `sda_theme_${user.organizationId}`;
      }
    }
  } catch {
    // ignore parse errors
  }
  return "sda_theme";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount (org-scoped key)
  useEffect(() => {
    const key = getThemeKey();
    const savedTheme = localStorage.getItem(key) as Theme | null;
    if (savedTheme && (savedTheme === "dark" || savedTheme === "light")) {
      setThemeState(savedTheme);
    }
    setMounted(true);
  }, []);

  // Apply theme class to document
  useEffect(() => {
    if (mounted) {
      const key = getThemeKey();
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
      localStorage.setItem(key, theme);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
