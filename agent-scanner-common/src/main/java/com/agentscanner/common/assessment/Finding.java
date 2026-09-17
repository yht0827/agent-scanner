package com.agentscanner.common.assessment;

import com.agentscanner.common.catalog.Importance;
import com.agentscanner.common.catalog.SecurityCheckCategory;

import lombok.Builder;

/**
 * 보안 취약점 진단 결과 및 조치 이력 (Canonical Record)
 */
@Builder
public record Finding(
	String id,                          // 취약점 고유 ID (예: FND-1A2B3C4D)
	SecurityCheckCategory category,     // 보안 위협 카테고리
	Importance importance,              // 점검 중요도 (상, 중, 하)
	RiskScore riskScore,                // 계산된 위험 점수 객체 (0~100, level 포함)
	String evidence,                    // 취약점 판단 근거 및 이상 징후 설명
	String recommendation,              // 보안 개선 조치 권고사항
	RemediationStatus remediationStatus,// 조치 상태 (OPEN, IN_PROGRESS, RESOLVED)
	String remediationNote              // 조치 내용 기록
) {
	public Finding {
		importance = importance != null ? importance : Importance.HIGH;
		remediationStatus = remediationStatus != null ? remediationStatus : RemediationStatus.OPEN;
	}

	public boolean isResolved() {
		return remediationStatus == RemediationStatus.RESOLVED;
	}

	public boolean isOpen() {
		return remediationStatus == RemediationStatus.OPEN;
	}
}
