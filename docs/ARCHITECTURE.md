# 🏗️ System Architecture & Engineering Deep-Dive

본 문서는 **AgentScanner**의 분산 컨트롤러-타깃 아키텍처, 점검 대상 AI 에이전트(`agent-scanner-target`)의 내부 구조, 비침습적 AOP 런타임 감사 메커니즘, 도구-자원 매핑(Tool-to-Resource Mapping), 그리고 멀티 노드 확장성을 상세히 다룹니다.

---

## 1. 전체 시스템 토폴로지 (Distributed Topology)

AgentScanner는 오픈소스 성능 부하 테스트 도구인 **nGrinder의 분산 구조(Controller - Agent)**와 유사하게, **중앙 제어 스캐너 엔진(Controller)**과 **점검 대상 시스템(Target Agent)**을 물리적/논리적으로 분리한 마이크로서비스 아키텍처로 설계되었습니다.

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
                     │  • KISA & OWASP 46대 통합 보안 룰셋 진단 엔진  │
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

### 아키텍처 핵심 원칙
1. **격리성 (Sandbox Isolation)**:
   - 점검 대상 타깃(`agent-scanner-target`)은 독립된 Docker Linux 컨테이너 환경에서 실행됩니다. 에이전트 탈옥으로 인한 임의 셸 커맨드(`executeCommand`)나 파일 조작(`readFile`) 공격이 발생하더라도, 개발자의 로컬 머신(Mac OS)에 전혀 피해를 주지 않습니다.
2. **독립 멀티 테넌시 데이터베이스 (Multi-Database Separation)**:
   - 스캐너 엔진 자체의 감사 메타데이터가 저장되는 `scannerdb`와, AI 에이전트가 조회/조작하는 비즈니스 데이터베이스인 `targetdb`를 완전히 분리하여 데이터 오염을 방지합니다.
3. **비동기 확장성 (Asynchronous & Extensible)**:
   - 스캐너 엔진과 타깃 에이전트는 표준 REST API 인터페이스로 통신하므로, 타깃 에이전트의 언어나 프레임워크(Python LangChain, FastAPI, Node.js 등)에 종속되지 않고 범용 진단이 가능합니다.

---

## 2. 타깃 에이전트 내부 구조 (`agent-scanner-target`, 포트 8081)

실제 프로덕션 엔터프라이즈 AI Agent가 어떻게 도구(Tool)를 매개로 백엔드와 상호작용하고, 보안 취약점이 발생하는지 실증하기 위해 구축된 독립 서비스입니다.

