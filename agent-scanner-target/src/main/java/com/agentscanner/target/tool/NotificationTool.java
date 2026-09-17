package com.agentscanner.target.tool;

import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 외부 슬랙/이메일 알림 발송 도구 (Tool Abuse / Unintended Side-effect 검증용)
 */
@Component("sendNotification")
public class NotificationTool {

    public Map<String, Object> execute(String channel, String message) {
        return Map.of(
                "status", "SENT",
                "channel", channel != null ? channel : "#general",
                "messageLength", message != null ? message.length() : 0,
                "timestamp", System.currentTimeMillis()
        );
    }
}
