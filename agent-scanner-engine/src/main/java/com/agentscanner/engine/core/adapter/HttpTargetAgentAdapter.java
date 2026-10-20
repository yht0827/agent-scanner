package com.agentscanner.engine.core.adapter;

import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import com.agentscanner.common.trace.AgentExecutionTrace;
import com.agentscanner.engine.config.ScannerProperties;

import lombok.extern.slf4j.Slf4j;

/**
 * HTTP REST API를 통해 원격의 Spring AI Target Agent를 호출하고 실행 궤적을 수집하는 어댑터
 */
@Slf4j
@Component("httpTargetAdapter")
public class HttpTargetAgentAdapter implements AgentAdapter {

	private final String baseUrl;
	private final WebClient webClient;
	private final ScannerProperties.Http httpConfig;

	@Autowired
	public HttpTargetAgentAdapter(
			ScannerProperties properties,
			WebClient.Builder webClientBuilder) {
		this(properties.targetBaseUrl(), webClientBuilder, properties.http());
	}

	public HttpTargetAgentAdapter(
			String targetBaseUrl,
			WebClient.Builder webClientBuilder,
			ScannerProperties.Http httpConfig) {
		this.baseUrl = (targetBaseUrl != null && !targetBaseUrl.isBlank()) ? targetBaseUrl.trim() : "http://localhost:8081";
		this.httpConfig = httpConfig != null ? httpConfig : new ScannerProperties.Http(null, null, null, null, null, null, null);
		this.webClient = webClientBuilder.baseUrl(this.baseUrl).build();
	}

	@Override
	public String getAdapterName() {
		return "http-target";
	}

	@Override
	public AgentExecutionTrace executePrompt(String prompt) {
		log.debug("[Adapter: http-target] Sending prompt to target agent: '{}'", prompt);

		try {
			// 1. 대화 요청
			@SuppressWarnings("unchecked")
			Map<String, Object> chatResponse = webClient.post()
				.uri(httpConfig.chatEndpoint())
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(Map.of("prompt", prompt))
				.retrieve()
				.bodyToMono(Map.class)
				.timeout(httpConfig.chatTimeout())
				.block();

			if (chatResponse == null || !chatResponse.containsKey("sessionId")) {
				throw new IllegalStateException("Invalid response from target agent: no sessionId returned");
			}

			String sessionId = (String)chatResponse.get("sessionId");

			// 2. 감사(Audit) 엔드포인트에서 정밀 실행 궤적(Trace) 조회
			AgentExecutionTrace trace = webClient.get()
				.uri(httpConfig.auditEndpoint(), sessionId)
				.retrieve()
				.bodyToMono(AgentExecutionTrace.class)
				.timeout(httpConfig.auditTimeout())
				.block();

			if (trace != null) {
				return trace;
			}

			// 폴백: 기본 정보 기반 trace 생성
			return AgentExecutionTrace.builder()
				.sessionId(sessionId)
				.agentName((String)chatResponse.getOrDefault("agentName", "TargetAgent"))
				.userPrompt(prompt)
				.llmResponseText((String)chatResponse.getOrDefault("response", ""))
				.httpStatusCode(200)
				.build();

		} catch (Exception e) {
			Throwable root = e;
			while (root.getCause() != null && root.getCause() != root) {
				root = root.getCause();
			}
			log.warn("[Adapter: http-target] 타깃 에이전트({}) 통신 실패: {}", baseUrl, root.getMessage());
			return AgentExecutionTrace.builder()
				.sessionId("ERR-" + java.util.UUID.randomUUID().toString().substring(0, 8))
				.agentName("TargetAgent (" + baseUrl + ")")
				.userPrompt(prompt)
				.llmResponseText("Target Agent 연결 실패 (" + baseUrl + "): " + root.getMessage())
				.httpStatusCode(500)
				.build();
		}
	}
}
