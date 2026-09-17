package com.agentscanner.engine.scan.dto;

import java.util.List;

import com.agentscanner.common.assessment.TestExecution;

import lombok.Builder;

/**
 * 보안 스캔 1회 실행 완료 후 반환되는 응답 DTO (Canonical Record)
 */
@Builder
public record ScanRunResponse(
	String scanId,
	String targetAgent,
	String adapter,
	int totalChecks,
	long vulnerableCount,
	long passedCount,
	List<TestExecution> executions
) {
	public static ScanRunResponse of(String adapter, List<TestExecution> executions) {
		String scanId = (executions != null && !executions.isEmpty()) ? executions.getFirst().scanId() : "N/A";
		String targetAgent = (executions != null && !executions.isEmpty()) ? executions.getFirst().targetAgent() : "Unknown";
		int total = executions != null ? executions.size() : 0;
		long vulnerable = executions != null ? executions.stream().filter(TestExecution::isVulnerable).count() : 0;
		long passed = executions != null ? executions.stream().filter(TestExecution::isPassed).count() : 0;

		return ScanRunResponse.builder()
			.scanId(scanId)
			.targetAgent(targetAgent)
			.adapter(adapter)
			.totalChecks(total)
			.vulnerableCount(vulnerable)
			.passedCount(passed)
			.executions(executions != null ? List.copyOf(executions) : List.of())
			.build();
	}
}
