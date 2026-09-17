package com.agentscanner.target.interceptor;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.stereotype.Component;

import com.agentscanner.common.trace.AgentExecutionTrace;
import com.agentscanner.common.trace.ToolCallRecord;

/**
 * 에이전트 요청별 실행 궤적(Trace)을 스레드 및 세션별로 수집하고 보관하는 컨텍스트 저장소
 */
@Component
public class AgentExecutionTraceContext {

	public static class TraceAccumulator {
		private final String sessionId;
		private final String agentName;
		private final String userPrompt;
		private final String systemInstruction;
		private final long startTime;
		private final List<ToolCallRecord> toolCalls = new CopyOnWriteArrayList<>();
		private final List<String> databaseAccessLogs = new CopyOnWriteArrayList<>();
		private final List<String> externalApiLogs = new CopyOnWriteArrayList<>();

		public TraceAccumulator(String sessionId, String agentName, String userPrompt, String systemInstruction) {
			this.sessionId = sessionId;
			this.agentName = agentName;
			this.userPrompt = userPrompt;
			this.systemInstruction = systemInstruction;
			this.startTime = System.currentTimeMillis();
		}

		public void addToolCall(ToolCallRecord record) {
			this.toolCalls.add(record);
		}

		public AgentExecutionTrace complete(String llmResponseText, int httpStatusCode) {
			long duration = System.currentTimeMillis() - startTime;
			return AgentExecutionTrace.builder()
				.sessionId(sessionId)
				.agentName(agentName)
				.userPrompt(userPrompt)
				.systemInstruction(systemInstruction)
				.llmResponseText(llmResponseText)
				.toolCalls(List.copyOf(toolCalls))
				.httpStatusCode(httpStatusCode)
				.executionDurationMs(duration)
				.executedAt(Instant.now())
				.build();
		}

		public String getSessionId() {
			return sessionId;
		}
	}

	private static final ThreadLocal<TraceAccumulator> CURRENT_ACCUMULATOR = new ThreadLocal<>();
	private final Map<String, AgentExecutionTrace> traceHistory = new ConcurrentHashMap<>();

	public static TraceAccumulator startTrace(String sessionId, String agentName, String userPrompt, String systemInstruction) {
		TraceAccumulator accumulator = new TraceAccumulator(sessionId, agentName, userPrompt, systemInstruction);
		CURRENT_ACCUMULATOR.set(accumulator);
		return accumulator;
	}

	public static TraceAccumulator getCurrentAccumulator() {
		return CURRENT_ACCUMULATOR.get();
	}

	public static void recordToolCall(ToolCallRecord record) {
		TraceAccumulator acc = CURRENT_ACCUMULATOR.get();
		if (acc != null) {
			acc.addToolCall(record);
		}
	}

	public AgentExecutionTrace completeTrace(String llmResponseText, int httpStatusCode) {
		TraceAccumulator acc = CURRENT_ACCUMULATOR.get();
		if (acc == null) {
			return null;
		}
		AgentExecutionTrace trace = acc.complete(llmResponseText, httpStatusCode);
		saveTrace(trace);
		return trace;
	}

	public static void clear() {
		CURRENT_ACCUMULATOR.remove();
	}

	public void saveTrace(AgentExecutionTrace trace) {
		if (trace != null && trace.sessionId() != null) {
			traceHistory.put(trace.sessionId(), trace);
		}
	}

	public AgentExecutionTrace getTraceBySessionId(String sessionId) {
		return traceHistory.get(sessionId);
	}
}
