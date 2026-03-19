import { CATEGORY_OPTIONS, DIFFICULTY_OPTIONS, PROGRESS_OPTIONS, ROADMAP_OPTIONS } from "@/lib/resource-analysis";
import { normalizeResource } from "@/lib/resource-record";
import type {
  ColumnVisibility,
  ColumnWidths,
  FilterState,
  ResourceRecord,
  SortConfig,
  StoredAppState,
  StyleMode,
  ViewMode,
} from "@/lib/types";

const STORAGE_KEYS = ["ai-roadmap-next-v2", "ai-roadmap-next-v1"] as const;
const SAFE_VIEW_VALUES = new Set<ViewMode>(["table", "roadmap", "category", "difficulty", "notes"]);
const SAFE_STYLE_VALUES = new Set<StyleMode>(["database", "focus"]);
const SAFE_CATEGORY_FILTERS = new Set<FilterState["category"]>(["전체", ...CATEGORY_OPTIONS]);
const SAFE_DIFFICULTY_FILTERS = new Set<FilterState["difficulty"]>(["전체", ...DIFFICULTY_OPTIONS]);
const SAFE_ROADMAP_FILTERS = new Set<FilterState["roadmap"]>(["전체", ...ROADMAP_OPTIONS]);
const SAFE_PROGRESS_FILTERS = new Set<FilterState["progress"]>(["전체", ...PROGRESS_OPTIONS]);
const SAFE_SORT_DIRECTIONS = new Set<SortConfig["direction"]>(["asc", "desc"]);

export interface AppStateDefaults {
  fallbackResources: ResourceRecord[];
  emptyFilters: FilterState;
  defaultSort: SortConfig;
  defaultColumnWidths: ColumnWidths;
  defaultColumnVisibility: ColumnVisibility;
}

export function loadStoredState(): unknown | null {
  if (typeof window === "undefined") return null;

  try {
    for (const key of STORAGE_KEYS) {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredState(data: StoredAppState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(data));
}

export function buildExportPayload(appState: StoredAppState) {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    appState,
  };
}

export function normalizeImportedState(payload: unknown, defaults: AppStateDefaults): StoredAppState | null {
  const source = extractStateSource(payload);
  if (!source) return null;

  const resources = Array.isArray(source.resources) ? source.resources.map(normalizeResource) : defaults.fallbackResources;

  return {
    resources,
    view: sanitizeEnum(source.view, SAFE_VIEW_VALUES, "table"),
    filters: normalizeFilters(source.filters, defaults.emptyFilters),
    styleMode: sanitizeEnum(source.styleMode, SAFE_STYLE_VALUES, "database"),
    sortConfig: normalizeSortConfig(source.sortConfig, defaults.defaultSort),
    columnWidths: normalizeColumnWidths(source.columnWidths, defaults.defaultColumnWidths),
    columnVisibility: normalizeColumnVisibility(source.columnVisibility, defaults.defaultColumnVisibility),
  };
}

function extractStateSource(payload: unknown): Record<string, any> | null {
  if (!isPlainObject(payload)) return null;
  if (isPlainObject(payload.appState)) return payload.appState;
  if (Array.isArray(payload.resources)) return payload;
  return null;
}

function normalizeFilters(source: unknown, defaults: FilterState): FilterState {
  if (!isPlainObject(source)) return defaults;

  return {
    search: typeof source.search === "string" ? source.search : defaults.search,
    category: sanitizeEnum(source.category, SAFE_CATEGORY_FILTERS, defaults.category),
    difficulty: sanitizeEnum(source.difficulty, SAFE_DIFFICULTY_FILTERS, defaults.difficulty),
    roadmap: sanitizeEnum(source.roadmap, SAFE_ROADMAP_FILTERS, defaults.roadmap),
    progress: sanitizeEnum(source.progress, SAFE_PROGRESS_FILTERS, defaults.progress),
  };
}

function normalizeSortConfig(source: unknown, defaults: SortConfig): SortConfig {
  if (!isPlainObject(source)) return defaults;

  return {
    key: typeof source.key === "string" ? source.key : defaults.key,
    direction: sanitizeEnum(source.direction, SAFE_SORT_DIRECTIONS, defaults.direction),
  };
}

function normalizeColumnWidths(source: unknown, defaults: ColumnWidths): ColumnWidths {
  if (!isPlainObject(source)) return defaults;

  return {
    category: sanitizeColumnWidth(source.category, defaults.category),
    resource: sanitizeColumnWidth(source.resource, defaults.resource),
    roadmap: sanitizeColumnWidth(source.roadmap, defaults.roadmap),
    difficulty: sanitizeColumnWidth(source.difficulty, defaults.difficulty),
    status: sanitizeColumnWidth(source.status, defaults.status),
    link: sanitizeColumnWidth(source.link, defaults.link),
  };
}

function normalizeColumnVisibility(source: unknown, defaults: ColumnVisibility): ColumnVisibility {
  if (!isPlainObject(source)) return defaults;

  return {
    category: sanitizeBoolean(source.category, defaults.category),
    resource: sanitizeBoolean(source.resource, defaults.resource),
    roadmap: sanitizeBoolean(source.roadmap, defaults.roadmap),
    difficulty: sanitizeBoolean(source.difficulty, defaults.difficulty),
    status: sanitizeBoolean(source.status, defaults.status),
    link: sanitizeBoolean(source.link, defaults.link),
  };
}

function sanitizeColumnWidth(value: unknown, fallback: number): number {
  const width = Number(value);
  return Number.isFinite(width) && width >= 100 && width <= 1200 ? width : fallback;
}

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeEnum<T extends string>(value: unknown, allowedValues: Set<T>, fallback: T): T {
  return allowedValues.has(value as T) ? (value as T) : fallback;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
