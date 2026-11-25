function $(id) {
  return document.getElementById(id);
}

let __currentLang = "en";

const RSS_RECOMMENDATIONS = {
  zh: [
    {
      title: "中新网",
      url: "https://www.chinanews.com.cn/rss",
      feeds: [
        ["即时新闻", "scroll-news"], ["要闻导读", "importnews"], ["时政新闻", "china"],
        ["东西问", "dxw"], ["国际新闻", "world"], ["社会新闻", "society"],
        ["财经新闻", "finance"], ["生活", "life"], ["健康", "jk"],
        ["大湾区", "dwq"], ["华人", "chinese"], ["文娱新闻", "culture"],
        ["体育新闻", "sports"], ["视频", "sp"], ["图片", "photo"],
        ["创意", "chuangyi"], ["直播", "zhibo"], ["教育", "edu"], ["法治", "fz"]
      ].map(([title, slug]) => ({ title, url: `https://www.chinanews.com.cn/rss/${slug}.xml` }))
    },
    { title: "IT之家", url: "https://www.ithome.com/rss/" }
  ],
  en: [
    { title: "The Guardian · World", url: "https://www.theguardian.com/world/rss" },
    {
      title: "VOA News",
      url: "https://www.voanews.com/rssfeeds",
      feeds: [
        ["All About America", "zb__qtl-vomx-tpeqrtqq"],
        ["US", "zqboml-vomx-tpeivmy"],
        ["East Asia", "zobo_l-vomx-tpepvmv"],
        ["China News", "zmjuqtl-vomx-tpey_jqq"]
      ].map(([title, slug]) => ({ title, url: `https://www.voanews.com/api/${slug}` }))
    }
  ]
};

function t(key) {
  const I18n = window.CalendarExtI18n;
  return I18n ? I18n.t(__currentLang, key) : key;
}

function normalizeRssFeed(item) {
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
}

function applyTranslations(lang) {
  __currentLang = lang || "en";
  document.documentElement.lang = __currentLang;
  // Translate all elements with data-i18n attribute
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      // Special handling for option elements
      if (el.tagName === "OPTION") {
        el.textContent = t(key);
      } else {
        el.textContent = t(key);
      }
    }
  });
  // Translate placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.placeholder = t(key);
  });
  // Update page title
  document.title = t("settingsTitle") + " - Calendar New Tab";
  renderDateFormatPreview();
  updateSubscribeButtons();
}

function renderDateFormatPreview() {
  const preview = $("dateFormatPreview");
  const dateFormat = $("dateFormat").value;
  preview.hidden = dateFormat !== "auto";
  if (preview.hidden) {
    preview.textContent = "";
    return;
  }

  const locale = navigator.language || "en-US";
  const settings = { uiLang: __currentLang, dateFormat };
  const date = window.CalendarExtI18n.formatCalendarDate(new Date(), settings, locale);
  preview.textContent = t("dateFormatPreview").replace("{locale}", locale).replace("{date}", date);
}

function renderRssRecommendations(lang) {
  const list = $(`rssRecommendations-${lang}`);
  list.replaceChildren();
  for (const feed of RSS_RECOMMENDATIONS[lang]) {
    const item = document.createElement("li");
    if (feed.feeds) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = feed.title;
      const directory = document.createElement("a");
      directory.href = feed.url;
      directory.target = "_blank";
      directory.rel = "noopener";
      directory.dataset.i18n = "rssOpenDirectory";
      const channels = document.createElement("div");
      channels.className = "rss-recommendation-channels";
      feed.feeds.forEach(channel => channels.appendChild(createSubscribeButton(channel)));
      details.append(summary, directory, channels);
      item.appendChild(details);
    } else {
      item.appendChild(createSubscribeButton(feed));
    }
    list.appendChild(item);
  }
}

function createSubscribeButton(feed) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-ghost";
  button.dataset.feedUrl = feed.url;
  button.dataset.feedTitle = feed.title;
  button.addEventListener("click", () => {
    if (readRssForm().some(({ url }) => url === feed.url)) return;
    $("rssFeedsList").appendChild(createRssRow(feed));
    updateSubscribeButtons();
    saveForm().catch(() => showToast(t("rssSaveFailed"), "error"));
  });
  return button;
}

