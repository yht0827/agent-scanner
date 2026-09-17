package com.agentscanner.engine.target;

import java.time.LocalDateTime;

public class TargetAgentDto {

	public record Request(
		String name,
		String baseUrl,
		String description,
		AdapterType adapterType
	) {}

	public record Response(
		Long id,
		String name,
		String baseUrl,
		String description,
		AdapterType adapterType,
		TargetStatus status,
		LocalDateTime lastHealthCheckAt,
		LocalDateTime createdAt
	) {
		public static Response from(TargetAgentEntity entity) {
			return new Response(
				entity.getId(),
				entity.getName(),
				entity.getBaseUrl(),
				entity.getDescription(),
				entity.getAdapterType(),
				entity.getStatus(),
				entity.getLastHealthCheckAt(),
				entity.getCreatedAt()
			);
		}
	}
}
