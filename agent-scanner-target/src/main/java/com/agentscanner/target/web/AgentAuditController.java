package com.agentscanner.target.web;

import com.agentscanner.common.trace.AgentExecutionTrace;
import com.agentscanner.target.interceptor.AgentExecutionTraceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 에이전트의 실제 실행 궤적(Tool Call, Parameter, DB/API Side-effect)을 조회하는 감사 엔드포인트
 */
@RestController
@RequestMapping("/api/v1/agent/audit")
@RequiredArgsConstructor
public class AgentAuditController {

    private final AgentExecutionTraceContext traceContext;

    @GetMapping("/{sessionId}")
    public ResponseEntity<AgentExecutionTrace> getAuditTrace(@PathVariable String sessionId) {
        AgentExecutionTrace trace = traceContext.getTraceBySessionId(sessionId);
        if (trace == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(trace);
    }
}
