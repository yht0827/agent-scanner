-- ==============================================================================
-- Flyway Database Migration: V2__scan_schedules.sql
-- Agent Scanner: Periodic Scheduled Scan Table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS scan_schedules
(
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    target_id       BIGINT,
    target_name     VARCHAR(100) NOT NULL DEFAULT '내장 Mock 시뮬레이터',
    adapter_name    VARCHAR(50)  NOT NULL DEFAULT 'mock',
    day_of_week     VARCHAR(20)  NOT NULL DEFAULT 'EVERYDAY', -- 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'EVERYDAY'
    time_of_day     VARCHAR(10)  NOT NULL DEFAULT '09:00',    -- 'HH:mm'
    cron_expression VARCHAR(100),
    enabled         BOOLEAN      NOT NULL DEFAULT true,
    last_run_at     TIMESTAMP,
    last_scan_id    VARCHAR(50),
    created_at      TIMESTAMP    NOT NULL,
    updated_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_schedules_enabled ON scan_schedules(enabled);
