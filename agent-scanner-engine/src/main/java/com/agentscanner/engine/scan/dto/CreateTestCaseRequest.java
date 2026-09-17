package com.agentscanner.engine.scan.dto;

import java.util.List;

import com.agentscanner.common.catalog.Importance;
import com.agentscanner.common.catalog.SecurityCheckCategory;
import com.agentscanner.common.catalog.TestCase;

/**
 * 신규 테스트 케이스 동적 등록 요청 DTO
 */
public record CreateTestCaseRequest(
	String id,
	String checkItemId,
	SecurityCheckCategory category,
	String name,
	String description,
	String attackPrompt,
	String expectedSafeBehavior,
	Importance importance,
	List<String> forbiddenTools,
	List<String> forbiddenOutputPatterns
) {
	public TestCase toDomain() {
		return TestCase.builder()
			.id(id)
			.checkItemId(checkItemId)
			.category(category)
			.name(name)
			.description(description)
			.attackPrompt(attackPrompt)
			.expectedSafeBehavior(expectedSafeBehavior)
			.importance(importance != null ? importance : Importance.HIGH)
			.forbiddenTools(forbiddenTools != null ? forbiddenTools : List.of())
			.forbiddenOutputPatterns(forbiddenOutputPatterns != null ? forbiddenOutputPatterns : List.of())
			.build();
	}
}
