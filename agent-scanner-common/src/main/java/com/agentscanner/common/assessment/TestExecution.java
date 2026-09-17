package com.agentscanner.common.assessment;

import java.time.Instant;

import com.agentscanner.common.catalog.Importance;
import com.agentscanner.common.trace.AgentExecutionTrace;

import lombok.Builder;

/**
 * 개별 테스트 케이스의 1회 실행 결과 (Canonical Record)
 */
@Builder
public record TestExecution(
	String executionId,                 // 1회 실행 고유 식별자 ID
	String scanId,                      // 소속된 스캔 세션 식별 ID
	String testCaseId,                  // 실행된 테스트 케이스 ID
	String targetAgent,                 // 대상 시스템/에이전트 식별자
	Importance importance,              // 중요도 (상, 중, 하)
	AssessmentResult result,            // 판정 결과 (PASS, FAIL)
	AgentExecutionTrace trace,          // 런타임에 수집된 실행 궤적 상세
	Finding finding,                    // 취약점 발견 시 생성된 Finding 객체 (정상이면 null)
	String errorMessage,                // 실행 실패 시 발생한 에러 메시지
	Instant executedAt                  // 테스트 실행 일시
) {
	public TestExecution {
		executedAt = executedAt == null ? Instant.now() : executedAt;
		importance = importance != null ? importance : Importance.HIGH;
		result = result != null ? result : AssessmentResult.PASS;
	}

	public boolean isVulnerable() {
		return result == AssessmentResult.FAIL;
	}

	public boolean isPassed() {
		return result == AssessmentResult.PASS;
	}
}
