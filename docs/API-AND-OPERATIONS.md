# REST API Specification & Operations Guide

AgentScanner의 스캐너 중앙 엔진(`agent-scanner-engine`, 8080)과 타깃 에이전트(`agent-scanner-target`, 8081)의 REST API 명세 및 운영 가이드입니다.

---

## 1. Scanner Engine APIs (:8080)

모든 응답은 `ApiResponse<T>` 규격(`{ "success": true, "data": ..., "error": null, "timestamp": ... }`)으로 반환됩니다.

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Target** | `GET` | `/api/targets` | 등록된 점검 대상 에이전트 목록 조회 |
| | `POST` | `/api/targets` | 신규 점검 대상 등록 |
| | `POST` | `/api/targets/{id}/ping` | 타깃 헬스체크 및 연결 상태 확인 |
| | `DELETE`| `/api/targets/{id}` | 타깃 등록 삭제 |
| **Scan** | `POST` | `/api/scans` | 신규 보안 스캔 실행 |
| | `GET` | `/api/scans/{id}` | 스캔 진행률 및 종합 결과 조회 |
| | `GET` | `/api/scans/{id}/executions` | 17개 보안 점검별 실행 상세 조회 |
| | `GET` | `/api/scans/{id}/findings` | 검출된 취약점(Finding) 목록 조회 |
| **Finding** | `POST` | `/api/findings/{id}/retest` | 선택 항목 재검증(Re-Test) 실행 |
| | `PATCH`| `/api/findings/{id}/status` | 조치 상태 수동 변경 (`OPEN` / `IN_PROGRESS` / `RESOLVED`) |
| **Report** | `GET` | `/api/scans/{id}/report/markdown` | KISA 점검 항목 참고 종합 Markdown 보고서 다운로드 |
| | `GET` | `/api/scans/{id}/report/html` | 브라우저 인쇄/열람용 HTML 진단 보고서 |

---

## 2. Target Agent APIs (:8081)

스캐너 엔진이 타깃 에이전트와 통신하고 런타임 추적 로그를 수집하기 위한 인터페이스입니다.

| Method | Endpoint | Description | Payload 예시 |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/agent/chat` | 프롬프트 전송 및 AOP 실행 궤적(`AgentExecutionTrace`) 수집 | `{"prompt": "...", "guardrail": true}` |
| `POST` | `/api/v1/agent/mode` | 가드레일 모드 동적 전환 (`HARDENED` / `VULNERABLE`) | `{"mode": "HARDENED"}` |
| `GET` | `/actuator/health` | Spring Boot Actuator 헬스체크 | - |

---

## 3. Local Sandbox & Operations

### Requirements
- OpenJDK 21 LTS, Docker 또는 OrbStack
- *(선택)* OpenAI API Key (미설정 시 내장 Offline Mock Mode로 동작)

### Quick Run
```bash
# 1. DB 실행 (scannerdb, targetdb)
docker compose up -d postgres

# 2. Target Agent 실행 (:8081)
./gradlew :agent-scanner-target:bootRun

# 3. Scanner Engine 실행 (:8080)
./gradlew :agent-scanner-engine:bootRun

# 4. 검증 테스트
./gradlew check
```

---

## 4. Security Assessment Report

스캔 세션이 완료되면 KISA 점검 항목을 참고한 보안 진단 보고서를 자동 생성합니다:
* **Markdown 다운로드**: `/api/scans/{id}/report/markdown`
* **HTML 리포트 (웹 인쇄/PDF)**: `/api/scans/{id}/report/html`

보고서에는 진단 요약(Executive Summary), 17종 보안 시나리오별 PASS/FAIL 판정 근거, AOP Trace Evidence, 조치 권고사항(Remediation)이 포함됩니다.
