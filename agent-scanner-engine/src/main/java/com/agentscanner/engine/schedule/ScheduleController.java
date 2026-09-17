package com.agentscanner.engine.schedule;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agentscanner.common.assessment.TestExecution;
import com.agentscanner.common.response.ApiResponse;
import com.agentscanner.engine.scan.dto.ScanRunResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * 정기 보안 점검 스케줄 관리 REST API 컨트롤러
 */
@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
public class ScheduleController {

	private final ScanScheduleService scheduleService;

	@GetMapping
	public ApiResponse<List<ScanScheduleEntity>> getAllSchedules() {
		return ApiResponse.ok(scheduleService.getAllSchedules());
	}

	@PostMapping
	public ApiResponse<ScanScheduleEntity> createSchedule(@Valid @RequestBody CreateScheduleRequest request) {
		ScanScheduleEntity created = scheduleService.createSchedule(request);
		return ApiResponse.ok(created, "정기 점검 스케줄이 성공적으로 등록되었습니다.");
	}

	@PatchMapping("/{id}/toggle")
	public ApiResponse<ScanScheduleEntity> toggleSchedule(@PathVariable Long id) {
		ScanScheduleEntity updated = scheduleService.toggleSchedule(id);
		return ApiResponse.ok(updated, "스케줄 활성화 상태가 변경되었습니다: " + updated.isEnabled());
	}

	@DeleteMapping("/{id}")
	public ApiResponse<Void> deleteSchedule(@PathVariable Long id) {
		scheduleService.deleteSchedule(id);
		return ApiResponse.ok(null, "스케줄이 성공적으로 삭제되었습니다.");
	}

	@PostMapping("/{id}/run-now")
	public ApiResponse<ScanRunResponse> runScheduleNow(@PathVariable Long id) {
		List<TestExecution> executions = scheduleService.runNow(id);
		return ApiResponse.ok(ScanRunResponse.of("scheduled-run-now", executions), "스케줄 점검이 즉시 실행되었습니다.");
	}
}
