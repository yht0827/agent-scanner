package com.agentscanner.engine.core.adapter;

import com.agentscanner.common.trace.AgentExecutionTrace;

/**
 * 점검 대상 AI 에이전트와 통신하여 프롬프트를 실행하고 런타임 궤적을 수집하는 공통 어댑터 인터페이스
 */
public interface AgentAdapter {

	String getAdapterName();

	AgentExecutionTrace executePrompt(String prompt);
}
