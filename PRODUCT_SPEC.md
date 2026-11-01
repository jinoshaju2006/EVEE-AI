# EVEE AI — Product & Architecture Specification

Brand: EVO  
Tagline: YOUR INTELLIGENCE. WITHOUT LIMITS.  
Product: EVEE AI  
Status: Planning / staged implementation.

## 1. Experience

A mobile-first, responsive AI workspace with desktop navigation, compact mobile navigation, dark mode by default, optional light mode, accessible contrast, keyboard navigation, reduced-motion support and progressive enhancement as a PWA.

Visual direction: near-black #090B12 canvas, #111522 surfaces, electric purple/blue accents, subtle gradients, restrained glass surfaces, rounded controls and clear typography. Original brand assets only.

Primary areas: Chat, Search, Images, Projects, Agents, Plugins, Library, Settings and account profile.

Chat should support persisted conversations, user/assistant messages, streaming, cancellation, markdown, syntax-highlighted code, tables, math, copy, edit, regenerate, feedback, sharing controls and export. All controls must have real handlers or be visibly marked as unavailable.

## 2. System boundaries

Use a modular monolith initially; extract workers/services only when scaling justifies it.

- Web: Next.js App Router, React, TypeScript, Tailwind.
- API: authenticated server actions/route handlers with schema validation.
- Database: PostgreSQL with Prisma migrations.
- Authentication: Auth.js or a maintained equivalent; secure cookies and OAuth.
- Background jobs: queue-backed workers for long research, extraction and media tasks.
- Storage: private S3-compatible object storage with short-lived signed URLs.
- Observability: structured logs, error reporting, metrics and audit events.
- Deployment: Railway or Vercel plus managed PostgreSQL/object storage.

Do not put provider SDK secrets in client bundles. Never trust user IDs, roles, plugin permissions, prices or limits supplied by the browser.

## 3. Domain model (initial)

- User: identity, role, status, preferences.
- Account / Session / VerificationToken: authentication provider records.
- Conversation: ownerId, title, projectId?, createdAt, updatedAt, archivedAt.
- Message: conversationId, role, content, modelId, status, tokenUsage, timestamps.
- Attachment: ownerId, messageId?, objectKey, mimeType, size, checksum, scanStatus.
- Provider: key, displayName, enabled, serverConfigReference.
- Model: providerId, modelKey, displayName, capabilities, enabled, limits.
- Plugin: manifest, publisher, version, reviewStatus, enabled.
- PluginConnection: ownerId, pluginId, encryptedCredentialReference, grantedScopes, status.
- ToolExecution: ownerId, conversationId, pluginId, toolName, inputHash, status, approval, resultReference.
- Project: ownerId, name, instructions.
- ProjectFile: projectId, attachmentId.
- Agent: ownerId, name, instructions, modelId, toolAllowlist.
- Memory: ownerId, content, category, approvedAt, expiresAt.
- Subscription / Entitlement / UsageEvent: provider reference, plan, limits, metered usage.
- AuditEvent: actorId, action, target, metadata, timestamp.

Add foreign keys, indexes, cascade rules and ownership checks. Use database transactions for multi-record state transitions. Never store raw payment card details.

## 4. Provider abstraction

Define a server-only interface for chat completion/streaming, model listing and optional capabilities. Implement adapters independently:
- OpenAI
- Gemini
- Anthropic
- OpenAI-compatible endpoints
- Ollama

Normalize messages, tool definitions, streaming events, usage, errors and capability metadata. Maintain an allowlisted model catalogue; do not trust a model identifier from the browser. Provider secrets are environment/secret-manager values. Admin configuration stores references to secrets, not plaintext secrets returned to the UI.

Model routing may consider task intent, user-selected model, capability, availability, budget and plan entitlements. Always expose the selected model and never silently route a request to an incompatible provider.

## 5. Tool / plugin architecture

A plugin manifest declares plugin identity, version, publisher, description, icon, category, supported tools, input JSON schemas, scopes, OAuth metadata, network destinations and risk levels.

Registry lifecycle: submitted → validated → security review → approved → published → suspended/revoked.

Adapters:
- OpenAPI: generate/validate typed tool contracts from an allowlisted specification.
- MCP: connect through a server-side MCP client with explicit transport and trust policy.
- OAuth 2.0: authorization-code flow with state, PKCE where supported, exact redirect URI matching, encrypted refresh/access tokens, expiry and revocation handling.

Tool execution flow:
1. Model proposes a tool call.
2. Validate plugin status, owner connection, scopes, input schema, rate limits and allowlisted destination.
3. Apply risk policy; ask the user to approve sensitive or external side effects.
4. Execute in an isolated worker with timeout, output limits and egress controls.
5. Normalize and sanitize results; label them as untrusted tool output.
6. Record execution/audit metadata and return result to the model.
7. Handle retries idempotently where possible.

