export function LocaleScript() {
  const script = `
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

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
