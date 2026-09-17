package com.agentscanner.engine.catalog;

import java.time.LocalDateTime;

import com.agentscanner.common.catalog.Importance;
import com.agentscanner.common.catalog.SecurityCheckCategory;
import com.agentscanner.common.catalog.SecurityCheckItem;
import com.agentscanner.common.catalog.SecurityDomain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "security_check_items")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class SecurityCheckItemEntity {

	@Id
	@Column(name = "id", length = 50)
	private String id; // 예: SEC-LINUX-01, SEC-PI-01

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

	@Column(name = "kisa_code", length = 50)
	private String kisaCode;

	@Column(name = "owasp_code", length = 100)
	private String owaspCode;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@PrePersist
	public void prePersist() {
		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
		if (domain == null && category != null) {
			domain = category.getDomain();
		}
		if (importance == null) {
			importance = Importance.HIGH;
		}
	}

	public SecurityCheckItem toDomain() {
		return SecurityCheckItem.builder()
			.id(id)
			.domain(domain)
			.category(category)
			.name(name)
			.description(description)
			.importance(importance)
			.kisaCode(kisaCode)
			.owaspCode(owaspCode)
			.build();
	}

	public static SecurityCheckItemEntity fromDomain(SecurityCheckItem item) {
		return SecurityCheckItemEntity.builder()
			.id(item.id())
			.domain(item.domain() != null ? item.domain() : item.category().getDomain())
			.category(item.category())
			.name(item.name())
			.description(item.description())
			.importance(item.importance() != null ? item.importance() : Importance.HIGH)
			.kisaCode(item.kisaCode())
			.owaspCode(item.owaspCode())
			.build();
	}
}
