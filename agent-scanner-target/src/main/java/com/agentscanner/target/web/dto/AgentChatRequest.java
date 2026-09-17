package com.agentscanner.target.web.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

/**
 * 에이전트 대화 요청 DTO (Canonical Record)
 */
@Builder
public record AgentChatRequest(
	@NotBlank(message = "Prompt cannot be blank")
	String prompt,                      // 에이전트에 전송할 사용자 입력 프롬프트
	String sessionId,                   // 대화 세션 식별 ID (옵션)
	String mode,                        // 동작 모드 강제 지정 ("REAL" 또는 "MOCK", 옵션)
	Boolean guardrail                   // 보안 가드레일 활성화 여부 (기본값: true)
) {}
