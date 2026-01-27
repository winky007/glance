function stripHtmlToText(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCollectionId(s) {
  const v = String(s || "").trim();
  if (!v) return "";
  // Unsplash collection id should be digits (usually)
  if (/^\d+$/.test(v)) return v;
  // Allow pasted url fragments like ".../collections/12345/..."
  const m = v.match(/collections\/(\d+)/i);
  return m ? m[1] : v;
}

function todayParts(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return { y, m, day };
}

function gradientFallback() {
  const gradients = [
    "radial-gradient(1200px 700px at 20% 20%, #2a3a7a 0%, rgba(42, 58, 122, 0) 55%),radial-gradient(900px 600px at 80% 10%, #246b6b 0%, rgba(36, 107, 107, 0) 50%),radial-gradient(900px 600px at 70% 90%, #6b3a24 0%, rgba(107, 58, 36, 0) 55%),linear-gradient(180deg, #0b1020 0%, #050812 100%)",
    "radial-gradient(900px 600px at 20% 30%, rgba(60, 130, 246, 0.35) 0%, rgba(60,130,246,0) 60%),radial-gradient(900px 600px at 80% 70%, rgba(16, 185, 129, 0.25) 0%, rgba(16,185,129,0) 55%),linear-gradient(180deg, #0b1020 0%, #070a16 100%)",
    "radial-gradient(1000px 700px at 30% 20%, rgba(244, 114, 182, 0.22) 0%, rgba(244,114,182,0) 60%),radial-gradient(1000px 700px at 70% 80%, rgba(245, 158, 11, 0.18) 0%, rgba(245,158,11,0) 55%),linear-gradient(180deg, #0b1020 0%, #050812 100%)"
  ];
  const css = gradients[Math.floor(Math.random() * gradients.length)];
  return {
    provider: "offline",
    kind: "gradient",
    cssBackground: css,
    creditText: "离线背景（渐变）",
    creditUrl: ""
  };
}

async function getUploadedImages() {
  // Only from IndexedDB (drag & drop uploaded images)
  try {
    const ImageDB = window.CalendarExtImageDB;
    if (ImageDB && typeof ImageDB.getAllImages === "function") {
      const images = await ImageDB.getAllImages();
      if (images && Array.isArray(images) && images.length > 0) {
        const pick = images[Math.floor(Math.random() * images.length)];
        if (pick && pick.data) {
          return {
            provider: "uploaded",
            kind: "photo",
            id: `db_${pick.id}`,
            imageUrl: String(pick.data), // DataURL (e.g., "data:image/jpeg;base64,...")
            creditText: `本地上传：${pick.name || "uploaded"}`,
            creditUrl: ""
          };
        }
      }
    }
  } catch (e) {
    console.warn("getUploadedImages IndexedDB error:", e);
  }
  return null;
}

async function getLocalImageFallback() {
  // Only from file system (img/images.json), NOT from IndexedDB
  // IndexedDB images are handled by getUploadedImages() for "uploaded" source
  try {
    const manifestUrl = chrome.runtime.getURL("img/images.json");
    const res = await fetch(manifestUrl);
    if (!res.ok) throw new Error("manifest not found");
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) throw new Error("manifest empty");
    const pick = list[Math.floor(Math.random() * list.length)];
    const imageUrl = chrome.runtime.getURL(`img/${pick}`);
    // Extract filename for credit
    const filename = String(pick).split("/").pop() || pick;
    return {
      provider: "local",
      kind: "photo",
      id: `file_${pick}`,
      imageUrl,
      creditText: `本地图片：${filename}`,
      creditUrl: ""
    };
  } catch (e) {
    // No local images available
    return null;
  }
}

