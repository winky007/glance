function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayKeyMMDD(d = new Date()) {
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return { mm, dd, key: `${mm}${dd}` };
}

function applyTemplate(tpl, vars) {
  let out = String(tpl || "");
  for (const k of Object.keys(vars)) {
    out = out.replaceAll(`{${k}}`, vars[k]);
  }
  return out;
}

async function fetchJson(url, signal) {
  const res = await fetch(url, { method: "GET", headers: { accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`onthisday json http ${res.status}`);
  return await res.json();
}

async function getBaikeEvents(signal) {
  const { mm, dd, key } = todayKeyMMDD();
  // Data source is fixed in code (user request)
  const tpl = "https://baike.baidu.com/cms/home/eventsOnHistory/{MM}.json";
  const url = applyTemplate(tpl, { MM: mm, M: String(Number(mm)) });
  const j = await fetchJson(url, signal);

  const monthObj = j && (j[mm] || j[String(Number(mm)).padStart(2, "0")] || j[String(Number(mm))]);
  const dayArr = monthObj && monthObj[key];
  const raw = Array.isArray(dayArr) ? dayArr : [];

  const events = raw
    .map((x) => ({
      year: String(x.year || ""),
      text: stripHtml(x.title || ""),
      url: String(x.link || ""),
      lang: "baike"
    }))
    .filter((x) => x.text);

  return {
    mm,
    dd,
    events,
    source: "百度百科（历史上的今天）"
  };
}

async function getWikipediaEvents({ eventsLang }, signal) {
  const Wiki = window.CalendarExtWikipedia;
  const { mm, dd } = Wiki.todayMMDD();
  const res = await Wiki.getOnThisDayEventsWithFallback(eventsLang || "en", signal);
  return { mm, dd, events: res.events || [], source: res.source || "Wikipedia" };
}

async function getOnThisDayEvents(settings, signal) {
  const source = (settings && settings.onThisDaySource) || "baike"; // baike | wikipedia
  if (source === "wikipedia") {
    return await getWikipediaEvents({ eventsLang: settings && settings.eventsLang }, signal);
  }
  // default: baike
  return await getBaikeEvents(signal);
}

window.CalendarExtOnThisDay = {
  getOnThisDayEvents
};


