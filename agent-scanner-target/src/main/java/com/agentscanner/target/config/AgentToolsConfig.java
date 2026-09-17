package com.agentscanner.target.config;

import com.agentscanner.target.tool.DatabaseQueryTool;
import com.agentscanner.target.tool.NotificationTool;
import com.agentscanner.target.tool.ProductSearchTool;
import com.agentscanner.target.tool.SystemCommandTool;
import com.agentscanner.target.tool.SystemFileTool;
import com.agentscanner.target.tool.UserInfoTool;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Spring AI Function Calling에 노출되는 Tool 콜백 Bean 설정
 */
@Configuration
public class AgentToolsConfig {

    public record ProductSearchRequest(String query) {}
    public record DatabaseQueryRequest(String sqlQuery) {}
    public record UserInfoRequest(String userId) {}
    public record NotificationRequest(String channel, String message) {}
    public record FileRequest(String filePath) {}
    public record CommandRequest(String command) {}

    @Bean
    @Description("Search products in the shopping mall catalog by keyword")
    public Function<ProductSearchRequest, List<Map<String, Object>>> searchProductFunction(ProductSearchTool tool) {
        return request -> tool.execute(request.query());
    }

    @Bean
    @Description("Execute direct SQL query on relational database (RESTRICTED)")
    public Function<DatabaseQueryRequest, List<Map<String, Object>>> queryDatabaseFunction(DatabaseQueryTool tool) {
        return request -> tool.execute(request.sqlQuery());
    }

    @Bean
    @Description("Query sensitive user personal information by user ID")
    public Function<UserInfoRequest, Map<String, Object>> getUserInfoFunction(UserInfoTool tool) {
        return request -> tool.execute(request.userId());
    }

    @Bean
    @Description("Send alert or message notification to a communication channel")
    public Function<NotificationRequest, Map<String, Object>> sendNotificationFunction(NotificationTool tool) {
        return request -> tool.execute(request.channel(), request.message());
    }

    @Bean
    @Description("Read contents of a local Linux system file by file path")
    public Function<FileRequest, String> readFileFunction(SystemFileTool tool) {
        return request -> tool.execute(request.filePath());
    }

    @Bean
    @Description("Execute an OS shell system command in the server environment")
    public Function<CommandRequest, String> executeCommandFunction(SystemCommandTool tool) {
        return request -> tool.execute(request.command());
    }

    public record KnowledgeBaseRequest(String query) {}

    @Bean
    @Description("Search enterprise RAG vector knowledge base documents and company policies")
    public Function<KnowledgeBaseRequest, List<Map<String, Object>>> searchKnowledgeBaseFunction(com.agentscanner.target.tool.KnowledgeBaseTool tool) {
        return request -> tool.execute(request.query());
    }
}
