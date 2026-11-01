# EVEE AI — Developer Setup

## Run locally

1. Install Node.js 20.9+ and pnpm.
2. Open a terminal in this `EVEE-AI` directory.
3. Install dependencies:

```bash
pnpm install
```

4. Copy the environment template and add a real provider key:

```bash
cp .env.example .env
```

Set `GEMINI_API_KEY` to a key created in Google AI Studio. Optional: set `OPENAI_API_KEY` to enable the OpenAI-compatible provider selector. Keep both keys in this server-side `.env` file only. Never paste them into client-side code or commit them.

5. Start the development server:

```bash
pnpm dev
```

6. Open http://localhost:3000.

The chat API streams actual provider output. If no key is configured, the interface displays a clear configuration error instead of fabricating a response.

## Database preparation

The initial Prisma schema is at `prisma/schema.prisma`. Configure `DATABASE_URL` for a PostgreSQL database, then run:

```bash
pnpm db:generate
pnpm db:migrate
```

Database persistence and authentication are not wired into the current chat UI yet; browser-local conversation history is currently used for this first preview.

## Implemented in this milestone

- Next.js App Router + TypeScript project scaffold.
- Responsive dark glass UI and EVEE brand treatment.
- Working server-side Gemini streaming adapter.
- Optional OpenAI-compatible streaming adapter.
- Provider selector and streaming cancellation.
- Markdown/GFM response rendering and copy action.
- Local browser chat history.
- Initial PostgreSQL Prisma schema.
- PWA manifest metadata.

## Not implemented yet

- Authentication and server-backed user sessions.
- Database-backed conversation persistence.
- File uploads, web search, plugins/MCP/OAuth.
- Image generation, voice, memory, projects and agents.
- Admin, subscriptions, payment processing and production deployment.
- PWA service worker/offline support and install icons.

These are intentionally marked as future work. Do not represent them as live features until implemented and tested.
