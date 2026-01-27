function stripCData(s) {
  const t = String(s || "");
  return t.replace(/^<!\[CDATA\[\s*/i, "").replace(/\s*\]\]>$/i, "").trim();
}

function safeText(node) {
  return node && node.textContent ? node.textContent.trim() : "";
}

async function fetchRss(url, signal) {
  const u = String(url || "").trim();
  if (!u) throw new Error("rss url missing");
  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7"
    },
    signal
  });
  if (!res.ok) throw new Error(`rss http ${res.status}`);
  const xml = await res.text();
  return xml;
}

function parseRss(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const out = [];
  
  // Try RSS 2.0 format first
  let channelTitle = stripCData(safeText(doc.getElementsByTagName("channel")[0]?.getElementsByTagName("title")[0]));
  let items = Array.from(doc.getElementsByTagName("item"));
  
  // Fallback to Atom format if no RSS items found
  if (!items.length) {
    const feed = doc.getElementsByTagName("feed")[0];
    if (feed) {
      channelTitle = stripCData(safeText(feed.getElementsByTagName("title")[0]));
      items = Array.from(doc.getElementsByTagName("entry"));
    }
  }
  
  for (const it of items.slice(0, 30)) {
    const title = stripCData(safeText(it.getElementsByTagName("title")[0]));
    
    // RSS uses <link>, Atom uses <link href="...">
    let link = stripCData(safeText(it.getElementsByTagName("link")[0]));
    if (!link) {
      // Atom format: <link href="..."/>
      const linkEl = it.getElementsByTagName("link")[0];
      if (linkEl) link = linkEl.getAttribute("href") || "";
    }
    link = link.replace(/^https:\/\/www\.chinanews\.com\.cnhttps:\/\/www\.chinanews\.com\.cn/i, "https://www.chinanews.com.cn");
    
    // RSS uses <pubDate>, Atom uses <updated> or <published>
    let pubDate = stripCData(safeText(it.getElementsByTagName("pubDate")[0]));
    if (!pubDate) {
      pubDate = stripCData(safeText(it.getElementsByTagName("updated")[0])) ||
                stripCData(safeText(it.getElementsByTagName("published")[0]));
    }
    
    if (!title || !link) continue;
    out.push({ title, link, pubDate });
  }
  return { items: out, channelTitle };
}

function formatPubDate(pubDate, timeZone) {
  const s = String(pubDate || "").trim();
  if (!s) return "";
  
  // 1. Standard RSS 2.0 (e.g. "Fri, 26 Dec 2025 19:59:00 +0800")
  let m = s.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const mon = m[2].toLowerCase();
    const year = m[3];
    const hms = m[4];
    const monthMap = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
    };
    const mm = monthMap[mon];
    if (mm) return `${year}-${mm}-${day} ${hms}`;
  }

  // 2. 36Kr / China format (e.g. "2025-12-30 17:26:06 +0800")
  m = s.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}:\d{2})/);
  if (m) {
      return `${m[1]}-${m[2]}-${m[3]} ${m[4]}`;
  }

  // Fallback: try Date parsing
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${da} ${hh}:${mi}:${ss}`;
}

async function getRssNews({ url, limit = 50, timeZone } = {}, signal) {
  try {
    const xml = await fetchRss(url, signal);
    const parsed = parseRss(xml);
    const items = (parsed.items || [])
      .map((x) => ({
        ...x,
        date: x.pubDate ? formatPubDate(x.pubDate, timeZone) : ""
      }))
      .slice(0, limit);
    return {
      items,
      sourceName: parsed.channelTitle || "RSS",
      sourceUrl: url,
      success: true
    };
  } catch (err) {
    return {
        items: [],
        sourceName: "Load Error",
        sourceUrl: url,
        success: false,
        error: String(err)
    };
  }
}

async function getAllRssNews({ urls = [], limit = 50, timeZone } = {}, signal) {
  // Parallel fetch all
  const tasks = urls.map(url => 
    getRssNews({ url, limit, timeZone }, signal)
  );
  
  const results = await Promise.all(tasks);
  return results;
}

window.CalendarExtNews = {
  getRssNews,
  getAllRssNews
};
