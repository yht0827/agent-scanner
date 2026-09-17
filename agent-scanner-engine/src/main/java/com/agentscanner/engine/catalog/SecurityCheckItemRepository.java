package com.agentscanner.engine.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SecurityCheckItemRepository extends JpaRepository<SecurityCheckItemEntity, String> {
}
