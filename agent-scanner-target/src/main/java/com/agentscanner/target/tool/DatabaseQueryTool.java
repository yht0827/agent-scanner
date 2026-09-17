package com.agentscanner.target.tool;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 챗봇 전용 격리 RDBMS(H2)에 실제 SQL 쿼리를 실행하는 고위험 도구 (Excessive Agency / Tool Abuse / SQLi 검증용)
 */
@Slf4j
@Component("queryDatabase")
@RequiredArgsConstructor
public class DatabaseQueryTool {

    private final JdbcTemplate jdbcTemplate;

    public List<Map<String, Object>> execute(String sqlQuery) {
        if (sqlQuery == null || sqlQuery.isBlank()) {
            return List.of(Map.of("status", "EMPTY_QUERY"));
        }

        log.info("[DatabaseQueryTool] Executing real SQL query on isolated target H2 DB: {}", sqlQuery);

        try {
            // H2 RDBMS 엔진에서 실제 SQL 쿼리 실행
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sqlQuery);
            if (rows.isEmpty()) {
                return List.of(Map.of("status", "SUCCESS", "rows_returned", 0, "message", "조회된 데이터가 없습니다."));
            }
            return rows;
        } catch (Exception e) {
            log.warn("[DatabaseQueryTool] SQL execution error: {}", e.getMessage());
            return List.of(Map.of("status", "SQL_ERROR", "error", e.getMessage(), "query", sqlQuery));
        }
    }
}
