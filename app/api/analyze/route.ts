import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_CATEGORIES = [
  "Foundations", "Prompting", "LLM Apps", "Agents", "RAG",
  "Evaluation", "Deployment", "Research", "Case Study",
] as const;

const ALLOWED_DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

const ALLOWED_ROADMAPS = [
  "Foundation", "Prompting", "Application", "Agent Systems", "Evaluation", "Production",
] as const;

const SYSTEM_PROMPT = `You are a learning resource analyzer. Given information about a learning resource (title, URL, file content, description), analyze it and return a JSON object with the following fields:

- "title": string — a clear, concise title for the resource (Korean or English depending on the original)
- "description": string — 1-3 sentence summary in Korean describing what this resource covers
- "category": one of ${JSON.stringify(ALLOWED_CATEGORIES)}
- "difficulty": one of ${JSON.stringify(ALLOWED_DIFFICULTIES)}
- "roadmap": one of ${JSON.stringify(ALLOWED_ROADMAPS)}
- "tags": array of up to 8 relevant lowercase English tags
- "summary": string — Korean, 1-2 sentences about what the learner will get from this
- "learningGoals": array of 2-4 Korean strings, each a specific learning objective
- "prepInfo": string — Korean, what prerequisites or prior knowledge would help
- "analysisNote": "Claude AI 분석"

Return ONLY valid JSON, no markdown fences, no explanation.`;

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "API 키가 필요합니다." }, { status: 401 });
  }

  let body: { content: string; fileName?: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.content || typeof body.content !== "string") {
    return NextResponse.json({ error: "분석할 내용이 없습니다." }, { status: 400 });
  }

  const truncatedContent = body.content.slice(0, 15000);

  const userMessage = [
    body.fileName ? `파일명: ${body.fileName}` : null,
    body.url ? `URL: ${body.url}` : null,
    `내용:\n${truncatedContent}`,
  ].filter(Boolean).join("\n\n");

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    const result = {
      title: typeof parsed.title === "string" ? parsed.title.slice(0, 200) : "새 리소스",
      description: typeof parsed.description === "string" ? parsed.description.slice(0, 4000) : "",
      category: ALLOWED_CATEGORIES.includes(parsed.category) ? parsed.category : "Foundations",
      difficulty: ALLOWED_DIFFICULTIES.includes(parsed.difficulty) ? parsed.difficulty : "Beginner",
      roadmap: ALLOWED_ROADMAPS.includes(parsed.roadmap) ? parsed.roadmap : "Foundation",
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: unknown) => typeof t === "string").slice(0, 12) : [],
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 4000) : "",
      learningGoals: Array.isArray(parsed.learningGoals) ? parsed.learningGoals.filter((g: unknown) => typeof g === "string").slice(0, 10) : [],
      prepInfo: typeof parsed.prepInfo === "string" ? parsed.prepInfo.slice(0, 500) : "",
      analysisNote: "Claude AI 분석",
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "API 키가 유효하지 않습니다." }, { status: 401 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "AI 응답을 파싱할 수 없습니다." }, { status: 502 });
    }
    return NextResponse.json({ error: "AI 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
