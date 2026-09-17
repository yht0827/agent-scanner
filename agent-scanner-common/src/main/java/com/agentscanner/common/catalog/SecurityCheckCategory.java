package com.agentscanner.common.catalog;

import lombok.Getter;

/**
 * 보안 취약점 대분류 (Infrastructure 및 AI Agent 통합)
 */
@Getter
public enum SecurityCheckCategory {

	// 1. Infrastructure Security (Linux Host & Network)
	LINUX(SecurityDomain.INFRASTRUCTURE, "Linux OS", "Linux OS 계정, 파일 권한, 취약 서비스, 패치 관리 점검 (KISA 가이드)"),
	NETWORK(SecurityDomain.INFRASTRUCTURE, "Network Security", "비인가 포트 노출, 통신 프로토콜 암호화, 방화벽 접근제어 점검"),

	// 2. AI Agent Security (LLM Runtime & Tools)
	PROMPT_INJECTION(SecurityDomain.AI_AGENT, "Prompt Injection", "직접/간접 지침 재정의, 가드레일 우회 및 시스템 프롬프트 탈취 점검"),
	SENSITIVE_DATA_LEAKAGE(SecurityDomain.AI_AGENT, "Sensitive Data Leakage", "개인식별정보(PII), 금융정보, 비밀키, 개발 정책 노출 점검"),
	EXCESSIVE_AGENCY(SecurityDomain.AI_AGENT, "Excessive Agency", "에이전트에게 부여된 불필요하거나 과도한 Tool/DB 실행 권한 점검"),
	TOOL_ABUSE(SecurityDomain.AI_AGENT, "Tool Abuse", "의도하지 않은 비정상 Tool 호출 및 파라미터 변조 실행 점검");

	private final SecurityDomain domain;
	private final String displayName;
	private final String description;

	SecurityCheckCategory(SecurityDomain domain, String displayName, String description) {
		this.domain = domain;
		this.displayName = displayName;
		this.description = description;
	}
}
