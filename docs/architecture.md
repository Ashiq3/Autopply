# Autopply Architecture

This document describes the current implementation in the repository. It is intended as a map for contributors, not as a promise that every internal API is a stable public contract.

## 1. High-level picture

Autopply is a React + TypeScript browser workspace backed by one Express server. The browser owns the active workspace state and calls the server for AI-assisted search, analysis, CV parsing, and application-preparation tasks.

```text
Browser
  src/main.tsx
      |
      v
  src/App.tsx  <----> browser localStorage
      |
      +--> Dashboard
      +--> Job Search
      +--> Applications Tracker
      +--> Candidate Profile
      +--> Settings & Schedule
      |
      +--> src/utils/llmClient.ts
      +--> src/utils/cvUpload.ts
                 |
                 | JSON requests / provider configuration
                 v
Express server (server.ts)
      |
      +--> health and provider routes
      +--> OpenRouter OAuth connection routes
      +--> AI agent routes
                 |
                 v
        selected AI provider(s)
        (Gemini or configured compatible provider)
```

The main workspace is local-first: profile, schedule, discovered jobs, application records, theme, and selected model configuration are stored in the browser. The current flow does not use a server-side application database for those records.

## 2. Frontend responsibilities

| File or area | Responsibility |
| --- | --- |
| `src/main.tsx` | Mounts the React application. |
| `src/App.tsx` | Owns the active tab, shared profile/schedule/job/application state, agent logs, theme, and the main job-preparation pipeline. |
| `src/components/AgentDashboard.tsx` | Shows the workspace overview and starts the preparation pipeline through callbacks supplied by `App`. |
| `src/components/JobsSearchEngine.tsx` | Collects search filters and provides keyword suggestions, job compatibility analysis, and fit screening. |
| `src/components/ApplicationsTracker.tsx` | Displays and manages saved application records and their local statuses. |
| `src/components/CandidateProfileEditor.tsx` | Edits candidate profile information and can request AI-assisted CV tailoring. |
| `src/components/SettingsSchedule.tsx` | Manages schedule/search preferences and AI-provider settings, including model discovery and connection checks. |
| `src/utils/llmClient.ts` | Reads provider credentials, masks keys for display, builds request headers, normalizes provider configuration, and provides `agentFetch`. |
| `src/utils/cvUpload.ts` | Reads supported CV files in the browser and sends their text or encoded file data to the CV parsing endpoint. |
| `src/types.ts` | Shared TypeScript contracts for profiles, jobs, applications, provider settings, and agent state. |
| `src/data/defaults.ts` | Default profile, schedule, and demo workspace data. |

### Workspace state and persistence

`App.tsx` loads initial values from `localStorage` and saves updates with React effects. The main storage keys are:

- `autoapply_user_profile_v1`
- `autoapply_schedule_config_v1`
- `autoapply_discovered_jobs_v1`
- `autoapply_applications_v1`
- `autoapply_theme_v1`
- `autoapply_llm_config_v2`

Provider credentials are handled separately by `llmClient.ts` under `autoapply_provider_credentials_v1`. The in-memory credential map is retained for the current page session; browser persistence depends on the user's setting. Do not put real credentials, resumes, or personal records into source files, fixtures, or commits.

## 3. Main user flows

### Job discovery

1. The user chooses titles, keywords, locations, and filters in Job Search.
2. `App.handleSearchJobs` calls `POST /api/agent/search-indeed-jobs`.
3. The server performs its multi-pass search and consolidation flow.
4. Returned jobs and search statistics are added to the browser workspace state.
5. The Job Search screen can separately request keyword suggestions, detailed compatibility analysis, or calibrated fit screening.

### Prepare an application package

1. The dashboard or a job card asks `App.runAgentPipeline` to prepare a selected job.
2. If no career-page URL is already available, the app calls `POST /api/agent/find-company-careers`.
3. It calls `POST /api/agent/tailor-resume` to generate a tailored CV and cover letter.
4. It calls `POST /api/agent/map-form-fields` to prepare suggested ATS field values.
5. The app saves the resulting package in the local Applications Tracker.

**Important boundary:** this pipeline prepares and stores application materials. It does not submit the employer's external application form. A saved record should not be interpreted as proof that an employer received an application.

### CV import and profile editing

`uploadAndParseCVFile` in `src/utils/cvUpload.ts` reads text files directly or encodes supported document files, then calls `POST /api/agent/parse-cv-file`. The returned structured profile is merged with the current profile in the browser. The original file is not uploaded to a repository by this feature.

### Provider settings

Settings checks provider availability through `GET /api/health`, requests model lists from `POST /api/providers/models`, and verifies credentials with `POST /api/providers/test`. OpenRouter connection uses a short-lived OAuth state and claim flow described below.

## 4. Backend responsibilities

All current server routes are registered in `server.ts`. The server:

- accepts JSON request bodies (currently limited to 10 MB);
- resolves the requested AI provider/model and credentials;
- calls Gemini or the selected compatible provider for AI work;
- normalizes provider errors into client-safe error responses;
- exposes provider readiness and usage limits through the health route;
- applies an in-memory daily cap and per-IP rate limit to `/api/agent` requests.

