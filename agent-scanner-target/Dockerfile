# Eclipse Temurin Linux JRE 21 (Alpine Linux 샌드박스)
FROM eclipse-temurin:21-jre-alpine

LABEL maintainer="Agent Scanner Team"
LABEL description="Agent Scanner Isolated Linux Target Container"

WORKDIR /app

# 컨테이너 내 안전한 비루트 서비스 사용자 생성
RUN addgroup -S agentgroup && adduser -S agentuser -G agentgroup

# 빌드된 타겟 JAR 파일 복사
ARG JAR_FILE=build/libs/agent-scanner-target-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar

# 타겟 포트 8081 노출
EXPOSE 8081

# 환경 변수 기본값 설정
ENV SERVER_PORT=8081 \
    SPRING_PROFILES_ACTIVE=default \
    OPENAI_API_KEY="mock-offline-key"

USER agentuser

# 타겟 애플리케이션 기동
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
