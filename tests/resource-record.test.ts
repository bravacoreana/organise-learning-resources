import assert from "node:assert/strict";
import test from "node:test";
import { normalizeResource, parseTags, resourceSignature, sanitizeExternalUrl, toPersistedResource, toResourceDraft } from "../lib/resource-record";

test("normalizeResource sanitizes unsafe values and builds a search index", () => {
  const resource = normalizeResource({
    id: "",
    title: "  Test Resource  ",
    url: "javascript:alert(1)",
    description: "Intro to agents",
    tags: ["agents", "agents", "  workflow  "],
    sourceType: "file",
    createdAt: "invalid",
    updatedAt: "invalid",
  });

  assert.equal(resource.title, "Test Resource");
  assert.equal(resource.url, "");
  assert.deepEqual(resource.tags, ["agents", "workflow"]);
  assert.equal(resource.sourceType, "manual");
  assert.match(resource.searchIndex, /intro to agents/);
});

test("toPersistedResource converts draft tags input into persisted tags", () => {
  const normalized = normalizeResource({
    id: "resource-1",
    title: "Prompt Patterns",
    url: "https://example.com/prompt",
    description: "Prompting guide",
    category: "Prompting",
    difficulty: "Intermediate",
    roadmap: "Prompting",
    progress: "진행 중",
    tags: ["prompt"],
    summary: "Prompt 요약",
    learningGoals: ["Goal"],
    prepInfo: "없음",
    analysisNote: "메모",
    notes: "노트",
    sourceType: "link",
    topic: "prompt",
    trustLevel: "높음",
    recommendationReason: "좋음",
    expectedOutcome: "적용",
    prerequisites: "기초",
    sourceCategory: "Guide",
    order: "1",
    createdAt: "2026-03-18T00:00:00.000Z",
    updatedAt: "2026-03-18T00:00:00.000Z",
  });
  const draft = toResourceDraft(normalized);
  draft.tagsInput = "prompt, eval, prompt";

  const persisted = toPersistedResource(draft, "2026-03-18T10:00:00.000Z");

  assert.deepEqual(persisted.tags, ["prompt", "eval"]);
  assert.equal(persisted.updatedAt, "2026-03-18T10:00:00.000Z");
  assert.match(persisted.searchIndex, /eval/);
});

test("resourceSignature ignores derived fields and tracks user-facing changes", () => {
  const resource = normalizeResource({
    id: "resource-2",
    title: "RAG Basics",
    url: "https://example.com/rag",
    description: "Search and retrieval",
  });
  const draft = toResourceDraft(resource);

  assert.equal(resourceSignature(resource), resourceSignature(draft));

  draft.notes = "updated";

  assert.notEqual(resourceSignature(resource), resourceSignature(draft));
});

test("parseTags and sanitizeExternalUrl normalize user input", () => {
  assert.deepEqual(parseTags(" agents, eval, , agents "), ["agents", "eval"]);
  assert.equal(sanitizeExternalUrl("https://example.com/docs"), "https://example.com/docs");
  assert.equal(sanitizeExternalUrl("ftp://example.com"), "");
});
