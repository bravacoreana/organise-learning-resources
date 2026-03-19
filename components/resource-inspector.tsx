"use client";

import { useEffect, useState } from "react";
import { CATEGORY_OPTIONS, DIFFICULTY_OPTIONS, PROGRESS_OPTIONS, ROADMAP_OPTIONS } from "@/lib/resource-analysis";
import { formatDate, sanitizeExternalUrl } from "@/lib/resource-record";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { ResourceDraft, ResourceRecord } from "@/lib/types";

interface ResourceInspectorProps {
  draft: ResourceDraft;
  setDraft: Dispatch<SetStateAction<ResourceDraft | null>>;
  onDelete: () => Promise<void> | void;
  onSave: (nextDraft?: ResourceDraft | null) => void;
  onClose?: () => void;
  inline?: boolean;
  saveStatus: "idle" | "saving" | "saved";
}

export default function ResourceInspector({
  draft,
  setDraft,
  onDelete,
  onSave,
  onClose,
  inline = false,
  saveStatus,
}: ResourceInspectorProps) {
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
  const saveStatusLabel = saveStatus === "saving" ? "저장 중..." : "저장됨";

  function handleEditToggle() {
    if (isEditing) {
      onSave();
    }
    setIsEditing((current) => !current);
  }

  function handleProgressChange(nextProgress: ResourceRecord["progress"]) {
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
          <span className={`save-indicator ${saveStatus === "saving" ? "saving" : ""}`}>{saveStatusLabel}</span>
          <button className={`ghost-button compact-button ${isEditing ? "active" : ""}`} type="button" onClick={handleEditToggle}>
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
                        onClick={() => handleProgressChange(option.value as ResourceRecord["progress"])}
                      >
                        {option.label}
                      </button>
                    ))}
                    {draft.progress === "복습 필요" ? <span className="progress-chip review">복습 필요</span> : null}
                  </div>
                </PropertyRow>
                <PropertyRow label="카테고리">
                  {isEditing ? (
                    <select
                      className="property-control"
                      value={draft.category}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, category: event.target.value as ResourceRecord["category"] } : current,
                        )
                      }
                    >
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
                    <select
                      className="property-control"
                      value={draft.difficulty}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, difficulty: event.target.value as ResourceRecord["difficulty"] } : current,
                        )
                      }
                    >
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
                    <select
                      className="property-control"
                      value={draft.roadmap}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, roadmap: event.target.value as ResourceRecord["roadmap"] } : current,
                        )
                      }
                    >
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
                    <select
                      className="property-control"
                      value={draft.progress}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, progress: event.target.value as ResourceRecord["progress"] } : current,
                        )
                      }
                    >
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
                      onChange={(event) => setDraft((current) => (current ? { ...current, tagsInput: event.target.value } : current))}
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
                onChange={(value) => setDraft((current) => (current ? { ...current, summary: value } : current))}
              />
              <ReadableField
                label="왜 볼 만한가"
                value={whyItMattersValue}
                multiline
                editing={isEditing}
                rows={4}
                onChange={(value) => setDraft((current) => (current ? { ...current, recommendationReason: value } : current))}
              />
              <ReadableField
                label="선행 지식"
                value={prerequisitesValue}
                multiline
                editing={isEditing}
                rows={3}
                onChange={(value) => setDraft((current) => (current ? { ...current, prerequisites: value, prepInfo: value } : current))}
              />
              <ReadableField
                label="얻게 되는 것"
                value={outcomesValue}
                multiline
                editing={isEditing}
                rows={4}
                onChange={(value) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          expectedOutcome: value,
                          learningGoals: value.split("\n").map((item) => item.trim()).filter(Boolean),
                        }
                      : current,
                  )
                }
              />
              <ReadableField
                label="주제"
                value={draft.topic}
                multiline
                editing={isEditing}
                rows={3}
                onChange={(value) => setDraft((current) => (current ? { ...current, topic: value } : current))}
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
                  onChange={(event) => setDraft((current) => (current ? { ...current, notes: event.target.value } : current))}
                  placeholder="여기에 학습 메모, 다음 액션, 요약 정리를 적습니다."
                />
              </article>
              <ReadableField
                label="분석 메모"
                value={draft.analysisNote}
                multiline
                editing={isEditing}
                rows={4}
                onChange={(value) => setDraft((current) => (current ? { ...current, analysisNote: value } : current))}
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
        <span className={`save-indicator ${saveStatus === "saving" ? "saving" : ""}`}>{saveStatusLabel}</span>
        <button className="ghost-button danger" type="button" onClick={onDelete}>
          삭제
        </button>
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
}: {
  label: string;
  value: string;
  multiline?: boolean;
  large?: boolean;
  editing?: boolean;
  onChange?: (value: string) => void;
  rows?: number;
  placeholder?: string;
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

function PropertyRow({
  label,
  children,
  full = false,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`property-row ${full || label === "태그" ? "full" : ""}`}>
      <div className="property-label">{label}</div>
      <div className="property-value">{children}</div>
    </div>
  );
}
