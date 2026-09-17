package com.agentscanner.engine.schedule;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ScanScheduleRepository extends JpaRepository<ScanScheduleEntity, Long> {

	List<ScanScheduleEntity> findAllByOrderByCreatedAtDesc();

	List<ScanScheduleEntity> findByEnabledTrue();
}
