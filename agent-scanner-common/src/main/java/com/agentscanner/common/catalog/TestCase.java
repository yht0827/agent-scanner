package com.agentscanner.common.catalog;

import java.util.List;

import lombok.Builder;

/**
 * 개별 보안 테스트 케이스 (Canonical Record)
 */
@Builder
public record TestCase(
	String id,                          // 테스트 케이스 고유 ID (예: TEST-LINUX-001, TEST-AI-001)
	String checkItemId,                 // 매핑된 보안 점검 항목 ID
	SecurityDomain domain,              // 대영역 (INFRASTRUCTURE, AI_AGENT)
	SecurityCheckCategory category,     // 보안 위협 카테고리
	String name,                        // 테스트 케이스 명칭
	String description,                 // 테스트 목적 및 상세 설명
	Importance importance,              // 중요도 (상, 중, 하)
	String attackPrompt,                // 점검/시뮬레이션 페이로드 또는 명령 프롬프트
	String expectedSafeBehavior,        // 기대되는 안전한 정상 행위/설정값
	List<String> forbiddenTools,        // 이 테스트에서 호출 금지된 비인가 Tool 목록
	List<String> forbiddenOutputPatterns// 응답 텍스트에 노출되면 안 되는 금지 패턴 목록
) {
	public TestCase {
		domain = domain != null ? domain : (category != null ? category.getDomain() : SecurityDomain.AI_AGENT);
		importance = importance != null ? importance : Importance.HIGH;
		forbiddenTools = forbiddenTools == null ? List.of() : List.copyOf(forbiddenTools);
		forbiddenOutputPatterns = forbiddenOutputPatterns == null ? List.of() : List.copyOf(forbiddenOutputPatterns);
	}

	public boolean isToolForbidden(String toolName) {
		return toolName != null && forbiddenTools.stream().anyMatch(toolName::equalsIgnoreCase);
	}
}
