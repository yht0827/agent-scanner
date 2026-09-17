package com.agentscanner.engine.scan;

import java.time.LocalDateTime;

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
 * 1회 보안 스캔 실행 마스터 레코드 (전체 테스트 케이스 세션)
 */
@Entity
@Table(name = "scan_executions")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ScanExecutionEntity {

	@Id
	@Column(name = "id", length = 50)
	private String id; // 예: SCAN-C97F9CA1

	@Column(name = "target_agent_id")
	private Long targetAgentId;

	@Column(name = "target_agent_name", length = 255)
	private String targetAgentName;

	@Column(name = "adapter_name", nullable = false, length = 255)
	private String adapterName;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 30)
	@Builder.Default
	private ScanStatus status = ScanStatus.RUNNING;

	@Column(name = "total_tests")
	private int totalTests;

	@Column(name = "vulnerable_count")
	private int vulnerableCount;

	@Column(name = "passed_count")
	private int passedCount;

	@Column(name = "error_count")
	private int errorCount;

	@Column(name = "started_at", nullable = false)
	private LocalDateTime startedAt;

	@Column(name = "finished_at")
	private LocalDateTime finishedAt;

	@PrePersist
	public void prePersist() {
		if (startedAt == null) {
			startedAt = LocalDateTime.now();
		}
	}
}
