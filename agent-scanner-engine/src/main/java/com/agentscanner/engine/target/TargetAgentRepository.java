package com.agentscanner.engine.target;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TargetAgentRepository extends JpaRepository<TargetAgentEntity, Long> {

	Optional<TargetAgentEntity> findByName(String name);
}
