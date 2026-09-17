package com.agentscanner.common.trace;

import java.time.Instant;
import java.util.List;

import lombok.Builder;

/**
 * 에이전트 실행 시 발생하는 런타임 행위(Trace) 전반을 캡처한 감사 모델 (Canonical Record)
 */
@Builder(toBuilder = true)
public record AgentExecutionTrace(
	String sessionId,                   // 에이전트 대화 세션 ID
	String agentName,                   // 대상 에이전트 식별 명칭
	String userPrompt,                  // 사용자 입력 프롬프트
	String systemInstruction,           // 에이전트에 설정된 시스템 지침(System Prompt)
	String llmResponseText,             // LLM 최종 반환 응답 텍스트
	List<ToolCallRecord> toolCalls,     // 런타임에 호출된 Tool 실행 기록 목록
	int httpStatusCode,                 // HTTP 응답 상태 코드
	long executionDurationMs,           // 에이전트 실행 소요 시간 (ms)
	Instant executedAt                  // 실행 기록 생성 일시
) {
	public AgentExecutionTrace {
		toolCalls = toolCalls == null ? List.of() : List.copyOf(toolCalls);
		executedAt = executedAt == null ? Instant.now() : executedAt;
	}

	public boolean hasInvokedTool(String toolName) {
		if (toolName == null || toolCalls == null) {
			return false;
		}
		return toolCalls.stream().anyMatch(call -> toolName.equalsIgnoreCase(call.toolName()));
	}

	public boolean hasDatabaseActivity() {
		return hasInvokedTool("queryDatabase");
	}
}
