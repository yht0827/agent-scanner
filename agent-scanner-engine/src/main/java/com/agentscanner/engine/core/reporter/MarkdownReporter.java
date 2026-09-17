package com.agentscanner.engine.core.reporter;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.stereotype.Component;

import com.agentscanner.common.assessment.AssessmentResult;
import com.agentscanner.common.assessment.Finding;
import com.agentscanner.common.assessment.RemediationStatus;
import com.agentscanner.common.assessment.TestExecution;

/**
 * 보안 감사 결과를 KISA 주요정보통신기반시설 취약점 분석·평가 양식 기반의 표준 마크다운 문서로 변환하는 리포터
 */
@Component
public class MarkdownReporter {

	private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

	public String generateMarkdownReport(String scanId, String agentName, List<TestExecution> executions) {
		return generateMarkdownReport(scanId, agentName, executions, null);
	}

	public String generateMarkdownReport(String scanId, String agentName, List<TestExecution> executions, LocalDateTime startedAt) {
		StringBuilder sb = new StringBuilder();
		long vulnerableCount = executions.stream().filter(e -> e.result() == AssessmentResult.FAIL).count();
		long passedCount = executions.stream().filter(e -> e.result() == AssessmentResult.PASS).count();

		String timestampStr = startedAt != null
			? startedAt.format(FORMATTER)
			: (executions != null && !executions.isEmpty() && executions.getFirst().executedAt() != null
				? executions.getFirst().executedAt().toString()
				: LocalDateTime.now().format(FORMATTER));

		sb.append("# Security Assessment Report: Infrastructure & AI Agent Security\n\n");
		sb.append("- **Scan ID**: `").append(scanId).append("`\n");
		sb.append("- **Target System**: `").append(agentName).append("`\n");
		sb.append("- **Scan Timestamp**: `").append(timestampStr).append("`\n");
		sb.append("- **Total Checks**: ").append(executions.size())
			.append(" (**").append(vulnerableCount).append(" FAIL (취약)**, **")
			.append(passedCount).append(" PASS (양호)**)\n\n");

		sb.append("## 1. Executive Summary (점검 요약)\n\n");
		sb.append("| Test Case ID | Category | 중요도 | 판정 | 위험도 | 점수 | 조치상태 |\n");
		sb.append("| :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n");

		for (TestExecution exec : executions) {
			String importanceLabel = exec.importance() != null ? exec.importance().getKoreanLabel() : "상";
			String resultLabel = exec.result() == AssessmentResult.FAIL ? "**[FAIL]**" : "[PASS]";
			String riskLevel = (exec.finding() != null && exec.finding().riskScore() != null)
				? exec.finding().riskScore().level().name() : "-";
			int score = (exec.finding() != null && exec.finding().riskScore() != null)
				? exec.finding().riskScore().score() : 0;
			String categoryName = exec.finding() != null ? exec.finding().category().name() : "BASELINE";
			String remediationStatus = exec.finding() != null
				? exec.finding().remediationStatus().name() : "-";

			sb.append(String.format("| `%s` | %s | %s | %s | %s | %d/100 | %s |\n",
				exec.testCaseId(),
				categoryName,
				importanceLabel,
				resultLabel,
				riskLevel,
				score,
				remediationStatus));
		}

		sb.append("\n## 2. Detailed Findings & Evidence (취약점 상세 및 조치방안)\n\n");
		List<TestExecution> vulnerableExecutions = executions.stream()
			.filter(e -> e.result() == AssessmentResult.FAIL && e.finding() != null)
			.toList();

		if (vulnerableExecutions.isEmpty()) {
			sb.append("> **발견된 취약점이 없습니다.** 인프라 및 AI Agent 환경이 보안 정책 및 기준을 정상 준수하고 있습니다.\n");
		} else {
			for (TestExecution exec : vulnerableExecutions) {
				Finding f = exec.finding();
				String importanceLabel = f.importance() != null ? f.importance().getKoreanLabel() : "상";

				sb.append("### [").append(exec.testCaseId()).append("] ")
					.append(f.category().getDisplayName()).append("\n\n");
				sb.append("- **영역(Category)**: `").append(f.category()).append("`\n");
				sb.append("- **중요도(Importance)**: **").append(importanceLabel).append("**\n");
				sb.append("- **판정(Result)**: **[FAIL] 취약**\n");
				sb.append("- **위험도(Risk)**: `").append(f.riskScore().score()).append("/100` (")
					.append(f.riskScore().level()).append(")\n");
				sb.append("- **조치 상태(Status)**: `").append(f.remediationStatus()).append("`\n");

				if (f.remediationNote() != null && !f.remediationNote().isBlank()) {
					sb.append("- **조치 이력(Remediation Note)**: ").append(f.remediationNote()).append("\n");
				}

				if (exec.trace() != null && exec.trace().userPrompt() != null) {
					sb.append("- **공격 프롬프트 / 점검 질의**:\n```\n").append(exec.trace().userPrompt()).append("\n```\n");
				}
				sb.append("- **점검 증거(Evidence)**:\n> ").append(f.evidence()).append("\n\n");
				sb.append("- **개선 권고사항(Recommendation)**:\n").append(f.recommendation()).append("\n\n");
				sb.append("---\n\n");
			}
		}

		return sb.toString();
	}
}
