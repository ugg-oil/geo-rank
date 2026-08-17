import Script from "next/script";

const THEME_BOOTSTRAP = `
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
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export function ThemeScript() {
  return (
    <Script id="geo-radar-theme" strategy="beforeInteractive">
      {THEME_BOOTSTRAP}
    </Script>
  );
}
