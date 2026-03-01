# Maven Central Ecosystem Redundancy Tracker

I saw that component releases on Maven Central often contain a lot of redundancy - there are even releases that are binary identical to previous ones entirely. To help developers understand *how much* of a release actually changed compared to its previous one, this repo contains a distributed app to analyze and track binary class redundancy across the Maven Central ecosystem. It hosts a frontend that lets you explore how classes evolve, appear, and disappear between component releases, and discover the most widespread "copy-paste" or "shaded" redundancies in your dependencies.

## Core Features

- **Component Analysis**: Search and index any Maven component by `groupId:artifactId`.
- **Release Diffing**: Compare consecutive releases to see exactly which classes were **Added**, **Removed**, or **Modified**.
- **Widespread Redundancy**: A global leaderboard of the most frequently occurring class files across all indexed artifacts.
- **Class Investigation**: For a given class, see every single component and version it is bundled in.
- **Real-time Processing**: Distributed analysis using RabbitMQ to handle deep indexing of JAR files in the background.

## Technology Stack

- **Backend**: Java 25, Spring Boot
- **Frontend**: React, Vite, Tailwind CSS, TanStack Query, Lucide React

## Prerequisites

- **Docker Compose**
- **Java 25 JDK** (for local development)
- **Maven 3.9+** (or use the provided `./mvnw`)

## Getting Started

### 1. Build the Backend
Before starting the containers, you need to package the Java modules so the Docker images can pick up the latest JARs:

```shell
./mvnw clean package -DskipTests
```

### 2. Launch the Ecosystem
Use Docker Compose to spin up the entire stack (Database, RabbitMQ, Analyzer, Producer, API, and Frontend):

```bash
docker-compose up --build -d
```

### 3. Access the Application
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **API Documentation**: [http://localhost:8080/api/v1/components](http://localhost:8080/api/v1/components) (JSON)

## Project Structure

- `/common`: Shared JPA entities and messaging DTOs
- `/maven-central-releases-producer`: Service discovers all releases for a given component
- `/maven-central-redundancy-analyzer`: Service that indexes JARs and calculates SHA-512 hashes for every class
- `/redundancy-api-service`: The REST gateway for the frontend
- `/frontend`: The React frontend to explore the data

