const CATEGORY_KEYWORDS = [
  { category: "Agents", keywords: ["agent", "agents", "langgraph", "autogen", "crew", "workflow", "tool use", "state graph"] },
  { category: "RAG", keywords: ["rag", "retrieval", "vector", "embedding", "chunk", "retriever", "search", "grounding"] },
  { category: "Prompting", keywords: ["prompt", "prompting", "few-shot", "system prompt", "instruction"] },
  { category: "Evaluation", keywords: ["eval", "evaluation", "benchmark", "judge", "groundedness", "faithfulness", "rubric"] },
  { category: "Deployment", keywords: ["deploy", "production", "latency", "observability", "monitoring", "serving", "infra"] },
  { category: "LLM Apps", keywords: ["chatbot", "assistant", "app", "sdk", "api", "function calling", "tool calling"] },
  { category: "Research", keywords: ["paper", "research", "arxiv", "transformer", "attention", "fine-tuning"] },
  { category: "Case Study", keywords: ["case study", "postmortem", "real world", "use case", "lessons learned"] },
  { category: "Foundations", keywords: ["introduction", "intro", "basics", "fundamentals", "overview", "foundation", "101"] },
];

const DIFFICULTY_KEYWORDS = {
  Beginner: ["intro", "basics", "beginner", "quickstart", "getting started", "overview", "guide", "101"],
  Intermediate: ["tutorial", "build", "pipeline", "workflow", "integration", "implementation", "rag", "agent"],
  Advanced: ["paper", "benchmark", "distributed", "optimization", "latency", "advanced", "eval harness", "transformer"],
};

const ROADMAP_BY_CATEGORY = {
  Foundations: "Foundation",
  Prompting: "Prompting",
  "LLM Apps": "Application",
  Agents: "Agent Systems",
  RAG: "Agent Systems",
  Evaluation: "Evaluation",
  Deployment: "Production",
  Research: "Evaluation",
  "Case Study": "Production",
};

export const CATEGORY_OPTIONS = [
  "Foundations",
  "Prompting",
  "LLM Apps",
  "Agents",
  "RAG",
  "Evaluation",
  "Deployment",
  "Research",
  "Case Study",
];

export const DIFFICULTY_OPTIONS = ["Beginner", "Intermediate", "Advanced"];
export const ROADMAP_OPTIONS = ["Foundation", "Prompting", "Application", "Agent Systems", "Evaluation", "Production"];
export const PROGRESS_OPTIONS = ["미시작", "진행 중", "복습 필요", "완료"];

export async function analyzeResourceInput({ title, url, description, file, category, difficulty, roadmap, tags }) {
  const fileContext = file ? await readFileContext(file) : { title: "", description: "", context: "", tags: [] };
  const mergedTitle = title || fileContext.title || getTitleFromUrl(url) || "새 리소스";
  const mergedDescription = description || fileContext.description || "";
  const text = [mergedTitle, url, mergedDescription, fileContext.context, tags.join(" "), file?.name || ""].join(" ").toLowerCase();

  const resolvedCategory = category === "자동 추정" ? inferCategory(text) : category;
  const resolvedDifficulty = difficulty === "자동 추정" ? inferDifficulty(text, resolvedCategory) : difficulty;
  const resolvedRoadmap = roadmap === "자동 추정" ? inferRoadmap(text, resolvedCategory, resolvedDifficulty) : roadmap;
  const resolvedTags = [...new Set([...tags, ...fileContext.tags, ...inferTags(text, resolvedCategory, resolvedDifficulty)])].slice(0, 12);
  const summary = buildSummary(mergedTitle, mergedDescription, resolvedCategory, resolvedDifficulty, url, file);
  const learningGoals = buildLearningGoals(resolvedCategory, resolvedDifficulty, mergedDescription);
  const prepInfo = buildPrepInfo(resolvedCategory, resolvedDifficulty);
  const analysisNote = buildAnalysisNote(text, resolvedCategory, resolvedDifficulty, resolvedRoadmap, category, difficulty, roadmap);

  return {
    title: mergedTitle,
    description: mergedDescription,
    category: resolvedCategory,
    difficulty: resolvedDifficulty,
    roadmap: resolvedRoadmap,
    tags: resolvedTags,
    summary,
    learningGoals,
    prepInfo,
    analysisNote,
  };
}

