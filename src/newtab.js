function $(id) {
  return document.getElementById(id);
}

let __uiLang = "en";
let __currentWallpaper = null;

function setBackground(item) {
  const bg = $("bg");
  const credit = $("bg-credit");

  if (item.kind === "gradient" && item.cssBackground) {
    bg.style.backgroundImage = item.cssBackground;
    bg.style.backgroundSize = "cover";
    bg.style.backgroundPosition = "center";
  } else if (item.imageUrl) {
    bg.style.backgroundImage = `url("${item.imageUrl}")`;
    bg.style.backgroundSize = "cover";
    bg.style.backgroundPosition = "center";
  }

  if (item.creditText) {
    const fullText = String(item.creditText);
    const showText = truncateWithEllipsis(fullText, 30);
    if (item.creditUrl) {
      credit.innerHTML = `<a href="${item.creditUrl}" target="_blank" rel="noopener" title="${escapeHtml(
        fullText
      )}">${escapeHtml(showText)}</a>`;
    } else {
      credit.textContent = showText;
      credit.title = fullText;
    }
    credit.hidden = false;
  } else {
    credit.hidden = true;
  }
}

function truncateWithEllipsis(s, maxChars) {
  const text = String(s || "").trim();
  const n = Number(maxChars);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (text.length <= n) return text;
  return text.slice(0, Math.max(0, n - 3)).trimEnd() + "...";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderCalendar(settings, d = new Date()) {
  $("today-day").textContent = window.CalendarExtI18n.formatCalendarDate(d, settings);
  renderDualClock(settings, d);

  const lunarEl = $("today-lunar");
  lunarEl.hidden = settings.lunarEnabled !== true;
  if (lunarEl.hidden) return;

  try {
    const lunar = window.CalendarExtLunar.toLunar(d);
    const prettyMonth = prettifyLunarMonth(lunar.monthCn || "");
    const prettyDay = prettifyLunarDay(lunar.dayCn || "");
    const zodiacYear = lunar.zodiac ? `${lunar.zodiac}年` : "";
    lunarEl.textContent = `农历 ${prettyMonth}${prettyDay} ${zodiacYear}`;
  } catch (e) {
    lunarEl.textContent = "农历：—";
  }
}

function renderDualClock(settings, date) {
  const clock = $("dual-clock");
  clock.hidden = settings.dualClockEnabled !== true;
  if (clock.hidden) return;

  const labels = {
    "Asia/Shanghai": "clockBeijing",
    "Europe/London": "clockLondon",
    "America/New_York": "clockNewYork",
    "Asia/Tokyo": "clockTokyo",
    UTC: null
  };
  const zone = Object.hasOwn(labels, settings.secondTimeZone) ? settings.secondTimeZone : "Asia/Shanghai";
  const label = key => window.CalendarExtI18n.t(settings.uiLang, key);
  const locale = settings.uiLang === "zh" ? "zh-CN" : "en-GB";
  const options = { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
  const localTime = new Intl.DateTimeFormat(locale, options).format(date);
  const secondTime = new Intl.DateTimeFormat(locale, { ...options, timeZone: zone }).format(date);
  clock.textContent = `${label("clockLocal")} ${localTime} · ${labels[zone] ? label(labels[zone]) : zone} ${secondTime}`;
}

function prettifyLunarMonth(monthCn) {
  const s = String(monthCn || "");
  const isLeap = s.includes("闰");
  const core = s.replace("闰", "");
  return (isLeap ? "闰" : "") + core;
}

function prettifyLunarDay(dayCn) {
  const s = String(dayCn || "").trim();
  if (!s) return s;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return numberToLunarDayCn(n);
  }
  return s;
}

function numberToLunarDayCn(n) {
  if (!Number.isFinite(n) || n < 1 || n > 30) return "";
  const num = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  if (n === 10) return "初十";
  if (n === 20) return "二十";
  if (n === 30) return "三十";
  const tens = Math.floor((n - 1) / 10);
  const ones = (n - 1) % 10;
  const prefix = ["初", "十", "廿"][tens] || "";
  return prefix + num[ones];
}

async function renderWeather() {
  const weatherEl = $("weather-info");
  if (!weatherEl) {
    console.log("[Weather] Element not found");
    return;
  }
  
  const Storage = window.CalendarExtStorage;
  const Weather = window.CalendarExtWeather;
  const settings = await Storage.getSettings();
  
  console.log("[Weather] Settings:", {
    weatherEnabled: settings.weatherEnabled,
    weatherLocMethod: settings.weatherLocMethod,
    weatherLat: settings.weatherLat,
    weatherLon: settings.weatherLon,
    weatherCity: settings.weatherCity
  });
  
  // Check if weather is enabled
  if (!settings.weatherEnabled) {
    console.log("[Weather] Disabled, skipping");
    weatherEl.hidden = true;
    return;
  }
  
  const uiLang = settings.uiLang || "en";
  
  // Show loading state
  weatherEl.textContent = "⏳";
  weatherEl.title = uiLang === "zh" ? "正在获取天气..." : "Loading weather...";
  weatherEl.hidden = false;
  
  console.log("[Weather] Fetching weather data...");
  
  try {
    const result = await Weather.getWeather(settings, uiLang);
    console.log("[Weather] Result:", result);
    
    if (!result.success) {
      // Show error icon with tooltip
      weatherEl.innerHTML = `<span class="weather-error" title="${escapeHtml(result.errorMessage || result.error)}">📍❓</span>`;
      return;
    }
    
    const w = result.weather;
    const tempStr = `${Math.round(w.temperature)}°C`;
    const precipStr = w.precipitation > 0 ? ` 💧${w.precipitation}mm` : "";
    
    // Air quality
    let airQualityHtml = "";
    let airQualityTitle = "";
    if (w.airQuality) {
      const aq = w.airQuality;
      const aqLabel = uiLang === "zh" ? "空气" : "AQI";
      airQualityHtml = `<span class="weather-airquality">${aqLabel}:${aq.icon}${aq.aqi}</span>`;
      airQualityTitle = ` | ${uiLang === "zh" ? "空气质量" : "Air Quality"}: ${aq.level} (AQI ${aq.aqi})`;
    }
    
    // Tomorrow's weather
    let tomorrowHtml = "";
    let tomorrowTitle = "";
    if (w.tomorrow) {
      const t = w.tomorrow;
      const tomorrowLabel = uiLang === "zh" ? "明" : "Tmr";
      tomorrowHtml = `<span class="weather-tomorrow">${tomorrowLabel}:${t.icon}${Math.round(t.tempMin)}~${Math.round(t.tempMax)}°</span>`;
      tomorrowTitle = ` | ${uiLang === "zh" ? "明天" : "Tomorrow"}: ${t.text} ${Math.round(t.tempMin)}~${Math.round(t.tempMax)}°C`;
    }
    
    // Build weather display
    weatherEl.innerHTML = `
      <span class="weather-icon" title="${escapeHtml(w.text)} (code:${w.weatherCode})">${w.icon}</span>
      <span class="weather-temp">${tempStr}</span>
      ${precipStr ? `<span class="weather-precip">${precipStr}</span>` : ""}
      ${airQualityHtml}
      ${tomorrowHtml}
    `;
    weatherEl.title = `${w.text} ${tempStr}${precipStr}${airQualityTitle}${tomorrowTitle}`;
    
  } catch (e) {
    console.error("Weather error:", e);
    weatherEl.innerHTML = `<span class="weather-error" title="${escapeHtml(String(e))}">⚠️</span>`;
  }
}

async function renderEvents() {
  const Storage = window.CalendarExtStorage;
  const I18n = window.CalendarExtI18n;
  const settings = await Storage.getSettings();
  const uiLang = settings.uiLang || "en";
  const dateKey = Storage.nowISODateKey();
  const cacheKey = `${dateKey}__${settings.onThisDaySource || "baike"}`;

  const status = $("onthisday-status");
  const list = $("onthisday-list");
  const source = $("onthisday-source");

  const cacheByDay = await Storage.getEventsCacheByDay();
  const cached = cacheByDay[cacheKey];
  
  // Cache TTL: 1 hour
  const EVENTS_CACHE_TTL = 60 * 60 * 1000;
  const isCacheValid = cached && 
    Array.isArray(cached.events) && 
    cached.events.length &&
    cached.cachedAt && 
    (Date.now() - cached.cachedAt < EVENTS_CACHE_TTL);

  if (isCacheValid) {
    // Use cached data, no network request
    if (cached.mm && cached.dd) {
      $("onthisday-date").textContent = `${cached.mm}/${cached.dd}`;
    }
    fillEvents(cached.events, settings.onThisDaySource);
    status.hidden = true;
    source.textContent = `${I18n.t(uiLang, "eventsSource")}：${cached.source || "缓存"}`;
    source.hidden = false;
    return; // Skip network request
  }
  
  // No valid cache, fetch from network
  status.hidden = false;
  status.textContent = "加载中…";
  list.hidden = true;
  source.hidden = true;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const res = await window.CalendarExtOnThisDay.getOnThisDayEvents(settings, controller.signal);
    if (res.events && res.events.length) {
      $("onthisday-date").textContent = `${res.mm}/${res.dd}`;
      cacheByDay[cacheKey] = { events: res.events, source: res.source, cachedAt: Date.now(), mm: res.mm, dd: res.dd };
      await Storage.setEventsCacheByDay(cacheByDay);
      fillEvents(res.events, settings.onThisDaySource);
      status.hidden = true;
      source.textContent = `${I18n.t(uiLang, "eventsSource")}：${res.source}`;
      source.hidden = false;
      return;
    }
  } catch (e) {
    // ignore
  } finally {
    clearTimeout(timeout);
  }

  // Network failed and no cache
  status.hidden = false;
  status.textContent = I18n.t(uiLang, "eventsUnavailable");
  list.hidden = true;
  source.hidden = true;

  function fillEvents(events, sourceType) {
    list.innerHTML = "";
    const sorted = events
      .slice()
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
      .slice(0, 3);
    const maxChars = sourceType === "wikipedia" ? 60 : 30;
    for (const ev of sorted) {
      const li = document.createElement("li");
      const year = ev.year ? `<span class="events-year">${escapeHtml(ev.year)}</span>` : "";
      const fullText = String(ev.text || "");
      const showText = truncateWithEllipsis(fullText, maxChars);
      if (ev.url) {
        li.innerHTML = `${year}<a href="${ev.url}" target="_blank" rel="noopener" title="${escapeHtml(
          fullText
        )}">${escapeHtml(showText)}</a>`;
      } else {
        li.innerHTML = `${year}<span title="${escapeHtml(fullText)}">${escapeHtml(showText)}</span>`;
      }
      list.appendChild(li);
    }
    list.hidden = false;
  }
}

