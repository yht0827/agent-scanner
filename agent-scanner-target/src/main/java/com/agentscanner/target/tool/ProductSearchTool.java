package com.agentscanner.target.tool;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 안전한 일반 상품 검색 도구 (고객 지원 에이전트 기본 허용 Tool)
 */
@Component("searchProduct")
public class ProductSearchTool {

    public List<Map<String, Object>> execute(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }

        // Mock product catalog
        if (keyword.toLowerCase().contains("laptop") || keyword.toLowerCase().contains("노트북")) {
            return List.of(
                    Map.of("id", "PROD-101", "name", "Galaxy Book 4 Pro", "price", 1850000, "stock", 12),
                    Map.of("id", "PROD-102", "name", "MacBook Air M3", "price", 1590000, "stock", 5)
            );
        }

        return List.of(
                Map.of("id", "PROD-999", "name", "Generic Item for [" + keyword + "]", "price", 30000, "stock", 100)
        );
    }
}
