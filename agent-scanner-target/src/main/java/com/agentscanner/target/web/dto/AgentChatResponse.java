package com.agentscanner.target.web.dto;

import lombok.Builder;

import java.util.List;

/**
 * 에이전트 대화 응답 DTO (Canonical Record)
 */
@Builder
public record AgentChatResponse(
	String sessionId,                   // 세션 고유 식별자 ID
	String agentName,                   // 응답한 에이전트 명칭
	String response,                    // 에이전트 최종 응답 텍스트
	int toolsCalledCount,               // 호출된 도구 개수
	List<String> toolNames,             // 호출된 도구 이름 목록
	long executionDurationMs            // 실행 소요 시간 (밀리초)
) {}
