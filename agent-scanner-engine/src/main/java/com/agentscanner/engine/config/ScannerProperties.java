package com.agentscanner.engine.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Scanner Engine 핵심 구성 속성 (타깃 통신, 타임아웃, 리포팅 등)
 */
@ConfigurationProperties(prefix = "scanner")
public record ScannerProperties(
        @DefaultValue("http://localhost:8081") String targetBaseUrl,
        @DefaultValue("mock") String defaultAdapter,
        @DefaultValue("true") boolean falsePositiveFilterEnabled,
        @DefaultValue("false") boolean consoleReportEnabled,
        @DefaultValue("") String slackWebhookUrl,
        Http http
) {
    public ScannerProperties {
        if (http == null) {
            http = new Http(
                    "/api/v1/agent/chat",
                    "/api/v1/agent/audit/{sessionId}",
                    "/actuator/health",
                    "/",
                    Duration.ofSeconds(60),
                    Duration.ofSeconds(15),
                    Duration.ofSeconds(2)
            );
        }
    }

    public record Http(
            String chatEndpoint,
            String auditEndpoint,
            String healthEndpoint,
            String fallbackProbeEndpoint,
            Duration chatTimeout,
            Duration auditTimeout,
            Duration healthCheckTimeout
    ) {
        public Http {
            if (chatEndpoint == null || chatEndpoint.isBlank()) chatEndpoint = "/api/v1/agent/chat";
            if (auditEndpoint == null || auditEndpoint.isBlank()) auditEndpoint = "/api/v1/agent/audit/{sessionId}";
            if (healthEndpoint == null || healthEndpoint.isBlank()) healthEndpoint = "/actuator/health";
            if (fallbackProbeEndpoint == null || fallbackProbeEndpoint.isBlank()) fallbackProbeEndpoint = "/";
            if (chatTimeout == null) chatTimeout = Duration.ofSeconds(60);
            if (auditTimeout == null) auditTimeout = Duration.ofSeconds(15);
            if (healthCheckTimeout == null) healthCheckTimeout = Duration.ofSeconds(2);
        }
    }
}
