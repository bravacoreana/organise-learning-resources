# Organise Learning Resources

AI 학습 리소스를 한곳에 모아서 정리하고, 로드맵/카테고리/난이도 기준으로 다시 읽을 수 있게 만든 Next.js 기반 개인 워크스페이스입니다.

## What It Does

- 링크 또는 파일을 추가하고 자동 분류합니다.
- 리소스를 `테이블`, `로드맵`, `카테고리`, `난이도`, `노트 모아보기` 뷰로 확인할 수 있습니다.
- 학습 진도, 태그, 검색, 필터 기준으로 다시 정리할 수 있습니다.
- 각 리소스에 대해 요약, 기대 학습, 선행 지식, 노트를 관리할 수 있습니다.
- 상태를 브라우저에 저장하고 JSON으로 내보내기/가져오기를 지원합니다.

## Stack

- Next.js 16
- React 19
- LocalStorage + IndexedDB

## Run Locally

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 을 열면 됩니다.

## Scripts

```bash
npm run dev
npm run build
npm run start
```

## Project Structure

```text
app/
  globals.css
  layout.js
  page.js
components/
  resource-workspace.jsx
lib/
  browser-storage.js
  reference-resources.js
  resource-analysis.js
```

## Data Model

리소스는 대략 아래 정보를 가집니다.

- 제목
- 링크 또는 파일 메타데이터
- 카테고리
- 난이도
- 로드맵 단계
- 학습 진도
- 태그
- 요약 / 기대 학습 / 선행 지식
- 노트 / 분석 메모

## Storage

- UI 상태와 리소스 메타데이터는 `localStorage` 에 저장됩니다.
- 업로드한 파일은 `IndexedDB` 에 저장됩니다.
- 서버나 외부 DB는 사용하지 않습니다.

## Security Notes

공개 레포 기준으로 최소한의 클라이언트 측 방어를 넣어두었습니다.

- 외부 링크는 `http` / `https` 만 허용합니다.
- 위험한 업로드 파일 형식은 새 탭 실행 대신 다운로드로 처리합니다.
- JSON import 시 구조 검증, 길이 제한, 허용값 검증을 수행합니다.

그래도 이 앱은 로컬 브라우저 저장소 기반 도구이므로, 민감한 비밀값이나 인증 토큰 저장용으로 쓰는 것은 권장하지 않습니다.

## Current Scope

이 프로젝트는 개인 학습 리소스 정리와 에이전트 작업 보조를 위한 로컬 워크스페이스입니다.

- 인증 없음
- 서버 없음
- 멀티 유저 협업 없음

## License

라이선스가 아직 정해지지 않았다면, 공개 전 `LICENSE` 파일을 추가하는 것을 권장합니다.
