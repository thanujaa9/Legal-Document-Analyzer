# Legal Document Analyzer

A portfolio-ready full-stack application that extracts text from PDF/DOCX contracts and produces a structured, AI-assisted risk report. It also includes a public **Sample Demo** that works without an API key or credits. AI output is informational and is not legal advice.

## Architecture

```text
React client ──JWT──> Express API ──> MongoDB/GridFS
     │                    │
     │                    ├── PDF/DOCX extraction + cleaning
     │                    ├── bounded chunk analysis ──> Gemini API
     │                    ├── final structured merge
     │                    └── optional Redis cache
     └── /demo uses a clearly labeled stored sample result (no AI call)
```

The Gemini key exists only in the backend environment. The browser never receives it. Analysis requests are user-scoped, atomically locked, and limited to one new live analysis per UTC day. Redis makes that global daily allowance durable across app instances.

## Local setup

Requirements: Node.js 18+, MongoDB, and optionally Redis.

```bash
cd backend
cp .env.example .env
npm install
npm test
npm start
```

In another terminal:

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:3000/demo` for the credit-free sample. Create an account, upload a PDF/DOCX, and select Analyze for live analysis.

## Environment variables

Copy `backend/.env.example`. Required variables are `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters. `GEMINI_API_KEY` enables live analysis; without it the API returns a clear `MISSING_API_KEY` error and all stored Sample Demo reports remain available. `FRONTEND_URL` is a comma-separated CORS allowlist. Configure `REDIS_URL` in deployment so the one-per-day global allowance is shared reliably.

Never put `GEMINI_API_KEY` in a React variable, source file, commit, screenshot, or client-side hosting configuration. Rotate any key that has ever been exposed.

### Get a Gemini API key

1. Sign in to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Select **Create API key** and choose or create a Google Cloud project.
3. Copy the key once and store it only as `GEMINI_API_KEY` in `backend/.env` locally or the backend host's secret settings.
4. Keep `GEMINI_MODEL=gemini-2.5-flash` and restart the backend.

The Gemini free tier is quota-limited and Google may use free-tier prompts/responses to improve products. This portfolio displays a warning not to upload confidential, privileged, personal, or commercially sensitive documents.

## Token-saving and safety approach

- Normalizes extracted whitespace and removes null characters.
- Rejects unreadable documents and enforces 10 MB, 80-page, and 140,000-character defaults.
- Splits text on paragraph/word boundaries into at most 12 chunks of 12,000 characters.
- Caps each chunk response at 900 tokens and the final merge at 1,800 tokens.
- Merges chunk reports into one concise JSON report and limits duplicate clauses/risks.
- Reuses completed results and rejects concurrent duplicate Analyze requests.
- Limits the entire public deployment to one new live analysis per UTC day, with an additional per-user/hour abuse limit.
- Classifies missing/invalid key, exhausted quota, provider rate limit, context limit, invalid file, and oversized document errors.

Limits are configurable, but raising them increases latency and cost. The in-memory limiter is appropriate for a single demo instance; a multi-instance production deployment should use a shared Redis-backed limiter.

## Demo mode

After login, the original dashboard includes five fictional stored reports below Recent Documents: software services, NDA, employment offer, residential lease, and freelance design. Every report is explicitly labeled **Sample Demo** and states that no live request occurred. The portfolio demo account is `xyz@gmail.com` / `123456` when `ENABLE_DEMO_ACCOUNT=true`.

## Tests

Backend unit tests cover text cleanup, a small document, bounded large-document chunking, empty/invalid text, exhausted quota mapping, provider rate-limit mapping, and token-limit mapping. Run `npm test` in `backend`. Frontend build verification is `npm test -- --watchAll=false` and `npm run build` in `frontend`.

Live Gemini quota exhaustion cannot be safely manufactured without provider credentials. The provider error mapper is tested with representative error objects; run a controlled smoke test after adding your own key.

## Deployment

Recommended portfolio stack:

- Frontend: Vercel static deployment.
- Backend: Render web service.
- Database: MongoDB Atlas.
- Optional cache: Upstash Redis or Render Redis.

### One-click Render Blueprint

The repository includes `render.yaml`, which creates the static React site, Node API, and a private free Render Key Value service. Push the project to a Git provider, select **New → Blueprint** in Render, and choose the repository. Render prompts privately for `MONGODB_URI`, `GEMINI_API_KEY`, `FRONTEND_URL`, and `REACT_APP_API_URL`; it generates `JWT_SECRET` automatically.

Create the Blueprint once to learn both Render URLs, then set:

- Backend `FRONTEND_URL` to the static-site URL, such as `https://legal-document-analyzer.onrender.com`.
- Frontend `REACT_APP_API_URL` to the API URL with `/api`, such as `https://legal-document-analyzer-api.onrender.com/api`.

Redeploy both services after setting those URLs.

Set `REACT_APP_API_URL` at frontend build time to the backend `/api` URL. On the backend set `FRONTEND_URL`, `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, and `REDIS_URL`. Use HTTPS-only platform URLs and restrict MongoDB network access/credentials.

Free tiers and quotas change; verify current terms before deployment. A sleeping free backend may have cold starts. The app deliberately permits only one new Gemini analysis per UTC day while leaving five stored reports always available. Public AI can still be abused, so retain authentication, provider restrictions, and the confidentiality warning.

## Operational notes

- Scanned/image-only PDFs require OCR, which this project intentionally does not perform.
- DOC (legacy Word) is rejected; convert it to DOCX.
- The app stores uploaded legal text in MongoDB/GridFS. Do not use confidential contracts in a public demo without a retention/deletion policy.
- The analysis is not a substitute for advice from a qualified lawyer.
