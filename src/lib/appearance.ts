export const APPEARANCE_THEMES = [
  { id: "sleek", name: "Clubhouse" },
  { id: "amethyst", name: "After hours" },
  { id: "midnight", name: "Blue hour" },
  { id: "obsidian", name: "Lights out" },
] as const;
export const APPEARANCE_ACCENTS = [
  { id: "purple", name: "Lilac" },
  { id: "pink", name: "Rose" },
  { id: "teal", name: "Lagoon" },
  { id: "green", name: "Mint" },
  { id: "amber", name: "Peach" },
] as const;
export type Appearance = { theme: string; accent: string; glass: boolean };
export function readAppearance(): Appearance {
  const root = document.documentElement;
  return {
    theme: root.dataset.theme || "sleek",
    accent: root.dataset.accent || "purple",
    glass: root.dataset.glass !== "false",
  };
}
export function applyAppearance(settings: Appearance) {
  const theme = APPEARANCE_THEMES.some((entry) => entry.id === settings.theme)
    ? settings.theme
    : "sleek";
  const accent = APPEARANCE_ACCENTS.some(
    (entry) => entry.id === settings.accent,
  )
    ? settings.accent
    : "purple";
  localStorage.setItem("bakaiti_appearance_theme", theme);
  localStorage.setItem("bakaiti_appearance_accent", accent);
  localStorage.setItem("bakaiti_appearance_glass", String(settings.glass));
  Object.assign(document.documentElement.dataset, {
    theme,
    accent,
    glass: String(settings.glass),
  });
}
// Self-contained so the same initializer runs before the first browser paint.
export function initializeAppearance() {
  try {
    for (const prefix of ["huddang_", "wellsy_"]) {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(prefix)) {
          const nextKey = "bakaiti_" + key.slice(prefix.length);
          if (localStorage.getItem(nextKey) === null)
            localStorage.setItem(nextKey, localStorage.getItem(key) || "");
        }
      }
    }
    Object.assign(document.documentElement.dataset, {
      theme: localStorage.getItem("bakaiti_appearance_theme") || "sleek",
      accent: localStorage.getItem("bakaiti_appearance_accent") || "purple",
      glass: localStorage.getItem("bakaiti_appearance_glass") || "true",
    });
  } catch {
    /* Use the canonical default palette when browser storage is unavailable. */
  }
}