No plugin is "connected" until OAuth/service authorization succeeds and a health check confirms it. An unavailable integration must be clearly labelled. Never pretend a tool ran.

## 6. Web research

Use a licensed/authorized search API behind a provider interface. Store source URL, title, publisher, retrieval time and relevant extracted excerpts. Use safe fetch rules: block private/link-local IPs, validate redirects and content types, enforce timeouts and response limits, and defend against SSRF. Cite claims with source links. Treat webpages as untrusted prompt content and defend against prompt injection.

## 7. Files and media

Private uploads only. Enforce maximum size, extension and MIME validation, magic-byte inspection, malware scanning, per-user quotas and signed URLs. Extract in workers, not request handlers. Support PDF, DOCX, XLSX, CSV, PPTX, TXT, JSON and images through dedicated parsers. OCR is opt-in where necessary. Never evaluate macros or embedded scripts. Keep original file and extracted text access scoped to the owner/project.

Image generation, transcription and speech synthesis require real configured providers. Track job state and costs. Do not return placeholder media as a generated result.

## 8. Memory and privacy

Memory is opt-in and user-controlled. Ask before saving a proposed memory. Provide view/edit/delete/export and per-conversation controls. Define retention and deletion propagation. Do not store passwords, payment data, authentication secrets or sensitive personal data as memories. Avoid using conversation content as memory without explicit user approval.

## 9. Agents and code workspace

Agents have explicit instruction, model, knowledge scope and tool allowlist. Use bounded step counts, budgets, deadlines and cancellation. Require user approval for sensitive external effects. Isolate agents per user/project.

Code assistant may read uploaded code and authorized GitHub repositories. Any execution must occur in an ephemeral, network-restricted sandbox with CPU/memory/time limits and no production credentials. Never run untrusted code on the web/API server.

## 10. Authentication, authorization and security

- Email verification, secure password hashing through a vetted library, reset tokens with expiry and single use.
- OAuth state validation, secure cookies, session rotation and account linking safeguards.
- RBAC for user, plugin developer, moderator and admin.
- Tenant isolation in every query; verify ownership server-side.
- CSRF protection for cookie-authenticated mutations; strict CORS.
- CSP, output escaping, safe markdown rendering and sanitization.
- SQL parameterization via ORM; schema validation at all boundaries.
- Per-IP and per-user rate limits, abuse controls and quotas.
- Encryption in transit and at rest; encrypt OAuth credentials with managed keys.
- Upload scanning, SSRF protection, network egress allowlists and tool timeouts.
- Audit privileged actions and secrets access without logging secrets or full private prompts.
- Backups, restore tests, data retention and account deletion workflow.
- Security test plan: authZ/IDOR, prompt injection, SSRF, XSS, CSRF, SQLi, upload bypass, OAuth mix-up, rate-limit bypass and plugin privilege escalation.

## 11. Admin and billing

Admin pages require server-side role checks and audit logging. Manage providers/models, plugin review, users, limits, incidents and usage metrics. Never expose secret values after creation.

Plans are entitlement configurations, not hardcoded UI promises. FREE, EVEE PLUS and EVEE PRO limits must be enforced server-side. Integrate a payment provider that supports India, verify signed webhooks, handle idempotency/refunds/cancellations and never store card data. Pricing and taxes require product/legal review before launch.

## 12. Delivery and acceptance criteria

### Stage 1 — Core
- App shell, responsive chat UI, login/session, database schema.
- Real provider integration and streaming/cancel.
- Conversations/messages persisted and isolated by user.
- Tests cover authentication, authorization and core chat.

### Stage 2 — Providers and knowledge
- Provider adapters and model catalogue.
- File uploads, safe extraction, web search with citations.
- Conversation search/export and quotas.

### Stage 3 — Plugins
- Plugin registry, OpenAPI and MCP adapters.
- OAuth lifecycle, permissions and approval gate.
- Developer submission and admin review.
- Integration test against at least one real service before claiming support.

### Stage 4 — Personal workspace
- Real image, speech and transcription adapters.
- Opt-in memory controls and projects.
- Background processing and retention controls.

### Stage 5 — Agents and operations
- Agents with bounded execution and sandboxed code analysis.
- GitHub OAuth integration.
- Admin usage and audit console.
- India-compatible billing provider and webhook tests.

### Stage 6 — Production readiness
- Threat model, security review and penetration test.
- Load, accessibility, browser and mobile tests.
- Monitoring, alerting, backups and restore rehearsal.
- PWA installability, offline shell and release documentation.

A feature is complete only when its backend path, authorization, error/loading states, tests and user-facing status are implemented. Roadmap items are not advertised as live capabilities before acceptance.