async function readFileContext(file) {
  const extension = getExtension(file.name);
  const textLike = file.type.startsWith("text/") || ["md", "txt", "json", "html", "htm", "csv", "js", "ts", "py"].includes(extension);

  if (!textLike || file.size > 2_000_000) {
    return {
      title: stripExtension(file.name),
      description: `${file.name} 파일 기반으로 분석했습니다.`,
      context: `${file.name} ${extension}`,
      tags: [extension].filter(Boolean),
    };
  }

  const raw = (await file.text()).slice(0, 5000);
  const clean = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const titleMatch =
    raw.match(/<title>(.*?)<\/title>/i) ||
    raw.match(/^#\s+(.+)$/m) ||
    raw.match(/^(.{8,100})$/m);

  return {
    title: titleMatch ? titleMatch[1].trim() : stripExtension(file.name),
    description: clean.slice(0, 220),
    context: `${file.name} ${clean}`,
    tags: [extension].filter(Boolean),
  };
}

function inferCategory(text) {
  for (const item of CATEGORY_KEYWORDS) {
    if (item.keywords.some((keyword) => text.includes(keyword))) {
      return item.category;
    }
  }
  return "Foundations";
}

function inferDifficulty(text, category) {
  for (const [level, keywords] of Object.entries(DIFFICULTY_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return level;
    }
  }

  if (["Agents", "RAG", "Evaluation", "Deployment"].includes(category)) {
    return "Intermediate";
  }

  return "Beginner";
}

function inferRoadmap(text, category, difficulty) {
  if (text.includes("deploy") || text.includes("production") || text.includes("monitoring")) {
    return "Production";
  }
  if (text.includes("eval") || text.includes("benchmark") || text.includes("judge")) {
    return "Evaluation";
  }
  if (difficulty === "Advanced" && category === "Research") {
    return "Evaluation";
  }
  return ROADMAP_BY_CATEGORY[category] || "Foundation";
}

function inferTags(text, category, difficulty) {
  const commonTags = ["agents", "rag", "prompt", "eval", "deployment", "research", "workflow", "guide", "api"];
  const matches = commonTags.filter((tag) => text.includes(tag));
  matches.push(category.toLowerCase().replace(/\s+/g, "-"));
  matches.push(difficulty.toLowerCase());
  return [...new Set(matches)];
}

function buildSummary(title, description, category, difficulty, url, file) {
  const sourceLabel = file ? `파일 ${file.name}` : url ? "링크 리소스" : "수동 입력 리소스";
  const lead = description
    ? description.slice(0, 160)
    : `${title}는 ${category} 학습 문맥에서 볼 만한 ${difficulty.toLowerCase()} 단계 자료입니다.`;

  return `${sourceLabel}입니다. ${lead}`;
}

function buildLearningGoals(category, difficulty, description) {
  const goals = [];

  if (category === "Prompting") {
    goals.push("프롬프트 설계 패턴과 실패 케이스를 구분한다.");
    goals.push("반복 수정 포인트를 자신의 작업 흐름에 적용한다.");
  } else if (category === "Agents") {
    goals.push("에이전트 단계 설계와 툴 연결 구조를 이해한다.");
    goals.push("상태 전이와 실패 지점을 설명할 수 있다.");
  } else if (category === "RAG") {
    goals.push("검색, 청킹, 리랭킹 구조를 구분한다.");
    goals.push("정확도와 근거 일치성 관점에서 품질을 점검한다.");
  } else if (category === "Evaluation") {
    goals.push("평가 기준과 측정 지표를 정의한다.");
    goals.push("품질 검증 항목을 실제 프로젝트 체크리스트로 바꾼다.");
  } else if (category === "Deployment") {
    goals.push("운영 환경에서 필요한 모니터링 포인트를 정리한다.");
    goals.push("성능, 비용, 안정성 트레이드오프를 파악한다.");
  } else {
    goals.push("핵심 개념을 빠르게 파악한다.");
    goals.push("다음 학습 단계로 이어질 질문을 정리한다.");
  }

  if (difficulty === "Advanced") {
    goals.push("구현 세부와 시스템 트레이드오프를 설명할 수 있다.");
  }

  if (description && description.length > 120) {
    goals.push("설명에 나온 핵심 포인트를 본인 프로젝트 기준으로 재정리한다.");
  }

  return goals.slice(0, 4);
}

function buildPrepInfo(category, difficulty) {
  const prepMap = {
    Foundations: "LLM 기본 개념과 API 호출 경험이 없어도 시작 가능",
    Prompting: "간단한 프롬프트 실험 경험이 있으면 더 좋음",
    "LLM Apps": "API 호출과 기본 UI 흐름 이해 필요",
    Agents: "함수 호출, 상태 관리, 툴 연결 개념 선행 권장",
    RAG: "임베딩, 검색, 문서 분할 개념 선행 권장",
    Evaluation: "샘플 데이터셋과 품질 기준 설정 경험이 유리",
    Deployment: "운영 환경, 로그, 모니터링 기본 이해 권장",
    Research: "논문 읽기와 모델 구조 이해 필요",
    "Case Study": "기초 개념 이해 후 읽는 편이 효율적",
  };

  const levelNote =
    difficulty === "Beginner"
      ? "입문용으로 부담이 낮음"
      : difficulty === "Intermediate"
        ? "직접 구현을 병행하면 학습 효율이 높음"
        : "구현 경험이 없으면 난도가 높을 수 있음";

  return `${prepMap[category]} / ${levelNote}`;
}

function buildAnalysisNote(text, category, difficulty, roadmap, manualCategory, manualDifficulty, manualRoadmap) {
  const notes = [];
  notes.push(`카테고리: ${manualCategory === "자동 추정" ? `${category} 자동 추정` : `${category} 수동 지정`}`);
  notes.push(`난이도: ${manualDifficulty === "자동 추정" ? `${difficulty} 자동 추정` : `${difficulty} 수동 지정`}`);
  notes.push(`로드맵: ${manualRoadmap === "자동 추정" ? `${roadmap} 자동 추정` : `${roadmap} 수동 지정`}`);
  if (text.includes("langgraph")) notes.push("LangGraph 키워드 반영");
  if (text.includes("rag")) notes.push("RAG 키워드 반영");
  if (text.includes("prompt")) notes.push("Prompt 키워드 반영");
  return notes.join(" / ");
}

function getTitleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.split("/").filter(Boolean).pop();
    return slug ? slug.replace(/[-_]/g, " ") : parsed.hostname;
  } catch {
    return "";
  }
}

function getExtension(fileName) {
  return fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "";
}

function stripExtension(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}