function updateSubscribeButtons() {
  const urls = new Set(readRssForm().map(({ url }) => url));
  $("rssRecommendations").querySelectorAll("[data-feed-url]").forEach(button => {
    button.disabled = urls.has(button.dataset.feedUrl);
    const action = t(button.disabled ? "rssSubscribed" : "rssSubscribe");
    button.textContent = `${button.dataset.feedTitle} · ${action}`;
  });
}

function readRssForm() {
  return Array.from(document.querySelectorAll(".rss-item"))
    .map(row => normalizeRssFeed({
      title: row.querySelector(".rss-title").value,
      url: row.querySelector(".rss-input").value
    }))
    .filter(Boolean);
}

function clampInt(n, min, max, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, Math.round(x)));
}

function debounce(fn, waitMs) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), waitMs);
  };
}

function createRssRow(url) {
  const row = document.createElement("div");
  row.className = "row rss-item";
  row.style.marginTop = "8px";
  const feed = normalizeRssFeed(url) || { title: "", url: "" };
  row.innerHTML = `
    <button class="rss-drag-handle" type="button" title="Drag to reorder" aria-label="Drag to reorder" draggable="true">
      <span></span><span></span><span></span>
    </button>
    <input type="text" class="rss-title" data-i18n-placeholder="rssTitlePlaceholder" />
    <input type="text" class="rss-input" style="flex:1" />
    <button class="btn btn-ghost btn-remove-rss" type="button" title="Remove">×</button>
  `;
  const titleInput = row.querySelector(".rss-title");
  titleInput.value = feed.title;
  titleInput.placeholder = t("rssTitlePlaceholder");
  row.querySelector(".rss-input").value = feed.url;

  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => saveForm().catch(() => {}));
  });
  row.querySelector(".btn-remove-rss").addEventListener("click", (e) => {
    e.target.closest(".rss-item").remove();
    saveForm().catch(() => {});
  });

  return row;
}

function renderRssList(urls) {
  const list = $("rssFeedsList");
  if (!list) return;
  list.innerHTML = "";
  urls
    .map((item) => normalizeRssFeed(item))
    .filter(Boolean)
    .forEach((item) => {
      list.appendChild(createRssRow(item));
    });
}

async function loadForm() {
  const Storage = window.CalendarExtStorage;
  const key = await Storage.getUnsplashKey();
  const s = await Storage.getSettings();

  $("unsplashKey").value = key;
  $("unsplashCollectionId").value = s.unsplashCollectionId || "";
  
  // Render RSS List
  renderRssList(s.rssFeeds || []);

  $("uiLang").value = s.uiLang || "en";
  $("dateFormat").value = s.dateFormat;
  if (!$("dateFormat").value) $("dateFormat").value = "auto";
  $("lunarEnabled").checked = s.lunarEnabled === true;
  $("dualClockEnabled").checked = s.dualClockEnabled === true;
  $("secondTimeZone").value = s.secondTimeZone || "Asia/Shanghai";
  if (!$("secondTimeZone").value) $("secondTimeZone").value = "Asia/Shanghai";
  syncDualClockUi();
  $("eventsLang").value = s.eventsLang || "en";
  $("onThisDaySource").value = s.onThisDaySource || "baike";
  $("bgRefresh").value = s.bgRefresh || "daily";
  $("wallpaperSource").value = s.wallpaperSource || "bing";
  
  // Weather settings
  $("weatherEnabled").value = s.weatherEnabled === true ? "true" : "false";
  $("weatherLocMethod").value = s.weatherLocMethod || "auto";
  $("weatherCity").value = s.weatherCity || "";
  $("weatherLat").value = s.weatherLat || "";
  $("weatherLon").value = s.weatherLon || "";

  // Apply translations based on saved language
  renderRssRecommendations("zh");
  renderRssRecommendations("en");
  applyTranslations(s.uiLang || "en");

  syncOnThisDayUi();
  syncWallpaperSourceUi();
  syncWeatherUi();
}

