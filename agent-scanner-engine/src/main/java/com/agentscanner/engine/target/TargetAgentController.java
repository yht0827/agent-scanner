package com.agentscanner.engine.target;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agentscanner.common.response.ApiResponse;

import lombok.RequiredArgsConstructor;

/**
 * 점검 대상 AI 에이전트 등록 및 헬스체크 관리 컨트롤러 (nGrinder 스타일)
 */
@RestController
@RequestMapping("/api/v1/targets")
@RequiredArgsConstructor
public class TargetAgentController {

	private final TargetAgentService targetAgentService;

	@GetMapping
	public ApiResponse<List<TargetAgentDto.Response>> getAllTargets() {
		return ApiResponse.ok(targetAgentService.getAllTargets());
	}

	@GetMapping("/{id}")
	public ApiResponse<TargetAgentDto.Response> getTarget(@PathVariable Long id) {
		return ApiResponse.ok(targetAgentService.getTarget(id));
	}

	@PostMapping
	public ApiResponse<TargetAgentDto.Response> registerTarget(@RequestBody TargetAgentDto.Request request) {
		return ApiResponse.ok(targetAgentService.registerTarget(request), "Target agent registered successfully");
	}

	@PutMapping("/{id}")
	public ApiResponse<TargetAgentDto.Response> updateTarget(
			@PathVariable Long id,
			@RequestBody TargetAgentDto.Request request) {
		return ApiResponse.ok(targetAgentService.updateTarget(id, request), "Target agent updated successfully");
	}

	@DeleteMapping("/{id}")
	public ApiResponse<Void> deleteTarget(@PathVariable Long id) {
		targetAgentService.deleteTarget(id);
		return ApiResponse.ok(null, "Target agent deleted successfully");
	}

	@PostMapping("/{id}/ping")
	public ApiResponse<TargetAgentDto.Response> pingTarget(@PathVariable Long id) {
		TargetAgentDto.Response response = targetAgentService.pingTarget(id);
		return ApiResponse.ok(response, "Target agent health check finished: " + response.status());
	}
}
