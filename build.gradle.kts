import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "1.6.21"
    id("com.github.johnrengelman.shadow") version "7.1.2"
    id("com.google.cloud.tools.appengine-appyaml") version "2.4.2"
}

group = "me.emmet"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

tasks.withType<KotlinCompile> {
    kotlinOptions.jvmTarget = "17"
}

dependencies {
    implementation("io.ktor:ktor-server-core:2.0.1")
    implementation("io.ktor:ktor-server-netty:2.0.1")
}

tasks.jar {
    enabled = false
}

tasks.shadowJar {
    manifest {
        attributes("Main-Class" to "ServerKt")
    }
}

tasks.assemble {
    dependsOn(tasks.shadowJar)
}