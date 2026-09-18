# 🛡️ AgentScanner

<div align="center">

[![CI](https://github.com/yht0827/agent-scanner/actions/workflows/ci.yml/badge.svg)](https://github.com/yht0827/agent-scanner/actions/workflows/ci.yml)
![Java](https://img.shields.io/badge/Java-21%20LTS-orange.svg)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.5-brightgreen.svg)
![Spring AI](https://img.shields.io/badge/Spring%20AI-1.0.0-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg)
![Security Rules](https://img.shields.io/badge/Security%20Checks-17%20Rules-red.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

**AI Agent Security Assessment & Runtime Guardrail Platform**  
*OWASP Top 10 for LLM Applications 준용 AI 에이전트 도구 오용 및 인프라 침해 연쇄 위협 자동화 진단 플랫폼*

[Security Assessment](./docs/SECURITY-ASSESSMENT.md) · [Case Study](./docs/CASE-STUDY.md) · [API & Operations](./docs/API-AND-OPERATIONS.md) · [Portfolio Whitepaper](./PORTFOLIO.md)

</div>

---

> **17 Security Checks** · OWASP Top 10 for LLM Applications 준용  
> **Evidence-based Findings** · **1-Click Remediation** · **Pinpoint Re-Test**
>
> **AgentScanner**는 엔터프라이즈 환경에서 도입되는 LLM Agent가 단순 챗봇을 넘어 데이터베이스 쿼리 실행, 내부 API 호출, 파일 시스템 접근 등 **실제 인프라와 결합된 강력한 도구(Tool Calling)를 수행할 때 발생하는 연쇄 침해 위협을 실증하고 자동 진단**하는 차세대 AI 보안 진단 플랫폼입니다.

> [!NOTE]
> 중요도(상/중/하) 및 100점 만점 위험도 점수는 KISA 취약점 분석 가이드라인의 중요도 가중치 체계와 런타임 공격 심각도를 결합하여 설계한 자체 `RiskEvaluator` 모델입니다.

> [!CAUTION]
> 모든 공격 시나리오는 완전히 격리된 로컬 Docker 샌드박스와 합성(Synthetic) 테스트 데이터를 대상으로 수행합니다. 실제 운영 시스템 또는 제3자 시스템에 대한 공격을 목적으로 하지 않습니다.

---

## 1. Overview (AI Agent 보안 및 인프라 공격 표면)

AgentScanner는 AI 에이전트의 취약점과 이를 매개로 침해되는 백엔드 인프라 자원을 하나의 유기적 거버넌스 체계로 통합 진단합니다.

### 🤖 AI Agent Security Checks (17종 전수 완비)
- **Prompt Injection & Jailbreak (3종)**: Direct Instruction Override, Multi-turn Context Hijacking, Indirect Injection
- **Sensitive Data Leakage (4종)**: 고객 PII(주민번호/카드번호), LLM API Key / Cloud Secret, RAG 대외비 문서, Error 스택 트레이스 & 스키마 노출
- **Excessive Agency & Infrastructure Abuse (4종)**: 비인가 DB 직접 쿼리(`queryDatabase`), BOLA/IDOR 계정 조작, SSRF(내부망 및 AWS IMDS), 호스트 OS 셸 명령어 실행(`executeCommand`)
- **Tool Abuse & DoS (2종)**: 대량 피싱 알림 도구 오용(`sendNotification`), 무한 루프 재귀 호출 DoS
- **System Integrity & Baseline (4종)**: 시스템 프롬프트 유출, 과도한 권한 바인딩 점검, 정상 상품/본인 정보 조회 오탐(False Positive) 방지

### 🎯 에이전트 도구를 매개로 한 인프라 침해 표면 (Attack Surfaces)
```text
[ 악의적 프롬프트 주입 ] ➔ [ AI 에이전트 도구 실행 (Tool Calling) ]
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
[ PostgreSQL 16 DB ]      [ Linux Host OS ]          [ 사설망 / 클라우드 IMDS ]
• admin_users 해시 덤프    • /etc/passwd 열람         • 192.168.x 내부 서버 정찰
• customer_credentials    • OS 셸 커맨드 원격 실행   • AWS 169.254.169.254
  (카드번호/주민번호)       (RCE 위험)                 IAM 마스터 자격증명 탈취
```

---

## 2. Core Flow (진단 라이프사이클)

```text
[ 17 Security Check Cases ]
          ↓
[ AgentScanner Engine (8080) ]
          ↓ (HTTP 원격 점검)
[ Target AI Agent (8081) ]
          ↓ (OpenAI Function Calling)
[ Tool Call: DB / RAG / OS / Internal Network ]
          ↓ (Spring AOP 런타임 가로채기)
[ AgentExecutionTrace (도구명, 파라미터, 반환값, 응답시간) ]
          ↓
[ Domain Analyzers (ToolAbuse, ExcessiveAgency, SensitiveData) ]
          ↓
[ PASS / FAIL 판정 & KISA 가중치 100점 위험도 산정 ]
          ↓
[ Finding 생성 & 보안 가드레일 조치 (Remediation) ]
          ↓
[ 1-Click Pinpoint Re-Test ➔ RESOLVED 자동 종결 ]
```

핵심은 LLM의 최종 텍스트 응답만을 보는 표면적 검증이 아니라, **에이전트가 실제로 실행한 도구(Tool) 호출 여부, 전달된 파라미터, 백엔드 데이터 반환 결과를 Spring AOP로 무결하게 가로채서(Trace) 판정**하는 것입니다.

---

## 3. Architecture (시스템 아키텍처 및 타깃 에이전트 구조)

오픈소스 부하 테스트 프레임워크인 **nGrinder의 분산 구조(Controller - Agent)**를 차용하여, 보안 제어 엔진과 점검 대상을 격리된 마이크로서비스로 분리했습니다.

### 3.1 전체 시스템 토폴로지 (System Topology)

```text
                                  [ 보안 관리자 / 개발자 ]
                                             │
                                             ▼
                     ┌───────────────────────────────────────────────┐
                     │    agent-scanner-frontend (Vite + React 18)   │
                     │  • 실시간 보안 대시보드 (메트릭 / 위험도 게이지)    │
                     │  • nGrinder 스타일 타깃 등록 & 1-Click Ping 체크 │
                     │  • 조치 내용 등록 및 1-Click Re-Test 인터랙션   │
                     └───────────────────────┬───────────────────────┘
                                             │ (HTTP / REST API)
                                             ▼
                     ┌───────────────────────────────────────────────┐
                     │    agent-scanner-engine (중앙 컨트롤러, 8080)   │
                     │  • Scan Session Orchestrator                  │
                     │  • OWASP LLM 기반 17대 보안 룰셋 진단 엔진    │
                     │  • 100점 가중치 위험도 평가 (RiskEvaluator)    │
                     │  • 조치(Remediation) & 핀포인트 재진단(Re-Test)│
                     │  • KISA 표준 감사 보고서 자동 발행 (MD / HTML)  │
                     └───────────────┬───────────────────┬───────────┘
                                     │ (원격 점검 HTTP)    │ (JPA / JDBC)
                                     ▼                   ▼
    ┌───────────────────────────────────────────────┐ ┌───────────────────────────────────────────────┐
    │  agent-scanner-target (Docker Linux 격리, 8081)│ │  PostgreSQL 16 Container (Docker, 5432)       │
    │  • Spring AI 1.0 (OpenAI Function Calling)    │ │  ┌─────────────────────┐ ┌───────────────────┐  │
    │  • Dual Mode: API 키 유무에 따른 자동 폴백    │ │  │ DB 1: scannerdb     │ │ DB 2: targetdb    │  │
    │  • AOP 런타임 감사 (Tool Execution Aspect)    │ │  │ • 카탈로그/룰셋 시딩 │ │ • 엔터프라이즈 DB │  │
    │  • Linux OS 파일(/etc/passwd), 커맨드 격리    │ │  │ • 스캔 세션/실행결과 │ │ • RAG 지식베이스  │  │
    │  • 호스트(Mac) 보호 완벽 격리 샌드박스        │ │  │ • Finding & 조치이력 │ │   (대외비 회의록, │  │
    │  • PostgreSQL 16 targetdb 실전 RDBMS 연동     │ │  │ • 리포트 & 타깃관리  │ │    급여 테이블)   │  │
    │                                               │ │  └─────────────────────┘ └───────────────────┘  │
    └───────────────────────┬───────────────────────┘ └───────────────────▲───────────────────────────┘
                            │ (JDBC 실전 RDBMS & RAG 쿼리)                │
                            └─────────────────────────────────────────────┘
```

### 3.2 타깃 에이전트 내부 구조 및 도구-자원 매핑 (Target Agent Internals)

점검 대상 에이전트(`agent-scanner-target`, 8081)는 Spring AI 기반으로 프롬프트와 Function Calling을 처리하며, 비침습적 Spring AOP 계층을 통해 모든 런타임 행위를 추적합니다:

```text
       사용자 (공격자 / 일반 고객)
                  ↓ (자연어 프롬프트)
     [ LLM Agent (CustomerSupportAgent) ] ── (Spring AOP ToolExecutionAuditAspect 가로채기)
                  │
  ┌───────────────┼───────────────┬───────────────┬───────────────────────────────┐
  │ [정상 업무]   │ [개인정보]    │ [DB 직접조회] │ [RAG 지식베이스]              │ [OS / 내부망]
  ▼               ▼               ▼               ▼                               ▼
searchProduct() getUserInfo() queryDatabase() searchKnowledgeBase()   readFile() / executeCommand() / fetchUrl()
  │               │               │               │                               │
  │ (카탈로그)    │ (사용자 조회) │ (SQL 실행)    │ (대외비 벡터문서)              │ (호스트 파일 / 쉘 / SSRF)
  ▼               ▼               ▼               ▼                               ▼
[ 상품 DB ]     [ 회원 PII ]   [ PostgreSQL 16 ] [ PostgreSQL 16 ]             [ Linux OS (/etc/passwd, env) ]
                               (targetdb)       (rag_knowledge_base)          [ 사설망 192.168.x / AWS 169.254.x ]
```

- **비침습적 Spring AOP 감사 (`ToolExecutionAuditAspect`)**: 비즈니스 로직 수정 없이 LLM이 호출한 도구명, SQL 인자, 반환 데이터, 소요 시간을 가로채 `AgentExecutionTrace` JSON 객체로 무결하게 캡슐화합니다.
- **실시간 가드레일 토글**: 재시작 없이 런타임에서 취약 모드(Vulnerable)와 최소 권한 도구 언바인딩 모드(Hardened)를 1초 만에 전환하여 Before/After를 즉각 검증할 수 있습니다.

---

## 4. Security Assessment Summary (17대 점검 카탈로그)

총 **17개 룰셋**을 통해 취약점의 유무와 위험도를 실시간으로 평가합니다.

| Category | Rules | 대표 검증 시나리오 | 중요도 |
| :--- | :---: | :--- | :---: |
| **Prompt Injection** | 3종 | 시스템 지침 무력화(`SEC-PI-01`), 3턴 대화 오염 우회, 간접 프롬프트 주입 | 상/중 |
| **Sensitive Data Leakage**| 4종 | LLM API 키 유출(`SEC-KEY-01`), RAG 사내 회의록/급여 탈취, 고객 PII 노출 | 상 |
| **Excessive Agency** | 4종 | AWS IMDS(`169.254.169.254`) SSRF, BOLA 계정 조작, OS 셸 커맨드 실행 | 상 |
| **Tool Abuse** | 2종 | `queryDatabase` 직접 쿼리 조작(`SEC-TOOL-01`), `sendNotification` 피싱 악용 | 상 |
| **System & Robustness** | 2종 | 시스템 프롬프트 유출(`SEC-SPL-01`), 에러 스택/스키마 노출(`SEC-ERR-01`) | 중 |
| **Baseline (오탐 검증)** | 2종 | 정상 상품 정보 문의(`SEC-BASE-01`), 인증 사용자 본인 정보 조회 | 하 |

> 📋 전체 17종 룰셋 카탈로그 및 100점 만점 위험도 산정 알고리즘은 [docs/SECURITY-ASSESSMENT.md](./docs/SECURITY-ASSESSMENT.md)를 참고하세요.

---

## 5. Case Study: Before vs After 실증

### 🚨 Before: 가드레일 OFF (취약 상태)
공격자가 고객지원 에이전트에게 업무 승인을 사칭하여 `admin_users` 조회를 요청하자, 에이전트가 `queryDatabase` 도구를 자율 호출하여 관리자 계정 해시를 전수 노출합니다.
```text
Attack Prompt ──> LLM Agent ──> queryDatabase(SELECT * FROM admin_users;) ──> [FAIL] 90점 CRITICAL
```

### ✅ After: 가드레일 ON (보안 적용)
최소 권한 원칙(Least Privilege)에 따라 비즈니스 무관 고위험 도구를 런타임에서 즉각 언바인딩(Unbind)하고, 비인가 쿼리 요청을 단호히 거절합니다.
```text
동일 공격 Prompt ──> Guardrail ──> toolCalls: 0건 (도구 호출 원천 차단) ──> [PASS] 0점 LOW (안전 종결)
```

> 🔬 실제 Before/After `AgentExecutionTrace` JSON 로그 비교 및 AWS IMDS SSRF 실증은 [docs/CASE-STUDY.md](./docs/CASE-STUDY.md)를 참고하세요.

---

## 6. Quick Start (1-Click Local Sandbox)

외부 클라우드 가입 없이 로컬 Docker 환경에서 즉시 구동 가능합니다.

### Requirements
- **Java 21 LTS**
- **Docker** 또는 **OrbStack**

### 1) 격리 인프라 실행 (PostgreSQL 16 Multi-DB)
```bash
docker compose up -d
```

### 2) 타깃 에이전트 실행 (포트 8081)
```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew :agent-scanner-target:bootRun
```
*웹 테스트베드: `http://localhost:8081/test`*

### 3) 스캐너 중앙 엔진 실행 (포트 8080)
```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew :agent-scanner-engine:bootRun
```
*보안 대시보드: `http://localhost:8080/`*

### 4) 전체 테스트 검증
```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew check
```

---

## 7. Multi-Module Layout

```text
agent-scanner/
├── agent-scanner-common/      # Canonical Model, Finding, AgentExecutionTrace 규격
├── agent-scanner-engine/      # 보안 스캔 오케스트레이터, 17종 분석기, RiskEvaluator, 보고서 생성
├── agent-scanner-target/      # Spring AI 기반 피실험체 에이전트, Spring AOP 감사 계층
├── agent-scanner-frontend/    # Vite + React 18 기반 실시간 보안 관제 대시보드
├── docs/                      # 3대 심층 기술 문서 (Security Assessment, Case Study, API & Operations)
├── docker-compose.yml         # PostgreSQL 16 멀티 데이터베이스 컨테이너 환경
└── PORTFOLIO.md               # 채용 담당자/면접관을 위한 7단계 종합 백서 (STAR 4대 챌린지)
```

---

## 8. Documentation Hub

| 문서명 | 주요 내용 | 바로가기 |
| :--- | :--- | :---: |
| **Security Assessment** | AI 17종 전수 카탈로그, 100점 위험도 평가 공식, 재진단 라이프사이클 | [보기](./docs/SECURITY-ASSESSMENT.md) |
| **Case Studies** | DB 유출 및 AWS IMDS SSRF 실제 Trace JSON 비교 분석, 21개 시나리오 매트릭스 | [보기](./docs/CASE-STUDY.md) |
| **API & Operations** | 엔진 및 타깃 REST API 명세서, 로컬 샌드박스 구동법, 감사 보고서 발행 | [보기](./docs/API-AND-OPERATIONS.md) |
| **Portfolio Whitepaper** | 5대 핵심 메트릭, 4대 STAR 기술 챌린지, 21개 전수 시나리오 실증 백서 | [보기](./PORTFOLIO.md) |

---

## 9. License

This project is open source and available under the [MIT License](LICENSE).
