# EVEE AI V2

**YOUR INTELLIGENCE. WITHOUT LIMITS.**  
Created by **EVO** · Android package: `ai.evee.app`

EVEE AI is a web-first assistant with a Kotlin Android WebView shell. This repository is under staged implementation: the text chat provider endpoints and image-generation endpoint are implemented, but database-backed auth/history, file understanding and many platform features remain planned. Do not treat roadmap items as shipped capabilities.

## Current implementation status

| Area | Current status |
| --- | --- |
| Web UI | Responsive dark EVEE chat UI |
| AI text | Server-side Gemini and OpenAI-compatible streaming routes |
| Image generation | Gemini image route with inline image payload validation; requires a model enabled for your API key |
| Conversation history | Browser-local storage only; not synced across devices |
| Authentication | Not implemented |
| PostgreSQL / Prisma | Initial schema exists; not yet wired into chat routes |
| File understanding | Not implemented |
| Android | Kotlin WebView app shell targeting the production web app |
| APK CI | GitHub Actions workflow builds and uploads a debug APK artifact |

## Configure the live AI services

Create a local `.env` from `.env.example` and set server-side credentials:

```env
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image

# Optional OpenAI-compatible service
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Planned database milestone
DATABASE_URL=postgresql://...
```

Use Vercel Project → Settings → Environment Variables for the deployed site. Add secrets only to server-side environment variables. Never add keys to `NEXT_PUBLIC_*`, Android resources, source code, commits, or browser storage.

The default Gemini image model is only a configurable starting point. Image-model availability depends on the Google AI account, API version, region and current model access. Change `GEMINI_IMAGE_MODEL` to a model actually enabled for your key. The API returns success only when it extracts supported inline image data.

## Local development

Requirements: Node.js 20.9+ and pnpm.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open http://localhost:3000.

For a production build:

```bash
pnpm build
```

## Android APK

The Android project uses package ID `ai.evee.app` and loads the configured production website. The workflow is at `.github/workflows/build-apk.yml`.

To build from GitHub:
1. Open the repository → Actions.
2. Select **Build EVEE AI APK**.
3. Select **Run workflow** on the branch you want to build.
4. When successful, open that workflow run and download **EVEE-AI-Android-APK** under Artifacts.

The workflow currently creates a debug APK, not a Play Store release-signed APK. Install the APK after downloading and allow installation from the source used by your device. For Play Store distribution, configure a private signing key in GitHub Actions secrets and add a release-signing job; never commit the keystore or passwords.

## Important release limitations

- Chat rate limiting in the current route is a lightweight in-memory per-instance guard; use a shared store such as Redis for multi-instance production.
- Browser-local history is not authenticated or private to a user account.
- Prisma schema is a starting point only. There is no account/session or database persistence implementation yet.
- No full Android instrumentation, device, browser, quota, or real-credential tests have been executed as part of this repository change.
- The Android wrapper currently accepts uploads through WebView's chooser. Download UX and app-specific permissions still need device QA.
- Do not advertise file analysis, voice, web search, plugins, accounts, synced history or other roadmap items as available until their API and tests exist.

## Development roadmap

1. User authentication and user-scoped PostgreSQL conversation persistence.
2. File upload and safe document/image extraction pipeline.
3. Search, export, voice, projects and plugins with explicit authorization.
4. Usage metering, shared rate limits, monitoring, privacy and security review.
5. Signed Android release build and physical-device QA.
