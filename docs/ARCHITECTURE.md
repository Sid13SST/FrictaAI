# Fricta Architecture Overview

Fricta is a scalable, modular monorepo built for autonomous UX intelligence.

## Core Packages

- `@fricta/db`: Prisma ORM schema and client.
- `@fricta/agent`: The autonomous execution layer. Contains:
  - **BrowserManager**: Playwright lifecycle orchestration.
  - **AgentLoop**: Core LLM interaction loop.
  - **Executor**: Translates AI decisions into mechanical browser actions with failure recovery.
  - **Queue/Workers**: BullMQ system for scalable job execution.
- `@fricta/mcp`: Model Context Protocol server for dynamic structured state extraction.
- `@fricta/ux-engine`: Heuristics and analytics layer that turns raw sessions into UX reports and recommendations.
- `@fricta/shared`: Reusable utilities, constants, and the global Pino logger.

## Application Layer

- `apps/frontend`: React (Vite) + Tailwind CSS + Recharts + Clerk. Displays the dashboard and reports.
- `apps/backend`: Hono (Node Server) backend API. Handles DB access, queue scheduling, and health monitoring.

## Execution Flow

1. User submits a workflow goal via the frontend.
2. The Backend API receives the request and enqueues a `WorkflowJobData` object via BullMQ.
3. An isolated worker picks up the job and instantiates an `AgentLoop`.
4. The Agent interacts with the target page via the `Executor` while the `mcp` extracts context.
5. The `ux-engine` analyzes the session and generates a UX Report.
