package com.agentscanner.engine.scan;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ScanExecutionRepository extends JpaRepository<ScanExecutionEntity, String> {

	List<ScanExecutionEntity> findAllByOrderByStartedAtDesc();
}