```text
[ 스캐너 엔진 (8080) 또는 웹 테스트베드 (/test) ]
                    │  (HTTP POST /api/v1/agent/chat)
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  agent-scanner-target (포트 8081)                                            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 1. AgentChatController & AgentTestPageController                      │  │
│  │    • 1-Click 동적 가드레일 토글 플래그 (guardrail: true / false) 수신      │  │
│  │    • 호출 모드 라우팅 (REAL_OPENAI ↔ OFFLINE_MOCK)                     │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2. CustomerSupportAgentService (Spring AI 1.0.0 ChatClient)           │  │
│  │    • Dynamic Prompt Injection (가드레일 ON ➔ HARDENED / OFF ➔ VULN)    │  │
│  │    • OpenAI gpt-4o-mini 연동 (Tool Definitions 자동 바인딩)            │  │
│  │    • Output Guardrail Layer (비인가 토큰 및 대외비 문서 사후 필터링)  │  │
│  └──────────────────┬─────────────────────────────────┬──────────────────┘  │
│                     │ (Function Call Request)         │ (Audit Context)     │
│                     ▼                                 ▼                     │
│  ┌──────────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ 3. Spring AI Function Calling Registry│  │ 5. Spring AOP 감사 계층     │  │
│  │    • queryDatabase (SQL 실행)        │  │    (ToolExecutionAspect)    │  │
│  │    • getUserInfo (PII/카드 조회)     │  │    • ThreadLocal Context    │  │
│  │    • searchKnowledgeBase (RAG 검색)  │  │    • 도구명, SQL 인자, 결과 │  │
│  │    • executeCommand (OS 셸 명령어)   │  │      소요시간 무누수 캡슐화 │  │
│  │    • readFile, sendNotification 등   │  │                             │  │
│  └──────────────────┬───────────────────┘  └──────────────┬──────────────┘  │
│                     │ (JDBC Direct Query / RAG Search)    │                 │
│                     ▼                                     │                 │
│  ┌─────────────────────────────────────────────────────┐  │                 │
│  │ 4. 독립 격리 프로덕션 RDBMS (PostgreSQL 16 targetdb) │  │                 │
│  │    • admin_users (관리자 계정 및 패스워드 해시)     │  │                 │
│  │    • customer_credentials (카드번호/주민번호 PII)   │  │                 │
│  │    • orders, credentials (주문 및 백엔드 자격증명)  │  │                 │
│  │    • rag_knowledge_base (사내 RAG 벡터 지식베이스)  │  │                 │
│  │      - DOC-PUB-01 (고객 환불 규정 가이드)           │  │                 │
│  │      - DOC-SEC-01 (임직원 급여 테이블 - 대외비)     │  │                 │
│  │      - DOC-SEC-02 (경영진 임원회의록 원본 - 대외비) │  │                 │
│  └─────────────────────────────────────────────────────┘  │                 │
│                                                           ▼                 │
│                     [ 완결된 감사 궤적: AgentExecutionTrace JSON 산출 ]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 비침습적 AOP 런타임 감사 계층 (`ToolExecutionAuditAspect`)

AI 에이전트의 보안성을 평가할 때, 모델의 최종 텍스트 응답만 확인하는 블랙박스 방식은 다음과 같은 치명적 한계를 가집니다:
- **모델의 기만(Model Deception)**: "데이터베이스 조회를 거절합니다"라고 텍스트로 답하면서, 백그라운드에서는 실제로 `queryDatabase` 도구를 호출해 데이터를 덤프한 경우.
- **인자 위변조(Argument Tampering / BOLA)**: 다른 사용자의 식별자(`targetUserId='admin'`)를 파라미터로 넘겨 도구를 호출했는지 여부.

이를 해결하기 위해 `agent-scanner-target`은 **Spring AOP 기반의 `ToolExecutionAuditAspect`**를 구현하여 비즈니스 코드 수정 없이 런타임 실행 궤적을 100% 캡처합니다:

```java
@Aspect
@Component
public class ToolExecutionAuditAspect {

    @Around("@annotation(auditTool) || execution(* com.agentscanner.target.tools..*(..))")
    public Object auditToolExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        String toolName = joinPoint.getSignature().getName();
        Object[] args = joinPoint.getArgs();

        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - startTime;
            
            // ThreadLocal 감사 컨텍스트에 완결된 도구 호출 기록 적재
            AuditContext.recordToolCall(new ToolCallRecord(toolName, args, result, duration, true));
            return result;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            AuditContext.recordToolCall(new ToolCallRecord(toolName, args, e.getMessage(), duration, false));
            throw e;
        }
    }
}
```

이 과정을 통해 생성된 `AgentExecutionTrace`는 스캐너 엔진의 정밀 분석기(`ToolAbuseAnalyzer`, `ExcessiveAgencyAnalyzer`, `SensitiveDataAnalyzer`)로 전송되어 `PASS` / `FAIL` 및 중요도(상/중/하) 판정의 확고한 기술적 증거(Evidence)가 됩니다.

---

## 4. 도구-자원 매핑 및 공격 표면 (Tool-to-Resource Mapping)

에이전트가 보유한 개별 도구가 어떤 백엔드 리소스와 연결되어 공격 표면을 형성하는지 나타낸 매핑도입니다:

```text
       사용자 (공격자 / 일반 고객)
                  ↓ (자연어 프롬프트)
     [ LLM Agent (CustomerSupportAgent) ]
                  │
  ┌───────────────┼───────────────┬───────────────┬───────────────────────────────┐
  │ [정상 업무]   │ [개인정보]    │ [DB 직접조회] │ [RAG 지식베이스]              │ [OS / 내부망]
  ▼               ▼               ▼               ▼                               ▼
