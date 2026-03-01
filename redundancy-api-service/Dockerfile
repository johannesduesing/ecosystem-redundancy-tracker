FROM openjdk:25-ea-25-jdk-slim-bullseye
WORKDIR /app
COPY target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]