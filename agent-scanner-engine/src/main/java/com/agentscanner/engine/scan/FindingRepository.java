package com.agentscanner.engine.scan;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FindingRepository extends JpaRepository<FindingEntity, String> {

	List<FindingEntity> findByScanId(String scanId);

	Optional<FindingEntity> findByExecutionId(String executionId);
}
