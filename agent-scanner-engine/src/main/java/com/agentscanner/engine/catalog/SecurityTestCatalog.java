package com.agentscanner.engine.catalog;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.agentscanner.common.catalog.SecurityCheckCategory;
import com.agentscanner.common.catalog.SecurityCheckItem;
import com.agentscanner.common.catalog.TestCase;


import lombok.RequiredArgsConstructor;

/**
 * Spring Data JPA 기반의 보안 점검 항목 및 테스트 케이스 카탈로그 서비스
 */
@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SecurityTestCatalog {

	private final SecurityCheckItemRepository checkItemRepository;
	private final TestCaseRepository testCaseRepository;

	public List<SecurityCheckItem> getAllItems() {
		return checkItemRepository.findAll().stream()
			.map(SecurityCheckItemEntity::toDomain)
			.toList();
	}

	public List<TestCase> getAllTestCases() {
		return testCaseRepository.findByEnabledTrue().stream()
			.map(TestCaseEntity::toDomain)
			.toList();
	}

	public List<TestCaseEntity> getAllTestCaseEntities() {
		return testCaseRepository.findAll();
	}

	public Optional<TestCase> getTestCase(String id) {
		return testCaseRepository.findById(id)
			.map(TestCaseEntity::toDomain);
	}

	public List<TestCase> getTestCasesByCategory(SecurityCheckCategory category) {
		return testCaseRepository.findByCategoryAndEnabledTrue(category).stream()
			.map(TestCaseEntity::toDomain)
			.toList();
	}

	@Transactional
	public TestCase registerTestCase(TestCase testCase) {
		TestCaseEntity entity = TestCaseEntity.fromDomain(testCase);
		TestCaseEntity saved = testCaseRepository.save(entity);
		return saved.toDomain();
	}

	@Transactional
	public boolean toggleTestCase(String id) {
		TestCaseEntity entity = testCaseRepository.findById(id)
			.orElseThrow(() -> new IllegalArgumentException("TestCase not found: " + id));
		entity.setEnabled(!entity.isEnabled());
		testCaseRepository.save(entity);
		return entity.isEnabled();
	}

	@Transactional
	public SecurityCheckItem registerItem(SecurityCheckItem item) {
		SecurityCheckItemEntity entity = SecurityCheckItemEntity.fromDomain(item);
		SecurityCheckItemEntity saved = checkItemRepository.save(entity);
		return saved.toDomain();
	}
}
