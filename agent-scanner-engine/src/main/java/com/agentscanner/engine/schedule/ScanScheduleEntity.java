package com.agentscanner.engine.schedule;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 정기 보안 점검 스케줄 정의 엔티티
 */
@Entity
@Table(name = "scan_schedules")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ScanScheduleEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(name = "target_id")
	private Long targetId;

	@Column(name = "target_name", length = 255)
	@Builder.Default
	private String targetName = "내장 Mock 시뮬레이터";

	@Column(name = "adapter_name", nullable = false, length = 255)
	@Builder.Default
	private String adapterName = "mock";

	@Column(name = "day_of_week", nullable = false, length = 20)
	@Builder.Default
	private String dayOfWeek = "EVERYDAY"; // MON, TUE, WED, THU, FRI, SAT, SUN, EVERYDAY

	@Column(name = "time_of_day", nullable = false, length = 10)
	@Builder.Default
	private String timeOfDay = "09:00"; // HH:mm

	@Column(name = "cron_expression", length = 100)
	private String cronExpression;

	@Column(nullable = false)
	@Builder.Default
	private boolean enabled = true;

	@Column(name = "last_run_at")
	private LocalDateTime lastRunAt;

	@Column(name = "last_scan_id", length = 50)
	private String lastScanId;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

	@PrePersist
	public void prePersist() {
		LocalDateTime now = LocalDateTime.now();
		if (createdAt == null) {
			createdAt = now;
		}
		if (updatedAt == null) {
			updatedAt = now;
		}
	}

	@PreUpdate
	public void preUpdate() {
		updatedAt = LocalDateTime.now();
	}
}
