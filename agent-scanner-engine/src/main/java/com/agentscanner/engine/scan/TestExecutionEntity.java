package com.agentscanner.engine.scan;

import java.time.LocalDateTime;

import com.agentscanner.common.assessment.AssessmentResult;
import com.agentscanner.common.catalog.Importance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 개별 테스트 케이스 1회 실행 결과 엔티티
 */
@Entity
@Table(name = "test_executions")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class TestExecutionEntity {

	@Id
	@Column(name = "id", length = 50)
	private String id; // 예: EXEC-C97F9CA1-001

	@Column(name = "scan_id", nullable = false, length = 50)
	private String scanId;

	@Column(name = "test_case_id", nullable = false, length = 50)
	private String testCaseId;

	@Column(name = "target_agent", length = 255)
	private String targetAgent;

	@Enumerated(EnumType.STRING)
	@Column(name = "importance", nullable = false, length = 20)
	@Builder.Default
	private Importance importance = Importance.HIGH;

	@Enumerated(EnumType.STRING)
	@Column(name = "result", nullable = false, length = 20)
	@Builder.Default
	private AssessmentResult result = AssessmentResult.PASS;

	@Column(name = "attack_prompt", columnDefinition = "TEXT")
	private String attackPrompt;

	@Column(name = "raw_response", columnDefinition = "TEXT")
	private String rawResponse;

	@Column(name = "error_message", columnDefinition = "TEXT")
	private String errorMessage;

	@Column(name = "finding_id", length = 50)
	private String findingId;

	@Column(name = "executed_at", nullable = false)
	private LocalDateTime executedAt;

	@PrePersist
	public void prePersist() {
		if (executedAt == null) {
			executedAt = LocalDateTime.now();
		}
		if (importance == null) {
			importance = Importance.HIGH;
		}
		if (result == null) {
			result = AssessmentResult.PASS;
		}
	}
}
