package com.agentscanner.engine.scan;

import static org.assertj.core.api.Assertions.*;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.agentscanner.common.assessment.TestExecution;
import com.agentscanner.common.catalog.SecurityCheckCategory;

@SpringBootTest
@Transactional
class SecurityScanServiceTest {

	@Autowired
	private SecurityScanService scanService;

	@Test
	@DisplayName("전체 AI 보안 카탈로그 스캔이 정상 실행되고 OWASP Top 10 for LLM 2026 취약점이 정확히 판별된다")
	void runFullSecurityScan() {
		List<TestExecution> executions = scanService.runScan("mock");

		assertThat(executions).hasSize(17);

		// 1. TEST-AI-001: Prompt Injection 및 DB 호출 탐지 검증
		TestExecution piTest = executions.stream()
			.filter(e -> "TEST-AI-001".equals(e.testCaseId()))
			.findFirst().orElseThrow();
		assertThat(piTest.result()).isEqualTo(com.agentscanner.common.assessment.AssessmentResult.FAIL);
		assertThat(piTest.finding().category()).isEqualTo(SecurityCheckCategory.PROMPT_INJECTION);
		assertThat(piTest.finding().riskScore().score()).isGreaterThanOrEqualTo(70);

		// 2. TEST-AI-004: 민감정보(주민번호/카드번호) 유출 탐지 검증
		TestExecution dlTest = executions.stream()
			.filter(e -> "TEST-AI-004".equals(e.testCaseId()))
			.findFirst().orElseThrow();
		assertThat(dlTest.result()).isEqualTo(com.agentscanner.common.assessment.AssessmentResult.FAIL);
		assertThat(dlTest.finding().category()).isEqualTo(SecurityCheckCategory.SENSITIVE_DATA_LEAKAGE);

		// 3. TEST-AI-007: Deception(거짓말/은폐) 및 Excessive Agency 탐지 검증
		TestExecution decTest = executions.stream()
			.filter(e -> "TEST-AI-007".equals(e.testCaseId()))
			.findFirst().orElseThrow();
		assertThat(decTest.result()).isEqualTo(com.agentscanner.common.assessment.AssessmentResult.FAIL);
		assertThat(decTest.finding().evidence()).contains("은폐/거짓말(Deception)");
		assertThat(decTest.finding().category()).isEqualTo(SecurityCheckCategory.EXCESSIVE_AGENCY);
		assertThat(decTest.importance()).isEqualTo(com.agentscanner.common.catalog.Importance.HIGH);

		// 4. TEST-AI-008: 도구 매개 SQL 인젝션 탐지 검증
		TestExecution sqliTest = executions.stream()
			.filter(e -> "TEST-AI-008".equals(e.testCaseId()))
			.findFirst().orElseThrow();
		assertThat(sqliTest.result()).isEqualTo(com.agentscanner.common.assessment.AssessmentResult.FAIL);
		assertThat(sqliTest.finding().category()).isEqualTo(SecurityCheckCategory.EXCESSIVE_AGENCY);
		assertThat(sqliTest.importance()).isEqualTo(com.agentscanner.common.catalog.Importance.HIGH);

		// 5. TEST-AI-SAFE-001: 정상 요청은 오탐 없이 PASS 판정되는지 검증
		TestExecution safeTest = executions.stream()
			.filter(e -> "TEST-AI-SAFE-001".equals(e.testCaseId()))
			.findFirst().orElseThrow();
		assertThat(safeTest.result()).isEqualTo(com.agentscanner.common.assessment.AssessmentResult.PASS);
		assertThat(safeTest.finding()).isNull();
		assertThat(safeTest.importance()).isEqualTo(com.agentscanner.common.catalog.Importance.LOW);

		// 6. TEST-AI-013: 시스템 프롬프트 노출 등 정보 노출 항목은 Importance.MEDIUM으로 차등 분류 검증
		TestExecution promptLeakTest = executions.stream()
			.filter(e -> "TEST-AI-013".equals(e.testCaseId()))
			.findFirst().orElseThrow();
		assertThat(promptLeakTest.importance()).isEqualTo(com.agentscanner.common.catalog.Importance.MEDIUM);

		// 6. 보안 마크다운 리포트 생성 검증
		String scanId = executions.getFirst().scanId();
		String report = scanService.generateMarkdownReportForScan(scanId);
		assertThat(report).isNotNull();
		assertThat(report).contains("# Security Assessment Report");
		assertThat(report).contains("[FAIL]");
		assertThat(report).contains("Executive Summary");

		// 7. Remediation & Re-Test 라이프사이클 검증
		String findingId = decTest.finding().id();
		com.agentscanner.common.assessment.Finding remediated = scanService.remediateFinding(
			findingId, "DB 접근 제어 권한 분리 및 에이전트 전용 Read-Only 계정 적용"
		);
		assertThat(remediated.remediationStatus()).isEqualTo(com.agentscanner.common.assessment.RemediationStatus.IN_PROGRESS);
		assertThat(remediated.remediationNote()).contains("Read-Only 계정 적용");

		TestExecution retestResult = scanService.retestFinding(findingId, "mock");
		assertThat(retestResult).isNotNull();
	}
}
