import { CATEGORY_OPTIONS, DIFFICULTY_OPTIONS, PROGRESS_OPTIONS, ROADMAP_OPTIONS } from "@/lib/resource-analysis";
import type {
  DifficultyLevel,
  ResourceCategory,
  ResourceDraft,
  ResourceRecord,
  RoadmapStage,
  SortConfig,
  SourceType,
} from "@/lib/types";

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:"]);
const SAFE_SOURCE_TYPES = new Set<SourceType>(["manual", "link", "file"]);
const SAFE_CATEGORY_VALUES = new Set<ResourceCategory>(CATEGORY_OPTIONS);
const SAFE_DIFFICULTY_VALUES = new Set<DifficultyLevel>(DIFFICULTY_OPTIONS);
const SAFE_ROADMAP_VALUES = new Set<RoadmapStage>(ROADMAP_OPTIONS);
const SAFE_PROGRESS_VALUES = new Set<ResourceRecord["progress"]>(PROGRESS_OPTIONS);

export const FIELD_LIMITS = {
  id: 120,
  title: 200,
  url: 2048,
  shortText: 120,
  mediumText: 500,
  longText: 4000,
  notes: 20000,
  order: 80,
  tag: 40,
  tagCount: 12,
  learningGoal: 240,
  learningGoalCount: 10,
} as const;

const RESOURCE_SIGNATURE_KEYS = [
  "id",
  "title",
  "url",
  "description",
  "category",
  "difficulty",
  "roadmap",
  "progress",
  "tags",
  "summary",
  "learningGoals",
  "prepInfo",
  "analysisNote",
  "notes",
  "sourceType",
  "topic",
  "trustLevel",
  "recommendationReason",
  "expectedOutcome",
  "prerequisites",
  "sourceCategory",
  "order",
  "createdAt",
] as const;

export function parseTags(raw: string): string[] {
  return sanitizeStringArray(String(raw || "").split(","), FIELD_LIMITS.tag, FIELD_LIMITS.tagCount);
}

export function toResourceDraft(resource: ResourceRecord): ResourceDraft {
  return {
    ...resource,
    tagsInput: resource.tags.join(", "),
  };
}

export function toPersistedResource(draft: ResourceDraft, updatedAt = new Date().toISOString()): ResourceRecord {
  const { tagsInput, ...resource } = draft;
  return normalizeResource({
    ...resource,
    url: sanitizeExternalUrl(draft.url),
    tags: parseTags(tagsInput || ""),
    updatedAt,
  });
}

export function normalizeResource(resource: unknown): ResourceRecord {
  const source = isPlainObject(resource) ? resource : {};
  const now = new Date().toISOString();
  const title = sanitizeString(source.title, FIELD_LIMITS.title);
  const normalized = {
    id: sanitizeId(source.id),
    title: title || "이름 없는 리소스",
    url: sanitizeExternalUrl(source.url).slice(0, FIELD_LIMITS.url),
    description: sanitizeString(source.description, FIELD_LIMITS.longText),
    category: sanitizeEnum(source.category, SAFE_CATEGORY_VALUES, "Foundations"),
    difficulty: sanitizeEnum(source.difficulty, SAFE_DIFFICULTY_VALUES, "Beginner"),
    roadmap: sanitizeEnum(source.roadmap, SAFE_ROADMAP_VALUES, "Foundation"),
    progress: sanitizeEnum(source.progress, SAFE_PROGRESS_VALUES, "미시작"),
    tags: sanitizeStringArray(source.tags, FIELD_LIMITS.tag, FIELD_LIMITS.tagCount),
    summary: sanitizeString(source.summary, FIELD_LIMITS.longText),
    learningGoals: sanitizeStringArray(source.learningGoals, FIELD_LIMITS.learningGoal, FIELD_LIMITS.learningGoalCount),
    prepInfo: sanitizeString(source.prepInfo, FIELD_LIMITS.mediumText),
    analysisNote: sanitizeString(source.analysisNote, FIELD_LIMITS.longText),
    notes: sanitizeString(source.notes, FIELD_LIMITS.notes),
    sourceType: sanitizeEnum(source.sourceType, SAFE_SOURCE_TYPES, "manual"),
    topic: sanitizeString(source.topic, FIELD_LIMITS.longText),
    trustLevel: sanitizeString(source.trustLevel, FIELD_LIMITS.shortText),
    recommendationReason: sanitizeString(source.recommendationReason, FIELD_LIMITS.longText),
    expectedOutcome: sanitizeString(source.expectedOutcome, FIELD_LIMITS.longText),
    prerequisites: sanitizeString(source.prerequisites, FIELD_LIMITS.mediumText),
    sourceCategory: sanitizeString(source.sourceCategory, FIELD_LIMITS.shortText),
    order: sanitizeString(source.order, FIELD_LIMITS.order),
    createdAt: sanitizeDate(source.createdAt, now),
    updatedAt: sanitizeDate(source.updatedAt, now),
  } satisfies Omit<ResourceRecord, "searchIndex">;

  return {
    ...normalized,
    searchIndex: buildSearchIndex(normalized),
  };
}