async function fetchUnsplashFromCollection(unsplashKey, collectionId, signal) {
  const cid = normalizeCollectionId(collectionId);
  if (!cid) throw new Error("unsplash collection id missing");
  const url =
    "https://api.unsplash.com/photos/random" +
    `?orientation=landscape&content_filter=high&collections=${encodeURIComponent(cid)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Client-ID ${unsplashKey}`
    },
    signal
  });
  if (!res.ok) throw new Error(`unsplash http ${res.status}`);
  const j = await res.json();
  const imgUrl = (j.urls && (j.urls.full || j.urls.regular)) || "";
  const link = (j.links && j.links.html) || "https://unsplash.com";
  const name = (j.user && (j.user.name || j.user.username)) || "Unsplash";
  const id = j.id || "";
  if (!imgUrl) throw new Error("unsplash no image url");
  // Recommended attribution: Photo by {name} on Unsplash
  return {
    provider: "unsplash",
    kind: "photo",
    id,
    imageUrl: imgUrl,
    creditText: `Photo by ${name} on Unsplash`,
    creditUrl: link
  };
}

async function fetchCommonsFeatured(d, signal) {
  const { y, m, day } = todayParts(d);
  const url = `https://commons.wikimedia.org/api/rest_v1/feed/featured/${y}/${m}/${day}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
    signal
  });
  if (!res.ok) throw new Error(`commons featured http ${res.status}`);
  const j = await res.json();
  const img = j && j.image;
  if (!img || !img.image || !img.image.source) throw new Error("commons no image");
  const imageUrl = img.image.source;
  const pageUrl = img.file_page || "https://commons.wikimedia.org";
  const title = img.title ? String(img.title).replace(/^File:/, "") : "Wikimedia Commons";
  const artist = img.artist && img.artist.html ? stripHtmlToText(img.artist.html) : "";
  const description = img.description && img.description.text ? String(img.description.text).trim() : "";
  const pieces = [];
  pieces.push(title);
  if (artist) pieces.push(artist);
  if (description) pieces.push(description);
  pieces.push("Wikimedia Commons");
  const creditText = pieces.join(" — ");
  return {
    provider: "commons",
    kind: "photo",
    id: img.title || title,
    imageUrl,
    creditText,
    creditUrl: pageUrl
  };
}

async function fetchBingImageArchive(signal, count = 10) {
  const url = `https://bing.com/HPImageArchive.aspx?format=js&idx=0&n=${count}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
    signal
  });
  if (!res.ok) throw new Error(`bing archive http ${res.status}`);
  const j = await res.json();
  const images = Array.isArray(j && j.images) ? j.images : [];
  return images;
}

function normalizeBingImage(img) {
  const rel = img && img.url ? String(img.url) : "";
  const imageUrl = rel.startsWith("http") ? rel : `https://www.bing.com${rel}`;
  const creditText = img && img.copyright ? String(img.copyright) : "Bing wallpaper";
  const creditUrl = img && img.copyrightlink ? String(img.copyrightlink) : "https://www.bing.com";
  const id = img && (img.hsh || img.urlbase || img.fullstartdate) ? String(img.hsh || img.urlbase || img.fullstartdate) : imageUrl;
  return {
    provider: "bing",
    kind: "photo",
    id,
    imageUrl,
    creditText,
    creditUrl
  };
}

async function getBingRandomWallpaper(signal) {
  const Storage = window.CalendarExtStorage;
  const dateKey = Storage.nowISODateKey();
  const cacheByDay = await Storage.getBingImageArchiveByDay();
  let images = cacheByDay[dateKey] && Array.isArray(cacheByDay[dateKey].images) ? cacheByDay[dateKey].images : null;

  if (!images || !images.length) {
    images = await fetchBingImageArchive(signal, 10);
    cacheByDay[dateKey] = { images, cachedAt: Date.now() };
    await Storage.setBingImageArchiveByDay(cacheByDay);
  }

  const normalized = images.map(normalizeBingImage).filter((x) => x.imageUrl);
  if (!normalized.length) throw new Error("bing archive empty");
  return normalized[Math.floor(Math.random() * normalized.length)];
}

async function getBingTodayWallpaper(signal) {
  // Only fetch today's wallpaper (idx=0, n=1)
  const images = await fetchBingImageArchive(signal, 1);
  if (!images || !images.length) throw new Error("bing today empty");
  const normalized = normalizeBingImage(images[0]);
  if (!normalized.imageUrl) throw new Error("bing today no image");
  return normalized;
}

