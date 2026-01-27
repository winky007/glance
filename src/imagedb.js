// IndexedDB storage for local images (drag & drop upload)

const DB_NAME = "CalendarExtImages";
const DB_VERSION = 1;
const STORE_NAME = "images";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        store.createIndex("name", "name", { unique: false });
        store.createIndex("uploadedAt", "uploadedAt", { unique: false });
      }
    };
  });
  return dbPromise;
}

async function saveImage(file) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: e.target.result, // base64 or ArrayBuffer
        uploadedAt: Date.now()
      };
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file); // Use DataURL for easier handling
  });
}

async function getAllImages() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function deleteImage(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clearAllImages() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function exportImages() {
  const images = await getAllImages();
  // Remove auto-increment id, keep only data needed for import
  const exportData = images.map((img) => ({
    name: img.name,
    type: img.type,
    size: img.size,
    data: img.data,
    uploadedAt: img.uploadedAt
  }));
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `calendar-ext-images-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return exportData.length;
}

async function importImages(jsonData) {
  if (!Array.isArray(jsonData)) {
    throw new Error("Invalid import data: must be an array");
  }
  let imported = 0;
  let failed = 0;
  for (const item of jsonData) {
    if (!item.data || !item.name) {
      failed++;
      continue;
    }
    try {
      // DataURL is already in base64 format, convert to File
      const dataUrl = String(item.data);
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], item.name, { type: item.type || blob.type || "image/jpeg" });
      await saveImage(file);
      imported++;
    } catch (e) {
      console.warn("Import image failed:", e);
      failed++;
    }
  }
  return { imported, failed };
}

window.CalendarExtImageDB = {
  saveImage,
  getAllImages,
  deleteImage,
  clearAllImages,
  exportImages,
  importImages
};

