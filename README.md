# AutoApply AI

**An open-source AI job search, ATS compatibility auditor, and tailored resume preparation agent built with React, TypeScript, Express, and Google Gemini Search Grounding.**

AutoApply AI helps job seekers discover active roles across the web, audit how well their resume matches any job description, tailor CVs and cover letters without fabricating experience, map common ATS application form fields, and export clean PDF resumes—all from a single workspace.

---

## Key Features

- **3-Pass Live Job Discovery (`Google Search Grounding`)**: Searches major job boards and direct company ATS portals using target job titles, skill keywords, remote/hybrid/onsite filters, experience level, date posted, minimum salary, and optional non-voice filtering.
- **Intelligent CV Keyword Suggestions**: Automatically extracts high-signal role titles and keywords from your uploaded CV and work history.
- **AI Resume Parser (`PDF / DOCX / TXT / MD`)**: Upload an existing resume and automatically extract contact details, skills, target titles, and a clean Markdown Master CV.
- **Granular ATS Compatibility Audit**: Compares your profile against any job listing and scores **Skills**, **Experience**, **Education**, and **Domain Knowledge**, highlighting matched requirements and actionable CV improvements.
- **Tailored CV, Cover Letter & PDF Export**: Generates role-specific Markdown CVs and cover letters, exports print-ready PDFs via `jsPDF`, and maps common ATS application fields.
- **Application Pipeline Tracker**: Tracks every prepared package with editable status tags (`Applied`, `Under Review`, `Interview Scheduled`, `Action Required`, `Rejected`) and search filtering.
- **Local-First Persistence & Dark Mode**: Automatically saves your profile, search alerts, discovered jobs, application log, and light/dark theme preference in browser `localStorage`.

---

## How the 6-Step Pipeline Works

```text
[1. Job Search] ──▶ [2. ATS Scoring] ──▶ [3. Career Portal Discovery]
                                                    │
[6. Package Archive] ◀── [5. ATS Form Mapping] ◀── [4. CV & Cover Letter Tailoring]
```

1. **Search**: Queries live job openings using Gemini Search Grounding and your saved filters.
2. **Score**: Evaluates skill overlap and overall candidate fit.
3. **Discover**: Resolves the company's official career page and ATS platform (Lever, Greenhouse, Workday, Ashby, or custom portal).
4. **Tailor**: Re-orders relevant skills and highlights from your Master CV and drafts a custom cover letter.
5. **Map**: Pre-fills standard ATS application fields (contact info, work authorization, salary expectations, motivation prompt) for review.
6. **Save & Export**: Stores the complete package in your **Applications Log** and lets you download a tailored PDF CV.

---

## Quick Start (Run Locally in 3 Minutes)

