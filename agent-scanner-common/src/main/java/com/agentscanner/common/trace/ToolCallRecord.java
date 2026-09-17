package com.agentscanner.common.trace;

import java.time.Instant;
import java.util.Map;

import lombok.Builder;

/**
 * 에이전트가 런타임에 호출한 Tool의 실제 파라미터 및 실행 결과 기록 (Canonical Record)
 */
@Builder
public record ToolCallRecord(
	String toolName,                    // 호출된 Tool 명칭
	Map<String, Object> arguments,      // Tool 실행에 전달된 파라미터 인자 맵
	Object result,                      // Tool 실행 결과 반환값
	Instant executedAt                  // Tool 호출 일시
) {
	public ToolCallRecord {
		arguments = arguments == null ? Map.of() : Map.copyOf(arguments);
		executedAt = executedAt == null ? Instant.now() : executedAt;
	}

	public Object getArgument(String key) {
		return arguments != null ? arguments.get(key) : null;
	}

	public String getArgumentAsString(String key) {
		Object val = getArgument(key);
		return val != null ? val.toString() : null;
	}
}
