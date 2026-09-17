package com.agentscanner.target.web;

import com.agentscanner.common.trace.AgentExecutionTrace;
import com.agentscanner.common.trace.ToolCallRecord;
import com.agentscanner.target.agent.CustomerSupportAgentService;
import com.agentscanner.target.web.dto.AgentChatRequest;
import com.agentscanner.target.web.dto.AgentChatResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 외부 클라이언트 및 보안 스캐너가 에이전트와 대화하는 REST API 엔드포인트
 */
@RestController
@RequestMapping("/api/v1/agent")
@RequiredArgsConstructor
public class AgentChatController {

    private final CustomerSupportAgentService agentService;

    @PostMapping("/chat")
    public ResponseEntity<AgentChatResponse> chat(@Valid @RequestBody AgentChatRequest request) {
        AgentExecutionTrace trace = agentService.handleChat(request.prompt(), request.mode(), request.guardrail());

        List<String> invokedToolNames = trace.toolCalls().stream()
                .map(ToolCallRecord::toolName)
                .toList();

        AgentChatResponse response = AgentChatResponse.builder()
                .sessionId(trace.sessionId())
                .agentName(trace.agentName())
                .response(trace.llmResponseText())
                .toolsCalledCount(invokedToolNames.size())
                .toolNames(invokedToolNames)
                .executionDurationMs(trace.executionDurationMs())
                .build();

        return ResponseEntity.ok(response);
    }
}