The default AI-agent limits are 250 requests per day and 12 requests per IP per minute. They can be adjusted with `MAX_DAILY_AI_REQUESTS`, `RATE_LIMIT_MAX_PER_IP`, and `RATE_LIMIT_WINDOW_MS`. These counters are held in process memory, so they reset when the server restarts; they are not a distributed quota system.

### HTTP endpoints

These are the routes currently registered in `server.ts`.

| Method and path | Purpose | Main input / successful response |
| --- | --- | --- |
| `GET /api/health` | Read service and provider readiness. | Returns `status`, `service`, `aiConfigured`, provider availability booleans, usage limits, and a timestamp. It does not return provider secrets. |
| `POST /api/auth/openrouter/start` | Start OpenRouter OAuth. | Accepts the browser origin; returns an authorization URL, state, and callback URL. |
| `GET /api/auth/openrouter/callback/:state` | Handle the OAuth provider redirect. | Completes or records the OAuth result for the matching short-lived state. |
| `GET /api/auth/openrouter/poll/:state` | Check OAuth progress. | Returns `pending`, `completed`, `error`, or `expired`; a completed result includes a one-time claim token. |
| `POST /api/auth/openrouter/claim` | Claim the completed OAuth credential. | Accepts `claimToken` and `state`; returns the credential to the browser once, plus a masked hint and provider user ID. |
| `POST /api/providers/models` | Discover available models for the selected provider. | Uses the selected provider/model configuration; returns `provider` and a `models` array. |
| `POST /api/providers/test` | Verify a provider connection. | Uses the selected provider configuration; returns `success`, `provider`, and a human-readable message. |
| `POST /api/agent/search-indeed-jobs` | Run multi-pass job discovery and consolidation. | Accepts search filters such as titles, keywords, locations, date, job type, experience, salary, location type, and exclusions; returns jobs, grounding URLs, and search statistics. |
| `POST /api/agent/decision-evaluate-jobs` | Score one job or screen a list of jobs. | Accepts `job` or `jobs` plus `userProfile`; returns a calibrated score or screened jobs. |
| `POST /api/agent/suggest-keywords` | Suggest target job titles and search keywords. | Accepts `userProfile`, `currentTitles`, and `currentKeywords`; returns a `suggestions` object. |
| `POST /api/agent/parse-cv-file` | Extract structured profile data from a CV. | Accepts `fileName`, text or base64 file content, and `mimeType`; returns `parsedProfile`. |
| `POST /api/agent/analyze-job-compatibility` | Compare a job description with a candidate profile. | Accepts `job` and `userProfile`; returns an `analysis` object. |
| `POST /api/agent/find-company-careers` | Find the company's official site and career portal. | Accepts `companyName` and `jobTitle`; returns `companyDetails`. |
| `POST /api/agent/tailor-resume` | Generate tailored CV and cover-letter content. | Accepts `userProfile` and `jobListing`; returns a `result` object. |
| `POST /api/agent/map-form-fields` | Suggest values for common ATS application fields. | Accepts `userProfile` and `jobListing`; returns `formFields`. |

AI-agent endpoints generally return `{ success: true, ... }` on success and `{ success: false, error }` on handled failure. Exact result fields are specific to each route and may evolve with the UI.

### Provider configuration and request flow

`agentFetch` in `src/utils/llmClient.ts` sends JSON to the same-origin server, adds the selected provider configuration, and attaches configured provider headers when needed. The server resolves the final provider configuration and obtains credentials from the supported server-side sources or request override. Provider keys must never be written into this architecture document, source control, logs, or issue reports.

OpenRouter OAuth uses a state value and short-lived in-memory records. The browser starts authorization, the provider redirects to the callback, the browser polls for completion, and the browser claims the credential once. This is provider connection, not application-user sign-in.

## 5. Development and production runtime

The package scripts currently define:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run `server.ts` through `tsx`; Express mounts Vite in middleware mode for the frontend. |
| `npm run lint` | Run the TypeScript compiler without emitting files (`tsc --noEmit`). |
| `npm run build` | Build the frontend with Vite and bundle the server with esbuild. |
| `npm start` | Run the bundled production server from `dist/server.cjs`. |

In development, Express delegates frontend handling to Vite middleware. In production, Express serves the built `dist` assets and falls back to `index.html` for client-side routes. The server listens on `PORT` or port 3000 by default.

## 6. Contributor safety notes

- Treat CVs, candidate profiles, API keys, and application records as sensitive user data.
- Use synthetic data in tests and documentation examples.
- Keep real provider keys in local environment configuration or the intended credential flow; never commit them.
- Do not describe a prepared package as an application that has been submitted to an employer.
- When changing an endpoint, update the frontend caller and this route table together.
- When changing browser storage, consider existing users who may already have older values saved.
- AI provider calls can incur cost and are subject to provider availability, configured quotas, and the server's in-memory request limits.
