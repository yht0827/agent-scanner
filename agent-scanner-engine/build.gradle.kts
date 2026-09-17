plugins {
    id("org.springframework.boot")
    id("io.spring.dependency-management")
}

dependencies {
    implementation(project(":agent-scanner-common"))

    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")

    runtimeOnly("org.postgresql:postgresql")

    // macOS 네이티브 DNS Resolver (Apple Silicon aarch64 및 Intel x86_64 호환)
    runtimeOnly("io.netty:netty-resolver-dns-native-macos:4.1.114.Final:osx-aarch_64")
    runtimeOnly("io.netty:netty-resolver-dns-native-macos:4.1.114.Final:osx-x86_64")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
