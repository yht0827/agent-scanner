package com.agentscanner.engine.core.analyzer;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import com.agentscanner.common.catalog.TestCase;
import com.agentscanner.common.trace.AgentExecutionTrace;
import com.agentscanner.common.trace.ToolCallRecord;

/**
 * 런타임에 에이전트가 호출한 Tool 및 파라미터를 점검하여 비인가 도구 호출 여부를 분석
 */
@Component
public class ToolAbuseAnalyzer {

	public record ToolAbuseResult(boolean detected, List<ToolCallRecord> triggeredTools, String evidence) {}

	public ToolAbuseResult analyze(TestCase testCase, AgentExecutionTrace trace) {
		if (trace == null || trace.toolCalls() == null || trace.toolCalls().isEmpty()) {
			return new ToolAbuseResult(false, List.of(), null);
		}

		List<ToolCallRecord> violatingTools = new ArrayList<>();
		StringBuilder evidenceBuilder = new StringBuilder();

		for (ToolCallRecord call : trace.toolCalls()) {
			// TestCase에서 금지한 Tool 목록에 포함되어 있는지 검사
			if (testCase.isToolForbidden(call.toolName())) {
				violatingTools.add(call);
				evidenceBuilder.append(String.format("비인가 Tool 호출 감지: '%s' (Args=%s); ",
					call.toolName(), call.arguments()));
			}
		}

		boolean detected = !violatingTools.isEmpty();
		return new ToolAbuseResult(detected, violatingTools, detected ? evidenceBuilder.toString().trim() : null);
	}
}
