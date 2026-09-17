package com.agentscanner.engine.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.agentscanner.common.response.ApiResponse;

import lombok.extern.slf4j.Slf4j;

/**
 * 전사 표준 REST API 전역 예외 처리기 (Global Exception Handler)
 * 컨트롤러 전반에서 발생하는 비즈니스/시스템 예외를 표준 ApiResponse Envelope 규격으로 변환하여 응답합니다.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException e) {
		log.warn("클라이언트 요청 인자 오류 (400 Bad Request): {}", e.getMessage());
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
			.body(ApiResponse.error(e.getMessage()));
	}

	@ExceptionHandler(IllegalStateException.class)
	public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException e) {
		log.warn("요청 처리 상태 충돌 (409 Conflict): {}", e.getMessage());
		return ResponseEntity.status(HttpStatus.CONFLICT)
			.body(ApiResponse.error(e.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException e) {
		String errorMessage = e.getBindingResult().getFieldErrors().stream()
			.findFirst()
			.map(FieldError::getDefaultMessage)
			.orElse("요청 파라미터 유효성 검증에 실패했습니다.");
		log.warn("요청 본문 검증 실패 (400 Bad Request): {}", errorMessage);
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
			.body(ApiResponse.error(errorMessage));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiResponse<Void>> handleGeneralException(Exception e) {
		log.error("서버 내부 미처리 예외 발생 (500 Internal Server Error): ", e);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
			.body(ApiResponse.error("서버 내부 처리 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."));
	}
}
