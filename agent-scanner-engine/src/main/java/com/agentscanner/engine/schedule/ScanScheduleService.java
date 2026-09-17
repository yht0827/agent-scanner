package com.agentscanner.engine.schedule;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.agentscanner.common.assessment.TestExecution;
import com.agentscanner.engine.scan.SecurityScanService;
import com.agentscanner.engine.target.TargetAgentEntity;
import com.agentscanner.engine.target.TargetAgentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 정기 보안 점검 스케줄 관리 및 자동 트리거 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ScanScheduleService {

	private final ScanScheduleRepository scheduleRepository;
	private final SecurityScanService scanService;
	private final TargetAgentRepository targetAgentRepository;

	public List<ScanScheduleEntity> getAllSchedules() {
		return scheduleRepository.findAllByOrderByCreatedAtDesc();
	}

	public Optional<ScanScheduleEntity> getSchedule(Long id) {
		return scheduleRepository.findById(id);
	}

	@Transactional
	public ScanScheduleEntity createSchedule(CreateScheduleRequest request) {
		String targetName = "내장 Mock 시뮬레이터";
		String adapterName = request.adapterName() != null ? request.adapterName() : "mock";

		if (request.targetId() != null) {
			TargetAgentEntity target = targetAgentRepository.findById(request.targetId())
				.orElseThrow(() -> new IllegalArgumentException("Target agent not found: " + request.targetId()));
			targetName = target.getName();
			adapterName = target.getAdapterType().name().toLowerCase();
		}

		String dayOfWeek = (request.dayOfWeek() != null && !request.dayOfWeek().isBlank())
			? request.dayOfWeek().toUpperCase()
			: "EVERYDAY";

		String timeOfDay = (request.timeOfDay() != null && !request.timeOfDay().isBlank())
			? request.timeOfDay()
			: "09:00";

		String cronExp = buildCronExpression(dayOfWeek, timeOfDay);

		ScanScheduleEntity entity = ScanScheduleEntity.builder()
			.name(request.name())
			.targetId(request.targetId())
			.targetName(targetName)
			.adapterName(adapterName)
			.dayOfWeek(dayOfWeek)
			.timeOfDay(timeOfDay)
			.cronExpression(cronExp)
			.enabled(true)
			.createdAt(LocalDateTime.now())
			.updatedAt(LocalDateTime.now())
			.build();

		ScanScheduleEntity saved = scheduleRepository.save(entity);
		log.info("Created new scan schedule: ID={}, Name='{}', Day={}, Time={}",
			saved.getId(), saved.getName(), saved.getDayOfWeek(), saved.getTimeOfDay());
		return saved;
	}

	@Transactional
	public ScanScheduleEntity toggleSchedule(Long id) {
		ScanScheduleEntity entity = scheduleRepository.findById(id)
			.orElseThrow(() -> new IllegalArgumentException("Schedule not found: " + id));
		entity.setEnabled(!entity.isEnabled());
		ScanScheduleEntity saved = scheduleRepository.save(entity);
		log.info("Toggled scan schedule ID={} -> enabled={}", id, saved.isEnabled());
		return saved;
	}

	@Transactional
	public void deleteSchedule(Long id) {
		scheduleRepository.deleteById(id);
		log.info("Deleted scan schedule ID={}", id);
	}

	@Transactional
	public List<TestExecution> runNow(Long id) {
		ScanScheduleEntity schedule = scheduleRepository.findById(id)
			.orElseThrow(() -> new IllegalArgumentException("Schedule not found: " + id));

		log.info("Executing on-demand scan for schedule ID={}, Name='{}'", id, schedule.getName());
		return executeScanForSchedule(schedule, LocalDateTime.now());
	}

	/**
	 * 매 분 0초마다 등록된 활성 스케줄을 점검하여 정기 스캔 자동 실행
	 */
	@Scheduled(cron = "0 * * * * *")
	@Transactional
	public void checkAndRunScheduledScans() {
		LocalDateTime now = LocalDateTime.now();
		String currentDay = now.getDayOfWeek().name().substring(0, 3); // MON, TUE, etc.
		String currentTime = String.format("%02d:%02d", now.getHour(), now.getMinute());

		List<ScanScheduleEntity> activeSchedules = scheduleRepository.findByEnabledTrue();
		for (ScanScheduleEntity schedule : activeSchedules) {
			boolean dayMatches = "EVERYDAY".equalsIgnoreCase(schedule.getDayOfWeek())
				|| currentDay.equalsIgnoreCase(schedule.getDayOfWeek());
			boolean timeMatches = currentTime.equals(schedule.getTimeOfDay());

			boolean alreadyRunRecently = schedule.getLastRunAt() != null
				&& ChronoUnit.SECONDS.between(schedule.getLastRunAt(), now) < 55;

			if (dayMatches && timeMatches && !alreadyRunRecently) {
				log.info("⏰ Scheduled scan triggered! Schedule ID={}, Name='{}', CurrentTime={}",
					schedule.getId(), schedule.getName(), currentTime);
				try {
					executeScanForSchedule(schedule, now);
				} catch (Exception e) {
					log.error("Failed to execute scheduled scan for ID=" + schedule.getId(), e);
				}
			}
		}
	}

	private List<TestExecution> executeScanForSchedule(ScanScheduleEntity schedule, LocalDateTime runTime) {
		List<TestExecution> executions = scanService.runScan(schedule.getAdapterName(), schedule.getTargetId());
		String scanId = (executions != null && !executions.isEmpty()) ? executions.get(0).scanId() : null;

		schedule.setLastRunAt(runTime);
		schedule.setLastScanId(scanId);
		scheduleRepository.save(schedule);

		log.info("Scan schedule ID={} completed. ScanId={}", schedule.getId(), scanId);
		return executions;
	}

	private String buildCronExpression(String dayOfWeek, String timeOfDay) {
		try {
			String[] parts = timeOfDay.split(":");
			int hour = Integer.parseInt(parts[0]);
			int minute = Integer.parseInt(parts[1]);
			String dayField = "EVERYDAY".equalsIgnoreCase(dayOfWeek) ? "*" : dayOfWeek;
			return String.format("0 %d %d ? * %s", minute, hour, dayField);
		} catch (Exception e) {
			return "0 0 9 ? * MON";
		}
	}
}
