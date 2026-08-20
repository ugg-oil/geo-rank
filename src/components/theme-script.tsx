/** Runs synchronously in <head> before paint to avoid dark→light flash. */
export const THEME_BOOTSTRAP = `
(() => {
  try {
    const key = "geo-radar-theme";
    const stored = localStorage.getItem(key);
    const theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (_) {
    document.documentElement.setAttribute("data-theme", "light");
  }
  requestAnimationFrame(() => {
    document.documentElement.classList.add("theme-transition");
  });
})();
`;