let pendingFormSave = Promise.resolve();

function saveForm() {
  const save = pendingFormSave.then(persistForm);
  pendingFormSave = save.catch(() => {});
  return save;
}

async function persistForm() {
  const Storage = window.CalendarExtStorage;
  showToast(t("saving"), "info");

  const key = $("unsplashKey").value || "";
  await Storage.setUnsplashKey(key);

  const unsplashCollectionId = $("unsplashCollectionId").value || "";
  
  // Collect RSS feeds
  const rssFeeds = readRssForm();

  const uiLang = $("uiLang").value || "en";
  const dateFormat = $("dateFormat").value || "auto";
  const lunarEnabled = $("lunarEnabled").checked;
  const dualClockEnabled = $("dualClockEnabled").checked;
  const secondTimeZone = $("secondTimeZone").value;
  const eventsLang = ($("eventsLang").value || "en").trim() || "en";
  const onThisDaySource = $("onThisDaySource").value || "baike";
  const bgRefresh = $("bgRefresh").value || "daily";
  const wallpaperSource = $("wallpaperSource").value || "bing";
  
  // Weather settings
  const weatherEnabled = $("weatherEnabled").value === "true";
  const weatherLocMethod = $("weatherLocMethod").value || "auto";
  const weatherCity = ($("weatherCity").value || "").trim();
  const weatherLat = ($("weatherLat").value || "").trim();
  const weatherLon = ($("weatherLon").value || "").trim();
  
  await Storage.setSettings({ 
    unsplashCollectionId, rssFeeds, uiLang, dateFormat, lunarEnabled, dualClockEnabled, secondTimeZone,
    eventsLang, onThisDaySource, bgRefresh, wallpaperSource,
    weatherEnabled, weatherLocMethod, weatherCity, weatherLat, weatherLon
  });

  updateSubscribeButtons();

  showToast(t("saved"), "success");
}

let toastTimer = null;

function syncDualClockUi() {
  $("secondTimeZoneField").hidden = !$("dualClockEnabled").checked;
}
function showToast(text, variant) {
  const el = $("toast");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("toast-success");
  if (variant === "success") el.classList.add("toast-success");
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 3000);
}

async function clearCacheWithStatus(clearFn, statusId) {
  const st = $(statusId);
  if (!st) return;
  st.textContent = "...";
  await clearFn();
  st.textContent = t("cacheCleared");
  setTimeout(() => (st.textContent = ""), 1500);
  showToast(t("cacheCleared"), "success");
}

async function clearNewsCache() {
  const Storage = window.CalendarExtStorage;
  await clearCacheWithStatus(() => Storage.clearNewsCache(), "news-cache-status");
}

async function clearEventsCache() {
  const Storage = window.CalendarExtStorage;
  await clearCacheWithStatus(() => Storage.clearEventsCache(), "events-cache-status");
}

async function clearWallpaperCache() {
  const Storage = window.CalendarExtStorage;
  await clearCacheWithStatus(() => Storage.clearWallpaperCache(), "wallpaper-cache-status");
}

async function clearBlock() {
  const Storage = window.CalendarExtStorage;
  const st = $("block-status");
  if (!st) return;
  st.textContent = "...";
  await Storage.clearBlocklist();
  st.textContent = t("blockCleared");
  setTimeout(() => (st.textContent = ""), 1500);
  showToast(t("blockCleared"), "success");
}

function syncOnThisDayUi() {
  const source = ($("onThisDaySource") && $("onThisDaySource").value) || "baike";
  const field = $("eventsLangField");
  const input = $("eventsLang");
  const show = source === "wikipedia";
  if (field) field.hidden = !show;
  if (input) input.disabled = !show;
}

function syncWallpaperSourceUi() {
  const source = ($("wallpaperSource") && $("wallpaperSource").value) || "bing";
  const config = $("unsplashConfig");
  const localConfig = $("localImagesConfig");
  const showUnsplash = source === "unsplash";
  const showUploaded = source === "uploaded";
  if (config) config.hidden = !showUnsplash;
  if (localConfig) localConfig.hidden = !showUploaded;
  if (showUploaded) {
    loadLocalImagesList();
  }
}

