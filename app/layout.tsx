import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Resource Roadmap",
  description: "AI 학습 리소스를 분류, 요약, 노트, 진도 기준으로 관리하는 Next.js 앱",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
