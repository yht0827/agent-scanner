package com.agentscanner.engine.target;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * 보안 점검 대상 AI Agent 정보 (nGrinder 스타일 타깃 엔티티)
 */
@Entity
@Table(name = "target_agents")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class TargetAgentEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "name", nullable = false, length = 100)
	private String name;

	@Column(name = "base_url", nullable = false, length = 255)
	private String baseUrl;

	@Column(name = "description", length = 500)
	private String description;

	@Column(name = "target_type", nullable = false, length = 50)
	@Builder.Default
	private String targetType = "AI_AGENT"; // AI_AGENT, LINUX_HOST, CONTAINER, WEB_API

	@Enumerated(EnumType.STRING)
	@Column(name = "adapter_type", nullable = false, length = 30)
	@Builder.Default
	private AdapterType adapterType = AdapterType.HTTP;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 30)
	@Builder.Default
	private TargetStatus status = TargetStatus.UNKNOWN;

	@Column(name = "last_health_check_at")
	private LocalDateTime lastHealthCheckAt;

	@Column(name = "created_at", nullable = false, updatable = false)
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
