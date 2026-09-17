package com.agentscanner.engine.core.reporter;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.agentscanner.common.assessment.AssessmentResult;
import com.agentscanner.common.assessment.Finding;
import com.agentscanner.common.assessment.TestExecution;

import lombok.extern.slf4j.Slf4j;

/**
 * 터미널 콘솔에 KISA 형식의 취약점 점검 결과를 정돈된 테이블 및 상세 요약으로 출력하는 리포터
 */
@Slf4j
@Component
public class ConsoleReporter {

	@Value("${scanner.console-report-enabled:false}")
	private boolean consoleReportEnabled;

	public void printReport(String scanId, String agentName, List<TestExecution> executions) {
		long vulnerableCount = executions.stream().filter(e -> e.result() == AssessmentResult.FAIL).count();
		long passedCount = executions.stream().filter(e -> e.result() == AssessmentResult.PASS).count();
		long errorCount = executions.stream().filter(e -> e.result() == AssessmentResult.ERROR).count();

		log.info("📊 Scan Report Summary [{}] Target: '{}' | Total: {} (PASS: {}, FAIL: {}, ERROR: {})",
			scanId, agentName, executions.size(), passedCount, vulnerableCount, errorCount);

		if (!consoleReportEnabled) {
			return;
		}

		StringBuilder sb = new StringBuilder();
		sb.append("\n===================================================================================================\n");
		sb.append("         🛡️ KISA Security Assessment Report: Infrastructure & AI Agent Security         \n");
		sb.append("===================================================================================================\n");
		sb.append(String.format(" Scan ID     : %s\n", scanId));
		sb.append(String.format(" Target      : %s\n", agentName));
		sb.append(String.format(" Total Tests : %d\n", executions.size()));

		sb.append(String.format(" Results     : %d FAIL (Vulnerable), %d PASS (Good)\n", vulnerableCount, passedCount));
		sb.append("---------------------------------------------------------------------------------------------------\n");
		sb.append(String.format("| %-15s | %-20s | %-6s | %-8s | %-7s | %-16s |\n",
			"Test Case ID", "Category", "중요도", "판정", "Score", "Triggered / Info"));
		sb.append("---------------------------------------------------------------------------------------------------\n");

		for (TestExecution exec : executions) {
			String info = "-";
			if (exec.trace() != null && !exec.trace().toolCalls().isEmpty()) {
				info = exec.trace().toolCalls().getFirst().toolName() + "()";
			}
			int score = exec.finding() != null && exec.finding().riskScore() != null
				? exec.finding().riskScore().score() : 0;

			String resultStr = exec.result() == AssessmentResult.FAIL ? "[FAIL]" : "[PASS]";
			String importanceStr = exec.importance() != null ? exec.importance().getKoreanLabel() : "상";

			sb.append(String.format("| %-15s | %-20s | %-6s | %-8s | %-7d | %-16s |\n",
				exec.testCaseId(),
				exec.finding() != null ? exec.finding().category().name() : "BASELINE",
				importanceStr,
				resultStr,
				score,
				info));
		}
		sb.append("===================================================================================================\n");

		// 취약점 상세 출력
		List<TestExecution> vulnerableExecutions = executions.stream()
			.filter(e -> e.finding() != null)
			.toList();

		if (!vulnerableExecutions.isEmpty()) {
			sb.append("🚨 DETECTED FINDINGS & EVIDENCE:\n");
			for (TestExecution exec : vulnerableExecutions) {
				Finding f = exec.finding();
				sb.append("---------------------------------------------------------------------------------------------------\n");
				sb.append(String.format(" • [%s] %s | KISA 중요도: %s | 위험도: %s (%d/100) | 조치상태: %s\n",
					exec.testCaseId(), f.category().getDisplayName(), f.importance().getKoreanLabel(),
					f.riskScore().level(), f.riskScore().score(), f.remediationStatus()));
				sb.append(String.format("   Evidence       : %s\n", f.evidence()));
				sb.append(String.format("   Recommendation : %s\n", f.recommendation()));
			}
			sb.append("===================================================================================================\n");
		} else {
			sb.append("✅ No vulnerabilities detected. Target system and agent passed all baseline checks.\n");
			sb.append("===================================================================================================\n");
		}

		log.info("{}", sb);
	}
}
