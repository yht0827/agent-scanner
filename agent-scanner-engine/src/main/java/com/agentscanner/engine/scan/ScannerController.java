package com.agentscanner.engine.scan;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.agentscanner.common.assessment.Finding;
import com.agentscanner.common.assessment.TestExecution;
import com.agentscanner.common.catalog.TestCase;
import com.agentscanner.common.response.ApiResponse;
import com.agentscanner.engine.catalog.SecurityTestCatalog;
import com.agentscanner.engine.scan.dto.CreateTestCaseRequest;
import com.agentscanner.engine.scan.dto.RemediateFindingRequest;
import com.agentscanner.engine.scan.dto.ScanRunResponse;
import com.agentscanner.engine.scan.dto.SecurityCatalogResponse;

import lombok.RequiredArgsConstructor;

/**
 * 보안 스캐너 제어, 카탈로그 관리 및 스캔 이력 조회 REST 컨트롤러
 */
@RestController
@RequestMapping("/api/v1/scan")
@RequiredArgsConstructor
public class ScannerController {

	private final SecurityScanService scanService;
	private final SecurityTestCatalog catalog;

	@GetMapping("/catalog")
	public ApiResponse<SecurityCatalogResponse> getCatalog() {
		return ApiResponse.ok(
			SecurityCatalogResponse.of(catalog.getAllItems(), catalog.getAllTestCases())
		);
	}

	@PostMapping("/catalog/test-cases")
	public ApiResponse<TestCase> createTestCase(@RequestBody CreateTestCaseRequest request) {
		TestCase created = catalog.registerTestCase(request.toDomain());
		return ApiResponse.ok(created, "Test case created successfully");
	}

	@PatchMapping("/catalog/test-cases/{id}/toggle")
	public ApiResponse<Boolean> toggleTestCase(@PathVariable String id) {
		boolean enabled = catalog.toggleTestCase(id);
		return ApiResponse.ok(enabled, "Test case enabled status updated: " + enabled);
	}

	@PostMapping("/run")
	public ApiResponse<ScanRunResponse> runScan(
		@RequestParam(name = "adapter", required = false) String adapter,
		@RequestParam(name = "targetId", required = false) Long targetId,
		@RequestParam(name = "categories", required = false) List<String> categories) {
		List<TestExecution> executions = scanService.runScan(adapter, targetId, categories);
		String adapterLabel = targetId != null ? "target-" + targetId : (adapter != null ? adapter : "mock");
		return ApiResponse.ok(ScanRunResponse.of(adapterLabel, executions));
	}

	@GetMapping("/executions")
	public ApiResponse<List<ScanExecutionEntity>> getAllExecutions() {
		return ApiResponse.ok(scanService.getAllScanExecutions());
	}

	@GetMapping("/executions/{scanId}")
	public ApiResponse<List<TestExecution>> getExecutionResults(@PathVariable String scanId) {
		List<TestExecution> results = scanService.getScanResult(scanId);
		return ApiResponse.ok(results);
	}

	@GetMapping("/findings")
	public ApiResponse<List<Finding>> getAllFindings() {
		return ApiResponse.ok(scanService.getAllFindings());
	}

	@GetMapping("/findings/{id}")
	public ApiResponse<Finding> getFinding(@PathVariable String id) {
		return scanService.getFinding(id)
			.map(ApiResponse::ok)
			.orElseGet(() -> ApiResponse.error("Finding not found: " + id));
	}

	@PatchMapping("/findings/{id}/remediate")
	public ApiResponse<Finding> remediateFinding(
		@PathVariable String id,
		@RequestBody RemediateFindingRequest request) {
		Finding updated = scanService.remediateFinding(id, request.remediationNote());
		return ApiResponse.ok(updated, "Finding remediation note recorded successfully");
	}

	@PostMapping("/findings/{id}/re-test")
	public ApiResponse<TestExecution> retestFinding(
		@PathVariable String id,
		@RequestParam(name = "adapter", defaultValue = "mock") String adapter) {
		TestExecution retestResult = scanService.retestFinding(id, adapter);
		return ApiResponse.ok(retestResult, "Re-test executed. Result: " + retestResult.result());
	}

	@GetMapping(value = "/reports/{scanId}/markdown", produces = MediaType.TEXT_MARKDOWN_VALUE)
	public ResponseEntity<String> getMarkdownReport(@PathVariable String scanId) {
		String report = scanService.generateMarkdownReportForScan(scanId);
		if (report == null) {
			return ResponseEntity.notFound().build();
		}
		return ResponseEntity.ok(report);
	}

	@PostMapping("/reset")
	public ApiResponse<Void> resetData() {
		scanService.resetAllScanData();
		return ApiResponse.ok(null, "All scan executions, test results, and findings have been reset.");
	}
}
