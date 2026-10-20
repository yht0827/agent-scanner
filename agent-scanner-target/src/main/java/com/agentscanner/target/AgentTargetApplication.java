package com.agentscanner.target;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableAspectJAutoProxy
public class AgentTargetApplication {

    public static void main(String[] args) {
        SpringApplication.run(AgentTargetApplication.class, args);
    }
}
