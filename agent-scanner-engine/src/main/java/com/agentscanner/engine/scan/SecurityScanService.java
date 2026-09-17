package com.agentscanner.engine.scan;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.agentscanner.common.assessment.AssessmentResult;
import com.agentscanner.common.assessment.Finding;
import com.agentscanner.common.assessment.RemediationStatus;
import com.agentscanner.common.assessment.TestExecution;
import com.agentscanner.common.catalog.Importance;
import com.agentscanner.common.catalog.SecurityDomain;
import com.agentscanner.common.catalog.TestCase;
import com.agentscanner.common.trace.AgentExecutionTrace;
import com.agentscanner.engine.catalog.SecurityTestCatalog;
import com.agentscanner.engine.core.adapter.AgentAdapter;
import com.agentscanner.engine.core.adapter.HttpTargetAgentAdapter;
import com.agentscanner.engine.core.analyzer.AnalysisEngine;
import com.agentscanner.engine.core.reporter.ConsoleReporter;
import com.agentscanner.engine.core.reporter.MarkdownReporter;
import com.agentscanner.engine.core.reporter.SlackReporter;
import com.agentscanner.engine.target.AdapterType;
import com.agentscanner.engine.target.TargetAgentEntity;
import com.agentscanner.engine.target.TargetAgentRepository;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 전체 테스트 카탈로그를 순회하며 보안 스캔을 수행하고 결과를 DB에 영속화하는 오케스트레이션 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SecurityScanService {

	private final SecurityTestCatalog catalog;
	private final AnalysisEngine analysisEngine;
	private final List<AgentAdapter> adapters;
	private final ConsoleReporter consoleReporter;
	private final MarkdownReporter markdownReporter;
	private final SlackReporter slackReporter;

	private final ScanExecutionRepository scanExecutionRepository;
	private final TestExecutionRepository testExecutionRepository;
	private final FindingRepository findingRepository;
	private final TargetAgentRepository targetAgentRepository;
	private final WebClient.Builder webClientBuilder;

	@Value("${scanner.default-adapter:mock}")
	private String defaultAdapterName;

	@Value("${scanner.target-base-url:http://localhost:8081}")
	private String defaultTargetBaseUrl;

	@Transactional
	public List<TestExecution> runScan(String adapterName) {
		return runScan(adapterName, null, null);
	}

	@Transactional
	public List<TestExecution> runScan(String adapterName, Long targetId) {
		return runScan(adapterName, targetId, null);
	}

	@Transactional
	public List<TestExecution> runScan(String adapterName, Long targetId, List<String> categories) {
		String scanId = "SCAN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

		AgentAdapter adapter;
		String targetAgentName = "Unknown";
		String adapterDisplayName;

		if (targetId != null) {
			TargetAgentEntity target = targetAgentRepository.findById(targetId)
				.orElseThrow(() -> new IllegalArgumentException("지정된 타깃 에이전트를 찾을 수 없습니다. 타깃 관리 상태를 확인하거나 Mock 시뮬레이터를 선택해 주세요."));
			targetAgentName = target.getName();
			if (target.getAdapterType() == AdapterType.MOCK) {
				adapter = resolveAdapter("mock");
				adapterDisplayName = "mock (" + target.getName() + ")";
			} else {
				checkTargetConnectivity(target.getName(), target.getBaseUrl());
				adapter = new HttpTargetAgentAdapter(target.getBaseUrl(), webClientBuilder);
				adapterDisplayName = "http (" + target.getName() + " - " + target.getBaseUrl() + ")";
			}
		} else {
			String selectedAdapterName = (adapterName != null && !adapterName.isBlank()) ? adapterName : defaultAdapterName;
			adapter = resolveAdapter(selectedAdapterName);
			adapterDisplayName = adapter.getAdapterName();
			if (adapter instanceof HttpTargetAgentAdapter) {
				checkTargetConnectivity("HTTP Target Agent", defaultTargetBaseUrl);
			}
		}

		adapterDisplayName = truncate(adapterDisplayName, 250);
		targetAgentName = truncate(targetAgentName, 250);

		log.info("Starting security scan [{}] for target '{}' using adapter '{}' with categories '{}'",
			scanId, targetAgentName, adapterDisplayName, categories);

		ScanExecutionEntity scanEntity = ScanExecutionEntity.builder()
			.id(scanId)
			.targetAgentId(targetId)
			.adapterName(adapterDisplayName)
			.targetAgentName(targetAgentName)
			.status(ScanStatus.RUNNING)
			.startedAt(LocalDateTime.now())
			.build();
		scanExecutionRepository.save(scanEntity);

		List<TestCase> testCases = catalog.getAllTestCases();
		if (categories != null && !categories.isEmpty()) {
			Set<String> normalizedCategories = categories.stream()
				.filter(c -> c != null && !c.isBlank())
				.map(String::trim)
				.map(String::toUpperCase)
				.collect(Collectors.toSet());

			testCases = testCases.stream()
				.filter(tc -> {
					if (tc.category() == null) {
						return true;
					}
					// 'AI' 키워드가 포함되어 있고 해당 테스트케이스가 AI_AGENT 도메인인 경우 매칭
					if (normalizedCategories.contains("AI") && tc.category().getDomain() == SecurityDomain.AI_AGENT) {
						return true;
					}
					// 특정 카테고리 enum 명칭과 직접 매칭
					return normalizedCategories.contains(tc.category().name());
				})
				.toList();
		}
		List<TestExecution> results = new ArrayList<>();
		int vulnerableCount = 0;
		int passedCount = 0;
		int errorCount = 0;

		for (TestCase tc : testCases) {
			log.debug("Running Test Case [{}]: {}", tc.id(), tc.name());

			AgentExecutionTrace trace = adapter.executePrompt(tc.attackPrompt());
			if (trace != null && trace.agentName() != null && "Unknown".equals(targetAgentName)) {
				targetAgentName = trace.agentName();
			}

			TestExecution execution = analysisEngine.analyze(scanId, tc, trace);
			results.add(execution);

			String findingId = null;
			if (execution.finding() != null) {
				vulnerableCount++;
				findingId = execution.finding().id();
				FindingEntity findingEntity = FindingEntity.builder()
					.id(findingId)
					.scanId(scanId)
					.executionId(execution.executionId())
					.category(execution.finding().category())
					.importance(execution.importance() != null ? execution.importance() : Importance.HIGH)
					.riskScore(execution.finding().riskScore().score())
					.riskLevel(execution.finding().riskScore().level())
					.evidence(execution.finding().evidence())
					.recommendation(execution.finding().recommendation())
					.remediationStatus(execution.finding().remediationStatus() != null ? execution.finding().remediationStatus() : RemediationStatus.OPEN)
					.detectedAt(LocalDateTime.now())
					.build();
				findingRepository.save(findingEntity);

				slackReporter.sendFindingAlert(execution);
			} else if (execution.result() == AssessmentResult.PASS) {
				passedCount++;
			} else {
				errorCount++;
			}

			TestExecutionEntity executionEntity = TestExecutionEntity.builder()
				.id(execution.executionId())
				.scanId(scanId)
				.testCaseId(tc.id())
				.targetAgent(execution.targetAgent())
				.importance(execution.importance() != null ? execution.importance() : Importance.HIGH)
				.result(execution.result() != null ? execution.result() : AssessmentResult.PASS)
				.attackPrompt(tc.attackPrompt())
				.rawResponse(trace != null ? trace.llmResponseText() : null)
				.errorMessage(execution.errorMessage())
				.findingId(findingId)
				.executedAt(LocalDateTime.now())
				.build();
			testExecutionRepository.save(executionEntity);
		}

		scanEntity.setStatus(ScanStatus.COMPLETED);
		scanEntity.setTargetAgentName(targetAgentName);
		scanEntity.setTotalTests(results.size());
		scanEntity.setVulnerableCount(vulnerableCount);
		scanEntity.setPassedCount(passedCount);
		scanEntity.setErrorCount(errorCount);
		scanEntity.setFinishedAt(LocalDateTime.now());
		scanExecutionRepository.save(scanEntity);

		consoleReporter.printReport(scanId, targetAgentName, results);

		return results;
	}

	public List<TestExecution> getScanResult(String scanId) {
		List<TestExecutionEntity> executionEntities = testExecutionRepository.findByScanIdOrderByExecutedAtAsc(scanId);
		if (executionEntities.isEmpty()) {
			return List.of();
		}

		Map<String, FindingEntity> findingMap = findingRepository.findByScanId(scanId).stream()
			.collect(Collectors.toMap(FindingEntity::getId, f -> f));

		return executionEntities.stream().map(ee -> {
			Finding finding = null;
			if (ee.getFindingId() != null && findingMap.containsKey(ee.getFindingId())) {
				finding = findingMap.get(ee.getFindingId()).toDomain();
			}

			AgentExecutionTrace trace = AgentExecutionTrace.builder()
				.agentName(ee.getTargetAgent())
				.userPrompt(ee.getAttackPrompt())
				.llmResponseText(ee.getRawResponse())
				.build();

			return TestExecution.builder()
				.executionId(ee.getId())
				.scanId(ee.getScanId())
				.testCaseId(ee.getTestCaseId())
				.targetAgent(ee.getTargetAgent())
				.importance(ee.getImportance())
				.result(ee.getResult())
				.trace(trace)
				.finding(finding)
				.errorMessage(ee.getErrorMessage())
				.executedAt(ee.getExecutedAt().toInstant(ZoneOffset.UTC))
				.build();
		}).toList();
	}

	@Transactional
	public Finding remediateFinding(String findingId, String remediationNote) {
		FindingEntity findingEntity = findingRepository.findById(findingId)
			.orElseThrow(() -> new IllegalArgumentException("Finding not found: " + findingId));

		findingEntity.setRemediationNote(remediationNote);
		findingEntity.setRemediationStatus(RemediationStatus.IN_PROGRESS);
		FindingEntity saved = findingRepository.save(findingEntity);
		log.info("Finding [{}] remediation updated. Note: {}", findingId, remediationNote);
		return saved.toDomain();
	}

	@Transactional
	public TestExecution retestFinding(String findingId, String adapterName) {
		FindingEntity findingEntity = findingRepository.findById(findingId)
			.orElseThrow(() -> new IllegalArgumentException("Finding not found: " + findingId));

		TestExecutionEntity executionEntity = testExecutionRepository.findById(findingEntity.getExecutionId())
			.orElseThrow(() -> new IllegalArgumentException("Execution not found for finding: " + findingId));

		TestCase testCase = catalog.getTestCase(executionEntity.getTestCaseId())
			.orElseThrow(() -> new IllegalArgumentException("TestCase not found: " + executionEntity.getTestCaseId()));

		String selectedAdapter = (adapterName != null && !adapterName.isBlank()) ? adapterName : defaultAdapterName;
		AgentAdapter adapter = adapters.stream()
			.filter(a -> a.getAdapterName().equalsIgnoreCase(selectedAdapter))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Unknown AgentAdapter: " + selectedAdapter));

		log.info("Re-testing finding [{}] on TestCase [{}] with adapter '{}'",
			findingId, testCase.id(), adapter.getAdapterName());

		AgentExecutionTrace trace = adapter.executePrompt(testCase.attackPrompt());
		TestExecution retestResult = analysisEngine.analyze(executionEntity.getScanId(), testCase, trace);

		if (retestResult.result() == AssessmentResult.PASS) {
			log.info("Re-test PASSED for finding [{}]. Resolving finding.", findingId);
			findingEntity.setRemediationStatus(RemediationStatus.RESOLVED);
			findingRepository.save(findingEntity);

			executionEntity.setResult(AssessmentResult.PASS);
			executionEntity.setRawResponse(trace != null ? trace.llmResponseText() : null);
			testExecutionRepository.save(executionEntity);
		} else {
			log.info("Re-test FAILED for finding [{}]. Status remains OPEN / IN_PROGRESS.", findingId);
		}

		return retestResult;
	}

	public List<Finding> getAllFindings() {
		return findingRepository.findAll().stream()
			.map(FindingEntity::toDomain)
			.toList();
	}

	public Optional<Finding> getFinding(String findingId) {
		return findingRepository.findById(findingId)
			.map(FindingEntity::toDomain);
	}

	public List<ScanExecutionEntity> getAllScanExecutions() {
		return scanExecutionRepository.findAllByOrderByStartedAtDesc();
	}

	public Optional<ScanExecutionEntity> getScanExecution(String scanId) {
		return scanExecutionRepository.findById(scanId);
	}

	public String generateMarkdownReportForScan(String scanId) {
		List<TestExecution> executions = getScanResult(scanId);
		if (executions == null || executions.isEmpty()) {
			return null;
		}
		String agentName = executions.getFirst().targetAgent();
		java.time.LocalDateTime startedAt = scanExecutionRepository.findById(scanId)
			.map(ScanExecutionEntity::getStartedAt)
			.orElse(null);
		return markdownReporter.generateMarkdownReport(scanId, agentName, executions, startedAt);
	}

	@Transactional
	public void resetAllScanData() {
		log.info("Resetting all scan data: findings, test executions, and scan executions...");
		findingRepository.deleteAll();
		testExecutionRepository.deleteAll();
		scanExecutionRepository.deleteAll();
	}

	private AgentAdapter resolveAdapter(String name) {
		return adapters.stream()
			.filter(a -> a.getAdapterName().equalsIgnoreCase(name))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Unknown AgentAdapter: " + name));
	}

	private void checkTargetConnectivity(String targetName, String baseUrl) {
		try {
			WebClient client = webClientBuilder.baseUrl(baseUrl).build();
			client.get()
				.uri("/actuator/health")
				.retrieve()
				.toBodilessEntity()
				.timeout(Duration.ofSeconds(2))
				.block();
		} catch (WebClientResponseException e) {
			// HTTP 4xx, 5xx 등 서버 응답이 수신된 경우는 프로세스가 리스닝 중이므로 통과
			log.info("Target agent HTTP probe received response code ({}) at {}", e.getStatusCode(), baseUrl);
		} catch (Exception e) {
			Throwable cause = e;
			while (cause.getCause() != null && cause.getCause() != cause) {
				cause = cause.getCause();
			}
			String errorMsg = cause.getMessage() != null ? cause.getMessage() : e.getMessage();
			log.warn("Target agent reachability check failed for {} ({}): {}", targetName, baseUrl, errorMsg);
			throw new IllegalArgumentException(
				String.format("선택된 점검 대상(%s)에 연결할 수 없습니다. 대상 시스템 상태를 확인해 주세요.", targetName)
			);
		}
	}

	private String truncate(String text, int maxLength) {
		if (text == null || text.length() <= maxLength) {
			return text;
		}
		return text.substring(0, maxLength - 3) + "...";
	}
}
