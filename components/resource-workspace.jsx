"use client";

import { useDeferredValue, useEffect, useRef, useState, startTransition } from "react";
import {
  analyzeResourceInput,
  CATEGORY_OPTIONS,
  DIFFICULTY_OPTIONS,
  PROGRESS_OPTIONS,
  ROADMAP_OPTIONS,
} from "@/lib/resource-analysis";
import { REFERENCE_RESOURCES } from "@/lib/reference-resources";
import {
  deleteStoredFile,
  getStoredFile,
  loadStoredState,
  putStoredFile,
  saveStoredState,
} from "@/lib/browser-storage";

const EMPTY_FILTERS = {
  search: "",
  category: "전체",
  difficulty: "전체",
  roadmap: "전체",
  progress: "전체",
};

const VIEW_OPTIONS = [
  { value: "table", label: "테이블" },
  { value: "roadmap", label: "로드맵" },
  { value: "category", label: "카테고리" },
  { value: "difficulty", label: "난이도" },
  { value: "notes", label: "노트 모아보기" },
];

const STYLE_OPTIONS = [
  { value: "database", label: "데이터베이스형" },
  { value: "focus", label: "포커스형" },
];

const EMPTY_FORM = {
  title: "",
  url: "",
  description: "",
  category: "자동 추정",
  difficulty: "자동 추정",
  roadmap: "자동 추정",
  tags: "",
};

const DEFAULT_SORT = {
  key: "",
  direction: "desc",
};

const DEFAULT_COLUMN_WIDTHS = {
  category: 170,
  resource: 460,
  roadmap: 180,
  difficulty: 150,
  status: 180,
  link: 120,
};

const DEFAULT_COLUMN_VISIBILITY = {
  category: true,
  resource: true,
  roadmap: true,
  difficulty: true,
  status: true,
  link: true,
};

const TABLE_COLUMNS = [
  { key: "category", label: "카테고리", sortKey: "category", minWidth: 150 },
  { key: "resource", label: "리소스 이름", sortKey: "resource", minWidth: 320 },
  { key: "roadmap", label: "로드맵", sortKey: "roadmap", minWidth: 150 },
  { key: "difficulty", label: "난이도", sortKey: "difficulty", minWidth: 130 },
  { key: "status", label: "상태", sortKey: "status", minWidth: 150 },
  { key: "link", label: "링크", sortKey: "link", minWidth: 110 },
];

const ROADMAP_STAGE_META = {
  Foundation: {
    eyebrow: "Phase 01",
    description: "개념과 기본 사용 흐름을 익히는 구간",
    outcome: "핵심 개념과 기본 API 흐름을 설명할 수 있습니다.",
  },
  Prompting: {
    eyebrow: "Phase 02",
    description: "프롬프트 설계 패턴과 반복 개선 루프를 다듬는 구간",
    outcome: "프롬프트 구조와 실패 원인을 직접 조정할 수 있습니다.",
  },
  Application: {
    eyebrow: "Phase 03",
    description: "기능 단위 앱과 사용자 흐름을 묶어보는 구간",
    outcome: "간단한 LLM 기능을 실제 앱 흐름에 연결할 수 있습니다.",
  },
  "Agent Systems": {
    eyebrow: "Phase 04",
    description: "툴 사용, 상태 전이, 다단계 흐름을 설계하는 구간",
    outcome: "에이전트 구조와 실행 단계를 설명하고 구현할 수 있습니다.",
  },
  Evaluation: {
    eyebrow: "Phase 05",
    description: "품질 기준과 측정 방식을 세우는 검증 구간",
    outcome: "평가 항목과 데이터셋 기준으로 품질을 점검할 수 있습니다.",
  },
  Production: {
    eyebrow: "Phase 06",
    description: "운영, 모니터링, 비용과 안정성을 다루는 마무리 구간",
    outcome: "실서비스 기준으로 운영 체크리스트를 구성할 수 있습니다.",
  },
};

const CATEGORY_META = {
  Foundations: {
    eyebrow: "Core Concepts",
    description: "전체 학습의 기반이 되는 개념과 입문 자료를 모으는 구간",
  },
  Prompting: {
    eyebrow: "Prompt Design",
    description: "프롬프트 구조와 수정 패턴을 다듬는 실전 영역",
  },
  "LLM Apps": {
    eyebrow: "App Building",
    description: "기능을 제품 흐름에 연결하는 응용 영역",
  },
  Agents: {
    eyebrow: "Agent Design",
    description: "도구 사용과 상태 전이를 설계하는 자동화 영역",
  },
  RAG: {
    eyebrow: "Retrieval Systems",
    description: "검색과 근거 연결을 다루는 지식 연결 영역",
  },
  Evaluation: {
    eyebrow: "Quality Checks",
    description: "품질 기준과 검증 루프를 설계하는 측정 영역",
  },
  Deployment: {
    eyebrow: "Production Ops",
    description: "운영, 관측, 비용을 다루는 서비스화 영역",
  },
  Research: {
    eyebrow: "Deep Dive",
    description: "논문과 구조 이해를 중심으로 깊게 파는 탐구 영역",
  },
  "Case Study": {
    eyebrow: "Applied Cases",
    description: "실제 사례와 회고에서 패턴을 읽는 해석 영역",
  },
};

