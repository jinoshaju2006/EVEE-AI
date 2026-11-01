# EVEE AI V2 — Developer Notes

## Run locally

Requirements: Node.js 20.9+ and pnpm.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Configure `GEMINI_API_KEY` in the server-side `.env` file before sending text or image requests. Optionally configure `OPENAI_API_KEY`, `OPENAI_BASE_URL` and `OPENAI_MODEL` to enable the OpenAI-compatible option. Image generation uses `GEMINI_IMAGE_MODEL`. The selected model must be enabled for your Google AI account/API key.

Never use `NEXT_PUBLIC_*` for provider credentials. Do not commit `.env`, API keys, private database credentials or signing keys.

## Current live routes

- `POST /api/chat`: provider-backed streaming chat for Gemini or OpenAI-compatible APIs.
- `POST /api/images`: Gemini image-generation request. The handler validates inline image data and returns an error if no supported image is included.

A lightweight in-memory request limit is present. It is not a replacement for a shared Redis-backed limiter in multi-instance deployments. Current chat history is browser-local and is not authenticated, database-backed or synchronized.

## Production environment

Set the server variables in Vercel Project Settings → Environment Variables, redeploy, and verify both text and image routes using a valid key. For PostgreSQL work, configure `DATABASE_URL`; the Prisma schema is not yet wired to the UI.

## Android APK

Run **Actions → Build EVEE AI APK → Run workflow**. Download the `EVEE-AI-Android-APK` artifact from the completed workflow run. This is a debug APK; a Play Store build needs a private signing configuration stored as GitHub Actions secrets.

## Not yet implemented

- Authentication / Google sign-in
- Database-backed conversation history and user sync
- File uploads to AI, PDF/DOCX extraction and image understanding
- Settings, conversation rename/delete/search/edit/regenerate
- Web search, voice, plugins and project workspace
- Production Redis rate limits, monitoring, security review and Android device QA

Only claim a capability as production-ready after its implementation and tests are complete.
