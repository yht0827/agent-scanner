package com.agentscanner.engine.target;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.agentscanner.engine.config.ScannerProperties;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * nGrinder 스타일 점검 대상 에이전트 등록, 관리 및 헬스체크 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TargetAgentService {

	public static final String MOCK_INTERNAL_URL = "mock://internal";

	private final TargetAgentRepository targetAgentRepository;
	private final WebClient.Builder webClientBuilder;
	private final ScannerProperties scannerProperties;

	public List<TargetAgentDto.Response> getAllTargets() {
		return targetAgentRepository.findAll().stream()
			.map(TargetAgentDto.Response::from)
			.toList();
	}

	public TargetAgentDto.Response getTarget(Long id) {
		TargetAgentEntity entity = targetAgentRepository.findById(id)
			.orElseThrow(() -> new IllegalArgumentException("점검 대상 정보를 찾을 수 없습니다."));
		return TargetAgentDto.Response.from(entity);
	}

	@Transactional
	public TargetAgentDto.Response registerTarget(TargetAgentDto.Request request) {
		String baseUrl = request.baseUrl();
		if (request.adapterType() == AdapterType.MOCK && (baseUrl == null || baseUrl.isBlank())) {
			baseUrl = MOCK_INTERNAL_URL;
		}
		TargetAgentEntity entity = TargetAgentEntity.builder()
			.name(request.name())
			.baseUrl(baseUrl != null && !baseUrl.isBlank() ? baseUrl : MOCK_INTERNAL_URL)
			.description(request.description())
			.adapterType(request.adapterType() != null ? request.adapterType() : AdapterType.HTTP)
			.status(TargetStatus.UNKNOWN)
			.build();

		TargetAgentEntity saved = targetAgentRepository.save(entity);
		log.info("Registered new target agent: [{}] {}", saved.getId(), saved.getName());
		return TargetAgentDto.Response.from(saved);
	}

	@Transactional
	public void deleteTarget(Long id) {
		if (!targetAgentRepository.existsById(id)) {
			throw new IllegalArgumentException("점검 대상 정보를 찾을 수 없습니다.");
		}
		targetAgentRepository.deleteById(id);
		log.info("Deleted target agent: {}", id);
	}

	@Transactional
	public TargetAgentDto.Response updateTarget(Long id, TargetAgentDto.Request request) {
		TargetAgentEntity entity = targetAgentRepository.findById(id)
			.orElseThrow(() -> new IllegalArgumentException("점검 대상 정보를 찾을 수 없습니다: " + id));

		String baseUrl = request.baseUrl();
		AdapterType adapterType = request.adapterType() != null ? request.adapterType() : entity.getAdapterType();
		if (adapterType == AdapterType.MOCK && (baseUrl == null || baseUrl.isBlank())) {
			baseUrl = MOCK_INTERNAL_URL;
		}

		if (request.name() != null && !request.name().isBlank()) {
			entity.setName(request.name().trim());
		}
		if (baseUrl != null && !baseUrl.isBlank()) {
			if (!baseUrl.trim().equals(entity.getBaseUrl())) {
				entity.setStatus(TargetStatus.UNKNOWN);
				entity.setLastHealthCheckAt(null);
			}
			entity.setBaseUrl(baseUrl.trim());
		}
		if (request.description() != null) {
			entity.setDescription(request.description().trim());
		}
		entity.setAdapterType(adapterType);

		TargetAgentEntity updated = targetAgentRepository.save(entity);
		log.info("Updated target agent: [{}] {}", updated.getId(), updated.getName());
		return TargetAgentDto.Response.from(updated);
	}

	@Transactional
	public TargetAgentDto.Response pingTarget(Long id) {
		TargetAgentEntity entity = targetAgentRepository.findById(id)
			.orElseThrow(() -> new IllegalArgumentException("Target agent not found with id: " + id));

		TargetStatus newStatus = TargetStatus.OFFLINE;
		if (entity.getAdapterType() == AdapterType.MOCK) {
			newStatus = TargetStatus.ONLINE;
		} else {
			newStatus = checkConnectivity(entity.getBaseUrl());
		}

		entity.setStatus(newStatus);
		entity.setLastHealthCheckAt(LocalDateTime.now());
		TargetAgentEntity updated = targetAgentRepository.save(entity);

		return TargetAgentDto.Response.from(updated);
	}

	private TargetStatus checkConnectivity(String baseUrl) {
		if (baseUrl == null || baseUrl.isBlank()) {
			return TargetStatus.OFFLINE;
		}
		try {
			WebClient client = webClientBuilder.baseUrl(baseUrl).build();
			Duration timeout = scannerProperties.http().healthCheckTimeout();
			// 1차: /actuator/health 엔드포인트 프로브 (Spring Boot)
			try {
				client.get()
					.uri(scannerProperties.http().healthEndpoint())
					.retrieve()
					.toBodilessEntity()
					.timeout(timeout)
					.block();
				return TargetStatus.ONLINE;
			} catch (WebClientResponseException e) {
				// HTTP 응답이 수신된 경우는 서버가 리스닝 중이므로 온라인 판정
				return TargetStatus.ONLINE;
			} catch (Exception e) {
				log.debug("Actuator health check failed for {}, trying root path: {}", baseUrl, e.getMessage());
			}

			// 2차: 루트(/) 경로 범용 프로브 (FastAPI, Flask, Express, Go 등)
			try {
				client.get()
					.uri(scannerProperties.http().fallbackProbeEndpoint())
					.retrieve()
					.toBodilessEntity()
					.timeout(timeout)
					.block();
				return TargetStatus.ONLINE;
			} catch (WebClientResponseException e) {
				// 4xx, 5xx 응답이어도 웹 서버 프로세스가 동작 중이므로 포트 연결 정상 판정
				return TargetStatus.ONLINE;
			} catch (Exception e) {
				log.warn("Target connectivity check failed for {}: {}", baseUrl, e.getMessage());
				return TargetStatus.OFFLINE;
			}
		} catch (Exception e) {
			log.warn("Invalid target URL {}: {}", baseUrl, e.getMessage());
			return TargetStatus.OFFLINE;
		}
	}
}
