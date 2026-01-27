English | [中文](README.zh.md)
# Glance
An intelligent chrome new tab extension: **Calendar/Lunar Calendar + Weather + News + On This Day + Beautiful Wallpapers**

![screen](tab-screen.png)
![setting](tab-setting.png)

# Installation

1. Open Chrome: `chrome://extensions`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select this directory (contains `manifest.json`)
4. Open a new tab to verify

# Features

## Calendar and Lunar Calendar

- **Gregorian**: year/month/day + weekday
- **Lunar**: month + day + zodiac year (e.g. Snake, Tiger)
- Supports switching between Chinese and English UI

## Weather

- **Display**:
  - Current weather: icon + temperature + precipitation (if any)
  - Air quality: AQI value + level icon (Excellent/Good/Light/Moderate/Heavy/Severe)
  - Tomorrow forecast: icon + low~high temperature
- **Location options** (choose one):
  1. **Auto**: browser geolocation API (permission required)
  2. **Manual city input**: enter English city name (e.g. Shanghai, New York); it searches and gets coordinates. Manual input is recommended to avoid inaccurate location.
- **Data sources**:
  - Weather: Open-Meteo Forecast API
  - Air quality: Open-Meteo Air Quality API
- **Cache**: weather and air quality cached for 1 hour to reduce API requests

## News

- RSS subscriptions supported
- **RSS examples**:
  - China News Service: `https://www.chinanews.com.cn/rss/scroll-news.xml`
  - VOA English: choose "Subscribe" at <https://www.voanews.com/rssfeeds>
  - VOA Chinese: choose "Subscribe" at <https://www.voachinese.com/rssfeeds>
- Shows publish time (accurate to seconds)

## On This Day

- **Optional data sources**:
  - **Baidu Baike** (default, Chinese, 30-char limit)
  - **Wikipedia** (languages: zh / en / ja / fr ..., 60-char limit)
- Shows 3 events, sorted by year descending
- Click to open detail page

## Background Images

- **Four sources**:
  1. **Local images**: use images in `img/` (add your own, then run `generate_manifest.py` to generate the list)
  2. **Local uploads**: drag and drop to browser IndexedDB (supports import/export backups)
  3. **Bing daily wallpaper** (default, no key, auto-enabled)
  4. **Unsplash** (optional, needs Access Key + Collection ID; docs: https://unsplash.com/developers)
- **Refresh**: fixed one per day / random each open
- **Image management**:
  - Image source shown in bottom-right
  - Right-click the credit to block the current image and auto-load another
  - Uploaded images can be exported as JSON and imported from backups

# Settings Page

- **News**: RSS subscription URLs
- **Language**:
  - UI language (English / Chinese)
  - On This Day data source (Baidu Baike / Wikipedia)
  - Wikipedia language code (only shown when Wikipedia is selected)
- **Weather**:
  - Enable/disable weather (default off)
  - Location:
    - **Auto**: click to request geolocation permission
    - **Manual city input**: enter English city name, click "Search", choose a city to fill coordinates
  - Verify cities: <https://open-meteo.com/en/docs/geocoding-api>
- **Background**:
  - Source (Local images / Local uploads / Bing random / Bing daily / Unsplash)
  - Unsplash Access Key / Collection ID (only for Unsplash)
  - Refresh strategy
  - Upload area (only for "Local uploads")
  - Import/export
- **Cache**: clear cache (including weather cache) / blocked list

# Local Images and Uploads

## Bulk import into local images (good for large collections)

1. Put images into `img/` (subfolders supported)
2. Generate the manifest:

   ```bash
   python generate_manifest.py
   ```

3. Select "Local images" as the background source in settings

## Upload images as background

1. Select "Local uploads" in settings
2. Drag images into the upload area or click to choose files
3. Images are saved to browser IndexedDB
4. (Optional) click "Export images" to back up, or "Import images" to restore

# Tips

- **Right-click image credit**: block the current image and auto-load another
- **Hover news/history cards**: remove blur for easier reading
- **Hover weather**: show detailed weather info (description, AQI level, tomorrow forecast)
- **Auto-save**: changes save automatically; "Saved" appears at the top
- **Image backup**: export uploaded images regularly to avoid loss after clearing browser data
- **Weather cache**: cached for 1 hour; clear cache to refresh immediately
