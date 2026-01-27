/* global window */

/**
 * Open-Meteo Weather API Module
 * https://open-meteo.com/
 * 
 * WMO Weather Codes:
 * 0: Clear sky
 * 1, 2, 3: Mainly clear, partly cloudy, overcast
 * 45, 48: Fog
 * 51, 53, 55: Drizzle (light, moderate, dense)
 * 56, 57: Freezing Drizzle
 * 61, 63, 65: Rain (slight, moderate, heavy)
 * 66, 67: Freezing Rain
 * 71, 73, 75: Snow fall (slight, moderate, heavy)
 * 77: Snow grains
 * 80, 81, 82: Rain showers
 * 85, 86: Snow showers
 * 95: Thunderstorm
 * 96, 99: Thunderstorm with hail
 */

const WEATHER_CODE_MAP = {
  0: { icon: "☀️", text: "晴", textEn: "Clear" },
  1: { icon: "🌤️", text: "晴间多云", textEn: "Mainly Clear" },
  2: { icon: "⛅", text: "多云", textEn: "Partly Cloudy" },
  3: { icon: "☁️", text: "阴", textEn: "Overcast" },
  45: { icon: "🌫️", text: "雾", textEn: "Fog" },
  48: { icon: "🌫️", text: "雾凇", textEn: "Depositing Fog" },
  51: { icon: "🌦️", text: "小毛毛雨", textEn: "Light Drizzle" },
  53: { icon: "🌦️", text: "毛毛雨", textEn: "Drizzle" },
  55: { icon: "🌦️", text: "密集毛毛雨", textEn: "Dense Drizzle" },
  56: { icon: "🌧️", text: "冻毛毛雨", textEn: "Freezing Drizzle" },
  57: { icon: "🌧️", text: "密集冻毛毛雨", textEn: "Dense Freezing Drizzle" },
  61: { icon: "🌧️", text: "小雨", textEn: "Slight Rain" },
  63: { icon: "🌧️", text: "中雨", textEn: "Moderate Rain" },
  65: { icon: "🌧️", text: "大雨", textEn: "Heavy Rain" },
  66: { icon: "🌧️", text: "小冻雨", textEn: "Light Freezing Rain" },
  67: { icon: "🌧️", text: "大冻雨", textEn: "Heavy Freezing Rain" },
  71: { icon: "🌨️", text: "小雪", textEn: "Slight Snow" },
  73: { icon: "🌨️", text: "中雪", textEn: "Moderate Snow" },
  75: { icon: "❄️", text: "大雪", textEn: "Heavy Snow" },
  77: { icon: "🌨️", text: "雪粒", textEn: "Snow Grains" },
  80: { icon: "🌧️", text: "小阵雨", textEn: "Slight Showers" },
  81: { icon: "🌧️", text: "中阵雨", textEn: "Moderate Showers" },
  82: { icon: "🌧️", text: "强阵雨", textEn: "Violent Showers" },
  85: { icon: "🌨️", text: "小阵雪", textEn: "Slight Snow Showers" },
  86: { icon: "🌨️", text: "大阵雪", textEn: "Heavy Snow Showers" },
  95: { icon: "⛈️", text: "雷暴", textEn: "Thunderstorm" },
  96: { icon: "⛈️", text: "雷暴伴小冰雹", textEn: "Thunderstorm with Hail" },
  99: { icon: "⛈️", text: "雷暴伴大冰雹", textEn: "Thunderstorm with Heavy Hail" }
};

// Default fallback for unknown codes
const WEATHER_UNKNOWN = { icon: "🌡️", text: "未知", textEn: "Unknown" };

/**
 * Get air quality level from AQI (US AQI standard)
 * @param {number} aqi - Air Quality Index (0-500+)
 * @param {string} lang - Language (en or zh)
 * @returns {{level: string, levelEn: string, icon: string}}
 */
