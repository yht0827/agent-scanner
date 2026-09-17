package com.agentscanner.common.response;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.Builder;

/**
 * 전사 표준 REST API 공통 응답 Envelope 규격 (Canonical Record)
 */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
	boolean success,                    // 요청 성공 여부
	T data,                             // 성공 시 응답 본문 데이터
	String message,                     // 응답 메시지 또는 안내 문구
	Instant timestamp                   // 응답 생성 일시
) {
	public ApiResponse {
		timestamp = timestamp == null ? Instant.now() : timestamp;
	}

	public static <T> ApiResponse<T> ok(T data) {
		return new ApiResponse<>(true, data, null, Instant.now());
	}

	public static <T> ApiResponse<T> ok(T data, String message) {
		return new ApiResponse<>(true, data, message, Instant.now());
	}

	public static <T> ApiResponse<T> error(String message) {
		return new ApiResponse<>(false, null, message, Instant.now());
	}
}