async function renderNews() {
  const Storage = window.CalendarExtStorage;
  const I18n = window.CalendarExtI18n;
  const settings = await Storage.getSettings();
  const { rssFeeds: feeds, uiLang, timeZone } = settings;
  const tabs = $("news-tabs");
  const status = $("news-status");
  const list = $("news-list");
  const source = $("news-source");
  const translate = key => I18n.t(uiLang, key);
  const cacheTtl = 20 * 60 * 1000;
  let activeIndex = 0;
  let selectedByUser = false;

  if (!feeds.length) {
    status.textContent = translate("rssNoFeeds");
    status.hidden = false;
    return;
  }

  const cache = await Storage.getNewsFeedCaches(feeds.map(feed => feed.url)).catch(() => []);
  const states = feeds.map((_, index) => ({
    data: cache[index],
    loading: !cache[index]?.cachedAt || Date.now() - cache[index].cachedAt >= cacheTtl,
    failed: false
  }));

  tabs.replaceChildren();
  feeds.forEach((feed, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "news-tab-item";
    button.textContent = feed.title || rssTabName(feed.url);
    const select = () => {
      selectedByUser = true;
      activeIndex = index;
      renderActiveFeed();
    };
    button.addEventListener("click", select);
    button.addEventListener("mouseenter", select);
    tabs.appendChild(button);
  });
  setupNewsTabNavigation(tabs, translate);

  const firstCached = states.findIndex(state => state.data?.items?.length);
  if (firstCached >= 0) activeIndex = firstCached;
  new ResizeObserver(() => fitNewsList(list)).observe(list);
  renderActiveFeed();

  await Promise.all(feeds.map(async (feed, index) => {
    const state = states[index];
    if (!state.loading) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let refreshed;
    try {
      refreshed = await window.CalendarExtNews.getRssNews({
        url: feed.url, limit: 30, timeZone
      }, controller.signal);
      if (refreshed.success) state.data = { ...refreshed, cachedAt: Date.now() };
      else state.failed = true;
    } catch {
      state.failed = true;
    } finally {
      clearTimeout(timeout);
      state.loading = false;
    }

    if (!selectedByUser && !states[activeIndex].data?.items?.length && state.data?.items?.length) {
      activeIndex = index;
    }
    if (index === activeIndex) renderActiveFeed();

    if (refreshed?.success) {
      await Storage.setNewsFeedCache(feed.url, state.data).catch(error => {
        console.warn("Could not cache RSS feed", error);
      });
    }
  }));

  function renderActiveFeed() {
    Array.from(tabs.children).forEach((tab, index) => {
      tab.classList.toggle("active", index === activeIndex);
      tab.setAttribute("aria-pressed", String(index === activeIndex));
    });

    const { data, loading, failed } = states[activeIndex];
    const url = feeds[activeIndex].url;
    const items = data?.items || [];
    status.hidden = Boolean(items.length) && !failed;
    status.textContent = items.length
      ? (failed ? translate("rssCached") : "")
      : translate(loading ? "loading" : failed ? "rssLoadFailed" : "rssNoItems");
    list.hidden = !items.length;
    list.replaceChildren();
    source.hidden = !items.length;
    source.replaceChildren();
    if (!items.length) return;

    const titleMax = /voanews.com/i.test(url) ? 43 : 23;
    for (const item of items) {
      const li = document.createElement("li");
      const title = String(item.title || "");
      const link = rssLink(item.link, url);
      const label = link || document.createElement("span");
      label.title = title;
      label.textContent = truncateWithEllipsis(title, titleMax);
      li.appendChild(label);
      if (item.date) {
        const date = document.createElement("span");
        date.className = "news-date muted";
        date.textContent = item.date;
        li.append(" ", date);
      }
      list.appendChild(li);
    }
    const link = rssLink(url);
    if (link) {
      link.textContent = data.sourceName || "RSS";
      source.append(translate("eventsSource") + " · ", link);
    }
    fitNewsList(list);
  }
}

