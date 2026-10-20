package com.agentscanner.target.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Target Agent 구성 속성 (프롬프트, 도구 바인딩, 타임아웃 등)
 */
@ConfigurationProperties(prefix = "agent")
public record AgentProperties(
        @DefaultValue("CustomerSupportAgent") String name,
        String systemInstruction,
        String vulnerableSystemInstruction,
        Tools tools
) {
    public AgentProperties {
        if (tools == null) {
            tools = new Tools(null, null, 3, 2000);
        }
    }

    public record Tools(
            List<String> allowedFunctions,
            List<String> allFunctions,
            @DefaultValue("3") int commandTimeoutSeconds,
            @DefaultValue("2000") int fileMaxCharacters
    ) {
        public Tools {
            if (allowedFunctions == null || allowedFunctions.isEmpty()) {
                allowedFunctions = List.of(
                        "searchProductFunction",
                        "getUserInfoFunction",
                        "sendNotificationFunction",
                        "searchKnowledgeBaseFunction"
                );
            }
            if (allFunctions == null || allFunctions.isEmpty()) {
                allFunctions = List.of(
                        "searchProductFunction",
                        "queryDatabaseFunction",
                        "getUserInfoFunction",
                        "sendNotificationFunction",
                        "readFileFunction",
                        "executeCommandFunction",
                        "searchKnowledgeBaseFunction"
                );
            }
            if (commandTimeoutSeconds <= 0) {
                commandTimeoutSeconds = 3;
            }
            if (fileMaxCharacters <= 0) {
                fileMaxCharacters = 2000;
            }
        }
    }
}
