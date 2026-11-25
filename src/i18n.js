const LOCALE_FOLDERS = { en: "en", zh: "zh_CN" };
const catalogs = new Map();
const chromeI18n = globalThis.chrome?.i18n;
const nativeLanguage = chromeI18n?.getMessage("interfaceLanguageCode");
const chromeLanguage = nativeLanguage === "zh" ? "zh" : "en";

function loadCatalog(language) {
  if (!catalogs.has(language)) {
    const path = `_locales/${LOCALE_FOLDERS[language]}/messages.json`;
    const catalog = fetch(path).then(response => {
      if (!response.ok) throw new Error(`Could not load locale ${language}`);
      return response.json();
    }).catch(error => {
      catalogs.delete(language);
      throw error;
    });
    catalogs.set(language, catalog);
  }
  return catalogs.get(language);
}

const loadedCatalogs = new Map();

async function loadLanguage(preference) {
  const language = preference === "en" || preference === "zh" ? preference : chromeLanguage;
  for (const candidate of new Set([language, chromeLanguage, "en"])) {
    if (candidate === nativeLanguage) return candidate;
    try {
      loadedCatalogs.set(candidate, await loadCatalog(candidate));
      return candidate;
    } catch (error) {
      console.warn("Could not load locale catalog", candidate, error);
    }
  }
  return "en";
}

function getTranslation(language, key, substitutions = []) {
  const entry = loadedCatalogs.get(language)?.[key];
  if (!entry) return chromeI18n?.getMessage(key, substitutions) || "";
  return entry.message.replace(/\$([\w]+)\$/g, (token, name) => {
    const position = entry.placeholders?.[name]?.content;
    return position ? substitutions[Number(position.slice(1)) - 1] ?? "" : token;
  });
}

function translatePage(language, root = document) {
  for (const element of root.querySelectorAll("[data-i18n]")) {
    const text = getTranslation(language, element.dataset.i18n);
    if (text) element.textContent = text;
  }
  const attributes = { placeholder: "data-i18n-placeholder", title: "data-i18n-title", "aria-label": "data-i18n-aria-label", alt: "data-i18n-alt" };
  for (const [attribute, marker] of Object.entries(attributes)) {
    for (const element of root.querySelectorAll(`[${marker}]`)) {
      const text = getTranslation(language, element.getAttribute(marker));
      if (text) element.setAttribute(attribute, text);
    }
  }
}

function formatGregorianISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatCalendarDate(date, settings, browserLocale = navigator.language) {
  const language = settings.uiLang === "zh" ? "zh" : "en";
  const region = new Intl.Locale(browserLocale || "en-US").maximize().region;
  let format = settings.dateFormat;
  if (language === "en" && region === "GB" && (!format || format === "auto")) {
    format = "uk";
  }

  const weekday = date.toLocaleDateString(language, { weekday: "long" });
  if (format === "numeric") return `${formatGregorianISO(date)} ${weekday}`;
  if (format === "uk" || format === "us") {
    const british = format === "uk";
    const dateText = date.toLocaleDateString(british ? "en-GB" : "en-US", { dateStyle: "long" });
    return `${weekday}${british ? " " : ", "}${dateText}`;
  }

  return date.toLocaleDateString(`${language}-${region}`, { dateStyle: "full", calendar: "gregory" });
}

window.CalendarExtI18n = { t: getTranslation, loadLanguage, translatePage, formatCalendarDate };


