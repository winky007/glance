function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayMMDD(d = new Date()) {
  return { mm: pad2(d.getMonth() + 1), dd: pad2(d.getDate()) };
}

function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, "");
}

function pickChineseOrFallbackText(eventObj) {
  // zh feed already provides Chinese text in eventObj.text, but keep safe
  if (eventObj && typeof eventObj.text === "string" && eventObj.text.trim()) return eventObj.text.trim();
  return "";
}

function pageUrlFromPage(page) {
  // Prefer canonical page if present
  if (!page) return "";
  if (page.content_urls && page.content_urls.desktop && page.content_urls.desktop.page) {
    return page.content_urls.desktop.page;
  }
  if (page.pageid && page.title && page.lang) {
    const title = encodeURIComponent(page.title.replace(/ /g, "_"));
    return `https://${page.lang}.wikipedia.org/wiki/${title}`;
  }
  if (page.title) {
    const title = encodeURIComponent(page.title.replace(/ /g, "_"));
    return `https://zh.wikipedia.org/wiki/${title}`;
  }
  return "";
}

function isYearLikeTitle(title) {
  const t = String(title || "").trim();
  // Examples: "2024年", "公元前44年" etc. Keep it simple and avoid obvious year-only pages.
  if (/^\d{1,4}年$/.test(t)) return true;
  if (/^公元前\d{1,4}年$/.test(t)) return true;
  if (/^\d{1,4}\s*BC$/i.test(t)) return true;
  return false;
}

function pickBestPageForEvent(pages) {
  const arr = Array.isArray(pages) ? pages : [];
  if (!arr.length) return null;
  // Prefer non-year topic pages (person/place/event) over year pages like "2024年"
  for (const p of arr) {
    if (!p || !p.title) continue;
    if (isYearLikeTitle(p.title)) continue;
    return p;
  }
  return arr[0] || null;
}

async function fetchOnThisDayEvents(lang, mm, dd, signal) {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`;
  const headers = { accept: "application/json" };
  // Best-effort: force Simplified Chinese for zh endpoint
  if (lang === "zh" || String(lang).startsWith("zh-")) {
    headers["accept-language"] = "zh-hans";
  }
  const res = await fetch(url, {
    method: "GET",
    headers,
    signal
  });
  if (!res.ok) throw new Error(`wikipedia ${lang} events http ${res.status}`);
  return await res.json();
}

function normalizeEvents(payload, lang) {
  const raw = Array.isArray(payload && payload.events) ? payload.events : [];
  const out = [];
  for (const ev of raw.slice(0, 12)) {
    const year = ev.year;
    const text = pickChineseOrFallbackText(ev);
    const page = pickBestPageForEvent(ev.pages);
    const url = pageUrlFromPage(page);
    if (!text) continue;
    out.push({
      year: Number.isFinite(Number(year)) ? String(year) : "",
      text: stripHtml(text),
      url,
      lang
    });
  }
  return out;
}

async function getOnThisDayEventsWithFallback(preferredLang, signal) {
  const { mm, dd } = todayMMDD();
  const lang = (preferredLang || "en").trim() || "en";
  try {
    const payload = await fetchOnThisDayEvents(lang, mm, dd, signal);
    const events = normalizeEvents(payload, lang);
    if (events.length) return { events, source: `Wikipedia（${lang}）` };
  } catch (e) {
    // ignore
  }

  return { events: [], source: "离线（暂无）" };
}

window.CalendarExtWikipedia = {
  todayMMDD,
  getOnThisDayEventsWithFallback
};


