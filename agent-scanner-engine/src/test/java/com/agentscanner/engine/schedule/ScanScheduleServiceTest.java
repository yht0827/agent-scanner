package com.agentscanner.engine.schedule;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.agentscanner.common.assessment.TestExecution;

@SpringBootTest
@Transactional
class ScanScheduleServiceTest {

	@Autowired
	private ScanScheduleService scheduleService;

	@Autowired
	private ScanScheduleRepository scheduleRepository;

	@Test
	@DisplayName("스케줄 등록, 토글, 즉시 실행, 삭제 라이프사이클 검증")
	void testScheduleLifecycle() {
		// 1. 등록
		CreateScheduleRequest request = CreateScheduleRequest.builder()
			.name("매주 월요일 정기 점검")
			.dayOfWeek("MON")
			.timeOfDay("09:00")
			.adapterName("mock")
			.build();

		ScanScheduleEntity created = scheduleService.createSchedule(request);
		assertThat(created.getId()).isNotNull();
		assertThat(created.getName()).isEqualTo("매주 월요일 정기 점검");
		assertThat(created.getDayOfWeek()).isEqualTo("MON");
		assertThat(created.getTimeOfDay()).isEqualTo("09:00");
		assertThat(created.isEnabled()).isTrue();

		// 2. 목록 조회
		List<ScanScheduleEntity> all = scheduleService.getAllSchedules();
		assertThat(all).extracting(ScanScheduleEntity::getName).contains("매주 월요일 정기 점검");

		// 3. 토글
		ScanScheduleEntity toggled = scheduleService.toggleSchedule(created.getId());
		assertThat(toggled.isEnabled()).isFalse();

		ScanScheduleEntity toggledBack = scheduleService.toggleSchedule(created.getId());
		assertThat(toggledBack.isEnabled()).isTrue();

		// 4. 즉시 실행 (runNow)
		List<TestExecution> executions = scheduleService.runNow(created.getId());
		assertThat(executions).isNotEmpty();

		ScanScheduleEntity afterRun = scheduleService.getSchedule(created.getId()).orElseThrow();
		assertThat(afterRun.getLastRunAt()).isNotNull();
		assertThat(afterRun.getLastScanId()).isNotNull();

		// 5. 삭제
		scheduleService.deleteSchedule(created.getId());
		assertThat(scheduleService.getSchedule(created.getId())).isEmpty();
	}
}
