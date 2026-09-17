package com.agentscanner.engine.scan.dto;

/**
 * 취약점 조치 등록 요청 DTO
 */
public record RemediateFindingRequest(
	String remediationNote
) {
}
