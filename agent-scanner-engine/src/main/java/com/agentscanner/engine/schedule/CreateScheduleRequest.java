package com.agentscanner.engine.schedule;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

public record CreateScheduleRequest(
	@NotBlank(message = "스케줄 명칭은 필수입니다.")
	String name,
	Long targetId,
	String dayOfWeek,
	String timeOfDay,
	String adapterName
) {
	@Builder
	public CreateScheduleRequest {}
}
