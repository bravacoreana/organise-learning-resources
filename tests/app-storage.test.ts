import assert from "node:assert/strict";
import test from "node:test";
import { normalizeImportedState } from "../lib/app-storage";
import { normalizeResource } from "../lib/resource-record";

const fallbackResources = [
  normalizeResource({
    id: "fallback-1",
    title: "Fallback",
    url: "https://example.com/fallback",
    description: "fallback resource",
  }),
];

const defaults = {
  fallbackResources,
  emptyFilters: {
    search: "",
    category: "전체" as const,
    difficulty: "전체" as const,
    roadmap: "전체" as const,
    progress: "전체" as const,
  },
  defaultSort: {
    key: "",
    direction: "desc" as const,
  },
  defaultColumnWidths: {
    category: 170,
    resource: 460,
    roadmap: 180,
    difficulty: 150,
    status: 180,
    link: 120,
  },
  defaultColumnVisibility: {
    category: true,
    resource: true,
    roadmap: true,
    difficulty: true,
    status: true,
    link: true,
  },
};

test("normalizeImportedState accepts full export payloads", () => {
  const imported = normalizeImportedState(
    {
      version: 2,
      exportedAt: "2026-03-18T12:00:00.000Z",
      appState: {
        resources: [
          {
            id: "resource-1",
            title: "Prompt Patterns",
            url: "https://example.com/prompt",
            description: "Prompting guide",
            category: "Prompting",
            difficulty: "Intermediate",
            roadmap: "Prompting",
            progress: "진행 중",
            tags: ["prompt"],
            summary: "summary",
            learningGoals: ["goal"],
            prepInfo: "prep",
            analysisNote: "note",
            notes: "memo",
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
          },
        ],
        view: "notes",
        filters: {
          search: "prompt",
          category: "Prompting",
          difficulty: "Intermediate",
          roadmap: "Prompting",
          progress: "진행 중",
        },
        styleMode: "focus",
        sortConfig: {
          key: "resource",
          direction: "asc",
        },
        columnWidths: {
          category: 200,
          resource: 520,
          roadmap: 180,
          difficulty: 150,
          status: 180,
          link: 120,
        },
        columnVisibility: {
          category: true,
          resource: true,
          roadmap: true,
          difficulty: true,
          status: true,
          link: false,
        },
      },
    },
    defaults,
  );

  assert(imported);
  assert.equal(imported.view, "notes");
  assert.equal(imported.styleMode, "focus");
  assert.equal(imported.resources[0].sourceType, "link");
  assert.equal(imported.filters.category, "Prompting");
  assert.equal(imported.columnVisibility.link, false);
});

test("normalizeImportedState accepts legacy resources-only payloads", () => {
  const imported = normalizeImportedState(
    {
      resources: [],
    },
    defaults,
  );

  assert(imported);
  assert.deepEqual(imported.resources, []);
  assert.equal(imported.view, "table");
  assert.equal(imported.styleMode, "database");
});

test("normalizeImportedState rejects invalid payloads", () => {
  assert.equal(normalizeImportedState({ invalid: true }, defaults), null);
});
