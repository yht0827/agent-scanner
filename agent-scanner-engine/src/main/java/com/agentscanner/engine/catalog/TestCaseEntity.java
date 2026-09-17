package com.agentscanner.engine.catalog;

import java.time.LocalDateTime;
import java.util.List;

import com.agentscanner.common.catalog.Importance;
import com.agentscanner.common.catalog.SecurityCheckCategory;
import com.agentscanner.common.catalog.SecurityDomain;
import com.agentscanner.common.catalog.TestCase;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "test_cases")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class TestCaseEntity {

	@Id
	@Column(name = "id", length = 50)
	private String id; // 예: TEST-LINUX-001, TEST-AI-001

	@Column(name = "check_item_id", nullable = false, length = 50)
	private String checkItemId;

	@Enumerated(EnumType.STRING)
	@Column(name = "domain", nullable = false, length = 30)
	@Builder.Default
	private SecurityDomain domain = SecurityDomain.AI_AGENT;

	@Enumerated(EnumType.STRING)
	@Column(name = "category", nullable = false, length = 50)
	private SecurityCheckCategory category;

	@Column(name = "name", nullable = false, length = 150)
	private String name;

	@Column(name = "description", length = 1000)
	private String description;

	@Enumerated(EnumType.STRING)
	@Column(name = "importance", nullable = false, length = 20)
	@Builder.Default
	private Importance importance = Importance.HIGH;

	@Column(name = "attack_prompt", nullable = false, columnDefinition = "TEXT")
	private String attackPrompt;

	@Column(name = "expected_safe_behavior", columnDefinition = "TEXT")
	private String expectedSafeBehavior;

	@Convert(converter = StringListConverter.class)
	@Column(name = "forbidden_tools", columnDefinition = "TEXT")
	@Builder.Default
	private List<String> forbiddenTools = List.of();

	@Convert(converter = StringListConverter.class)
	@Column(name = "forbidden_output_patterns", columnDefinition = "TEXT")
	@Builder.Default
	private List<String> forbiddenOutputPatterns = List.of();

	@Column(name = "enabled", nullable = false)
	@Builder.Default
	private boolean enabled = true;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

	@PrePersist
	public void prePersist() {
		LocalDateTime now = LocalDateTime.now();
		if (createdAt == null) {
			createdAt = now;
		}
		if (updatedAt == null) {
			updatedAt = now;
		}
		if (domain == null && category != null) {
			domain = category.getDomain();
		}
		if (importance == null) {
			importance = Importance.HIGH;
		}
	}

	@PreUpdate
	public void preUpdate() {
		updatedAt = LocalDateTime.now();
	}

	public TestCase toDomain() {
		return TestCase.builder()
			.id(id)
			.checkItemId(checkItemId)
			.domain(domain)
			.category(category)
			.name(name)
			.description(description)
			.importance(importance)
			.attackPrompt(attackPrompt)
			.expectedSafeBehavior(expectedSafeBehavior)
			.forbiddenTools(forbiddenTools)
			.forbiddenOutputPatterns(forbiddenOutputPatterns)
			.build();
	}

	public static TestCaseEntity fromDomain(TestCase tc) {
		return TestCaseEntity.builder()
			.id(tc.id())
			.checkItemId(tc.checkItemId())
			.domain(tc.domain() != null ? tc.domain() : tc.category().getDomain())
			.category(tc.category())
			.name(tc.name())
			.description(tc.description())
			.importance(tc.importance() != null ? tc.importance() : Importance.HIGH)
			.attackPrompt(tc.attackPrompt())
			.expectedSafeBehavior(tc.expectedSafeBehavior())
			.forbiddenTools(tc.forbiddenTools())
			.forbiddenOutputPatterns(tc.forbiddenOutputPatterns())
			.enabled(true)
			.build();
	}
}
