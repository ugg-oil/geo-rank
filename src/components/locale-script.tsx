import Script from "next/script";

const LOCALE_BOOTSTRAP = `
(() => {
  try {
    const key = "geo-radar-locale";
    const stored = localStorage.getItem(key);
    const locale = stored === "zh" || stored === "en" ? stored : "en";
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.documentElement.setAttribute("data-locale", locale);
  } catch (_) {
    document.documentElement.lang = "en";
    document.documentElement.setAttribute("data-locale", "en");
  }
})();
`;

export function LocaleScript() {
  return (
    <Script id="geo-radar-locale" strategy="beforeInteractive">
      {LOCALE_BOOTSTRAP}
    </Script>
  );
}