function setupNewsTabNavigation(tabs, translate) {
  const navigation = $("news-tab-navigation");
  const previous = $("news-tabs-prev");
  const next = $("news-tabs-next");
  const controls = [[previous, -1, "rssScrollLeft"], [next, 1, "rssScrollRight"]];

  for (const [button, direction, key] of controls) {
    button.title = translate(key);
    button.setAttribute("aria-label", button.title);
    button.addEventListener("click", () => {
      tabs.scrollBy({ left: direction * tabs.clientWidth, behavior: "instant" });
    });
  }

  function update() {
    const overflow = tabs.scrollWidth > navigation.clientWidth;
    previous.hidden = next.hidden = !overflow;
    previous.disabled = tabs.scrollLeft <= 0;
    next.disabled = tabs.scrollLeft + tabs.clientWidth >= tabs.scrollWidth - 1;
  }

  tabs.addEventListener("scroll", update);
  new ResizeObserver(update).observe(navigation);
  update();
}

function fitNewsList(list) {
  if (list.hidden) return;
  const rows = Array.from(list.children);
  rows.forEach(row => { row.hidden = false; });
  const bottom = list.getBoundingClientRect().bottom;
  const firstOverflow = rows.findIndex(row => row.getBoundingClientRect().bottom > bottom);
  if (firstOverflow >= 0) {
    rows.slice(firstOverflow).forEach(row => { row.hidden = true; });
  }
}