export function resourceSignature(resource: ResourceRecord | ResourceDraft): string {
  const normalized =
    "tagsInput" in resource
      ? toPersistedResource(resource, resource.updatedAt || resource.createdAt || new Date().toISOString())
      : resource;

  return JSON.stringify(
    RESOURCE_SIGNATURE_KEYS.reduce<Record<string, unknown>>((accumulator, key) => {
      accumulator[key] = normalized[key];
      return accumulator;
    }, {}),
  );
}

export function getDominantValue(items: ResourceRecord[], key: keyof ResourceRecord): string {
  if (!items.length) return "";

  const counts = new Map<string, number>();
  for (const item of items) {
    const value = item[key];
    if (!value) continue;
    const normalizedValue = String(value);
    counts.set(normalizedValue, (counts.get(normalizedValue) || 0) + 1);
  }

  let dominant = "";
  let max = 0;
  for (const [value, count] of counts.entries()) {
    if (count > max) {
      dominant = value;
      max = count;
    }
  }

  return dominant;
}

export function compareResources(left: ResourceRecord, right: ResourceRecord, sortConfig: SortConfig): number {
  if (!sortConfig.key) {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  }

  const leftValue = getSortValue(left, sortConfig.key);
  const rightValue = getSortValue(right, sortConfig.key);
  const direction = sortConfig.direction === "asc" ? 1 : -1;

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return (leftValue - rightValue) * direction;
  }

  return String(leftValue).localeCompare(String(rightValue), "ko", { numeric: true, sensitivity: "base" }) * direction;
}

export function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ko-KR");
}

export function sanitizeExternalUrl(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    return SAFE_LINK_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function getResourceKindLabel(sourceType: SourceType): string {
  return sourceType === "link" ? "링크" : "직접 추가";
}

function buildSearchIndex(resource: Omit<ResourceRecord, "searchIndex">): string {
  return [
    resource.title,
    resource.description,
    resource.summary,
    resource.notes,
    resource.prepInfo,
    resource.analysisNote,
    resource.topic,
    resource.recommendationReason,
    resource.expectedOutcome,
    resource.prerequisites,
    resource.trustLevel,
    resource.sourceCategory,
    resource.tags.join(" "),
    resource.url,
  ]
    .join(" ")
    .toLowerCase();
}

function getSortValue(resource: ResourceRecord, sortKey: string) {
  const difficultyOrder = { Beginner: 1, Intermediate: 2, Advanced: 3 };
  const roadmapOrder = {
    Foundation: 1,
    Prompting: 2,
    Application: 3,
    "Agent Systems": 4,
    Evaluation: 5,
    Production: 6,
  };
  const progressOrder = { 미시작: 1, "진행 중": 2, "복습 필요": 3, 완료: 4 };

  if (sortKey === "resource") return resource.title || "";
  if (sortKey === "category") return resource.category || "";
  if (sortKey === "difficulty") return difficultyOrder[resource.difficulty] || 999;
  if (sortKey === "roadmap") return roadmapOrder[resource.roadmap] || 999;
  if (sortKey === "status") return progressOrder[resource.progress] || 999;
  if (sortKey === "link") return resource.url || "";

  return resource.updatedAt || "";
}

function sanitizeString(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function sanitizeStringArray(value: unknown, itemMaxLength: number, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];

  const normalized: string[] = [];
  for (const item of value) {
    const safeItem = sanitizeString(item, itemMaxLength);
    if (!safeItem || normalized.includes(safeItem)) continue;
    normalized.push(safeItem);
    if (normalized.length >= maxItems) break;
  }
  return normalized;
}

function sanitizeEnum<T extends string>(value: unknown, allowedValues: Set<T>, fallback: T): T {
  return allowedValues.has(value as T) ? (value as T) : fallback;
}

function sanitizeDate(value: unknown, fallback: string): string {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function sanitizeId(value: unknown): string {
  const safeId = sanitizeString(value, FIELD_LIMITS.id);
  return safeId || crypto.randomUUID();
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
