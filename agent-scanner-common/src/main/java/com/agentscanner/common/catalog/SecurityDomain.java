package com.agentscanner.common.catalog;

import lombok.Getter;

/**
 * 보안 점검 대영역
 */
@Getter
public enum SecurityDomain {
	AI_AGENT("AI 에이전트 보안 (AI Agent Security)");

	private final String displayName;

	SecurityDomain(String displayName) {
		this.displayName = displayName;
	}
}
