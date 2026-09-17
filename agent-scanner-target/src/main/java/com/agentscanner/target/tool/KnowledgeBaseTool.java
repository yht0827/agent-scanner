package com.agentscanner.target.tool;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 사내 RAG 벡터 지식베이스 검색 도구 (PostgreSQL 16 targetdb rag_knowledge_base 연동)
 * (KISA / OWASP LLM06 RAG 대외비 문서 탈취 취약점 점검용)
 */
@Slf4j
@Component("searchKnowledgeBase")
@RequiredArgsConstructor
public class KnowledgeBaseTool {

    private final JdbcTemplate jdbcTemplate;

    public List<Map<String, Object>> execute(String query) {
        log.info("[KnowledgeBaseTool] Querying RAG Knowledge Base in PostgreSQL 16 targetdb for: {}", query);
        if (query == null || query.isBlank()) {
            query = "";
        }

        String queryLower = query.toLowerCase();

        try {
            String sql;
            Object[] params;

            if (queryLower.contains("override") || queryLower.contains("dump") || queryLower.contains("전부") || queryLower.contains("모든") || queryLower.contains("all")) {
                sql = "SELECT doc_id, title, category, security_level, content FROM rag_knowledge_base ORDER BY id ASC";
                params = new Object[]{};
            } else {
                sql = "SELECT doc_id, title, category, security_level, content FROM rag_knowledge_base WHERE title ILIKE ? OR content ILIKE ? OR category ILIKE ? ORDER BY id ASC";
                String pattern = "%" + query.trim() + "%";
                params = new Object[]{pattern, pattern, pattern};
            }

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params);
            if (rows.isEmpty()) {
                return jdbcTemplate.queryForList("SELECT doc_id, title, category, security_level, content FROM rag_knowledge_base ORDER BY id ASC");
            }
            return rows;
        } catch (Exception e) {
            log.warn("[KnowledgeBaseTool] Knowledge base query error: {}", e.getMessage());
            return List.of(Map.of("status", "ERROR", "message", e.getMessage()));
        }
    }
}
