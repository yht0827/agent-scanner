package com.agentscanner.common.catalog;

import lombok.Getter;

/**
 * 보안 점검 대영역 (인프라 vs AI 에이전트)
 */
@Getter
public enum SecurityDomain {
	INFRASTRUCTURE("인프라 보안 (Infrastructure Security)"),
	AI_AGENT("AI 에이전트 보안 (AI Agent Security)");

	private final String displayName;

	SecurityDomain(String displayName) {
		this.displayName = displayName;
	}
}