function getAirQualityLevel(aqi, lang = "zh") {
  if (!Number.isFinite(aqi) || aqi < 0) {
    return { level: "未知", levelEn: "Unknown", icon: "❓" };
  }
  
  if (aqi <= 50) {
    return { level: "优", levelEn: "Good", icon: "🟢" };
  } else if (aqi <= 100) {
    return { level: "良", levelEn: "Moderate", icon: "🟡" };
  } else if (aqi <= 150) {
    return { level: "轻度污染", levelEn: "Unhealthy for Sensitive", icon: "🟠" };
  } else if (aqi <= 200) {
    return { level: "中度污染", levelEn: "Unhealthy", icon: "🔴" };
  } else if (aqi <= 300) {
    return { level: "重度污染", levelEn: "Very Unhealthy", icon: "🟣" };
  } else {
    return { level: "严重污染", levelEn: "Hazardous", icon: "⚫" };
  }
}

/**
 * Get weather info from code
 * @param {number} code - WMO weather code
 * @param {string} lang - Language (en or zh)
 * @returns {{icon: string, text: string}}
 */
function getWeatherFromCode(code, lang = "zh") {
  const info = WEATHER_CODE_MAP[code] || WEATHER_UNKNOWN;
  return {
    icon: info.icon,
    text: lang === "zh" ? info.text : info.textEn
  };
}

/**
 * Get user's geolocation using browser API
 * @param {number} timeout - Timeout in ms (default 10000)
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
function getUserLocation(timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: timeout,
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  });
}

/**
 * Fetch air quality data from Open-Meteo Air Quality API
 * @param {Object} options
 * @param {number} options.latitude
 * @param {number} options.longitude
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function fetchAirQuality({ latitude, longitude, signal }) {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", latitude.toFixed(4));
  url.searchParams.set("longitude", longitude.toFixed(4));
  url.searchParams.set("current", "us_aqi");

  try {
    const response = await fetch(url.toString(), { signal });
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (e) {
    if (e.name === "AbortError") {
      return { success: false, error: "Timeout" };
    }
    return { success: false, error: String(e.message || e) };
  }
}

/**
 * Fetch weather data from Open-Meteo API
 * @param {Object} options
 * @param {number} options.latitude
 * @param {number} options.longitude
 * @param {string} options.timezone - e.g. "Asia/Shanghai"
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function fetchWeather({ latitude, longitude, timezone = "Asia/Shanghai", signal }) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude.toFixed(4));
  url.searchParams.set("longitude", longitude.toFixed(4));
  url.searchParams.set("current", "temperature_2m,precipitation,weather_code");
  // Add daily forecast for tomorrow
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("forecast_days", "2"); // Today + Tomorrow
  url.searchParams.set("timezone", timezone);

  try {
    const response = await fetch(url.toString(), { signal });
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (e) {
    if (e.name === "AbortError") {
      return { success: false, error: "Timeout" };
    }
    return { success: false, error: String(e.message || e) };
  }
}

/**
 * Get current weather with caching
 * @param {Object} settings - App settings containing location info
 * @param {string} lang - Language for weather text
 * @returns {Promise<{success: boolean, weather?: Object, error?: string}>}
 */
