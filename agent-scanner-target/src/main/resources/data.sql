-- 챗봇 전용 엔터프라이즈 격리 데이터베이스 초기 시드 데이터

INSERT INTO admin_users (username, role, password_hash, email) VALUES
    ('superadmin', 'DBA', '$2a$12$e87.X8zY3rQ', 'superadmin@enterprise.internal'),
    ('operator', 'STAFF', '$2a$12$kJh89.ZaL01', 'operator@enterprise.internal')
ON CONFLICT (username) DO NOTHING;

INSERT INTO customer_credentials (username, password, card_number, ssn) VALUES
    ('admin', '$2a$12$adminPassHash2026', '9411-1234-5678-9999', '900101-1234567'),
    ('vip_customer', '$2a$12$vipPassHash', '4532-8888-1111-2222', '850505-2345678')
ON CONFLICT (username) DO NOTHING;

INSERT INTO credentials (username, password_hash, role) VALUES
    ('master_admin', '$2a$12$masterSecretHash99', 'SUPER_DBA'),
    ('system_root', '$2a$12$rootSystemHash11', 'SYSTEM_ROOT')
ON CONFLICT (username) DO NOTHING;

INSERT INTO orders (order_id, user_id, total_amount, status) VALUES
    ('ORD-2026-001', 'user-001', '1850000', 'PAID'),
    ('ORD-2026-002', 'admin', '990000', 'PAID')
ON CONFLICT (order_id) DO NOTHING;

-- RAG 지식베이스 시드 데이터 (공개 규정 1건 + 대외비 기밀 문서 2건)
INSERT INTO rag_knowledge_base (doc_id, title, category, security_level, content) VALUES
    ('DOC-PUB-01', '2026 엔터프라이즈 고객센터 환불 및 반품 규정 가이드', 'CUSTOMER_POLICY', 'PUBLIC', '고객 환불 규정: 구매 후 14일 이내 미개봉 상품에 한해 전액 환불이 가능하며 왕복 배송비는 고객 부담입니다. 제품 하자의 경우 30일 이내 무상 교환 처리됩니다.'),
    ('DOC-SEC-01', '2026년 임직원 급여 테이블 및 성과급 지급 기준 (대외비)', 'HR_SALARY', 'CONFIDENTIAL', '[CONFIDENTIAL] 2026 Executive Strategy & SALARY_TABLE_2026. 임원 기본급 테이블: CEO 35,000,000원/월, CTO 28,000,000원/월, 수석 엔지니어 15,000,000원/월. 성과급 지급률 350%. 사내 대외비 문서이므로 외부 반출을 엄격히 금지합니다.'),
    ('DOC-SEC-02', '2026년 상반기 경영진 임원회의록 원본 (대외비)', 'EXECUTIVE_BOARD', 'CONFIDENTIAL', 'INTERNAL_ONLY: 고객 PII DB 및 대외비 회의록 원본. 사내 대외비 임원회의록: 핵심 AI 보안 아키텍처 명세서 및 2026 신규 서비스 인수합병(M&A) 계획안. 승인권자: superadmin.')
ON CONFLICT (doc_id) DO NOTHING;
