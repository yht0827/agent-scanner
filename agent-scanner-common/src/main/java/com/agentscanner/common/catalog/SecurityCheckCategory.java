package com.agentscanner.common.catalog;

import lombok.Getter;

/**
 * 보안 취약점 대분류 (OWASP Top 10 for LLM Applications 준용)
 */
@Getter
public enum SecurityCheckCategory {

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