function isBlocked(blocklist, item) {
  if (!Array.isArray(blocklist) || !blocklist.length) return false;
  const id = String(item && item.id ? item.id : "");
  const url = String(item && item.imageUrl ? item.imageUrl : "");
  return blocklist.includes(id) || (url && blocklist.includes(url));
}

async function getWallpaper({ forceRefresh = false } = {}) {
  const Storage = window.CalendarExtStorage;
  const settings = await Storage.getSettings();
  const blocklist = await Storage.getBgBlocklist();
  const dateKey = Storage.nowISODateKey();

  const cacheByDay = await Storage.getBgCacheByDay();
  const cached = cacheByDay[dateKey];

  const useDailyCache = settings.bgRefresh === "daily" && !forceRefresh;
  if (useDailyCache && cached && cached.provider && (cached.imageUrl || cached.cssBackground)) {
    return { ...cached, fromCache: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const wallpaperSource = settings.wallpaperSource || "bing";

    // 1) Local images (IndexedDB + file system)
    if (wallpaperSource === "local") {
      const localItem = await getLocalImageFallback();
      if (localItem && !isBlocked(blocklist, localItem)) {
        if (settings.bgRefresh === "daily") {
          cacheByDay[dateKey] = { ...localItem, cachedAt: Date.now() };
          await Storage.setBgCacheByDay(cacheByDay);
        }
        return { ...localItem, fromCache: false };
      }
      // Fallback to gradient if no local images
      const item = gradientFallback();
      if (settings.bgRefresh === "daily") {
        cacheByDay[dateKey] = { ...item, cachedAt: Date.now() };
        await Storage.setBgCacheByDay(cacheByDay);
      }
      return { ...item, fromCache: false };
    }

    // 2) Uploaded images (IndexedDB only)
    if (wallpaperSource === "uploaded") {
      const uploadedItem = await getUploadedImages();
      if (uploadedItem && !isBlocked(blocklist, uploadedItem)) {
        if (settings.bgRefresh === "daily") {
          cacheByDay[dateKey] = { ...uploadedItem, cachedAt: Date.now() };
          await Storage.setBgCacheByDay(cacheByDay);
        }
        return { ...uploadedItem, fromCache: false };
      }
      // Fallback to gradient if no uploaded images
      const item = gradientFallback();
      if (settings.bgRefresh === "daily") {
        cacheByDay[dateKey] = { ...item, cachedAt: Date.now() };
        await Storage.setBgCacheByDay(cacheByDay);
      }
      return { ...item, fromCache: false };
    }

    // 3) Bing random wallpaper
    if (wallpaperSource === "bing") {
      for (let i = 0; i < 3; i++) {
        try {
          // Let settings.bgRefresh control Bing behavior too:
          // - daily: fixed wallpaper for the day (cached in BG_CACHE)
          // - always: random each new tab
          if (settings.bgRefresh === "daily" && !forceRefresh) {
            const dailyCached = cacheByDay[dateKey];
            if (dailyCached && dailyCached.provider === "bing" && dailyCached.imageUrl) {
              return { ...dailyCached, fromCache: true };
            }
            const item = await getBingRandomWallpaper(controller.signal);
            if (isBlocked(blocklist, item)) continue;
            cacheByDay[dateKey] = { ...item, cachedAt: Date.now() };
            await Storage.setBgCacheByDay(cacheByDay);
            return { ...item, fromCache: false };
          }

          const item = await getBingRandomWallpaper(controller.signal);
          if (isBlocked(blocklist, item)) continue;
          return { ...item, fromCache: false };
        } catch (e) {
          // retry
        }
      }
      // Fallback to local images if Bing fails
      const localItem = await getLocalImageFallback();
      if (localItem && !isBlocked(blocklist, localItem)) {
        return { ...localItem, fromCache: false };
      }
      // Final fallback: gradient
      const item = gradientFallback();
      if (settings.bgRefresh === "daily") {
        cacheByDay[dateKey] = { ...item, cachedAt: Date.now() };
        await Storage.setBgCacheByDay(cacheByDay);
      }
      return { ...item, fromCache: false };
    }

    // 4) Bing today's wallpaper (only today's image)
    if (wallpaperSource === "bingToday") {
      try {
        // Always cache today's wallpaper (it's the same for the whole day)
        if (!forceRefresh) {
          const dailyCached = cacheByDay[dateKey];
          if (dailyCached && dailyCached.provider === "bing" && dailyCached.imageUrl) {
            return { ...dailyCached, fromCache: true };
          }
        }
        const item = await getBingTodayWallpaper(controller.signal);
        if (isBlocked(blocklist, item)) {
          // If blocked, fallback to gradient
          const fallback = gradientFallback();
          cacheByDay[dateKey] = { ...fallback, cachedAt: Date.now() };
          await Storage.setBgCacheByDay(cacheByDay);
          return { ...fallback, fromCache: false };
        }
        cacheByDay[dateKey] = { ...item, cachedAt: Date.now() };
        await Storage.setBgCacheByDay(cacheByDay);
        return { ...item, fromCache: false };
      } catch (e) {
        // Fallback to local images if Bing fails
        const localItem = await getLocalImageFallback();
        if (localItem && !isBlocked(blocklist, localItem)) {
          return { ...localItem, fromCache: false };
        }
        // Final fallback: gradient
        const item = gradientFallback();
        cacheByDay[dateKey] = { ...item, cachedAt: Date.now() };
        await Storage.setBgCacheByDay(cacheByDay);
        return { ...item, fromCache: false };
      }
    }

    // 3) Unsplash
    if (wallpaperSource === "unsplash") {
      const unsplashKey = await Storage.getUnsplashKey();
      const collectionId = normalizeCollectionId(settings.unsplashCollectionId || "");

      if (unsplashKey && collectionId) {
        for (let i = 0; i < 4; i++) {
          try {
            const item = await fetchUnsplashFromCollection(unsplashKey, collectionId, controller.signal);
            if (isBlocked(blocklist, item)) continue;
            if (settings.bgRefresh === "daily") {
              cacheByDay[dateKey] = { ...item, cachedAt: Date.now() };
              await Storage.setBgCacheByDay(cacheByDay);
            }
            return { ...item, fromCache: false };
          } catch (e) {
            // continue to retry a few times, then fallback
          }
        }
      }
      // Fallback to Bing if Unsplash fails or not configured
      for (let i = 0; i < 3; i++) {
        try {
          const item = await getBingRandomWallpaper(controller.signal);
          if (isBlocked(blocklist, item)) continue;
          return { ...item, fromCache: false };
        } catch (e) {
          // retry
        }
      }
      // Fallback to local images
      const localItem = await getLocalImageFallback();
      if (localItem && !isBlocked(blocklist, localItem)) {
        return { ...localItem, fromCache: false };
      }
      // Final fallback: gradient
      const item = gradientFallback();
      if (settings.bgRefresh === "daily") {
        cacheByDay[dateKey] = { ...item, cachedAt: Date.now() };
        await Storage.setBgCacheByDay(cacheByDay);
      }
      return { ...item, fromCache: false };
    }

    // Default fallback (should not reach here)
    const item = gradientFallback();
    if (settings.bgRefresh === "daily") {
      cacheByDay[dateKey] = { ...item, cachedAt: Date.now() };
      await Storage.setBgCacheByDay(cacheByDay);
    }
    return { ...item, fromCache: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function blockCurrentWallpaper(item) {
  const Storage = window.CalendarExtStorage;
  const list = await Storage.getBgBlocklist();
  const id = String(item && item.id ? item.id : "").trim();
  const url = String(item && item.imageUrl ? item.imageUrl : "").trim();
  const next = new Set(Array.isArray(list) ? list : []);
  if (id) next.add(id);
  if (url) next.add(url);
  await Storage.setBgBlocklist(Array.from(next).slice(0, 500));
}

window.CalendarExtWallpaper = {
  getWallpaper,
  blockCurrentWallpaper
};


