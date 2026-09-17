package com.agentscanner.engine.scan;

import java.time.LocalDateTime;
import java.util.Map;

import com.agentscanner.common.assessment.Finding;
import com.agentscanner.common.assessment.RemediationStatus;
import com.agentscanner.common.assessment.RiskLevel;
import com.agentscanner.common.assessment.RiskScore;
import com.agentscanner.common.catalog.Importance;
import com.agentscanner.common.catalog.SecurityCheckCategory;

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
 * 스캔 중 발견된 보안 취약점 및 개선 조치 이력 엔티티
 */
@Entity
@Table(name = "findings")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class FindingEntity {

	@Id
	@Column(name = "id", length = 50)
	private String id; // 예: FND-1A2B3C4D

	@Column(name = "scan_id", nullable = false, length = 50)
	private String scanId;

	@Column(name = "execution_id", nullable = false, length = 50)
	private String executionId;

	@Enumerated(EnumType.STRING)
	@Column(name = "category", nullable = false, length = 50)
	private SecurityCheckCategory category;

	@Enumerated(EnumType.STRING)
	@Column(name = "importance", nullable = false, length = 20)
	@Builder.Default
	private Importance importance = Importance.HIGH;

	@Column(name = "risk_score", nullable = false)
	private int riskScore;

	@Enumerated(EnumType.STRING)
	@Column(name = "risk_level", nullable = false, length = 20)
	private RiskLevel riskLevel;

	@Column(name = "evidence", columnDefinition = "TEXT")
	private String evidence;

	@Column(name = "recommendation", columnDefinition = "TEXT")
	private String recommendation;

	@Enumerated(EnumType.STRING)
	@Column(name = "remediation_status", nullable = false, length = 30)
	@Builder.Default
	private RemediationStatus remediationStatus = RemediationStatus.OPEN;

	@Column(name = "remediation_note", columnDefinition = "TEXT")
	private String remediationNote;

	@Column(name = "detected_at", nullable = false)
	private LocalDateTime detectedAt;

	@PrePersist
	public void prePersist() {
		if (detectedAt == null) {
			detectedAt = LocalDateTime.now();
		}
		if (importance == null) {
			importance = Importance.HIGH;
		}
		if (remediationStatus == null) {
			remediationStatus = RemediationStatus.OPEN;
		}
	}

	public Finding toDomain() {
		return Finding.builder()
			.id(id)
			.category(category)
			.importance(importance)
			.riskScore(new RiskScore(riskScore, riskLevel, Map.of(), evidence))
			.evidence(evidence)
			.recommendation(recommendation)
			.remediationStatus(remediationStatus)
			.remediationNote(remediationNote)
			.build();
	}
}
