package com.agentscanner.engine.catalog;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.agentscanner.common.catalog.SecurityCheckCategory;

@Repository
public interface TestCaseRepository extends JpaRepository<TestCaseEntity, String> {

	List<TestCaseEntity> findByEnabledTrue();

	List<TestCaseEntity> findByCategoryAndEnabledTrue(SecurityCheckCategory category);
}
