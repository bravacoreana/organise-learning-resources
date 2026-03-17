const STORAGE_KEY = "ai-roadmap-next-v1";
const DB_NAME = "ai-roadmap-next-db";
const DB_STORE = "files";

export function loadStoredState() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredState(data) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function putStoredFile(id, file) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStoredFile(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const request = tx.objectStore(DB_STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteStoredFile(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
