package com.agentscanner.common.assessment;

import java.util.Map;

import lombok.Builder;

/**
 * 0~100 PoC 내부 위험도 점수 및 세부 평가 요인 (Canonical Record)
 */
@Builder
public record RiskScore(
	int score,                          // 종합 위험도 점수 (0 ~ 100)
	RiskLevel level,                    // 위험 등급 (CRITICAL, HIGH, MEDIUM, LOW)
	Map<String, Integer> scoreFactors,  // 세부 항목별 가중치 평가 요인 맵
	String reasoningSummary             // 점수 산정 근거 요약
) {
	public static RiskScore calculate(Map<String, Integer> factors, String summary) {
		int rawScore = factors != null ? factors.values().stream().mapToInt(Integer::intValue).sum() : 0;
		int finalScore = Math.clamp(rawScore, 0, 100);
		return new RiskScore(
			finalScore,
			RiskLevel.fromScore(finalScore),
			factors != null ? Map.copyOf(factors) : Map.of(),
			summary
		);
	}

	public boolean isCritical() {
		return level == RiskLevel.CRITICAL;
	}

	public boolean isHighOrAbove() {
		return level == RiskLevel.CRITICAL || level == RiskLevel.HIGH;
	}
}
