-- ==============================================================================
-- Flyway Database Migration: V3__alter_adapter_name_length.sql
-- Agent Scanner: Expand column lengths for adapter and target agent names
-- ==============================================================================

ALTER TABLE scan_executions ALTER COLUMN adapter_name TYPE VARCHAR(255);
ALTER TABLE scan_executions ALTER COLUMN target_agent_name TYPE VARCHAR(255);

ALTER TABLE test_executions ALTER COLUMN target_agent TYPE VARCHAR(255);

ALTER TABLE scan_schedules ALTER COLUMN target_name TYPE VARCHAR(255);
ALTER TABLE scan_schedules ALTER COLUMN adapter_name TYPE VARCHAR(255);
