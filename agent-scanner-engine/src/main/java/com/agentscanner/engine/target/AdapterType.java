package com.agentscanner.engine.target;

/**
 * 점검 대상 AI 에이전트 연동 방식 어댑터 유형
 */
public enum AdapterType {
	HTTP,
	MOCK;

	public static AdapterType fromString(String value) {
		if (value == null || value.isBlank()) {
			return HTTP;
		}
		for (AdapterType type : values()) {
			if (type.name().equalsIgnoreCase(value.trim())) {
				return type;
			}
		}
		return HTTP;
	}
}
