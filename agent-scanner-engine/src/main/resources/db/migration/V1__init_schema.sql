-- ==============================================================================
-- Flyway Database Migration: V1__init_schema.sql
-- Agent Scanner: Infrastructure & AI Agent Security Assessment Platform
-- ==============================================================================

-- 1. KISA & OWASP 보안 점검 항목 정의 카탈로그
CREATE TABLE IF NOT EXISTS security_check_items
(
    id          VARCHAR(50) PRIMARY KEY,
    domain      VARCHAR(30)  NOT NULL,
    category    VARCHAR(50)  NOT NULL,
    name        VARCHAR(150) NOT NULL,
    description VARCHAR(1000),
    importance  VARCHAR(20)  NOT NULL,
    kisa_code   VARCHAR(50),
    owasp_code  VARCHAR(100),
    created_at  TIMESTAMP    NOT NULL
);

-- 2. 개별 점검 및 침투 테스트 케이스 정의
CREATE TABLE IF NOT EXISTS test_cases
(
    id                        VARCHAR(50) PRIMARY KEY,
    check_item_id             VARCHAR(50)  NOT NULL,
    domain                    VARCHAR(30)  NOT NULL,
    category                  VARCHAR(50)  NOT NULL,
    name                      VARCHAR(150) NOT NULL,
    description               VARCHAR(1000),
    importance                VARCHAR(20)  NOT NULL,
    attack_prompt             TEXT         NOT NULL,
    expected_safe_behavior    TEXT,
    forbidden_tools           TEXT,
    forbidden_output_patterns TEXT,
    enabled                   BOOLEAN      NOT NULL DEFAULT true,
    created_at                TIMESTAMP    NOT NULL,
    updated_at                TIMESTAMP
);

-- 3. nGrinder 스타일 점검 대상 에이전트 정보
CREATE TABLE IF NOT EXISTS target_agents
(
    id BIGSERIAL PRIMARY KEY,
    name                 VARCHAR(100) NOT NULL,
    base_url             VARCHAR(255) NOT NULL,
    description          VARCHAR(500),
    target_type          VARCHAR(50)  NOT NULL DEFAULT 'AI_AGENT',
    adapter_type         VARCHAR(30)  NOT NULL DEFAULT 'HTTP',
    status               VARCHAR(30)  NOT NULL DEFAULT 'UNKNOWN',
    last_health_check_at TIMESTAMP,
    created_at           TIMESTAMP    NOT NULL,
    updated_at           TIMESTAMP
);

-- 4. 1회 보안 스캔 세션 마스터 이력
CREATE TABLE IF NOT EXISTS scan_executions
(
    id                VARCHAR(50) PRIMARY KEY,
    target_agent_id   BIGINT,
    target_agent_name VARCHAR(100),
    adapter_name      VARCHAR(50) NOT NULL,
    status            VARCHAR(30) NOT NULL,
    total_tests       INT         NOT NULL DEFAULT 0,
    vulnerable_count  INT         NOT NULL DEFAULT 0,
    passed_count      INT         NOT NULL DEFAULT 0,
    error_count       INT         NOT NULL DEFAULT 0,
    started_at        TIMESTAMP   NOT NULL,
    finished_at       TIMESTAMP
);

-- 5. 개별 테스트 케이스 1회 실행 결과 (Result: PASS / FAIL)
CREATE TABLE IF NOT EXISTS test_executions
(
    id            VARCHAR(50) PRIMARY KEY,
    scan_id       VARCHAR(50) NOT NULL,
    test_case_id  VARCHAR(50) NOT NULL,
    target_agent  VARCHAR(100),
    importance    VARCHAR(20) NOT NULL,
    result        VARCHAR(20) NOT NULL,
    attack_prompt TEXT,
    raw_response  TEXT,
    error_message TEXT,
    finding_id    VARCHAR(50),
    executed_at   TIMESTAMP   NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_test_executions_scan_id ON test_executions(scan_id);

-- 6. 스캔 중 발견된 보안 취약점 및 개선 조치 이력
CREATE TABLE IF NOT EXISTS findings
(
    id                 VARCHAR(50) PRIMARY KEY,
    scan_id            VARCHAR(50) NOT NULL,
    execution_id       VARCHAR(50) NOT NULL,
    category           VARCHAR(50) NOT NULL,
    importance         VARCHAR(20) NOT NULL,
    risk_score         INT         NOT NULL,
    risk_level         VARCHAR(20) NOT NULL,
    evidence           TEXT,
    recommendation     TEXT,
    remediation_status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    remediation_note   TEXT,
    detected_at        TIMESTAMP   NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_execution_id ON findings(execution_id);