const DIFFICULTY_META = {
  Beginner: {
    eyebrow: "Level 01",
    description: "개념과 기본 흐름을 빠르게 잡는 단계",
    checkpoint: "핵심 용어와 기본 사용 흐름을 설명할 수 있으면 다음 단계로 올라갈 준비가 됩니다.",
  },
  Intermediate: {
    eyebrow: "Level 02",
    description: "직접 구현하고 실패 원인을 분석하는 단계",
    checkpoint: "간단한 기능을 만들고 구조적 선택 이유를 설명할 수 있어야 합니다.",
  },
  Advanced: {
    eyebrow: "Level 03",
    description: "성능, 평가, 운영 트레이드오프를 다루는 단계",
    checkpoint: "시스템 설계와 품질 기준을 프로젝트 맥락에서 결정할 수 있어야 합니다.",
  },
};

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:"]);
const SAFE_SOURCE_TYPES = new Set(["manual", "link", "file"]);
const SAFE_CATEGORY_VALUES = new Set(CATEGORY_OPTIONS);
const SAFE_DIFFICULTY_VALUES = new Set(DIFFICULTY_OPTIONS);
const SAFE_ROADMAP_VALUES = new Set(ROADMAP_OPTIONS);
const SAFE_PROGRESS_VALUES = new Set(PROGRESS_OPTIONS);
const SAFE_PREVIEW_FILE_TYPES = new Set([
  "application/pdf",
  "application/json",
  "text/plain",
  "text/markdown",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);
const SAFE_PREVIEW_FILE_EXTENSIONS = new Set([
  "pdf",
  "json",
  "txt",
  "md",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
]);
const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMPORTED_RESOURCES = 2000;
const FIELD_LIMITS = {
  id: 120,
  title: 200,
  url: 2048,
  shortText: 120,
  mediumText: 500,
  longText: 4000,
  notes: 20000,
  fileName: 255,
  fileType: 120,
  order: 80,
  tag: 40,
  tagCount: 12,
  learningGoal: 240,
  learningGoalCount: 10,
};

export default function ResourceWorkspace() {
  const [hydrated, setHydrated] = useState(false);
  const [resources, setResources] = useState(REFERENCE_RESOURCES);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [view, setView] = useState("table");
  const [styleMode, setStyleMode] = useState("database");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT);
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_COLUMN_VISIBILITY);
  const [headerMenu, setHeaderMenu] = useState(null);
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [drawerDraft, setDrawerDraft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resizeStateRef = useRef(null);

  const deferredSearch = useDeferredValue(filters.search);

  useEffect(() => {
    const stored = loadStoredState();
    if (stored) {
      const storedResources = Array.isArray(stored.resources) ? stored.resources.map(normalizeResource) : [];
      setResources(storedResources.length ? storedResources : REFERENCE_RESOURCES);
      setView(stored.view || "table");
      setStyleMode(stored.styleMode || "database");
      setFilters({ ...EMPTY_FILTERS, ...(stored.filters || {}) });
      setSortConfig(stored.sortConfig || DEFAULT_SORT);
      setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS, ...(stored.columnWidths || {}) });
      setColumnVisibility({ ...DEFAULT_COLUMN_VISIBILITY, ...(stored.columnVisibility || {}) });
    } else {
      setResources(REFERENCE_RESOURCES);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveStoredState({ resources, view, filters, styleMode, sortConfig, columnWidths, columnVisibility });
  }, [resources, view, filters, styleMode, sortConfig, columnWidths, columnVisibility, hydrated]);

  useEffect(() => {
    function handlePointerDown(event) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (!target.closest(".table-floating-menu") && !target.closest(".table-menu-trigger")) {
        setHeaderMenu(null);
      }

      if (!target.closest(".column-picker")) {
        setIsColumnPickerOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!headerMenu) return;

    function handleViewportChange() {
      setHeaderMenu(null);
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [headerMenu]);

  useEffect(() => {
    if (!selectedId) {
      setDrawerDraft(null);
      return;
    }
    const current = resources.find((resource) => resource.id === selectedId);
    setDrawerDraft(current ? { ...current, tagsInput: current.tags.join(", ") } : null);
  }, [selectedId, resources]);

  const filteredResources = resources
    .filter((resource) => (filters.category === "전체" ? true : resource.category === filters.category))
    .filter((resource) => (filters.difficulty === "전체" ? true : resource.difficulty === filters.difficulty))
    .filter((resource) => (filters.roadmap === "전체" ? true : resource.roadmap === filters.roadmap))
    .filter((resource) => (filters.progress === "전체" ? true : resource.progress === filters.progress))
    .filter((resource) => {
      if (!deferredSearch) return true;
      const haystack = [
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
      return haystack.includes(deferredSearch.toLowerCase());
    });

  const visibleResources = [...filteredResources].sort((a, b) => compareResources(a, b, sortConfig));

  const notesOnly = visibleResources.filter((resource) => resource.notes.trim());
  const completedCount = resources.filter((resource) => resource.progress === "완료").length;
  const inProgressCount = resources.filter((resource) => resource.progress === "진행 중").length;
  const noteCount = resources.filter((resource) => resource.notes.trim()).length;
  const activeFilterCount = [
    Boolean(filters.search.trim()),
    filters.category !== "전체",
    filters.difficulty !== "전체",
    filters.roadmap !== "전체",
    filters.progress !== "전체",
  ].filter(Boolean).length;

  useEffect(() => {
    if (styleMode !== "focus") return;

    if (!visibleResources.length) {
      setSelectedId(null);
      return;
    }

    const exists = visibleResources.some((resource) => resource.id === selectedId);
    if (!exists) {
      setSelectedId(visibleResources[0].id);
    }
  }, [styleMode, selectedId, visibleResources]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim() && !form.url.trim() && !selectedFile) {
      window.alert("제목, 링크, 파일 중 하나는 필요합니다.");
      return;
    }

    const safeUrl = sanitizeExternalUrl(form.url);
    if (form.url.trim() && !safeUrl) {
      window.alert("링크는 http:// 또는 https:// 주소만 사용할 수 있습니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      const analyzed = await analyzeResourceInput({
        title: form.title.trim(),
        url: safeUrl,
        description: form.description.trim(),
        file: selectedFile,
        category: form.category,
        difficulty: form.difficulty,
        roadmap: form.roadmap,
        tags: parseTags(form.tags),
      });

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const resource = {
        id,
        title: analyzed.title,
        url: safeUrl,
        description: analyzed.description,
        category: analyzed.category,
        difficulty: analyzed.difficulty,
        roadmap: analyzed.roadmap,
        progress: "미시작",
        tags: analyzed.tags,
        summary: analyzed.summary,
        learningGoals: analyzed.learningGoals,
        prepInfo: analyzed.prepInfo,
        analysisNote: analyzed.analysisNote,
        topic: "",
        trustLevel: "",
        recommendationReason: "",
        expectedOutcome: "",
        prerequisites: "",
        sourceCategory: "",
        order: "",
        notes: "",
        sourceType: selectedFile ? "file" : form.url.trim() ? "link" : "manual",
        fileName: selectedFile?.name || "",
        fileType: selectedFile?.type || "",
        createdAt: now,
        updatedAt: now,
      };
      const safeResource = normalizeResource(resource);

      if (selectedFile) {
        await putStoredFile(id, selectedFile);
      }

      startTransition(() => {
        setResources((current) => [safeResource, ...current]);
        setForm(EMPTY_FORM);
        setSelectedFile(null);
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateFilter(key, value) {
    startTransition(() => {
      setFilters((current) => ({ ...current, [key]: value }));
    });
  }

  function resetFilters() {
    startTransition(() => {
      setFilters(EMPTY_FILTERS);
    });
  }

  function toggleSort(sortKey) {
    setSortConfig((current) => {
      if (current.key !== sortKey) {
        return { key: sortKey, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key: sortKey, direction: "desc" };
      }
      return DEFAULT_SORT;
    });
  }

  function setExplicitSort(sortKey, direction) {
    setSortConfig({ key: sortKey, direction });
    setHeaderMenu(null);
  }

  function clearSort() {
    setSortConfig(DEFAULT_SORT);
    setHeaderMenu(null);
  }

  function toggleColumnVisibility(columnKey) {
    setColumnVisibility((current) => {
      const visibleCount = Object.values(current).filter(Boolean).length;
      if (current[columnKey] && visibleCount === 1) {
        return current;
      }
      return {
        ...current,
        [columnKey]: !current[columnKey],
      };
    });
  }

  function resetColumnVisibility() {
    setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
  }

  function openHeaderDropdown(event, columnKey) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 168;
    const nextLeft = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
    setHeaderMenu((current) =>
      current?.key === columnKey
        ? null
        : {
            key: columnKey,
            left: nextLeft,
            top: rect.bottom + 8,
          },
    );
  }

  function startColumnResize(event, columnKey) {
    event.preventDefault();
    event.stopPropagation();
    const column = TABLE_COLUMNS.find((item) => item.key === columnKey);
    resizeStateRef.current = {
      columnKey,
      startX: event.clientX,
      startWidth: columnWidths[columnKey],
      minWidth: column?.minWidth || 120,
    };

    const handlePointerMove = (moveEvent) => {
      if (!resizeStateRef.current) return;
      const nextWidth = Math.max(
        resizeStateRef.current.minWidth,
        resizeStateRef.current.startWidth + (moveEvent.clientX - resizeStateRef.current.startX),
      );
      setColumnWidths((current) => ({
        ...current,
        [columnKey]: nextWidth,
      }));
    };

    const handlePointerUp = () => {
      resizeStateRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function openResource(id) {
    setSelectedId(id);
  }

  function closeDrawer() {
    if (styleMode === "focus") return;
    setSelectedId(null);
  }

  function saveDrawer(nextDraft = null) {
    const targetDraft = nextDraft || drawerDraft;
    if (!targetDraft) return;

    const safeUrl = sanitizeExternalUrl(targetDraft.url);
    if (targetDraft.url?.trim() && !safeUrl) {
      window.alert("링크는 http:// 또는 https:// 주소만 저장할 수 있습니다.");
      return;
    }

    const updated = normalizeResource({
      ...targetDraft,
      url: safeUrl,
      tags: parseTags(targetDraft.tagsInput || ""),
      updatedAt: new Date().toISOString(),
    });
    delete updated.tagsInput;

    setResources((current) => current.map((resource) => (resource.id === updated.id ? updated : resource)));
    setSelectedId(updated.id);
  }

  async function deleteResource() {
    if (!drawerDraft) return;
    const target = drawerDraft;
    if (!window.confirm(`"${target.title}" 리소스를 삭제하시겠습니까?`)) return;

    if (target.sourceType === "file") {
      await deleteStoredFile(target.id);
    }

    setResources((current) => current.filter((resource) => resource.id !== target.id));
    setSelectedId(null);
  }

  async function openLinkedFile() {
    if (!drawerDraft || drawerDraft.sourceType !== "file") return;
    const file = await getStoredFile(drawerDraft.id);
    if (!file) {
      window.alert("저장된 파일을 찾지 못했습니다.");
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    if (canPreviewStoredFile(file)) {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = file.name || "download";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
    window.alert("스크립트 실행 가능성이 있는 파일 형식은 새 탭 대신 다운로드로 처리했습니다.");
  }

  function loadSamples() {
    setResources((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      const toAdd = REFERENCE_RESOURCES.filter((item) => !existingIds.has(item.id));
      return [...toAdd, ...current];
    });
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ resources }, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ai-roadmap-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  async function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;

     if (file.size > MAX_IMPORT_FILE_BYTES) {
      window.alert("JSON 파일은 5MB 이하만 가져올 수 있습니다.");
      event.target.value = "";
      return;
    }

    try {
      const parsed = JSON.parse(await file.text());
      if (!isValidImportPayload(parsed)) throw new Error("invalid");
      setResources(parsed.resources.map(normalizeResource));
    } catch {
      window.alert("유효한 JSON 구조가 아닙니다.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main className="page-shell">
      <div className="page-noise" />
      <section className="hero-panel">
        <div>
          <p className="eyebrow">AI Learning Workspace</p>
          <h1>로드맵 설계부터 리소스 정리, 진도 관리, 노트 작성까지 한 화면에서.</h1>
          <p className="hero-copy">
            링크와 파일을 추가하면 카테고리, 난이도, 로드맵, 학습 목표를 정리하고
            표 보기와 노트 모아보기까지 바로 이어집니다.
          </p>
        </div>
        <div className="hero-actions">
          <div className="style-switch" role="tablist" aria-label="레이아웃 스타일">
            {STYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`switch-chip ${styleMode === option.value ? "active" : ""}`}
                type="button"
                onClick={() => setStyleMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button className="ghost-button" type="button" onClick={loadSamples}>
            기본 리소스 불러오기
          </button>
          <button className="ghost-button" type="button" onClick={exportJson}>
            JSON 내보내기
          </button>
          <label className="ghost-button file-trigger">
            JSON 불러오기
            <input type="file" accept="application/json" onChange={importJson} />
          </label>
        </div>
      </section>

      <section className="stats-bar">
        <StatPill label="전체 리소스" value={resources.length} />
        <StatPill label="진행 중" value={inProgressCount} />
        <StatPill label="완료" value={completedCount} />
        <StatPill label="노트 작성" value={noteCount} />
      </section>

      <section className="top-controls">
        <section className={`glass-panel control-panel add-panel ${isAddOpen ? "open" : "collapsed"}`}>
          <div className="compact-head">
            <div className="section-head">
              <p className="eyebrow">Add Resource</p>
              <h2>새 리소스 추가</h2>
            </div>
            <button className="ghost-button" type="button" onClick={() => setIsAddOpen((current) => !current)}>
              {isAddOpen ? "접기" : "열기"}
            </button>
          </div>

          {isAddOpen ? (
            <form className="resource-form horizontal-form" onSubmit={handleSubmit}>
              <label>
                <span>제목</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="예: LangGraph 튜토리얼"
                />
              </label>

              <label>
                <span>링크</span>
                <input
                  value={form.url}
                  onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://..."
                />
              </label>

              <label className="control-wide">
                <span>설명</span>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="요약, 컨텍스트, 왜 필요한지"
                />
              </label>

              <label className="upload-box">
                <span>파일 첨부</span>
                <input
                  type="file"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
                <strong>{selectedFile ? selectedFile.name : "파일 선택"}</strong>
              </label>

              <div className="triple-grid control-wide">
                <SelectField
                  label="카테고리"
                  value={form.category}
                  options={["자동 추정", ...CATEGORY_OPTIONS]}
                  onChange={(value) => setForm((current) => ({ ...current, category: value }))}
                />
                <SelectField
                  label="난이도"
                  value={form.difficulty}
                  options={["자동 추정", ...DIFFICULTY_OPTIONS]}
                  onChange={(value) => setForm((current) => ({ ...current, difficulty: value }))}
                />
                <SelectField
                  label="로드맵"
                  value={form.roadmap}
                  options={["자동 추정", ...ROADMAP_OPTIONS]}
                  onChange={(value) => setForm((current) => ({ ...current, roadmap: value }))}
                />
              </div>

              <label>
                <span>태그</span>
                <input
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="쉼표로 구분: agents, rag, eval"
                />
              </label>

              <div className="control-actions">
                <button className="primary-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "분석 중..." : "리소스 추가"}
                </button>
              </div>
            </form>
          ) : (
            <form className="collapsed-add-form" onSubmit={handleSubmit}>
              <label className="collapsed-add-input">
                <span>링크</span>
                <input
                  value={form.url}
                  onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "분석 중..." : "리소스 추가"}
              </button>
            </form>
          )}
        </section>

        <section className={`glass-panel control-panel filter-panel ${isFilterOpen ? "open" : "collapsed"}`}>
          <div className="compact-head">
            <div className="section-head">
              <p className="eyebrow">Filters</p>
              <h2>필터</h2>
            </div>
            <button className="ghost-button" type="button" onClick={() => setIsFilterOpen((current) => !current)}>
              {isFilterOpen ? "접기" : "열기"}
            </button>
          </div>

          {isFilterOpen ? (
            <div className="filter-stack filter-toolbar">
              <label className="search-control">
                <span>검색</span>
                <input
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="제목, 요약, 태그, 노트 검색"
                />
              </label>

              <div className="toolbar-chip-groups">
                <FilterChips
                  label="카테고리"
                  value={filters.category}
                  options={["전체", ...CATEGORY_OPTIONS]}
                  onChange={(value) => updateFilter("category", value)}
                />
                <FilterChips
                  label="난이도"
                  value={filters.difficulty}
                  options={["전체", ...DIFFICULTY_OPTIONS]}
                  onChange={(value) => updateFilter("difficulty", value)}
                />
                <FilterChips
                  label="로드맵"
                  value={filters.roadmap}
                  options={["전체", ...ROADMAP_OPTIONS]}
                  onChange={(value) => updateFilter("roadmap", value)}
                />
                <FilterChips
                  label="학습 진도"
                  value={filters.progress}
                  options={["전체", ...PROGRESS_OPTIONS]}
                  onChange={(value) => updateFilter("progress", value)}
                />
              </div>
            </div>
          ) : (
            <div className="collapsed-filter-hint">
              <label className="search-control collapsed-filter-search">
                <span>검색</span>
                <input
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="제목, 요약, 태그, 노트 검색"
                />
              </label>
              <div className="compact-workspace-meta filter-meta">
                <span>활성 필터 {activeFilterCount}개</span>
                <span>현재 결과 {visibleResources.length}개</span>
              </div>
            </div>
          )}
        </section>
      </section>

      <section className="workspace-content">
        {styleMode === "database" ? (
          <section className="content-stack">
            <section className="glass-panel workspace-toolbar-panel">
              <div className="view-header">
                <div>
                  <p className="eyebrow">Workspace</p>
                  <h2>리소스 보기</h2>
                </div>
                <div className="view-switch">
                  {VIEW_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={`switch-chip ${view === option.value ? "active" : ""}`}
                      type="button"
                      onClick={() => setView(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                  {view === "table" ? (
                    <div className="column-picker">
                      <button
                        className={`ghost-button compact-button ${isColumnPickerOpen ? "active" : ""}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsColumnPickerOpen((current) => !current);
                        }}
                      >
                        열 설정
                      </button>
                      {isColumnPickerOpen ? (
                        <div className="column-picker-panel" onClick={(event) => event.stopPropagation()}>
                          <div className="column-picker-head">
                            <strong>표 열 표시</strong>
                            <button className="ghost-button compact-button" type="button" onClick={resetColumnVisibility}>
                              초기화
                            </button>
                          </div>
                          <div className="column-picker-list">
                            {TABLE_COLUMNS.map((column) => {
                              const checked = columnVisibility[column.key] !== false;
                              const visibleCount = Object.values(columnVisibility).filter(Boolean).length;
                              return (
                                <label key={column.key} className={`column-toggle-option ${checked ? "checked" : ""}`}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={checked && visibleCount === 1}
                                    onChange={() => toggleColumnVisibility(column.key)}
                                  />
                                  <span>{column.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {view !== "table" ? (
                <div className="compact-workspace-meta">
                  <span>현재 결과 {visibleResources.length}개</span>
                  <span>파일 자료 {resources.filter((resource) => resource.sourceType === "file").length}개</span>
                  <span>로드맵 단계 {new Set(visibleResources.map((resource) => resource.roadmap)).size}개</span>
                  <span>노트 {notesOnly.length}개</span>
                </div>
              ) : null}
            </section>

            <section className="glass-panel content-panel">
              {!hydrated ? <EmptyState title="불러오는 중" text="저장된 리소스를 읽고 있습니다." /> : null}
              {hydrated && visibleResources.length === 0 ? (
                <EmptyState
                  title="아직 리소스가 없습니다."
                  text="왼쪽에서 링크나 파일을 추가하면 자동 분류와 상세 정리가 시작됩니다."
                />
              ) : null}
              {hydrated && visibleResources.length > 0
                ? renderView(
                    view,
                    visibleResources,
                    notesOnly,
                    openResource,
                    filters,
                    updateFilter,
                    resetFilters,
                    sortConfig,
                    toggleSort,
                    setExplicitSort,
                    clearSort,
                    columnWidths,
                    setColumnWidths,
                    columnVisibility,
                    headerMenu,
                    setHeaderMenu,
                    openHeaderDropdown,
                    startColumnResize,
                  )
                : null}
            </section>
          </section>
        ) : (
          <section className="focus-layout">
            <section className="glass-panel focus-list-panel">
              <div className="view-header">
                <div>
                  <p className="eyebrow">Resource list</p>
                  <h2>리소스 리스트</h2>
                </div>
                <div className="summary-inline">{visibleResources.length}개</div>
              </div>

              <div className="summary-strip focus-summary">
                <SummaryBlock label="진행 중" value={`${inProgressCount}개`} />
                <SummaryBlock label="완료" value={`${completedCount}개`} />
                <SummaryBlock label="노트" value={`${noteCount}개`} />
                <SummaryBlock label="로드맵" value={`${new Set(visibleResources.map((resource) => resource.roadmap)).size}개`} />
              </div>

              {!hydrated ? <EmptyState title="불러오는 중" text="저장된 리소스를 읽고 있습니다." /> : null}
              {hydrated && visibleResources.length === 0 ? (
                <EmptyState
                  title="조건에 맞는 리소스가 없습니다."
                  text="필터를 조정하거나 새 리소스를 추가해 보세요."
                />
              ) : null}
              {hydrated && visibleResources.length > 0 ? (
                <div className="focus-list">
                  {visibleResources.map((resource) => (
                    <button
                      key={resource.id}
                      type="button"
                      className={`focus-item ${selectedId === resource.id ? "active" : ""}`}
                      onClick={() => openResource(resource.id)}
                    >
                      <div className="focus-item-head">
                        <strong>{resource.title}</strong>
                        <span>{resource.progress}</span>
                      </div>
                      <div className="meta-pills">
                        <span>{resource.category}</span>
                        <span>{resource.difficulty}</span>
                        <span>{resource.trustLevel || "직접 추가"}</span>
                      </div>
                      <p>{resource.summary}</p>
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="glass-panel focus-detail-panel">
              {drawerDraft ? (
                <ResourceInspector
                  draft={drawerDraft}
                  setDraft={setDrawerDraft}
                  onDelete={deleteResource}
                  onSave={saveDrawer}
                  onOpenFile={openLinkedFile}
                  inline
                />
              ) : (
                <EmptyState
                  title="리소스를 선택하세요."
                  text="왼쪽 리스트에서 항목을 고르면 상세 정보와 노트를 바로 편집할 수 있습니다."
                />
              )}
            </section>
          </section>
        )}
      </section>

      {drawerDraft && styleMode === "database" ? (
        <div className="drawer-backdrop" onClick={closeDrawer}>
          <aside className="detail-drawer" onClick={(event) => event.stopPropagation()}>
            <ResourceInspector
              draft={drawerDraft}
              setDraft={setDrawerDraft}
              onDelete={deleteResource}
              onSave={saveDrawer}
              onOpenFile={openLinkedFile}
              onClose={closeDrawer}
            />
          </aside>
        </div>
      ) : null}
    </main>
  );
}

function renderView(
  view,
  filteredResources,
  notesOnly,
  openResource,
  filters,
  updateFilter,
  resetFilters,
  sortConfig,
  toggleSort,
  setExplicitSort,
  clearSort,
  columnWidths,
  setColumnWidths,
  columnVisibility,
  headerMenu,
  setHeaderMenu,
  openHeaderDropdown,
  startColumnResize,
) {
  if (view === "table") {
    const activeColumns = TABLE_COLUMNS.filter((column) => columnVisibility[column.key] !== false);
    const actionColumnKey =
      [...activeColumns].reverse().find((column) => column.key !== "link")?.key ?? activeColumns[activeColumns.length - 1]?.key;

    return (
      <div className="table-wrap database-table-wrap">
        <table className="database-table">
          <colgroup>
            {activeColumns.map((column) => (
              <col key={column.key} style={{ width: `${columnWidths[column.key]}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {activeColumns.map((column) => (
                <th key={column.key}>
                  <div className="table-head-cell">
                    <button className="table-sort-button" type="button" onClick={() => toggleSort(column.sortKey)}>
                      <span>{column.label}</span>
                      <span className="table-sort-indicator">
                        {sortConfig.key === column.sortKey ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                    <button
                      className="table-menu-trigger"
                      type="button"
                      onClick={(event) => openHeaderDropdown(event, column.key)}
                    >
                      ⋯
                    </button>
                    <div
                      className="table-resize-handle"
                      onPointerDown={(event) => startColumnResize(event, column.key)}
                    />
                  </div>
                </th>
              ))}
            </tr>
            <tr className="table-filter-row">
              {activeColumns.map((column) => (
                <th key={column.key}>
                  {renderTableFilterCell(
                    column,
                    filters,
                    updateFilter,
                    resetFilters,
                    filteredResources.length,
                    column.key === actionColumnKey,
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredResources.map((resource) => (
              <tr key={resource.id} onClick={() => openResource(resource.id)}>
                {activeColumns.map((column) => renderTableBodyCell(column, resource))}
              </tr>
            ))}
          </tbody>
        </table>
        {headerMenu ? (
          <div
            className="table-floating-menu"
            style={{ top: `${headerMenu.top}px`, left: `${headerMenu.left}px` }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                const targetColumn = TABLE_COLUMNS.find((column) => column.key === headerMenu.key);
                if (!targetColumn) return;
                setExplicitSort(targetColumn.sortKey, "asc");
                setHeaderMenu(null);
              }}
            >
              오름차순
            </button>
            <button
              type="button"
              onClick={() => {
                const targetColumn = TABLE_COLUMNS.find((column) => column.key === headerMenu.key);
                if (!targetColumn) return;
                setExplicitSort(targetColumn.sortKey, "desc");
                setHeaderMenu(null);
              }}
            >
              내림차순
            </button>
            <button
              type="button"
              onClick={() => {
                clearSort();
                setHeaderMenu(null);
              }}
            >
              기본 정렬
            </button>
            <button
              type="button"
              onClick={() => {
                setColumnWidths((current) => ({
                  ...current,
                  [headerMenu.key]: DEFAULT_COLUMN_WIDTHS[headerMenu.key],
                }));
                setHeaderMenu(null);
              }}
            >
              폭 초기화
            </button>
            <button type="button" onClick={() => setHeaderMenu(null)}>
              닫기
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (view === "notes") {
    return notesOnly.length ? (
      <div className="notes-grid">
        {notesOnly.map((resource) => (
          <article key={resource.id} className="note-card" onClick={() => openResource(resource.id)}>
            <div className="note-card-head">
              <div>
                <p>{resource.category}</p>
                <h3>{resource.title}</h3>
              </div>
              <span>{resource.progress}</span>
            </div>
            <p className="note-card-summary">{resource.summary}</p>
            <pre>{resource.notes}</pre>
          </article>
        ))}
      </div>
    ) : (
      <EmptyState title="노트가 없습니다." text="상세 패널에서 노트를 작성하면 이 뷰에 모입니다." />
    );
  }

  if (view === "roadmap") {
    return renderRoadmapJourney(filteredResources, openResource);
  }

  if (view === "category") {
    return renderCategoryAtlas(filteredResources, openResource);
  }

  if (view === "difficulty") {
    return renderDifficultyLadder(filteredResources, openResource);
  }

  return null;
}

function renderRoadmapJourney(resources, openResource) {
  const stages = ROADMAP_OPTIONS.map((stage, index) => {
    const items = resources.filter((resource) => resource.roadmap === stage);
    const completed = items.filter((resource) => resource.progress === "완료").length;
    const inProgress = items.filter((resource) => resource.progress === "진행 중").length;
    const review = items.filter((resource) => resource.progress === "복습 필요").length;
    const progressPercent = items.length ? Math.round((completed / items.length) * 100) : 0;
    const categories = [...new Set(items.map((resource) => resource.category))].slice(0, 3);
    return {
      key: stage,
      index,
      items,
      completed,
      inProgress,
      review,
      progressPercent,
      categories,
      dominantDifficulty: getDominantValue(items, "difficulty"),
      meta: ROADMAP_STAGE_META[stage],
    };
  });

  const currentStageIndex = stages.findIndex((stage) => stage.items.length > 0 && stage.completed < stage.items.length);
  const activeStageIndex =
    currentStageIndex >= 0
      ? currentStageIndex
      : stages.reduce((lastIndex, stage, index) => (stage.items.length > 0 ? index : lastIndex), 0);
  const totalCompleted = resources.filter((resource) => resource.progress === "완료").length;
  const totalPercent = resources.length ? Math.round((totalCompleted / resources.length) * 100) : 0;
  const activeStage = stages[activeStageIndex];

  return (
    <div className="roadmap-journey">
      <section className="roadmap-overview">
        <div className="roadmap-overview-copy">
          <p className="eyebrow">Learning Path</p>
          <h3>단계와 목표가 보이는 로드맵 시안</h3>
          <p>
            전체 학습 흐름을 먼저 보고, 각 단계에서 어떤 리소스로 무엇을 익혀야 하는지 바로 내려가며 읽는 구조입니다.
          </p>
        </div>
        <div className="roadmap-overview-stats">
          <article>
            <span>전체 진행</span>
            <strong>{totalPercent}%</strong>
          </article>
          <article>
            <span>현재 단계</span>
            <strong>{activeStage?.key || "Foundation"}</strong>
          </article>
          <article>
            <span>전체 리소스</span>
            <strong>{resources.length}개</strong>
          </article>
        </div>
      </section>

      <section className="roadmap-track">
        {stages.map((stage, index) => {
          const isActive = index === activeStageIndex;
          const isDone = stage.items.length > 0 && stage.completed === stage.items.length;
          const isEmpty = stage.items.length === 0;
          return (
            <a
              key={stage.key}
              className={`roadmap-step ${isActive ? "active" : ""} ${isDone ? "done" : ""} ${isEmpty ? "empty" : ""}`}
              href={`#roadmap-stage-${slugify(stage.key)}`}
            >
              <div className="roadmap-step-node">{String(index + 1).padStart(2, "0")}</div>
              <div className="roadmap-step-body">
                <p>{stage.meta.eyebrow}</p>
                <h3>{stage.key}</h3>
                <span>{stage.items.length ? `${stage.items.length}개 리소스` : "준비 중"}</span>
                <div className="roadmap-step-progress">
                  <div style={{ width: `${stage.progressPercent}%` }} />
                </div>
              </div>
            </a>
          );
        })}
      </section>

      <div className="roadmap-stage-list">
        {stages.map((stage, index) => {
          const isActive = index === activeStageIndex;
          const isDone = stage.items.length > 0 && stage.completed === stage.items.length;
          return (
            <section
              key={stage.key}
              id={`roadmap-stage-${slugify(stage.key)}`}
              className={`roadmap-stage ${isActive ? "active" : ""} ${isDone ? "done" : ""} ${stage.items.length === 0 ? "empty" : ""}`}
            >
              <div className="roadmap-stage-rail">
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="roadmap-stage-panel">
                <div className="roadmap-stage-head">
                  <div>
                    <p>{stage.meta.eyebrow}</p>
                    <h3>{stage.key}</h3>
                    <p className="roadmap-stage-description">{stage.meta.description}</p>
                  </div>
                  <div className="roadmap-stage-badges">
                    <span>{stage.items.length}개 자료</span>
                    <span>완료 {stage.completed}개</span>
                    <span>{stage.dominantDifficulty || "난이도 미정"}</span>
                  </div>
                </div>

                <div className="roadmap-stage-summary">
                  <div>
                    <strong>학습 목표</strong>
                    <p>{stage.meta.outcome}</p>
                  </div>
                  <div>
                    <strong>핵심 주제</strong>
                    <p>{stage.categories.length ? stage.categories.join(" · ") : "아직 자료가 없습니다."}</p>
                  </div>
                  <div>
                    <strong>진행 상태</strong>
                    <p>
                      {stage.inProgress > 0
                        ? `진행 중 ${stage.inProgress}개`
                        : stage.review > 0
                          ? `복습 필요 ${stage.review}개`
                          : isDone
                            ? "단계 완료"
                            : "시작 전"}
                    </p>
                  </div>
                </div>

                {stage.items.length ? (
                  <div className="roadmap-resource-grid">
                    {stage.items.map((resource) => (
                      <article key={resource.id} className="roadmap-resource-card" onClick={() => openResource(resource.id)}>
                        <div className="roadmap-resource-head">
                          <div>
                            <p>{resource.category}</p>
                            <h4>{resource.title}</h4>
                          </div>
                          <span className={`db-badge ${progressBadgeClass(resource.progress)}`}>{resource.progress}</span>
                        </div>
                        <p className="roadmap-resource-summary">{resource.summary || resource.description || "요약 없음"}</p>
                        <div className="roadmap-resource-meta">
                          <span>{resource.difficulty}</span>
                          <span>{resource.sourceType === "file" ? "파일 자료" : "링크 자료"}</span>
                        </div>
                        <div className="roadmap-resource-focus">
                          {resource.learningGoals[0] || resource.prepInfo || "학습 목표를 추가하면 이 영역에 먼저 보입니다."}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="roadmap-empty-stage">
                    <strong>이 단계는 아직 비어 있습니다.</strong>
                    <p>앞 단계 정리 후 필요한 자료를 추가하면 여기에 자연스럽게 연결됩니다.</p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function renderCategoryAtlas(resources, openResource) {
  const categories = CATEGORY_OPTIONS.map((category) => {
    const items = resources.filter((resource) => resource.category === category);
    return {
      key: category,
      items,
      completed: items.filter((resource) => resource.progress === "완료").length,
      inProgress: items.filter((resource) => resource.progress === "진행 중").length,
      roadmapFocus: getDominantValue(items, "roadmap"),
      difficultyFocus: getDominantValue(items, "difficulty"),
      meta: CATEGORY_META[category],
    };
  });

  const visibleCategories = categories.filter((category) => category.items.length > 0);
  const highlighted = [...visibleCategories].sort((left, right) => right.items.length - left.items.length)[0];

  return (
    <div className="category-atlas">
      <section className="category-atlas-overview">
        <div className="category-atlas-copy">
          <p className="eyebrow">Topic Atlas</p>
          <h3>주제별로 리소스를 읽는 구조</h3>
          <p>
            카테고리 뷰는 작업 보드가 아니라 지식 지도를 보는 감각이어야 합니다. 어떤 주제가 많이 쌓였고 어디가 비어 있는지 한 번에 읽히게 구성했습니다.
          </p>
        </div>
        <div className="category-atlas-spotlight">
          <span>가장 두꺼운 영역</span>
          <strong>{highlighted?.key || "없음"}</strong>
          <p>{highlighted ? highlighted.meta.description : "조건에 맞는 카테고리가 없습니다."}</p>
        </div>
      </section>

      <section className="category-atlas-map">
        {categories.map((category) => (
          <a
            key={category.key}
            className={`category-map-card ${category.items.length ? "filled" : "empty"}`}
            href={`#category-${slugify(category.key)}`}
          >
            <p>{category.meta.eyebrow}</p>
            <h3>{category.key}</h3>
            <span>{category.items.length}개 리소스</span>
          </a>
        ))}
      </section>

      <div className="category-section-list">
        {categories.map((category) => (
          <section
            key={category.key}
            id={`category-${slugify(category.key)}`}
            className={`category-section ${category.items.length ? "filled" : "empty"}`}
          >
            <div className="category-section-head">
              <div>
                <p>{category.meta.eyebrow}</p>
                <h3>{category.key}</h3>
                <p className="category-section-description">{category.meta.description}</p>
              </div>
              <div className="category-section-badges">
                <span>{category.items.length}개 자료</span>
                <span>완료 {category.completed}개</span>
                <span>{category.roadmapFocus || "로드맵 미정"}</span>
              </div>
            </div>

            <div className="category-section-summary">
              <div>
                <strong>주요 단계</strong>
                <p>{category.roadmapFocus || "아직 지정된 로드맵이 없습니다."}</p>
              </div>
              <div>
                <strong>난이도 중심</strong>
                <p>{category.difficultyFocus || "난이도 미정"}</p>
              </div>
              <div>
                <strong>현재 상태</strong>
                <p>
                  {category.inProgress > 0
                    ? `진행 중 ${category.inProgress}개`
                    : category.completed > 0
                      ? `완료 ${category.completed}개`
                      : "시작 전"}
                </p>
              </div>
            </div>

            {category.items.length ? (
              <div className="category-resource-grid">
                {category.items.map((resource) => (
                  <article key={resource.id} className="category-resource-card" onClick={() => openResource(resource.id)}>
                    <div className="category-resource-head">
                      <div>
                        <p>{resource.roadmap}</p>
                        <h4>{resource.title}</h4>
                      </div>
                      <span className={`db-badge ${difficultyBadgeClass(resource.difficulty)}`}>{resource.difficulty}</span>
                    </div>
                    <p className="category-resource-summary">{resource.summary || resource.description || "요약 없음"}</p>
                    <div className="category-resource-meta">
                      <span>{resource.progress}</span>
                      <span>{resource.sourceType === "file" ? "파일" : "링크"}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="category-empty-state">
                <strong>이 카테고리는 아직 비어 있습니다.</strong>
                <p>리소스를 추가하면 이 주제 영역이 아틀라스에 채워집니다.</p>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function renderDifficultyLadder(resources, openResource) {
  const levels = DIFFICULTY_OPTIONS.map((difficulty, index) => {
    const items = resources.filter((resource) => resource.difficulty === difficulty);
    const completed = items.filter((resource) => resource.progress === "완료").length;
    const roadmapFocus = getDominantValue(items, "roadmap");
    const categoryFocus = getDominantValue(items, "category");
    return {
      key: difficulty,
      index,
      items,
      completed,
      roadmapFocus,
      categoryFocus,
      meta: DIFFICULTY_META[difficulty],
    };
  });

  const currentLevelIndex = levels.findIndex((level) => level.items.length > level.completed);
  const activeLevelIndex =
    currentLevelIndex >= 0 ? currentLevelIndex : levels.reduce((last, level, index) => (level.items.length ? index : last), 0);

  return (
    <div className="difficulty-ladder">
      <section className="difficulty-overview">
        <div className="difficulty-overview-copy">
          <p className="eyebrow">Skill Ladder</p>
          <h3>입문에서 고급까지 올라가는 난이도 시안</h3>
          <p>
            난이도 뷰는 리소스 묶음이 아니라 학습 체감 난도를 보여줘야 합니다. 아래로 갈수록 구현과 판단이 더 요구되는 구조로 읽히게 바꿨습니다.
          </p>
        </div>
        <div className="difficulty-track">
          {levels.map((level, index) => (
            <a
              key={level.key}
              className={`difficulty-step ${index === activeLevelIndex ? "active" : ""}`}
              href={`#difficulty-${slugify(level.key)}`}
            >
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <div>
                <p>{level.meta.eyebrow}</p>
                <span>{level.key}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <div className="difficulty-level-list">
        {levels.map((level, index) => (
          <section
            key={level.key}
            id={`difficulty-${slugify(level.key)}`}
            className={`difficulty-level ${index === activeLevelIndex ? "active" : ""} ${!level.items.length ? "empty" : ""}`}
          >
            <div className="difficulty-level-mark">
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="difficulty-level-panel">
              <div className="difficulty-level-head">
                <div>
                  <p>{level.meta.eyebrow}</p>
                  <h3>{level.key}</h3>
                  <p className="difficulty-level-description">{level.meta.description}</p>
                </div>
                <div className="difficulty-level-badges">
                  <span>{level.items.length}개 자료</span>
                  <span>완료 {level.completed}개</span>
                  <span>{level.roadmapFocus || "로드맵 미정"}</span>
                </div>
              </div>

              <div className="difficulty-level-summary">
                <div>
                  <strong>읽는 포인트</strong>
                  <p>{level.meta.checkpoint}</p>
                </div>
                <div>
                  <strong>자주 나오는 주제</strong>
                  <p>{level.categoryFocus || "카테고리 미정"}</p>
                </div>
                <div>
                  <strong>주요 단계</strong>
                  <p>{level.roadmapFocus || "로드맵 미정"}</p>
                </div>
              </div>

              {level.items.length ? (
                <div className="difficulty-resource-stack">
                  {level.items.map((resource) => (
                    <article key={resource.id} className="difficulty-resource-card" onClick={() => openResource(resource.id)}>
                      <div className="difficulty-resource-main">
                        <div>
                          <p>{resource.category}</p>
                          <h4>{resource.title}</h4>
                        </div>
                        <div className="difficulty-resource-badges">
                          <span>{resource.roadmap}</span>
                          <span>{resource.progress}</span>
                        </div>
                      </div>
                      <p className="difficulty-resource-summary">{resource.summary || resource.description || "요약 없음"}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="difficulty-empty-state">
                  <strong>이 단계의 자료는 아직 없습니다.</strong>
                  <p>현재 기준에 맞는 리소스를 추가하면 학습 사다리가 더 선명해집니다.</p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ResourceInspector({ draft, setDraft, onDelete, onSave, onOpenFile, onClose, inline = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const progressOptions = [
    { label: "학습 시작", value: "미시작" },
    { label: "학습중", value: "진행 중" },
    { label: "완료", value: "완료" },
  ];

  useEffect(() => {
    setIsEditing(false);
  }, [draft.id, inline]);

  const detailBadges = [
    draft.category,
    draft.roadmap,
    draft.difficulty,
    draft.trustLevel || "직접 추가",
  ].filter(Boolean);
  const whyItMattersValue = draft.recommendationReason || draft.description;
  const prerequisitesValue = draft.prerequisites || draft.prepInfo;
  const outcomesValue = draft.expectedOutcome || draft.learningGoals.join("\n");
  const safeDraftUrl = sanitizeExternalUrl(draft.url);

  function handleSave() {
    onSave();
    setIsEditing(false);
  }

  function handleNotesChange(value) {
    setDraft((current) => ({ ...current, notes: value }));
  }

  function handleNotesBlur() {
    if (isEditing) return;
    onSave({ ...draft });
  }

  function handleProgressChange(nextProgress) {
    if (draft.progress === nextProgress) return;
    const nextDraft = { ...draft, progress: nextProgress };
    setDraft(nextDraft);
    onSave(nextDraft);
  }

  return (
    <>
      <div className={`drawer-head ${inline ? "inline-head" : ""}`}>
        <div className="resource-detail-hero">
          <p className="eyebrow">{inline ? "Selected resource" : "Resource detail"}</p>
          <h2>{draft.title}</h2>
          <div className="resource-detail-badges">
            {detailBadges.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
        </div>
        <div className="resource-detail-head-actions">
          <button className={`ghost-button compact-button ${isEditing ? "active" : ""}`} type="button" onClick={() => setIsEditing((current) => !current)}>
            {isEditing ? "보기" : "편집"}
          </button>
          {!inline ? (
            <button className="icon-button" type="button" onClick={onClose}>
              ×
            </button>
          ) : null}
        </div>
      </div>

      <div className={`drawer-scroll ${inline ? "inline-scroll" : ""}`}>
        <div className={`resource-detail-layout ${isEditing ? "editing" : "reading"}`}>
          <section className="resource-detail-summary-card">
            <div className="resource-detail-section-head">
              <div>
                <p className="eyebrow">Properties</p>
                <h3>리소스 속성</h3>
              </div>
              <div className="resource-detail-link-row">
                {safeDraftUrl ? (
                  <a className="ghost-button compact-button" href={safeDraftUrl} target="_blank" rel="noopener noreferrer">
                    링크 열기
                  </a>
                ) : null}
                {draft.sourceType === "file" ? (
                  <button className="ghost-button compact-button" type="button" onClick={onOpenFile}>
                    파일 열기
                  </button>
                ) : null}
              </div>
            </div>

            <div className="property-sheet">
              <div className="property-grid">
              <PropertyRow label="학습 진도" full>
                <div className="progress-strip-controls">
                  {progressOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`progress-chip ${draft.progress === option.value ? "active" : ""}`}
                      onClick={() => handleProgressChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                  {draft.progress === "복습 필요" ? <span className="progress-chip review">복습 필요</span> : null}
                </div>
              </PropertyRow>
              <PropertyRow label="카테고리">
                {isEditing ? (
                  <select className="property-control" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{draft.category || "-"}</span>
                )}
              </PropertyRow>
              <PropertyRow label="난이도">
                {isEditing ? (
                  <select className="property-control" value={draft.difficulty} onChange={(event) => setDraft((current) => ({ ...current, difficulty: event.target.value }))}>
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{draft.difficulty || "-"}</span>
                )}
              </PropertyRow>
              <PropertyRow label="로드맵">
                {isEditing ? (
                  <select className="property-control" value={draft.roadmap} onChange={(event) => setDraft((current) => ({ ...current, roadmap: event.target.value }))}>
                    {ROADMAP_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{draft.roadmap || "-"}</span>
                )}
              </PropertyRow>
              <PropertyRow label="학습 진도">
                {isEditing ? (
                  <select className="property-control" value={draft.progress} onChange={(event) => setDraft((current) => ({ ...current, progress: event.target.value }))}>
                    {PROGRESS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{draft.progress || "-"}</span>
                )}
              </PropertyRow>
              <PropertyRow label="태그">
                {isEditing ? (
                  <input
                    className="property-control"
                    value={draft.tagsInput}
                    onChange={(event) => setDraft((current) => ({ ...current, tagsInput: event.target.value }))}
                    placeholder="쉼표로 구분"
                  />
                ) : draft.tags.length ? (
                  <div className="tag-chip-list">
                    {draft.tags.map((tag) => (
                      <span key={tag} className="tag-chip">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span>-</span>
                )}
              </PropertyRow>
              </div>
            </div>
            <div className="resource-detail-flow">
              <ReadableField
                label="한 줄 요약"
                value={draft.summary || draft.description}
                multiline
                editing={isEditing}
                rows={4}
                onChange={(value) => setDraft((current) => ({ ...current, summary: value }))}
              />
              <ReadableField
                label="왜 볼 만한가"
                value={whyItMattersValue}
                multiline
                editing={isEditing}
                rows={4}
                onChange={(value) => setDraft((current) => ({ ...current, recommendationReason: value }))}
              />
              <ReadableField
                label="선행 지식"
                value={prerequisitesValue}
                multiline
                editing={isEditing}
                rows={3}
                onChange={(value) => setDraft((current) => ({ ...current, prerequisites: value, prepInfo: value }))}
              />
              <ReadableField
                label="얻게 되는 것"
                value={outcomesValue}
                multiline
                editing={isEditing}
                rows={4}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    expectedOutcome: value,
                    learningGoals: value.split("\n").map((item) => item.trim()).filter(Boolean),
                  }))
                }
              />
              <ReadableField
                label="주제"
                value={draft.topic}
                multiline
                editing={isEditing}
                rows={3}
                onChange={(value) => setDraft((current) => ({ ...current, topic: value }))}
              />
            </div>
          </section>

          <section className="resource-detail-section">
            <div className="resource-detail-section-head">
              <div>
                <h3>메모와 판단</h3>
              </div>
            </div>
            <div className="resource-detail-flow">
              <article className="readable-field editing large plain-note-field">
                <textarea
                  className="readable-editor large note-editor"
                  rows={8}
                  value={draft.notes || ""}
                  onChange={(event) => handleNotesChange(event.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="여기에 학습 메모, 다음 액션, 요약 정리를 적습니다."
                />
                <div className="note-save-row">
                  <button className="ghost-button compact-button note-save-button" type="button" onClick={handleNotesBlur}>
                    저장
                  </button>
                </div>
              </article>
              <ReadableField
                label="분석 메모"
                value={draft.analysisNote}
                multiline
                editing={isEditing}
                rows={4}
                onChange={(value) => setDraft((current) => ({ ...current, analysisNote: value }))}
              />
            </div>
          </section>

          <section className="resource-detail-section">
            <div className="resource-detail-section-head">
              <div>
                <h3>메타 정보</h3>
              </div>
            </div>
            <div className="property-sheet readable-meta-panel">
              <div className="property-grid meta-property-grid">
                <PropertyRow label="소스">
                  <span>{draft.sourceType || "-"}</span>
                </PropertyRow>
                <PropertyRow label="신뢰도">
                  <span>{draft.trustLevel || "-"}</span>
                </PropertyRow>
                {draft.fileName ? (
                  <PropertyRow label="파일명" full>
                    <span>{draft.fileName}</span>
                  </PropertyRow>
                ) : null}
                <PropertyRow label="생성">
                  <span>{formatDate(draft.createdAt)}</span>
                </PropertyRow>
                <PropertyRow label="수정">
                  <span>{formatDate(draft.updatedAt)}</span>
                </PropertyRow>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className={`drawer-actions ${inline ? "inline-actions" : ""}`}>
        <button className="ghost-button danger" type="button" onClick={onDelete}>
          삭제
        </button>
        {isEditing ? (
          <button className="primary-button" type="button" onClick={handleSave}>
            저장
          </button>
        ) : null}
      </div>
    </>
  );
}

function ReadableField({
  label,
  value,
  multiline = false,
  large = false,
  editing = false,
  onChange,
  rows = 4,
  placeholder = "",
}) {
  return (
    <article className={`readable-field ${large ? "large" : ""} ${editing ? "editing" : ""}`}>
      <p>{label}</p>
      {editing ? multiline ? (
        <textarea
          className={`readable-editor ${large ? "large" : ""}`}
          rows={rows}
          value={value || ""}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className="readable-editor"
          value={value || ""}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
        />
      ) : multiline ? (
        <div className="readable-field-body multiline">{value?.trim() || "아직 내용이 없습니다."}</div>
      ) : (
        <strong>{value?.trim() || "-"}</strong>
      )}
    </article>
  );
}

function PropertyRow({ label, children, full = false }) {
  return (
    <div className={`property-row ${full || label === "태그" ? "full" : ""}`}>
      <div className="property-label">{label}</div>
      <div className="property-value">{children}</div>
    </div>
  );
}

function FilterChips({ label, value, options, onChange }) {
  return (
    <div className="chip-filter">
      <p>{label}</p>
      <div className="chip-row">
        {options.map((option) => (
          <button
            key={option}
            className={`switch-chip ${value === option ? "active" : ""}`}
            type="button"
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function renderTableFilterCell(column, filters, updateFilter, resetFilters, resultCount, isActionColumn) {
  let control = null;

  if (column.key === "category") {
    control = (
      <select className="table-filter-select" value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
        {["전체", ...CATEGORY_OPTIONS].map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (column.key === "resource") {
    control = (
      <input
        className="table-filter-input"
        value={filters.search}
        onChange={(event) => updateFilter("search", event.target.value)}
        placeholder="리소스 검색"
      />
    );
  }
  if (column.key === "roadmap") {
    control = (
      <select className="table-filter-select" value={filters.roadmap} onChange={(event) => updateFilter("roadmap", event.target.value)}>
        {["전체", ...ROADMAP_OPTIONS].map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (column.key === "difficulty") {
    control = (
      <select className="table-filter-select" value={filters.difficulty} onChange={(event) => updateFilter("difficulty", event.target.value)}>
        {["전체", ...DIFFICULTY_OPTIONS].map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (column.key === "status") {
    control = (
      <select className="table-filter-select" value={filters.progress} onChange={(event) => updateFilter("progress", event.target.value)}>
        {["전체", ...PROGRESS_OPTIONS].map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  const actions = (
    <div className="table-filter-actions">
      <button className="table-reset-button" type="button" onClick={resetFilters}>
        초기화
      </button>
      <span>{resultCount}개</span>
    </div>
  );

  if (!control) {
    return actions;
  }

  if (!isActionColumn) {
    if (column.key === "link") {
      return <div className="table-filter-placeholder" />;
    }
    return control;
  }

  return (
    <div className="table-filter-stack">
      {control}
      {actions}
    </div>
  );
}

function renderTableBodyCell(column, resource) {
  const safeResourceUrl = sanitizeExternalUrl(resource.url);

  if (column.key === "category") {
    return (
      <td key={column.key}>
        <span className="db-badge neutral">{resource.category}</span>
      </td>
    );
  }

  if (column.key === "resource") {
    return (
      <td key={column.key} className="resource-cell">
        <div className="table-primary">{resource.title}</div>
        <div className="table-secondary">
          {resource.summary || resource.description || "요약 없음"}
        </div>
        <div className="table-meta-line">
          <span>{resource.notes ? "노트 있음" : "노트 없음"}</span>
          <span>
            {resource.sourceType === "file"
              ? "파일"
              : resource.sourceType === "link"
                ? "링크"
                : "직접 추가"}
          </span>
        </div>
      </td>
    );
  }

  if (column.key === "roadmap") {
    return (
      <td key={column.key}>
        <div className="table-stack">
          <span className="db-badge subtle">{resource.roadmap}</span>
        </div>
      </td>
    );
  }

  if (column.key === "difficulty") {
    return (
      <td key={column.key}>
        <span className={`db-badge ${difficultyBadgeClass(resource.difficulty)}`}>{resource.difficulty}</span>
      </td>
    );
  }

  if (column.key === "status") {
    return (
      <td key={column.key}>
        <div className="table-stack">
          <span className={`db-badge ${progressBadgeClass(resource.progress)}`}>{resource.progress}</span>
          <span className={`db-badge ${trustBadgeClass(resource.trustLevel)}`}>{resource.trustLevel || "직접 추가"}</span>
        </div>
      </td>
    );
  }

  return (
    <td key={column.key} className="link-cell">
      {safeResourceUrl ? (
        <a
          className="table-link-icon"
          href={safeResourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${resource.title} 링크 열기`}
          title={resource.url}
          onClick={(event) => event.stopPropagation()}
        >
          🔗
        </a>
      ) : (
        <span className="table-link-icon table-link-icon-muted">-</span>
      )}
    </td>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SummaryBlock({ label, value }) {
  return (
    <div className="summary-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <article className="stat-pill">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function parseTags(raw) {
  return sanitizeStringArray(raw.split(","), FIELD_LIMITS.tag, FIELD_LIMITS.tagCount);
}

function getDominantValue(items, key) {
  if (!items.length) return "";

  const counts = new Map();
  for (const item of items) {
    const value = item[key];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
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

function normalizeResource(resource) {
  const source = isPlainObject(resource) ? resource : {};
  const now = new Date().toISOString();
  const title = sanitizeString(source.title, FIELD_LIMITS.title);

  return {
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
    fileName: sanitizeString(source.fileName, FIELD_LIMITS.fileName),
    fileType: sanitizeString(source.fileType, FIELD_LIMITS.fileType),
    topic: sanitizeString(source.topic, FIELD_LIMITS.longText),
    trustLevel: sanitizeString(source.trustLevel, FIELD_LIMITS.shortText),
    recommendationReason: sanitizeString(source.recommendationReason, FIELD_LIMITS.longText),
    expectedOutcome: sanitizeString(source.expectedOutcome, FIELD_LIMITS.longText),
    prerequisites: sanitizeString(source.prerequisites, FIELD_LIMITS.mediumText),
    sourceCategory: sanitizeString(source.sourceCategory, FIELD_LIMITS.shortText),
    order: sanitizeString(source.order, FIELD_LIMITS.order),
    createdAt: sanitizeDate(source.createdAt, now),
    updatedAt: sanitizeDate(source.updatedAt, now),
  };
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ko-KR");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function sanitizeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    return SAFE_LINK_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function canPreviewStoredFile(file) {
  const fileType = String(file?.type || "").toLowerCase();
  const extension = getExtension(file?.name || "");
  return SAFE_PREVIEW_FILE_TYPES.has(fileType) || SAFE_PREVIEW_FILE_EXTENSIONS.has(extension);
}

function sanitizeString(value, maxLength) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function sanitizeStringArray(value, itemMaxLength, maxItems) {
  if (!Array.isArray(value)) return [];

  const normalized = [];
  for (const item of value) {
    const safeItem = sanitizeString(item, itemMaxLength);
    if (!safeItem || normalized.includes(safeItem)) continue;
    normalized.push(safeItem);
    if (normalized.length >= maxItems) break;
  }
  return normalized;
}

function sanitizeEnum(value, allowedValues, fallback) {
  return allowedValues.has(value) ? value : fallback;
}

function sanitizeDate(value, fallback) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function sanitizeId(value) {
  const safeId = sanitizeString(value, FIELD_LIMITS.id);
  return safeId || crypto.randomUUID();
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidImportPayload(payload) {
  if (!isPlainObject(payload) || !Array.isArray(payload.resources)) return false;
  if (payload.resources.length > MAX_IMPORTED_RESOURCES) return false;
  return payload.resources.every(isPlainObject);
}

function compareResources(left, right, sortConfig) {
  if (!sortConfig.key) {
    return new Date(right.updatedAt) - new Date(left.updatedAt);
  }

  const leftValue = getSortValue(left, sortConfig.key);
  const rightValue = getSortValue(right, sortConfig.key);
  const direction = sortConfig.direction === "asc" ? 1 : -1;

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return (leftValue - rightValue) * direction;
  }

  return String(leftValue).localeCompare(String(rightValue), "ko", { numeric: true, sensitivity: "base" }) * direction;
}

function getSortValue(resource, sortKey) {
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
  if (sortKey === "link") return resource.url || resource.fileName || "";

  return resource.updatedAt || "";
}

function progressBadgeClass(value) {
  if (value === "완료") return "success";
  if (value === "진행 중") return "info";
  if (value === "복습 필요") return "warning";
  return "neutral";
}

function trustBadgeClass(value) {
  if (!value) return "subtle";
  if (value.includes("높음")) return "success";
  if (value.includes("낮음")) return "danger";
  return "warning";
}

function difficultyBadgeClass(value) {
  if (value === "Advanced") return "danger";
  if (value === "Intermediate") return "warning";
  return "subtle";
}

function prettyUrl(value) {
  try {
    const url = new URL(value);
    return {
      hostname: url.hostname.replace(/^www\./, ""),
      path: url.pathname === "/" ? value : `${url.pathname}${url.search}`.slice(0, 56),
    };
  } catch {
    return {
      hostname: value,
      path: "",
    };
  }
}