function syncWeatherUi() {
  const enabled = $("weatherEnabled") && $("weatherEnabled").value === "true";
  const locationConfig = $("weatherLocationConfig");
  if (locationConfig) locationConfig.hidden = !enabled;
  if (enabled) {
    syncWeatherLocMethodUi();
  }
}

function syncWeatherLocMethodUi() {
  const method = ($("weatherLocMethod") && $("weatherLocMethod").value) || "auto";
  const autoConfig = $("weatherAutoConfig");
  const cityConfig = $("weatherCityConfig");
  if (autoConfig) autoConfig.hidden = method !== "auto";
  if (cityConfig) cityConfig.hidden = method !== "city";
}

async function loadLocalImagesList() {
  const list = $("localImagesList");
  if (!list) return;
  try {
    const ImageDB = window.CalendarExtImageDB;
    if (!ImageDB) {
      list.innerHTML = '<div class="muted">ImageDB not available</div>';
      return;
    }
    const images = await ImageDB.getAllImages();
    if (!images || !images.length) {
      list.innerHTML = '<div class="muted" data-i18n="noImagesUploaded">No images uploaded yet</div>';
      applyTranslations(__currentLang);
      return;
    }
    list.innerHTML = images
      .map(
        (img) => `
      <div class="local-image-item">
        <img src="${img.data}" alt="${img.name || "image"}" />
        <button class="delete-btn" data-id="${img.id}" title="Delete">×</button>
      </div>
    `
      )
      .join("");
    // Bind delete buttons
    list.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = Number(e.target.getAttribute("data-id"));
        if (confirm(t("confirmDeleteImage") || "Delete this image?")) {
          try {
            await ImageDB.deleteImage(id);
            await loadLocalImagesList();
            showToast(t("imageDeleted") || "Image deleted", "success");
          } catch (err) {
            showToast(t("deleteFailed") || "Delete failed", "error");
          }
        }
      });
    });
  } catch (e) {
    list.innerHTML = '<div class="muted">Error loading images</div>';
  }
}

async function handleFileUpload(files) {
  const ImageDB = window.CalendarExtImageDB;
  if (!ImageDB) {
    showToast("ImageDB not available", "error");
    return;
  }
  const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
  if (!imageFiles.length) {
    showToast(t("noImageFiles") || "No image files selected", "error");
    return;
  }
  let success = 0;
  let failed = 0;
  for (const file of imageFiles) {
    try {
      await ImageDB.saveImage(file);
      success++;
    } catch (e) {
      failed++;
    }
  }
  await loadLocalImagesList();
  if (success > 0) {
    showToast(`${success} image(s) uploaded`, "success");
  }
  if (failed > 0) {
    showToast(`${failed} image(s) failed`, "error");
  }
}

async function exportImages() {
  try {
    const ImageDB = window.CalendarExtImageDB;
    if (!ImageDB) {
      showToast(t("exportFailed") || "Export failed", "error");
      return;
    }
    const count = await ImageDB.exportImages();
    showToast(t("exportSuccess") || `${count} image(s) exported`, "success");
  } catch (e) {
    showToast(t("exportFailed") || "Export failed", "error");
  }
}

async function importImages(file) {
  try {
    const ImageDB = window.CalendarExtImageDB;
    if (!ImageDB) {
      showToast(t("importFailed") || "Import failed", "error");
      return;
    }
    const text = await file.text();
    const jsonData = JSON.parse(text);
    const { imported, failed } = await ImageDB.importImages(jsonData);
    await loadLocalImagesList();
    if (imported > 0) {
      showToast(t("importSuccess") || `${imported} image(s) imported`, "success");
    }
    if (failed > 0) {
      showToast(`${failed} image(s) failed`, "error");
    }
  } catch (e) {
    showToast(t("importFailed") || "Import failed: invalid file", "error");
  }
}