### Prerequisites
- **Node.js** `v20+` ([Download Node.js](https://nodejs.org/))
- **Google Gemini API Key** — free tier available at [Google AI Studio](https://aistudio.google.com/apikey)

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/autoapply-ai.git
cd autoapply-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Add Your AI Provider Key(s)
Copy the example environment file:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Open `.env` and add keys for the provider(s) you want to use (Gemini is default, and OpenRouter, OpenAI, and Claude can be switched from the **Schedule** tab):
```env
GEMINI_API_KEY="paste-your-gemini-key-here"
# Optional additional providers:
# OPENROUTER_API_KEY="paste-your-openrouter-key-here"
# OPENAI_API_KEY="paste-your-openai-key-here"
# ANTHROPIC_API_KEY="paste-your-anthropic-key-here"
```

### 4. Start the App
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## How to Use (Step-by-Step)

1. **Set Up Your Profile (`Base CV & Profile` tab)**
   - Click **Upload Resume Document** to upload your PDF, DOCX, TXT, or Markdown resume—or edit your details and Markdown CV manually.
   - Click **Save Master Profile** to store your profile locally.
2. **Search Live Jobs (`Job Match Engine` tab)**
   - Add your target job titles and skill keywords.
   - Pick your filters (Remote, Experience Level, Date Posted, Minimum Salary, Non-Voice Only).
   - Click **Search Live Opportunities** to fetch matching roles, then click **Audit Fit Breakdown** on any card for a full ATS score report.
3. **Generate Tailored Applications (`Prepare Tailored Package` / `Run Agent Pipeline`)**
   - Click **Prepare Tailored Package** on any job card (or **Run Agent Pipeline** from the Dashboard).
   - Watch the live step-by-step execution logs in **Agent Dashboard**.
4. **Export & Track (`Applications Log` tab)**
   - Click **Download PDF CV** to export a tailored PDF resume.
   - Click **Inspect Full Package** to view the tailored Markdown CV, cover letter, and mapped ATS answers.
   - Update your application status dropdown as you hear back from companies.
5. **Customize Schedule & Alerts (`Schedule & Filters` tab)**
   - Configure your run limits, match score threshold, excluded companies, and reusable search alert presets.
   - Use **Reset All Data** anytime to restore the clean demo template.

---

## Project Structure

```text
autoapply-ai/
├── .github/
│   └── ISSUE_TEMPLATE/         # Bug report & feature request templates
├── src/
│   ├── components/
│   │   ├── AgentDashboard.tsx          # Pipeline overview, metrics & live logs
│   │   ├── ApplicationsTracker.tsx     # Package inspector, status tracker & PDF export
│   │   ├── CandidateProfileEditor.tsx  # Resume uploader, profile form & Markdown CV editor
│   │   ├── JobsSearchEngine.tsx        # 3-pass search, CV suggestions & ATS audit breakdown
│   │   ├── Navbar.tsx                  # Sticky navigation, theme toggle & pipeline trigger
│   │   └── SettingsSchedule.tsx        # Schedule preferences, blocklist & search alerts
│   ├── data/
│   │   └── defaults.ts                 # Clean demo template profile & sample listings
│   ├── utils/
│   │   └── pdfGenerator.ts             # Client-side Markdown-to-PDF resume exporter
│   ├── App.tsx                         # Main application state, pipeline & localStorage sync
│   ├── index.css                       # Tailwind CSS v4 & dark bento theme styles
│   ├── main.tsx                        # React entry point
│   └── types.ts                        # Shared TypeScript interfaces
├── server.ts                           # Express + Vite middleware + Gemini API routes
├── index.html                          # HTML entry point & OpenGraph metadata
├── package.json                        # Scripts & dependencies
├── tsconfig.json                       # TypeScript configuration
├── vite.config.ts                      # Vite & Tailwind plugin configuration
├── .env.example                        # Environment variable template
├── CONTRIBUTING.md                     # Contributor guidelines
└── LICENSE                             # MIT License
```

---

## Backend API Endpoints

All AI calls run securely on the Express server (`server.ts`) so provider API keys are never exposed to the browser:

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Checks server status and reports configured provider readiness (`gemini`, `openrouter`, `openai`, `anthropic`) |
| `POST` | `/api/agent/search-indeed-jobs` | 3-pass live job search with web search grounding & ATS verification |
| `POST` | `/api/agent/suggest-keywords` | Recommends searchable role titles and keywords derived from candidate CV data |
| `POST` | `/api/agent/parse-cv-file` | Extracts structured profile fields & Markdown CV from uploaded files |
| `POST` | `/api/agent/analyze-job-compatibility` | Runs a 4-category ATS compatibility audit on a job listing |
| `POST` | `/api/agent/find-company-careers` | Discovers the official company domain, career URL, and ATS platform |
| `POST` | `/api/agent/tailor-resume` | Customizes the Markdown CV and cover letter for a target role |
| `POST` | `/api/agent/map-form-fields` | Maps candidate profile data onto standard ATS form inputs |

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, jsPDF
- **Backend**: Node.js, Express, `tsx`, `esbuild`
- **AI & Grounding**: Multi-provider LLM support — Google Gemini (`@google/genai` + Google Search Grounding), OpenRouter, OpenAI (`Responses` & `Chat Completions`), and Anthropic Claude (`Messages` + `web_search`)
- **Build Tooling**: Vite 6

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Express + Vite full-stack dev server on `http://localhost:3000` |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run build` | Builds the frontend (`dist/`) and bundles the production server (`dist/server.cjs`) |
| `npm start` | Runs the compiled production server (`NODE_ENV=production` recommended) |
| `npm run clean` | Removes build artifacts (`dist/`) |

---

## Production Deployment

```bash
npm run build
NODE_ENV=production npm start
```

Set `GEMINI_API_KEY` (and optionally `PORT`, defaulting to `3000`) in your hosting provider's environment variables (Cloud Run, Render, Railway, Fly.io, or VPS).

---

## Troubleshooting

- **"GEMINI_API_KEY is not configured" error**: Ensure you created `.env` from `.env.example`, pasted a valid key from [Google AI Studio](https://aistudio.google.com/apikey), and restarted `npm run dev`.
- **Port 3000 already in use**: Set `PORT=3001` in `.env` and restart the server.
- **Want to clear your saved browser data?**: Click **Reset Demo** in `Base CV & Profile` or **Reset All Data** in `Schedule & Filters`.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## License

This project is licensed under the [MIT License](./LICENSE).
