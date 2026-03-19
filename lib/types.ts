export type ResourceCategory =
  | "Foundations"
  | "Prompting"
  | "LLM Apps"
  | "Agents"
  | "RAG"
  | "Evaluation"
  | "Deployment"
  | "Research"
  | "Case Study";

export type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";

export type RoadmapStage =
  | "Foundation"
  | "Prompting"
  | "Application"
  | "Agent Systems"
  | "Evaluation"
  | "Production";

export type ProgressStatus = "미시작" | "진행 중" | "복습 필요" | "완료";

export type SourceType = "manual" | "link" | "file";

export type ViewMode = "table" | "roadmap" | "category" | "difficulty" | "notes";

export type StyleMode = "database" | "focus";

export type ColumnKey = "category" | "resource" | "roadmap" | "difficulty" | "status" | "link";

export type ColumnWidths = Record<ColumnKey, number>;

export type ColumnVisibility = Record<ColumnKey, boolean>;

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterState {
  search: string;
  category: "전체" | ResourceCategory;
  difficulty: "전체" | DifficultyLevel;
  roadmap: "전체" | RoadmapStage;
  progress: "전체" | ProgressStatus;
}

export interface FormState {
  title: string;
  url: string;
  description: string;
  category: "자동 추정" | ResourceCategory;
  difficulty: "자동 추정" | DifficultyLevel;
  roadmap: "자동 추정" | RoadmapStage;
  tags: string;
}

export interface ResourceRecord {
  id: string;
  title: string;
  url: string;
  description: string;
  category: ResourceCategory;
  difficulty: DifficultyLevel;
  roadmap: RoadmapStage;
  progress: ProgressStatus;
  tags: string[];
  summary: string;
  learningGoals: string[];
  prepInfo: string;
  analysisNote: string;
  notes: string;
  sourceType: SourceType;
  topic: string;
  trustLevel: string;
  recommendationReason: string;
  expectedOutcome: string;
  prerequisites: string;
  sourceCategory: string;
  order: string | number;
  createdAt: string;
  updatedAt: string;
  searchIndex: string;
}

export interface ResourceDraft extends ResourceRecord {
  tagsInput: string;
}

export interface HeaderMenuState {
  key: ColumnKey;
  left: number;
  top: number;
}

export interface ResizeState {
  columnKey: ColumnKey;
  startX: number;
  startWidth: number;
  minWidth: number;
}

export interface StoredAppState {
  resources: ResourceRecord[];
  view: ViewMode;
  filters: FilterState;
  styleMode: StyleMode;
  sortConfig: SortConfig;
  columnWidths: ColumnWidths;
  columnVisibility: ColumnVisibility;
}

export interface FileAnalysisInput {
  title: string;
  url: string;
  description: string;
  file?: File | null;
  category: "자동 추정" | ResourceCategory;
  difficulty: "자동 추정" | DifficultyLevel;
  roadmap: "자동 추정" | RoadmapStage;
  tags: string[];
}

export interface FileAnalysisResult {
  title: string;
  description: string;
  category: ResourceCategory;
  difficulty: DifficultyLevel;
  roadmap: RoadmapStage;
  tags: string[];
  summary: string;
  learningGoals: string[];
  prepInfo: string;
  analysisNote: string;
}
