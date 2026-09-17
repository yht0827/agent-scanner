package com.agentscanner.common.catalog;

import lombok.Builder;

/**
 * 보안 점검 항목 정의 및 KISA, OWASP 매핑 메타데이터 (Canonical Record)
 */
@Builder
public record SecurityCheckItem(
	String id,                          // 보안 점검 항목 ID (예: SEC-LINUX-01, SEC-PI-01)
	SecurityDomain domain,              // 대영역 (INFRASTRUCTURE, AI_AGENT)
	SecurityCheckCategory category,     // 세부 보안 위협 카테고리
	String name,                        // 점검 항목 명칭
	String description,                 // 점검 항목 상세 설명
	Importance importance,              // 중요도 (상, 중, 하)
	String kisaCode,                    // 주요정보통신기반시설 매핑 코드
	String owaspCode                    // OWASP Top 10 표준 코드 (예: LLM01:2026)
) {
	public SecurityCheckItem {
		domain = domain != null ? domain : (category != null ? category.getDomain() : SecurityDomain.AI_AGENT);
		importance = importance != null ? importance : Importance.HIGH;
	}
}