function main() {
  loadForm().catch(() => {});
  $("btn-clear-news-cache").addEventListener("click", () => clearNewsCache().catch(() => {}));
  $("btn-clear-events-cache").addEventListener("click", () => clearEventsCache().catch(() => {}));
  $("btn-clear-wallpaper-cache").addEventListener("click", () => clearWallpaperCache().catch(() => {}));
  $("btn-clear-block").addEventListener("click", () => clearBlock().catch(() => {}));
  $("onThisDaySource").addEventListener("change", syncOnThisDayUi);

  // When language changes, immediately apply translations
  $("uiLang").addEventListener("change", () => {
    applyTranslations($("uiLang").value || "en");
  });
  $("dateFormat").addEventListener("change", renderDateFormatPreview);
  window.addEventListener("focus", renderDateFormatPreview);
  $("dualClockEnabled").addEventListener("change", syncDualClockUi);

  // When wallpaper source changes, show/hide Unsplash config
  $("wallpaperSource").addEventListener("change", () => {
    syncWallpaperSourceUi();
  });

  // When weather enabled changes, show/hide location config
  $("weatherEnabled").addEventListener("change", () => {
    syncWeatherUi();
  });

  // When weather location method changes, show/hide auto/city config
  $("weatherLocMethod").addEventListener("change", () => {
    syncWeatherLocMethodUi();
  });

  // Drag & drop upload
  const dropZone = $("dropZone");
  const fileInput = $("fileInput");
  if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-over");
    });
    dropZone.addEventListener("drop", async (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      const files = e.dataTransfer.files;
      if (files.length) {
        await handleFileUpload(files);
      }
    });
    fileInput.addEventListener("change", async (e) => {
      const files = e.target.files;
      if (files.length) {
        await handleFileUpload(files);
        e.target.value = ""; // Reset input
      }
    });
  }

  // Export/Import buttons
  const exportBtn = $("btn-export-images");
  const importBtn = $("btn-import-images");
  const importFileInput = $("importFileInput");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => exportImages().catch(() => {}));
  }
  if (importBtn && importFileInput) {
    importBtn.addEventListener("click", () => importFileInput.click());
    importFileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        await importImages(file);
        e.target.value = ""; // Reset input
      }
    });
  }

  // RSS Add button
  const btnAddRss = $("btnAddRss");
  const newRssUrl = $("newRssUrl");
  const newRssTitle = $("newRssTitle");
  if (btnAddRss && newRssUrl) {
    btnAddRss.addEventListener("click", () => {
        const url = newRssUrl.value.trim();
        if (url) {
            // Append to list and save
            const list = $("rssFeedsList");
            const title = (newRssTitle && newRssTitle.value || "").trim();
            list.appendChild(createRssRow({ title, url }));
            updateSubscribeButtons();
            
            newRssUrl.value = "";
            if (newRssTitle) newRssTitle.value = "";
            saveForm().catch(()=>{});
        }
    });
  }

  // RSS drag & drop reorder (handle-based)
  const rssList = $("rssFeedsList");
  if (rssList) {
    let dragRow = null;

    rssList.addEventListener("dragstart", (e) => {
      const handle = e.target.closest(".rss-drag-handle");
      if (!handle) return;
      const row = handle.closest(".rss-item");
      if (!row) return;
      dragRow = row;
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "rss");
      if (e.dataTransfer.setDragImage) {
        e.dataTransfer.setDragImage(row, 20, 20);
      }
    });

    rssList.addEventListener("dragend", () => {
      if (dragRow) dragRow.classList.remove("dragging");
      rssList.querySelectorAll(".rss-item.drag-over").forEach((el) => el.classList.remove("drag-over"));
      dragRow = null;
    });

    rssList.addEventListener("dragover", (e) => {
      if (!dragRow) return;
      e.preventDefault();
      const row = e.target.closest(".rss-item");
      if (!row || row === dragRow) return;
      row.classList.add("drag-over");
    });

    rssList.addEventListener("dragleave", (e) => {
      const row = e.target.closest(".rss-item");
      if (row) row.classList.remove("drag-over");
    });

    rssList.addEventListener("drop", (e) => {
      if (!dragRow) return;
      e.preventDefault();
      const targetRow = e.target.closest(".rss-item");
      if (!targetRow || targetRow === dragRow) return;

      const rect = targetRow.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      if (before) {
        rssList.insertBefore(dragRow, targetRow);
      } else {
        rssList.insertBefore(dragRow, targetRow.nextSibling);
      }

      targetRow.classList.remove("drag-over");
      saveForm().catch(() => {});
    });

  }

  // City search button
  const searchCityBtn = $("btn-search-city");
  const cityInput = $("weatherCity");
  const resultsContainer = $("citySearchResults");
  
  if (searchCityBtn && cityInput) {
    searchCityBtn.addEventListener("click", async () => {
      const cityName = cityInput.value.trim();
      if (!cityName) return;
      
      resultsContainer.innerHTML = `<div class="muted">${t("weatherSearching")}</div>`;
      
      try {
        const lang = __currentLang === "zh" ? "zh" : "en";
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=${lang}&format=json`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
          resultsContainer.innerHTML = `<div class="muted">${t("weatherCityNotFound")}</div>`;
          return;
        }
        
        // Show results as clickable list
        resultsContainer.innerHTML = `<div class="muted" style="margin-bottom: 8px;">${t("weatherSelectCity")}</div>`;
        const list = document.createElement("div");
        list.className = "city-results-list";
        
        data.results.forEach(city => {
          const item = document.createElement("div");
          item.className = "city-result-item";
          const admin = [city.admin1, city.country].filter(Boolean).join(", ");
          item.innerHTML = `<strong>${city.name}</strong> <span class="muted">${admin}</span>`;
          item.style.cssText = "padding: 8px 12px; cursor: pointer; border-radius: 8px; margin-bottom: 4px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);";
          
          item.addEventListener("mouseenter", () => {
            item.style.background = "rgba(255,255,255,0.12)";
          });
          item.addEventListener("mouseleave", () => {
            item.style.background = "rgba(255,255,255,0.05)";
          });
          
          item.addEventListener("click", () => {
            $("weatherLat").value = city.latitude.toFixed(4);
            $("weatherLon").value = city.longitude.toFixed(4);
            cityInput.value = city.name;
            resultsContainer.innerHTML = `<div class="muted" style="color: #22c55e;">✓ ${t("weatherCityFound")}: ${city.name} (${city.latitude.toFixed(4)}, ${city.longitude.toFixed(4)})</div>`;
            
            // Auto-save
            saveForm().catch(() => {});
          });
          
          list.appendChild(item);
        });
        
        resultsContainer.appendChild(list);
        
      } catch (e) {
        console.error("City search error:", e);
        resultsContainer.innerHTML = `<div class="muted" style="color: #ef4444;">Error: ${e.message}</div>`;
      }
    });
    
    // Also trigger search on Enter key
    cityInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchCityBtn.click();
      }
    });
  }

  // Auto-detect location button
  const detectBtn = $("btn-detect-location");
  if (detectBtn) {
    detectBtn.addEventListener("click", async () => {
      const status = $("location-status");
      status.textContent = "...";
      
      if (!navigator.geolocation) {
        status.textContent = t("weatherLocationFailed");
        return;
      }
      
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 0
          });
        });
        
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        
        $("weatherLat").value = lat;
        $("weatherLon").value = lon;
        
        status.textContent = t("weatherLocationDetected") + `: ${lat}, ${lon}`;
        
        // Auto-save
        saveForm().catch(() => {});
        
      } catch (e) {
        console.error("Location error:", e);
        status.textContent = t("weatherLocationFailed");
      }
    });
  }

  // Auto-save with a small delay + hint
  const autoSave = debounce(() => saveForm().catch(() => {}), 450);
  const ids = ["unsplashKey", "unsplashCollectionId", "uiLang", "dateFormat", "lunarEnabled", "dualClockEnabled", "secondTimeZone", "eventsLang", "onThisDaySource", "bgRefresh", "wallpaperSource", "weatherEnabled", "weatherLocMethod", "weatherCity", "weatherLat", "weatherLon"];
  for (const id of ids) {
    const el = $(id);
    if (!el) continue;
    el.addEventListener("change", autoSave);
    el.addEventListener("input", autoSave);
  }
}

document.addEventListener("DOMContentLoaded", main);
