# AGENTS.md

## Project Overview

This is a **distributed system that tracks binary class redundancy across Maven Central**. It indexes JAR files, hashes every cotained file (class files and resources) file with SHA-512, and lets users explore how classes appear, disappear, and get duplicated across the Java ecosystem.

## High-Level Architecture

```
React Frontend (5173)
       │
       ▼
REST API Service (8080)  ──→  PostgreSQL 16  ←──  RabbitMQ
       │
       ├──→ Releases Producer (8082)     [discovers versions from Maven Central]
       └──→ Redundancy Analyzer (8081)   [downloads JARs, hashes files]
```

## Module Breakdown

| Module | Port | Role |
|---|---|---|
| `redundancy-api-service` | 8080 | REST API for the frontend. Handles search, diffs, stats. Triggers analysis via RabbitMQ. |
| `maven-central-releases-producer` | 8082 | Listens for component requests, fetches version lists from Maven Central, queues per-release analysis tasks. |
| `maven-central-redundancy-analyzer` | 8081 | Downloads JARs, extracts entries, computes SHA-512 hashes, bulk-inserts into PostgreSQL. |
| `common` | — | Shared JPA entities (`Component`, `Release`, `ProjectFile`), DTOs, and RabbitMQ message classes. |
| `frontend` | 5173 | React SPA (Vite + Tailwind) for exploring redundancy data. |

## Tech Stack

- **Backend**: Java 25, Spring Boot 4.0, Spring Data JPA (Hibernate)
- **Frontend**: React 18, Vite 4, Tailwind CSS 3, TanStack Query 5, Framer Motion
- **Database**: PostgreSQL 16
- **Message Queue**: RabbitMQ 3
- **Build**: Maven 3.9+ (multi-module, with wrapper)
- **Containerization**: Docker Compose
- **CI**: GitHub Actions (Maven build on push/PR to main/develop)
- **Testing**: JUnit 5, AssertJ

## Key Design Decisions

- **Lazy/on-demand indexing** — components are only analyzed when a user first requests them. The API returns HTTP 202 while workers process in the background.
- **RabbitMQ decoupling** — the API never calls workers directly; it only publishes messages. Workers scale independently.
- **Bulk DB operations** — the analyzer uses PostgreSQL `unnest()` for batch find-or-create, avoiding N+1 queries on JARs with hundreds of files.
- **SHA-512 content identity** — files are uniquely identified by `(fqn, sha512)`, enabling cross-component duplicate detection.
- **Semver-compliant sorting** — full semver.org spec implementation for version ordering (`VersionUtils`).
- **Database size guard** — workers check PostgreSQL size against a 25 GB limit before processing.
- **Shared database** — all three microservices share the same PostgreSQL instance. API uses `ddl-auto=update`; workers use `ddl-auto=none`.

## Data Flow

1. User searches for a component on the frontend (e.g., `org.apache.commons:commons-lang3`)
2. API service checks DB. If not found, creates a PENDING `Component` record and sends a `ComponentAnalysisRequest` to RabbitMQ
3. Producer receives the message, fetches all versions from Maven Central's `maven-metadata.xml`, creates `Release` records, and sends `ReleaseAnalysisRequest` messages for each
4. Analyzer receives release messages, downloads the JAR, extracts all files, computes SHA-512 hashes, and bulk-inserts/updates `ProjectFile` records
5. Frontend polls the API (with `refetchInterval`) until status becomes READY, then displays the data
6. Diff calculation happens on-the-fly in `RedundancyService.getReleaseDiff()` by comparing file sets (by FQN + SHA-512) between two releases

## Port Assignments

| Service | Port |
|---|---|
| API Service | 8080 |
| Analyzer | 8081 |
| Producer | 8082 |
| Frontend (Vite dev) | 5173 |
| RabbitMQ | 5672 (AMQP), 15672 (management) |
| PostgreSQL | 5432 |

## Frontend Mock Mode (MSW)

The frontend runs standalone without backend/DB/RabbitMQ via Mock Service Worker:

```shell
cd frontend
npm run dev:mock   # vite --mode mock -> http://localhost:5173, no backend needed
```

- `npm run dev:mock` loads `frontend/.env.mock` (`VITE_USE_MOCKS=true`). Plain `npm run dev` and `docker-compose` are unaffected (mocks off). `.env.mock` is intentionally tracked — it holds no secrets and `dev:mock` breaks without it.
- `src/main.jsx` starts the worker only when `VITE_USE_MOCKS==='true'`; `src/api.js` reads the base URL from `VITE_API_URL` (fallback `http://localhost:8080/api/v1`).
- Handlers in `src/mocks/handlers.js` (MSW v2 — v3 requires Vite ≥6) cover every `src/api.js` call with Spring-`Page`-shaped payloads. `public/mockServiceWorker.js` (from `msw init`) must be committed.
- Fixtures in `src/mocks/data.js` center on `org.apache.commons:commons-lang3` (3.12.0–3.14.0): per-release diffs for `codeOnly` true/false incl. non-code files (`META-INF/*`, pom files), an explicit-baseline cumulative diff, and a generated 148-file baseline for 3.12.0. Diff entry counts/byte sums must match the `mockHistory` points — keep them in sync when editing.

## Key Design Decisions (Frontend)

- **Tolerant FQN lookup** — JAR entries are stored slash-separated (`org/apache/.../Foo.class`) but users search dot notation, often without `.class`. `RedundancyService.findByFqnTolerant()` tries exact match first, then normalized candidates; the MSW `/files/revisions` handler mirrors this via `findRevisions()`. `formatFqn()` in `App.jsx` normalizes slashes for display.
- **Lifetime overview UX** — the chart is a toggleable (`showHistory`), animated expand/collapse section outside the header, backed by a `useQuery(['history', groupId, artifactId, codeOnly])` with `keepPreviousData`, so switching Code Only / All Files cross-fades instead of unmounting.

## Package Structure

Base package: `de.jd.ecosystems`

- `de.jd.ecosystems.model` — JPA entities
- `de.jd.ecosystems.dto` — Data transfer objects
- `de.jd.ecosystems.messages` — RabbitMQ message classes
- `de.jd.ecosystems.util` — Utilities (e.g., `DatabaseSizeGuard`)
