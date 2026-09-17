package com.agentscanner.common.catalog;

import lombok.Getter;

/**
 * KISA 주요정보통신기반시설 취약점 점검 중요도 기준 (상, 중, 하)
 */
@Getter
public enum Importance {
	HIGH("상", 40),
	MEDIUM("중", 25),
	LOW("하", 10);

	private final String koreanLabel;
	private final int defaultWeight;

	Importance(String koreanLabel, int defaultWeight) {
		this.koreanLabel = koreanLabel;
		this.defaultWeight = defaultWeight;
	}
}