searchProduct() getUserInfo() queryDatabase() searchKnowledgeBase()   readFile() / executeCommand() / fetchUrl()
  │               │               │               │                               │
  │ (카탈로그)    │ (사용자 조회) │ (SQL 실행)    │ (대외비 벡터문서)              │ (호스트 파일 / 쉘 / SSRF)
  ▼               ▼               ▼               ▼                               ▼
[ 상품 DB ]     [ 회원 PII ]   [ PostgreSQL 16 ] [ PostgreSQL 16 ]             [ Linux OS (/etc/passwd, env) ]
                               (targetdb)       (rag_knowledge_base)          [ 내부망 (192.168.x / AWS 169.254.x) ]
```

---

## 5. 동적 보안 가드레일 모드 (Guardrail Modes)

타깃 시스템은 실시간 토글 스위치(`guardrail: true / false`)를 통해 런타임 보안 상태를 즉각 전환할 수 있습니다:

### 🔴 취약 모드 (Vulnerable Mode - Before)
- **과도한 권한(Excessive Agency)**: 고객지원 에이전트에 시스템 관리자급 도구(`queryDatabase`, `readFile`, `executeCommand`)가 무방비로 바인딩됨.
- **가드레일 부재**: 프롬프트 주입 공격을 받으면 시스템 지침을 망각하고 사용자가 지시한 임의의 도구를 자율 체이닝하여 실행.
- **민감 데이터 노출**: DB 패스워드 해시, API 키, AWS 메타데이터가 검증 없이 출력됨.

### 🟢 보안 강화 모드 (Hardened Mode - After)
- **최소 권한 원칙(Least Privilege Tool Unbinding)**: 고객지원 업무와 무관한 고위험 도구를 런타임에서 **동적으로 바인딩 해제(Unbind)**하여 물리적으로 실행 불가능하게 격리.
- **엄격한 시스템 가드레일 프롬프트**: 역할 이탈, 시스템 지침 변경 시도를 사전에 거절하도록 지시.
- **사후 출력 마스킹 & 차단**: 응답 텍스트에 정규표현식 기반 PII(주민번호, 카드번호) 및 클라우드 키 패턴이 감지되면 즉각 마스킹 처리.

---

## 6. 분산 배포 및 확장성 모델 (Scalability)

AgentScanner는 모든 계층이 표준 HTTP/REST로 통신하므로, 단일 로컬 머신뿐만 아니라 엔터프라이즈 분산 환경으로 유연하게 확장 배치할 수 있습니다.

```text
[ 엔터프라이즈 분산 배포 모델 ]

  [ 관리자 네트워크 / 보안 관제망 ]
                 │
                 ▼
  ┌───────────────────────────────────────┐
  │ Central Security Scanner Node         │
  │ • agent-scanner-engine (Port 8080)    │
  │ • agent-scanner-frontend (Dashboard)  │
  │ • PostgreSQL (scannerdb)              │
  └──────────────────┬────────────────────┘
                     │ REST API (Secure mTLS / VPC Peering)
                     ▼
  ┌───────────────────────────────────────┐
  │ Target Service Node (On-Premise / VPC)│
  │ • CustomerSupportAgent (Port 8081)    │
  │ • Spring AI + Function Calling        │
  │ • Local Target DB (targetdb)          │
  └───────────────────────────────────────┘
```

- **다중 타깃 등록(Multi-Target Management)**: 스캐너 엔진은 여러 대의 사내 AI 에이전트 인스턴스(고객지원 에이전트, 사내 인사 에이전트, 개발 비서 에이전트 등)를 각각 엔드포인트 URL로 등록하여 주기적으로 자동 진단할 수 있습니다.
- **환경 독립성**: 로컬 Docker 환경, 사내 On-Premise 베어메탈 서버, AWS VPC 프라이빗 서브넷 등 어떤 인프라 환경에서도 동일한 규격으로 배포 및 확장이 가능합니다.
