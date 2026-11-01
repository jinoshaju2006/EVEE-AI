# EVEE AI

**Your Intelligence. Without Limits.**  
An independent, modular AI assistant platform by **EVO**.

> Status: Project bootstrap / implementation roadmap. This is a project specification, not a claim that all platform integrations are live.

## Product direction

EVEE AI is a responsive web-first assistant with a PWA installation path and future iOS compatibility. It uses original branding and a modular provider/tool architecture.

## Implementation phases

### Phase 1 — Core platform
- Next.js App Router, React, TypeScript and Tailwind.
- PostgreSQL + Prisma data model.
- Secure authentication and role-based access.
- Streaming chat, conversation persistence, message editing and regeneration.
- Server-side provider abstraction; never expose provider secrets to browsers.

### Phase 2 — Knowledge and research
- OpenAI-compatible, Gemini, Anthropic and Ollama adapters.
- File upload and extraction with per-user authorization.
- Web search provider adapter with source citations.
- Conversation export and search.

### Phase 3 — Integrations
- Plugin manifest and registry.
- OpenAPI tool adapters and MCP client integration.
- OAuth connection lifecycle, scopes and revocation.
- Explicit user approval for sensitive actions.
- Developer portal and plugin review workflow.

### Phase 4 — Personal workspace
- Image-generation provider adapter.
- Speech-to-text and text-to-speech adapters.
- User-approved memory controls.
- Projects with scoped instructions and knowledge.

### Phase 5 — Advanced platform
- Configurable AI agents and bounded tool orchestration.
- Sandboxed code-analysis workflows and GitHub integration.
- Admin dashboard and audit logs.
- Subscription entitlements and payment integration suitable for India.

### Phase 6 — Release readiness
- Security review, tenant-isolation tests and rate limits.
- Accessibility, mobile QA, observability and load testing.
- Deployment automation, backups and incident procedures.

## Technology
- Next.js + TypeScript + Tailwind CSS
- PostgreSQL + Prisma
- Auth.js (or an equivalent maintained authentication provider)
- Provider adapters behind server-only interfaces
- S3-compatible object storage
- Railway/Vercel deployment options

## Local development

Prerequisites: Node.js LTS, pnpm, PostgreSQL.

```bash
pnpm install
cp .env.example .env
# Fill required server-side secrets and DATABASE_URL.
pnpm prisma generate
pnpm prisma migrate dev
pnpm dev
```

Do not commit `.env`, OAuth credentials, API keys, database dumps, or user uploads.

## Security principles
- Enforce user ownership in every database query.
- Keep credentials server-side and encrypt persisted OAuth tokens.
- Validate inputs and file types; enforce size and rate limits.
- Treat retrieved documents and plugin output as untrusted content.
- Apply plugin scopes and approval gates before execution.
- Never execute user-supplied code on the application host.
- Log security-relevant actions without logging secrets or private prompt content.

## Current scope
This commit adds the EVEE AI project specification within the existing repository. Features must be implemented and tested in subsequent commits; the roadmap is not a claim that these features are already live.
