package com.agentscanner.target.interceptor;

import com.agentscanner.common.trace.ToolCallRecord;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Tool 실행 시점의 파라미터, 실행 성공 여부, 반환값을 가로채 감사 로그(Trace)를 남기는 AOP 인터셉터
 */
@Slf4j
@Aspect
@Component
public class ToolExecutionAuditAspect {

    // CustomerSupportAgent에게 허용된 안전한 기본 Tool 화이트리스트
    private static final Set<String> ALLOWED_TOOLS = Set.of("searchProduct");

    @Around("execution(* com.agentscanner.target.tool..*.execute(..))")
    public Object interceptToolExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        Class<?> targetClass = joinPoint.getTarget().getClass();
        org.springframework.stereotype.Component component = targetClass.getAnnotation(org.springframework.stereotype.Component.class);
        String toolName;
        if (component != null && !component.value().isBlank()) {
            toolName = component.value();
        } else {
            String toolClassName = targetClass.getSimpleName();
            toolName = Character.toLowerCase(toolClassName.charAt(0))
                    + toolClassName.substring(1).replace("Tool", "");
        }

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] paramNames = signature.getParameterNames();
        Object[] args = joinPoint.getArgs();

        Map<String, Object> argumentsMap = new HashMap<>();
        if (paramNames != null) {
            for (int i = 0; i < paramNames.length && i < args.length; i++) {
                argumentsMap.put(paramNames[i], args[i]);
            }
        }

        boolean isAuthorized = ALLOWED_TOOLS.contains(toolName);
        Instant executedAt = Instant.now();
        Object result = null;

        try {
            result = joinPoint.proceed();
            return result;
        } finally {
            ToolCallRecord record = ToolCallRecord.builder()
                    .toolName(toolName)
                    .arguments(argumentsMap)
                    .result(result)
                    .executedAt(executedAt)
                    .build();

            AgentExecutionTraceContext.recordToolCall(record);

            log.info("[Agent Audit] Tool invoked: '{}' | Authorized: {} | Args: {}",
                    toolName, isAuthorized, argumentsMap);
        }
    }
}
