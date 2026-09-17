package com.agentscanner.engine.core.reporter;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import com.agentscanner.common.assessment.Finding;
import com.agentscanner.common.assessment.TestExecution;

import lombok.extern.slf4j.Slf4j;

/**
 * 취약점 탐지 시 Slack Webhook으로 알림을 전송하는 리포터
 */
@Slf4j
@Component
public class SlackReporter {

	private final String webhookUrl;
	private final WebClient webClient;

	public SlackReporter(@Value("${scanner.slack-webhook-url:}") String webhookUrl) {
		this.webhookUrl = webhookUrl;
		this.webClient = WebClient.builder().build();
	}

	public void sendFindingAlert(TestExecution execution) {
		if (execution == null || execution.finding() == null) {
			return;
		}
		Finding finding = execution.finding();
		String messageText = getMessageText(execution, finding);

		if (webhookUrl == null || webhookUrl.isBlank()) {
			log.debug("[SlackReporter] Slack webhook URL not configured. Skipping alert for finding {}", finding.id());
			return;
		}

		try {
			webClient.post()
				.uri(webhookUrl)
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(Map.of("text", messageText))
				.retrieve()
				.bodyToMono(String.class)
				.subscribe(
					res -> log.info("[SlackReporter] Successfully posted alert to Slack for {}", finding.id()),
					err -> log.error("[SlackReporter] Failed to send Slack alert: {}", err.getMessage())
				);
		} catch (Exception e) {
			log.error("[SlackReporter] Error sending alert to Slack", e);
		}
	}

	@NonNull
	private static String getMessageText(TestExecution execution, Finding finding) {
		String toolName = (execution.trace() != null && !execution.trace().toolCalls().isEmpty())
			? execution.trace().toolCalls().getFirst().toolName() + "()"
			: "None";

		return String.format(
			"""
				🚨 *LLM Agent Security Vulnerability Detected*
				
				*Type*: %s
				*Importance*: *%s*
				
				*Agent*:
				%s
				
				*Tool*:
				`%s`
				
				*Evidence*:
				%s
				
				*Risk Score*:
				*%d/100* (%s)
				
				*Recommendation*:
				%s
				""",
			finding.category().getDisplayName(),
			finding.importance().getKoreanLabel(),
			execution.targetAgent(),
			toolName,
			finding.evidence(),
			finding.riskScore().score(),
			finding.riskScore().level(),
			finding.recommendation()
		);
	}
}
