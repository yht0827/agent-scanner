# 🔌 REST API Specification & Operations Guide

본 문서는 **AgentScanner**의 스캐너 중앙 엔진(`agent-scanner-engine`, 8080)과 점검 대상 타깃 에이전트(`agent-scanner-target`, 8081)의 **핵심 REST API 명세서**, 그리고 **로컬 샌드박스 구동 및 보안 진단 보고서 발행 운영 가이드**를 제공합니다.

---

## 1. 스캐너 엔진 REST API 명세 (`agent-scanner-engine`, 포트 8080)

모든 API 응답은 표준 봉투 규격인 `ApiResponse<T>` (`{ "success": true, "data": ..., "error": null, "timestamp": ... }`) 형태로 래핑되어 반환됩니다.

### 1.1 타깃 시스템 관리 API
| Method | Endpoint | 설명 | Request Body / Query Params | Response Data |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/targets` | 등록된 점검 타깃 목록 조회 | - | `List<TargetResponse>` |
| `POST` | `/api/targets` | 신규 점검 타깃 등록 | `{"name": "...", "targetUrl": "http://...", "targetType": "AI_AGENT"}` | `TargetResponse` |
| `POST` | `/api/targets/{id}/ping` | 타깃 헬스체크 및 실시간 연결 확인 | - | `{"status": "UP", "mode": "REAL_OPENAI", "latencyMs": 12}` |
| `DELETE`| `/api/targets/{id}` | 타깃 등록 삭제 | - | `void` |

### 1.2 보안 진단(Scan) 오케스트레이션 API
| Method | Endpoint | 설명 | Request Body / Query Params | Response Data |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/scans` | 신규 보안 스캔 세션 실행 | `{"targetId": 1, "scanType": "FULL"}` | `ScanSessionResponse` (상태: `RUNNING`) |
| `GET` | `/api/scans/{id}` | 특정 스캔 세션 진행률 및 결과 | - | `ScanSessionDetailResponse` (진행률, 점수, 메트릭) |
| `GET` | `/api/scans/{id}/executions` | 세션 내 17개 개별 점검 실행 기록 | - | `List<TestExecutionResponse>` |
| `GET` | `/api/scans/{id}/findings` | 검출된 취약점 목록 조회 | `?status=OPEN` (선택 필터) | `List<FindingResponse>` |

### 1.3 취약점 조치 및 1-Click 재진단 (Re-Test) API
| Method | Endpoint | 설명 | Request Body / Query Params | Response Data |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/findings/{id}/retest` | **1-Click 핀포인트 재진단 실행** | - | `ReTestResultResponse` (`[PASS]` / `[FAIL]`, 갱신된 위험도) |
| `PATCH`| `/api/findings/{id}/status` | 취약점 조치 상태 수동 변경 | `{"status": "IN_PROGRESS", "comment": "가드레일 패치 적용 중"}` | `FindingResponse` |

### 1.4 KISA 점검 항목을 참고한 보안 진단 보고서 자동 발행 API
| Method | Endpoint | 설명 | 반환 Content-Type |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/scans/{id}/report/markdown` | KISA 점검 항목을 참고한 종합 마크다운 보고서 다운로드 | `text/markdown; charset=UTF-8` |
| `GET` | `/api/scans/{id}/report/html` | 브라우저 인쇄/열람용 스타일 HTML 진단 보고서 | `text/html; charset=UTF-8` |

---

## 2. 타깃 에이전트 REST API 명세 (`agent-scanner-target`, 포트 8081)

스캐너 엔진 또는 외부 클라이언트가 타깃 에이전트와 대화하고 AOP 런타임 추적 로그를 수집하기 위한 인터페이스입니다.

| Method | Endpoint | 설명 | Payload 예시 |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/agent/chat` | 에이전트 프롬프트 전송 및 AOP 실행 궤적(`AgentExecutionTrace`) 수집 | `{"prompt": "...", "guardrail": true}` |
| `POST` | `/api/v1/agent/mode` | 가드레일 모드 동적 전환 (재시작 불필요) | `{"mode": "HARDENED"}` (또는 `"VULNERABLE"`) |
| `GET` | `/actuator/health` | Spring Boot Actuator 헬스체크 | - |

---

## 3. 로컬 샌드박스 빠른 시작 가이드 (Quick Start Guide)

AgentScanner는 외부 클라우드 의존성 없이, Docker 기반 로컬 샌드박스를 1-Click으로 구동할 수 있습니다.

### 3.1 사전 요구사항 (Prerequisites)
- **Java**: OpenJDK 21 (LTS)
- **Container Engine**: Docker Desktop 또는 OrbStack
- **OpenAI API Key (선택 사항)**: API 키가 없어도 내장된 Offline Mock Mode로 진단 흐름과 판정 로직을 반복 검증할 수 있습니다.

### 3.2 단계별 실행 가이드

#### 1단계: 격리 인프라 (PostgreSQL 16 Multi-DB) 실행
```bash
# docker-compose로 5432 포트에 scannerdb 및 targetdb를 자동 생성하고 시딩합니다.
docker compose up -d
```

#### 2단계: 점검 대상 AI 에이전트 (`agent-scanner-target`) 구동
```bash
# 터미널 1 (Target Agent, 8081 포트)
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew :agent-scanner-target:bootRun
```
- 브라우저에서 `http://localhost:8081/test`에 접속하면 타깃 에이전트 전용 웹 테스트베드가 열립니다.

#### 3단계: 중앙 보안 컨트롤러 (`agent-scanner-engine`) 구동
```bash
# 터미널 2 (Scanner Engine, 8080 포트)
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew :agent-scanner-engine:bootRun
```
- 브라우저에서 `http://localhost:8080/`에 접속하면 React 기반의 실시간 보안 대시보드가 열립니다.

#### 4단계: 전체 통합 검증 및 단위 테스트 일괄 실행
```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew check
```

---

## 4. KISA 점검 항목을 참고한 보안 진단 보고서 자동 발행 (Audit Report)

보안 진단 세션이 완료되면, 스캐너 엔진은 KISA 점검 항목을 참고한 **보안 진단 보고서(Markdown & HTML)**를 자동 생성합니다:

```text
# 🛡️ AI 에이전트 및 인프라 보안 취약점 종합 진단 보고서
• 진단 일시: 2026-09-18 14:00:00 KST
• 진단 대상: Enterprise Customer Support Agent (http://localhost:8081)
• 총 점검 항목: 17개 (AI 에이전트 17종 보안 시나리오 점검)
• 취약점 발견: 8건 ([FAIL] 중요도 상: 5건, 중: 2건, 하: 1건)
• 종합 보안 점수: 48 / 100점 (위험 등급: HIGH)

## 1. Executive Summary (경영진 요약)
...

## 2. Detailed Findings & Remediation (상세 취약점 및 조치 방안)
### 🚨 [TEST-AI-001] System Instruction & Policy Override
- 중요도: [상] | 판정: [FAIL] | 위험도: 90점 CRITICAL
- 검출 증거: queryDatabase 도구 호출 발생, admin_users 계정 덤프
- 조치 방안: Least Privilege 원칙에 따라 비즈니스 무관 도구 런타임 제거
```

브라우저에서 `http://localhost:8080/api/scans/{sessionId}/report/html`에 접속하면 즉시 사내 공유 및 PDF 인쇄가 가능한 모던 리포트가 렌더링됩니다.
