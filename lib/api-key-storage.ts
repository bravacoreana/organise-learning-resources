const STORAGE_KEY = "ai-roadmap-anthropic-api-key";

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) || "";
}

export function setStoredApiKey(key: string): void {
  if (typeof window === "undefined") return;
  if (key) {
    window.localStorage.setItem(STORAGE_KEY, key);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function hasStoredApiKey(): boolean {
  return Boolean(getStoredApiKey());
}
