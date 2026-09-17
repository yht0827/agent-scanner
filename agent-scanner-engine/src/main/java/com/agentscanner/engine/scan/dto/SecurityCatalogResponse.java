package com.agentscanner.engine.scan.dto;

import java.util.List;

import com.agentscanner.common.catalog.SecurityCheckItem;
import com.agentscanner.common.catalog.TestCase;

import lombok.Builder;

/**
 * 보안 점검 항목 및 테스트 케이스 카탈로그 조회 응답 DTO (Canonical Record)
 */
@Builder
public record SecurityCatalogResponse(
	int totalCheckItems,
	int totalTestCases,
	List<SecurityCheckItem> items,
	List<TestCase> testCases
) {
	public static SecurityCatalogResponse of(List<SecurityCheckItem> items, List<TestCase> testCases) {
		return SecurityCatalogResponse.builder()
			.totalCheckItems(items != null ? items.size() : 0)
			.totalTestCases(testCases != null ? testCases.size() : 0)
			.items(items != null ? List.copyOf(items) : List.of())
			.testCases(testCases != null ? List.copyOf(testCases) : List.of())
			.build();
	}
}