async function getWeather(settings, lang = "zh") {
  const Storage = window.CalendarExtStorage;
  const dateKey = Storage.nowISODateKey();
  
  // Check cache first (cache for 1 hour)
  const CACHE_TTL = 60 * 60 * 1000;
  const cacheKey = "weatherCache";
  let cache = {};
  
  try {
    const stored = await chrome.storage.local.get([cacheKey]);
    cache = stored[cacheKey] || {};
  } catch (e) {
    // Ignore cache read errors
  }

  // Try to get location
  let lat = parseFloat(settings.weatherLat);
  let lon = parseFloat(settings.weatherLon);
  
  // If no manual location, try browser geolocation
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    try {
      const loc = await getUserLocation(8000);
      lat = loc.latitude;
      lon = loc.longitude;
    } catch (e) {
      return { 
        success: false, 
        error: "location_unavailable",
        errorMessage: lang === "zh" ? "无法获取位置" : "Location unavailable"
      };
    }
  }

  // Round coordinates for cache key (nearby locations share cache)
  const cacheLocKey = `${lat.toFixed(2)}_${lon.toFixed(2)}_${dateKey}`;
  const cached = cache[cacheLocKey];
  
  if (cached && cached.timestamp && (Date.now() - cached.timestamp < CACHE_TTL)) {
    const weatherInfo = getWeatherFromCode(cached.weatherCode, lang);
    // Rebuild air quality info with current language
    let airQuality = null;
    if (cached.airQuality) {
      const aqLevel = getAirQualityLevel(cached.airQuality.aqi, lang);
      airQuality = {
        ...cached.airQuality,
        level: lang === "zh" ? aqLevel.level : aqLevel.levelEn,
        icon: aqLevel.icon
      };
    }
    // Rebuild tomorrow info with current language
    let tomorrow = null;
    if (cached.tomorrow) {
      const tomorrowInfo = getWeatherFromCode(cached.tomorrow.weatherCode, lang);
      tomorrow = {
        ...cached.tomorrow,
        icon: tomorrowInfo.icon,
        text: tomorrowInfo.text
      };
    }
    return {
      success: true,
      weather: {
        temperature: cached.temperature,
        precipitation: cached.precipitation,
        weatherCode: cached.weatherCode,
        icon: weatherInfo.icon,
        text: weatherInfo.text,
        airQuality,
        tomorrow,
        fromCache: true
      }
    };
  }

  // Fetch fresh data
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const result = await fetchWeather({
      latitude: lat,
      longitude: lon,
      timezone: settings.timeZone || "Asia/Shanghai",
      signal: controller.signal
    });
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const current = result.data.current;
    const daily = result.data.daily;
    if (!current) {
      return { success: false, error: "No current data" };
    }

    const weatherCode = current.weather_code;
    const temperature = current.temperature_2m;
    const precipitation = current.precipitation;
    const weatherInfo = getWeatherFromCode(weatherCode, lang);

    // Fetch air quality from separate API
    let airQuality = null;
    try {
      const aqResult = await fetchAirQuality({
        latitude: lat,
        longitude: lon,
        signal: controller.signal
      });
      if (aqResult.success && aqResult.data && aqResult.data.current) {
        const aqi = aqResult.data.current.us_aqi;
        if (Number.isFinite(aqi)) {
          const aqLevel = getAirQualityLevel(aqi, lang);
          airQuality = {
            aqi: Math.round(aqi),
            level: lang === "zh" ? aqLevel.level : aqLevel.levelEn,
            icon: aqLevel.icon
          };
        }
      }
    } catch (e) {
      // Air quality fetch failed, continue without it
      console.warn("Air quality fetch failed:", e);
    }

    // Tomorrow's weather (index 1 in daily arrays)
    let tomorrow = null;
    if (daily && daily.time && daily.time.length > 1) {
      const tomorrowCode = daily.weather_code[1];
      const tomorrowInfo = getWeatherFromCode(tomorrowCode, lang);
      tomorrow = {
        weatherCode: tomorrowCode,
        tempMax: daily.temperature_2m_max[1],
        tempMin: daily.temperature_2m_min[1],
        icon: tomorrowInfo.icon,
        text: tomorrowInfo.text
      };
    }

    // Update cache
    cache[cacheLocKey] = {
      temperature,
      precipitation,
      weatherCode,
      airQuality,
      tomorrow,
      timestamp: Date.now()
    };
    
    // Clean old cache entries
    const now = Date.now();
    for (const key of Object.keys(cache)) {
      if (cache[key].timestamp && now - cache[key].timestamp > CACHE_TTL * 4) {
        delete cache[key];
      }
    }
    
    try {
      await chrome.storage.local.set({ [cacheKey]: cache });
    } catch (e) {
      // Ignore cache write errors
    }

    return {
      success: true,
      weather: {
        temperature,
        precipitation,
        weatherCode,
        icon: weatherInfo.icon,
        text: weatherInfo.text,
        airQuality,
        tomorrow,
        fromCache: false
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

// Expose API
window.CalendarExtWeather = {
  getWeather,
  getUserLocation,
  fetchWeather,
  fetchAirQuality,
  getWeatherFromCode,
  getAirQualityLevel,
  WEATHER_CODE_MAP
};
