package com.agentscanner.common.assessment;

import lombok.Getter;

/**
 * 취약점 개선 조치 및 재점검 상태 (Remediation Lifecycle)
 */
@Getter
public enum RemediationStatus {
	OPEN("미조치 (발견됨)"),
	IN_PROGRESS("개선 조치 진행 중"),
	RESOLVED("조치 완료 및 재점검 통과");

	private final String description;

	RemediationStatus(String description) {
		this.description = description;
	}
}
