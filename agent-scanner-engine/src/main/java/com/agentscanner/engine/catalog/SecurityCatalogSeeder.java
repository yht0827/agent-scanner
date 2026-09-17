package com.agentscanner.engine.catalog;

import java.io.InputStream;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 서버 기동 시 DB가 비어있는 경우 catalog JSON 파일로부터 KISA 인프라 및 AI Agent 통합 보안 카탈로그를 자동 시딩하는 컴포넌트
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class SecurityCatalogSeeder implements ApplicationRunner {

	private final SecurityCheckItemRepository checkItemRepository;
	private final TestCaseRepository testCaseRepository;
	private final ObjectMapper objectMapper;

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		syncCheckItems();
		syncTestCases();
	}

	private void syncCheckItems() {
		try {
			log.info("Syncing KISA Infrastructure & AI Agent Security Check Items from JSON...");
			ClassPathResource resource = new ClassPathResource("catalog/check-items.json");
			try (InputStream is = resource.getInputStream()) {
				List<SecurityCheckItemEntity> items = objectMapper.readValue(is, new TypeReference<>() {
				});
				Set<String> activeIds = items.stream().map(SecurityCheckItemEntity::getId).collect(Collectors.toSet());
				checkItemRepository.findAll().stream()
					.filter(e -> !activeIds.contains(e.getId()))
					.forEach(checkItemRepository::delete);
				checkItemRepository.saveAll(items);
				log.info("Successfully synced {} security check items from JSON (total in DB: {}).", items.size(), checkItemRepository.count());
			}
		} catch (Exception e) {
			log.error("Failed to sync security check items from catalog/check-items.json", e);
			throw new IllegalStateException("Security check items sync failed", e);
		}
	}

	private void syncTestCases() {
		try {
			log.info("Syncing KISA Infrastructure & AI Agent Security Test Cases from JSON...");
			ClassPathResource resource = new ClassPathResource("catalog/test-cases.json");
			try (InputStream is = resource.getInputStream()) {
				List<TestCaseEntity> testCases = objectMapper.readValue(is, new TypeReference<>() {
				});
				Set<String> activeIds = testCases.stream().map(TestCaseEntity::getId).collect(Collectors.toSet());
				testCaseRepository.findAll().stream()
					.filter(e -> !activeIds.contains(e.getId()))
					.forEach(testCaseRepository::delete);
				testCaseRepository.saveAll(testCases);
				log.info("Successfully synced {} test cases from JSON (total in DB: {}).", testCases.size(), testCaseRepository.count());
			}
		} catch (Exception e) {
			log.error("Failed to sync test cases from catalog/test-cases.json", e);
			throw new IllegalStateException("Test cases sync failed", e);
		}
	}
}