function rssTabName(url) {
  try {
    const name = new URL(url).hostname.replace(/^www./, "").split(".")[0];
    const labels = { chinanews: "中新网", "36kr": "36Kr", voachinese: "VOA" };
    return Object.hasOwn(labels, name) ? labels[name] : name;
  } catch {
    return "RSS";
  }
}

function rssLink(value, base) {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const link = document.createElement("a");
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener";
    return link;
  } catch {
    return null;
  }
}

async function renderWallpaper({ forceRefresh = false } = {}) {
  const Wallpaper = window.CalendarExtWallpaper;
  const item = await Wallpaper.getWallpaper({ forceRefresh });
  setBackground(item);
  __currentWallpaper = item;
  return item;
}

async function main() {
  let settings = window.CalendarExtStorage.DEFAULT_SETTINGS;
  try {
    settings = await window.CalendarExtStorage.getSettings();
    const uiLang = settings.uiLang || "en";
    __uiLang = uiLang;
    document.documentElement.lang = uiLang;
    
    const labelOnThisDay = $("label-onthisday");
    if (labelOnThisDay) labelOnThisDay.textContent = window.CalendarExtI18n.t(uiLang, "onThisDay");
    
    const settingsLabel = window.CalendarExtI18n.t(uiLang, "settings");
    const btnSettings = $("btn-settings");
    if (btnSettings) {
      btnSettings.textContent = truncateWithEllipsis(settingsLabel, 30);
      btnSettings.title = settingsLabel;
      btnSettings.addEventListener("click", () => {
        if (chrome && chrome.runtime && chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open("options.html", "_blank");
        }
      });
    }

    const refreshLabel = window.CalendarExtI18n.t(uiLang, "refreshWallpaper");
    const btnRefresh = $("btn-refresh-wallpaper");
    if (btnRefresh) {
      btnRefresh.textContent = truncateWithEllipsis(refreshLabel, 30);
      btnRefresh.title = refreshLabel;
      btnRefresh.addEventListener("click", async () => {
        btnRefresh.disabled = true;
        try {
          await renderWallpaper({ forceRefresh: true });
        } finally {
          btnRefresh.disabled = false;
        }
      });
    }
    
    const newsStatus = $("news-status");
    if (newsStatus) newsStatus.textContent = window.CalendarExtI18n.t(uiLang, "loading");
    
    const onthisdayStatus = $("onthisday-status");
    if (onthisdayStatus) onthisdayStatus.textContent = window.CalendarExtI18n.t(uiLang, "loading");
  } catch (e) {
    console.error(e);
  }

  function tickCalendar() {
    renderCalendar(settings);
    setTimeout(tickCalendar, 60000 - Date.now() % 60000);
  }
  tickCalendar();

  // Render weather (non-blocking, runs in background)
  renderWeather().catch(e => console.error("Weather render error:", e));

  await Promise.all([renderNews(), renderEvents(), renderWallpaper()]);

  const credit = $("bg-credit");
  if (credit) {
    credit.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
      try {
        if (__currentWallpaper) {
          await window.CalendarExtWallpaper.blockCurrentWallpaper(__currentWallpaper);
          await renderWallpaper({ forceRefresh: true });
        }
      } catch (err) {
        // ignore
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  main().catch((e) => {
    console.error("Main error:", e);
  });
});
