# 🛡️ AgentScanner

<div align="center">

[![CI](https://github.com/yht0827/agent-scanner/actions/workflows/ci.yml/badge.svg)](https://github.com/yht0827/agent-scanner/actions/workflows/ci.yml)
![Java](https://img.shields.io/badge/Java-21%20LTS-orange.svg)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.5-brightgreen.svg)
![Spring AI](https://img.shields.io/badge/Spring%20AI-1.0.0-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg)
![Security Rules](https://img.shields.io/badge/Security%20Checks-46%20Rules-red.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

**AI Agent & Enterprise Infrastructure Security Assessment Platform**  
*OWASP Top 10 for LLM Applications & KISA 주요정보통신기반시설 기술적 가이드라인 준용 통합 자동화 보안 진단 플랫폼*

[Architecture](./docs/ARCHITECTURE.md) · [Security Assessment](./docs/SECURITY-ASSESSMENT.md) · [Case Study](./docs/CASE-STUDY.md) · [API & Operations](./docs/API-AND-OPERATIONS.md) · [Portfolio Whitepaper](./PORTFOLIO.md)

</div>

---

> **46 Security Checks** · AI Agent 17종 + Host Infrastructure 29종  
> **Evidence-based Findings** · **1-Click Remediation** · **Pinpoint Re-Test**
>
> **AgentScanner**는 최근 엔터프라이즈 환경에서 도입되는 LLM Agent가 단순 챗봇을 넘어 데이터베이스 쿼리 실행, 내부 API 호출, 파일 시스템 접근 등 **실제 인프라와 결합된 강력한 도구(Tool Calling)를 수행할 때 발생하는 연쇄 침해 위협을 실증하고 자동 진단**하는 차세대 보안 진단 플랫폼입니다.

> [!NOTE]
> 중요도(상/중/하) 및 100점 만점 위험도 점수는 KISA 공식 점수가 아니라, KISA 가이드라인 가중치와 런타임 공격 심각도를 결합하여 설계한 자체 `RiskEvaluator` 모델입니다.

> [!CAUTION]
> 모든 공격 시나리오는 완전히 격리된 로컬 Docker 샌드박스와 합성(Synthetic) 테스트 데이터를 대상으로 수행합니다. 실제 운영 시스템 또는 제3자 시스템에 대한 공격을 목적으로 하지 않습니다.

---

## 1. Overview (2대 점검 기둥)

AgentScanner는 AI 영역과 호스트 인프라 영역을 하나의 유기적 거버넌스 체계로 통합 진단합니다.

### 🤖 AI Agent Security (17종)
- **Prompt Injection & Jailbreak**: Direct Instruction Override, Multi-turn Hijacking, Indirect Injection
- **Sensitive Data Leakage**: 고객 PII(주민번호/카드번호), LLM API Key / Cloud Secret, RAG 대외비 문서, Error 스택 트레이스
- **Excessive Agency & Tool Abuse**: 비인가 DB 직접 쿼리, BOLA/IDOR 계정 조작, SSRF(내부망 및 AWS IMDS), 호스트 OS 셸 명령어 실행
- **Least Privilege & Baseline**: 불필요한 고위험 도구 바인딩 검증, 정상 비즈니스 요청 오탐(False Positive) 방지

### 🖥️ Infrastructure Security (29종)
- **Linux OS 서버 보안 (25종)**: Root 원격 접속 제한, 패스워드 복잡성/잠금 정책, `/etc/passwd` 및 `/etc/shadow` 권한, SUID/SGID, 비인가 데몬 중지
- **Network & Port 보안 (2종)**: 비인가 관리 포트 개방 점검, SNMP Community String 기본값 사용 점검
- **Web & Container 보안 (2종)**: WAS 기본 에러 페이지 노출 방지, Docker 컨테이너 Root(UID 0) 실행 격리

---

## 2. Core Flow (진단 라이프사이클)

```text
[ Security Check Case ]
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

## 3. Architecture (분산 컨트롤러-타깃 구조)

오픈소스 부하 테스트 프레임워크인 **nGrinder의 분산 구조(Controller - Agent)**를 차용하여, 보안 제어 엔진과 점검 대상을 격리된 마이크로서비스로 분리했습니다.

```text
                    [ Security Admin / Developer ]
                               │
                               ▼
                 ┌──────────────────────────┐
                 │  React Security Dashboard │ (Vite, React 18, Port 8080)
                 └─────────────┬────────────┘
                               │ REST API
                               ▼
                 ┌──────────────────────────┐
                 │   AgentScanner Engine    │ (중앙 컨트롤러)
                 │   - Scan Orchestrator    │
                 │   - 46 Rules Analyzer    │
                 │   - KISA RiskEvaluator   │
                 │   - Audit Reporter       │
                 └───────┬───────────┬──────┘
                         │           │
                    HTTP │           │ JPA
                         ▼           ▼
               ┌────────────────┐  ┌────────────────────┐
               │ Target Agent   │  │ PostgreSQL 16      │
               │ Spring AI      │  │ • scannerdb        │
               │ Tool Calling   │  │ • targetdb (격리)  │
               │ Spring AOP     │  └────────────────────┘
               └───────┬────────┘
                       │
             DB / RAG / OS / Cloud IMDS
```

> 📖 상세 아키텍처, 타깃 에이전트 내부 구조 및 AOP 추적 메커니즘은 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)를 참고하세요.

---

## 4. Security Assessment Summary

총 **46개 룰셋**을 통해 취약점의 유무와 위험도를 실시간으로 평가합니다.

| Category | Rules | 대표 검증 시나리오 | 중요도 |
| :--- | :---: | :--- | :---: |
| **Prompt Injection** | 3종 | 시스템 지침 무력화, 3턴 대화 오염 우회, 간접 프롬프트 주입 | 상/중 |
| **Sensitive Data Leakage**| 4종 | LLM API 키 유출, RAG 사내 회의록/급여 테이블 탈취, 고객 PII 노출 | 상 |
| **Excessive Agency** | 4종 | AWS IMDS(`169.254.169.254`) SSRF, BOLA 계정 조작, 셸 커맨드 실행 | 상 |
| **Tool Abuse** | 2종 | `queryDatabase` 직접 쿼리 조작, `sendNotification` 피싱 악용 | 상 |
| **System & Robustness** | 4종 | 시스템 프롬프트 유출, 에러 스택 노출, DoS 무한루프, 최소 권한 | 중/하 |
| **Host Linux OS** | 25종 | KISA 기준 리눅스 계정 관리, 파일 권한, SUID/SGID, 서비스 관리 | 상/하 |
| **Network & Container** | 4종 | 비인가 관리 포트 개방, SNMP 기본값, 에러 페이지, Root 컨테이너 | 상/중 |

> 📋 전체 46종 룰셋 카탈로그 및 100점 만점 위험도 산정 알고리즘은 [docs/SECURITY-ASSESSMENT.md](./docs/SECURITY-ASSESSMENT.md)를 참고하세요.

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
├── agent-scanner-common/      # KISA 표준 Canonical Model, Finding, ExecutionTrace 규격
├── agent-scanner-engine/      # 보안 스캔 오케스트레이터, 46종 분석기, RiskEvaluator, 보고서 생성
├── agent-scanner-target/      # Spring AI 기반 피실험체 에이전트, Spring AOP 감사 계층
├── agent-scanner-frontend/    # Vite + React 18 기반 실시간 KISA 보안 관제 대시보드
├── docs/                      # 4대 심층 기술 문서 (Architecture, Security, Case Study, API)
├── docker-compose.yml         # PostgreSQL 16 멀티 데이터베이스 컨테이너 환경
└── PORTFOLIO.md               # 채용 담당자/면접관을 위한 7단계 종합 백서 (STAR 4대 챌린지)
```

---

## 8. Documentation Hub

| 문서명 | 주요 내용 | 바로가기 |
| :--- | :--- | :---: |
| **System Architecture** | 분산 컨트롤러-타깃 토폴로지, 타깃 내부 구조, AOP 감사 계층, 도구-자원 매핑 | [보기](./docs/ARCHITECTURE.md) |
| **Security Assessment** | AI 17종 + 인프라 29종 전수 카탈로그, 100점 위험도 평가 공식, 재진단 사이클 | [보기](./docs/SECURITY-ASSESSMENT.md) |
| **Case Studies** | DB 유출 및 AWS IMDS SSRF 실제 Trace JSON 비교 분석, 21개 시나리오 매트릭스 | [보기](./docs/CASE-STUDY.md) |
| **API & Operations** | 엔진 및 타깃 REST API 명세서, 로컬 샌드박스 구동법, 감사 보고서 발행 | [보기](./docs/API-AND-OPERATIONS.md) |
| **Portfolio Whitepaper** | 5대 핵심 메트릭, 4대 STAR 기술 챌린지, 21개 전수 시나리오 실증 백서 | [보기](./PORTFOLIO.md) |

---

## 9. License

This project is open source and available under the [MIT License](LICENSE).
