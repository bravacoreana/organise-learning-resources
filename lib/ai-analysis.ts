import { getStoredApiKey } from "./api-key-storage";
import type { FileAnalysisResult } from "./types";

export async function analyzeWithAI(input: {
  title: string;
  url: string;
  description: string;
  fileContent?: string;
  fileName?: string;
}): Promise<FileAnalysisResult | null> {
  const apiKey = getStoredApiKey();
  if (!apiKey) return null;

  const content = [
    input.title ? `제목: ${input.title}` : null,
    input.description ? `설명: ${input.description}` : null,
    input.fileContent || null,
  ].filter(Boolean).join("\n\n");

  if (!content.trim()) return null;

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      content,
      fileName: input.fileName,
      url: input.url,
    }),
  });

  if (!response.ok) return null;

  return response.json();
}
