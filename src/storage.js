/* global chrome */

const STORAGE_KEYS = {
  UNSPLASH_KEY: "unsplashAccessKey",
  SETTINGS: "settings",
  BG_CACHE: "bgCacheByDay",
  BING_CACHE: "bingImageArchiveByDay",
  BG_BLOCKLIST: "bgBlocklist",
  EVENTS_CACHE: "eventsCacheByDay",
  NEWS_CACHE: "newsCacheByDay",
  WEATHER_CACHE: "weatherCache"
};

const DEFAULT_SETTINGS = {
  uiLang: "en", // en | zh
  eventsLang: "en", // Wikipedia language code, e.g. en/zh/ja...
  bgRefresh: "always", // daily | always
  wallpaperSource: "bing", // local | uploaded | bing | unsplash
  unsplashCollectionId: "", // if empty => skip Unsplash and fallback to Wikimedia
  rssFeeds: [
    { title: "中新网", url: "https://www.chinanews.com.cn/rss/scroll-news.xml" },
    { title: "VOA", url: "https://www.voachinese.com/rssfeeds" },
    { title: "36Kr", url: "https://36kr.com/feed" }
  ],
  timeZone: "Asia/Shanghai",
  onThisDaySource: "baike", // baike | wikipedia
  // Weather settings
  weatherEnabled: false, // Default: off
  weatherLocMethod: "auto", // auto | city
  weatherCity: "", // City name for geocoding
  weatherLat: "", // Latitude (from city search or auto)
  weatherLon: ""  // Longitude (from city search or auto)
};

const LEGACY_DEFAULT_RSS_URLS = [
  "http://news.baidu.com/n?cmd=1&class=civilnews&tn=rss",
  "https://news.baidu.com/n?cmd=1&class=civilnews&tn=rss"
];

function isChromeStorageAvailable() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
}

function nowISODateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function storageGet(keys) {
  if (!isChromeStorageAvailable()) return {};
  return await chrome.storage.local.get(keys);
}

async function storageSet(obj) {
  if (!isChromeStorageAvailable()) return;
  await chrome.storage.local.set(obj);
}

async function storageRemove(keys) {
  if (!isChromeStorageAvailable()) return;
  await chrome.storage.local.remove(keys);
}

async function getUnsplashKey() {
  const res = await storageGet([STORAGE_KEYS.UNSPLASH_KEY]);
  return res[STORAGE_KEYS.UNSPLASH_KEY] || "";
}

async function setUnsplashKey(key) {
  await storageSet({ [STORAGE_KEYS.UNSPLASH_KEY]: (key || "").trim() });
}

async function getSettings() {
  const res = await storageGet([STORAGE_KEYS.SETTINGS]);
  const s = res[STORAGE_KEYS.SETTINGS] || {};
  const merged = {
    ...DEFAULT_SETTINGS,
    ...s
  };
  // One-time migration: if user still has the old Baidu default saved, move to ChinaNews default.
  // Also migrate rssUrl (string) to rssFeeds (array)
  if (merged.rssUrl && typeof merged.rssUrl === "string") {
    // If it's one of the legacy Baidu ones, ignore it and use default rssFeeds.
    // Otherwise, preserve user's custom URL.
    const defaultUrls = DEFAULT_SETTINGS.rssFeeds.map((f) => f.url);
    if (!LEGACY_DEFAULT_RSS_URLS.includes(merged.rssUrl.trim()) && !defaultUrls.includes(merged.rssUrl.trim())) {
       // It's a custom URL, add it to the front of default feeds
       const custom = merged.rssUrl.trim();
       if (custom) {
         // Create a unique set
         const set = new Set([custom, ...defaultUrls]);
         merged.rssFeeds = Array.from(set).map((url) => ({ title: "", url }));
       }
    }
    delete merged.rssUrl; // Clean up old key
    await storageSet({ [STORAGE_KEYS.SETTINGS]: merged });
  }
  
  // Ensure rssFeeds is an array
  if (!Array.isArray(merged.rssFeeds)) {
    merged.rssFeeds = DEFAULT_SETTINGS.rssFeeds;
  } else {
    merged.rssFeeds = merged.rssFeeds
      .map((item) => {
        if (!item) return null;
        if (typeof item === "string") {
          const url = item.trim();
          return url ? { title: "", url } : null;
        }
        if (typeof item === "object") {
          const url = String(item.url || "").trim();
          const title = String(item.title || "").trim();
          return url ? { title, url } : null;
        }
        return null;
      })
      .filter(Boolean);
  }
  
  return merged;
}

async function setSettings(partial) {
  const current = await getSettings();
  const next = {
    ...current,
    ...partial
  };
  await storageSet({ [STORAGE_KEYS.SETTINGS]: next });
  return next;
}

async function getBgCacheByDay() {
  const res = await storageGet([STORAGE_KEYS.BG_CACHE]);
  return res[STORAGE_KEYS.BG_CACHE] || {};
}

async function setBgCacheByDay(cache) {
  await storageSet({ [STORAGE_KEYS.BG_CACHE]: cache || {} });
}

async function getBingImageArchiveByDay() {
  const res = await storageGet([STORAGE_KEYS.BING_CACHE]);
  return res[STORAGE_KEYS.BING_CACHE] || {};
}

async function setBingImageArchiveByDay(cache) {
  await storageSet({ [STORAGE_KEYS.BING_CACHE]: cache || {} });
}

async function getEventsCacheByDay() {
  const res = await storageGet([STORAGE_KEYS.EVENTS_CACHE]);
  return res[STORAGE_KEYS.EVENTS_CACHE] || {};
}

async function setEventsCacheByDay(cache) {
  await storageSet({ [STORAGE_KEYS.EVENTS_CACHE]: cache || {} });
}

async function getNewsCacheByDay() {
  const res = await storageGet([STORAGE_KEYS.NEWS_CACHE]);
  return res[STORAGE_KEYS.NEWS_CACHE] || {};
}

async function setNewsCacheByDay(cache) {
  await storageSet({ [STORAGE_KEYS.NEWS_CACHE]: cache || {} });
}

async function getBgBlocklist() {
  const res = await storageGet([STORAGE_KEYS.BG_BLOCKLIST]);
  return res[STORAGE_KEYS.BG_BLOCKLIST] || [];
}

async function setBgBlocklist(list) {
  await storageSet({ [STORAGE_KEYS.BG_BLOCKLIST]: Array.isArray(list) ? list : [] });
}

async function clearCaches() {
  await storageRemove([STORAGE_KEYS.BG_CACHE, STORAGE_KEYS.BING_CACHE, STORAGE_KEYS.EVENTS_CACHE, STORAGE_KEYS.NEWS_CACHE, STORAGE_KEYS.WEATHER_CACHE]);
}

async function clearBlocklist() {
  await storageRemove([STORAGE_KEYS.BG_BLOCKLIST]);
}

// Expose minimal API for other scripts (no modules to keep it build-free)
window.CalendarExtStorage = {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  nowISODateKey,
  getUnsplashKey,
  setUnsplashKey,
  getSettings,
  setSettings,
  getBgCacheByDay,
  setBgCacheByDay,
  getBingImageArchiveByDay,
  setBingImageArchiveByDay,
  getEventsCacheByDay,
  setEventsCacheByDay,
  getNewsCacheByDay,
  setNewsCacheByDay,
  getBgBlocklist,
  setBgBlocklist,
  clearCaches,
  clearBlocklist
};
