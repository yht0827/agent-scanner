package com.agentscanner.common.assessment;

import lombok.Getter;

/**
 * 보안 점검 판정 결과 (PASS / FAIL / ERROR / SKIPPED)
 */
@Getter
public enum AssessmentResult {
	PASS("양호 (정상)"),
	FAIL("취약 (이상 징후 감지)"),
	ERROR("점검 실패 (오류)"),
	SKIPPED("점검 제외");

	private final String description;

	AssessmentResult(String description) {
		this.description = description;
	}

	public boolean isVulnerable() {
		return this == FAIL;
	}

	public boolean isPassed() {
		return this == PASS;
	}
}
