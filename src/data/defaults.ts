import {
  UserProfile,
  ScheduleConfig,
  JobListing,
  ApplicationRecord,
  GitHubTool,
  LlmProviderConfig,
  LlmProviderMetadata,
} from '../types';

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'usr_demo_1',
  fullName: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  phone: '+1 (555) 014-8920',
  location: 'Remote / Worldwide',
  linkedinUrl: 'https://linkedin.com/in/alex-morgan-demo',
  githubUrl: 'https://github.com/alexmorgan-dev',
  portfolioUrl: 'https://alexmorgan.example.dev',
  experienceLevel: 'entry',
  yearsExperience: 1,
  desiredSalary: '$60,000 - $85,000 / year',
  workAuthorization: 'Authorized for Remote Global Roles',
  requiresSponsorship: false,
  noticePeriod: 'Immediately available',
  skills: [
    'React',
    'TypeScript',
    'Node.js',
    'Tailwind CSS',
    'REST APIs',
    'PostgreSQL',
    'Git & GitHub',
    'AI Workflow Automation'
  ],
  targetJobTitles: [
    'Junior Full-Stack Developer',
    'Frontend React Developer',
    'Entry-Level Software Engineer',
    'AI Automation Engineer'
  ],
  education: [
    {
      id: 'edu_1',
      degree: 'B.S. in Computer Science',
      institution: 'State University of Technology',
      year: '2025',
      gpa: '3.8 / 4.0',
      fieldOfStudy: 'Software Engineering & Distributed Systems'
    }
  ],
  workHistory: [
    {
      id: 'wrk_1',
      company: 'CloudSpark Labs',
      role: 'Junior Software Developer Intern',
      duration: 'Jun 2024 - May 2025',
      highlights: [
        'Built reusable React & TypeScript dashboard components, cutting page load latency by 28%.',
        'Developed Express.js REST endpoints and automated CI checks with GitHub Actions.',
        'Integrated LLM-driven document parsing workflows for internal operations teams.'
      ]
    }
  ],
  projects: [
    {
      id: 'prj_1',
      name: 'AutoApply AI — Autonomous Job Search Agent',
      description: 'Full-stack AI agent that searches live web job boards, runs ATS compatibility audits, and generates tailored PDF resumes.',
      techStack: ['React', 'TypeScript', 'Express', 'Google Gemini API', 'Tailwind CSS'],
      link: 'https://github.com/alexmorgan-dev/autoapply-ai'
    },
    {
      id: 'prj_2',
      name: 'SheetSync Lead Pipeline',
      description: 'Automated webhook service syncing structured candidate & lead records with validation and reporting.',
      techStack: ['Node.js', 'TypeScript', 'REST APIs', 'PostgreSQL'],
      link: 'https://github.com/alexmorgan-dev/sheetsync-pipeline'
    }
  ],
  certificationsList: ['AWS Certified Cloud Practitioner', 'Meta Front-End Developer'],
  customBio: 'Entry-level Full-Stack Software Engineer skilled in React, TypeScript, Node.js, and AI workflow automation. Looking for 100% remote engineering or automation roles.',
  uploadedCVFiles: [
    {
      id: 'cv_file_demo_1',
      fileName: 'Alex_Morgan_Sample_Resume.pdf',
      fileSize: '124 KB',
      uploadedAt: '2026-08-01',
      fileType: 'pdf',
      isActive: true,
      contentPreview: 'Sample template CV — upload your own PDF, DOCX, or TXT resume to auto-populate your real profile.'
    }
  ],
  masterCV: `# Alex Morgan
**Email:** alex.morgan@example.com | **Location:** Remote / Worldwide
**GitHub:** github.com/alexmorgan-dev | **LinkedIn:** linkedin.com/in/alex-morgan-demo

---

### PROFESSIONAL SUMMARY
Entry-level **Full-Stack Software Engineer** with hands-on experience building production web apps in **React, TypeScript, and Node.js**, plus practical experience integrating **LLM & workflow automation** tools.

---

### TECHNICAL SKILLS
- **Frontend:** React, TypeScript, JavaScript (ES2022), Tailwind CSS, HTML5/CSS3
- **Backend & Data:** Node.js, Express, REST APIs, PostgreSQL, SQL
- **AI & Tooling:** Google Gemini SDK, Git, GitHub Actions, Docker, Vite

---

### EXPERIENCE
**Junior Software Developer Intern** — CloudSpark Labs *(Jun 2024 – May 2025)*
- Engineered modular React + TypeScript UI views and reduced initial bundle render time by 28%.
- Built Node.js/Express API routes with structured validation and automated test coverage.
- Implemented AI-assisted document extraction pipelines to streamline internal data workflows.

---

### PROJECTS
- **AutoApply AI**: Full-stack job search & ATS resume tailoring agent built with React, Express, and Gemini Search Grounding.
- **SheetSync Lead Pipeline**: Automated Node.js data enrichment & webhook pipeline with PostgreSQL storage.

---

### EDUCATION
**B.S. in Computer Science** — State University of Technology *(2025, GPA: 3.8/4.0)*`
};

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  enabled: true,
  frequency: 'daily',
  daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  runTime: '09:00',
  maxAppsPerRun: 5,
  minMatchScore: 70,
  isRemoteOnly: true,
  fresherOnly: true,
  nonVoiceOnly: false,
  targetTitles: [
    'Junior Full-Stack Developer',
    'Frontend React Developer',
    'Entry-Level Software Engineer',
    'AI Automation Engineer'
  ],
  locations: ['Remote', 'Worldwide'],
  excludedCompanies: ['Example Staffing Agency'],
  notifyViaEmail: false,
  syncGoogleTasks: false,
  savedSearchAlerts: [
    {
      id: 'alert_demo_1',
      name: 'Remote Junior React & TypeScript Roles',
      queryKeywords: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS'],
      targetTitles: ['Junior Full-Stack Developer', 'Frontend React Developer'],
      locationType: 'remote_only',
      experienceLevel: 'entry',
      datePosted: '7d',
      minSalary: '60k',
      isEnabled: true,
      lastRunAt: 'Not run yet',
      matchesFoundCount: 3
    }
  ]
};

export const SAMPLE_DISCOVERED_JOBS: JobListing[] = [
  {
    id: 'job_demo_1',
    title: 'Junior Full-Stack Developer (100% Remote)',
    company: 'Northstar Cloud Systems',
    location: 'Remote (Worldwide)',
    salary: '$65,000 - $82,000 / year',
    jobType: 'Full-time Remote',
    experienceReq: 'Entry Level / 0-2 Years',
    source: 'Indeed',
    sourceUrl: 'https://www.indeed.com/jobs?q=junior+full+stack+developer+remote',
    postedDate: '1 day ago',
    description: `Northstar Cloud Systems is hiring a Junior Full-Stack Developer to help build customer-facing SaaS dashboards and internal automation tools.

Key Responsibilities:
- Build responsive web interfaces with React, TypeScript, and Tailwind CSS.
- Develop and maintain REST API endpoints in Node.js / Express backed by PostgreSQL.
- Collaborate asynchronously with a distributed global engineering team.

Requirements:
- Strong fundamentals in TypeScript, React, and modern JavaScript.
- Familiarity with Git, REST APIs, and relational databases.
- Open to remote candidates worldwide.`,
    companyDomain: 'northstarcloud.example.com',
    careerPageUrl: 'https://northstarcloud.example.com/careers',
    matchScore: 94,
    matchReasoning: 'Strong overlap across React, TypeScript, Node.js, Tailwind CSS, and PostgreSQL with entry-level experience fit.',
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS', 'PostgreSQL', 'REST APIs'],
    applyMethod: 'company_portal',
    status: 'cv_tailored',
    discoveredAt: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: 'job_demo_2',
    title: 'Frontend React Engineer (Entry Level)',
    company: 'Veloce Labs',
    location: 'Remote (Anywhere)',
    salary: '$60,000 - $78,000 / year',
    jobType: 'Full-time Remote',
    experienceReq: 'Fresher / 0-1 Years',
    source: 'Indeed',
    sourceUrl: 'https://www.indeed.com/jobs?q=junior+react+developer+remote',
    postedDate: '2 days ago',
    description: `Veloce Labs is looking for an entry-level Frontend React Engineer passionate about clean UI architecture and fast web performance.

Role Overview:
- Translate product specs into accessible, maintainable React + TypeScript components.
- Integrate backend JSON APIs and optimize client-side state.
- Participate in async code reviews and weekly sprint planning.

Qualifications:
- Hands-on projects or internship experience with React and TypeScript.
- Understanding of Git workflows and modern CSS (Tailwind CSS).`,
    companyDomain: 'velocelabs.example.io',
    careerPageUrl: 'https://velocelabs.example.io/careers',
    matchScore: 91,
    matchReasoning: 'Matches core React, TypeScript, Tailwind CSS, and Git profile skills with fresher-friendly experience criteria.',
    requiredSkills: ['React', 'TypeScript', 'Tailwind CSS', 'Git & GitHub', 'REST APIs'],
    applyMethod: 'company_portal',
    status: 'discovered',
    discoveredAt: new Date(Date.now() - 3600000 * 10).toISOString()
  },
  {
    id: 'job_demo_3',
    title: 'AI Workflow & Automation Engineer',
    company: 'OrbitFlow AI',
    location: 'Remote (Global)',
    salary: '$70,000 - $90,000 / year',
    jobType: 'Full-time Remote',
    experienceReq: 'Entry / 1-2 Years',
    source: 'LinkedIn',
    sourceUrl: 'https://www.linkedin.com/jobs/search/?keywords=ai+automation+engineer+remote',
    postedDate: '3 days ago',
    description: `OrbitFlow AI builds intelligent workflow agents for growing operations teams. We are seeking a builder who loves connecting APIs, LLMs, and clean web interfaces.

Responsibilities:
- Design reliable LLM-powered extraction and classification workflows using Gemini / OpenAI APIs.
- Build TypeScript/Node.js backend connectors and lightweight React admin views.
- Monitor prompt accuracy, latency, and API reliability.

Requirements:
- Experience with Node.js, TypeScript, REST APIs, and AI workflow automation.
- Strong problem-solving and documentation habits.`,
    companyDomain: 'orbitflow.example.ai',
    careerPageUrl: 'https://orbitflow.example.ai/jobs',
    matchScore: 89,
    matchReasoning: 'Direct fit for AI Workflow Automation, Node.js, TypeScript, and REST API integration skills.',
    requiredSkills: ['AI Workflow Automation', 'Node.js', 'TypeScript', 'REST APIs', 'React'],
    applyMethod: 'company_portal',
    status: 'discovered',
    discoveredAt: new Date(Date.now() - 3600000 * 22).toISOString()
  }
];

export const SAMPLE_APPLICATIONS: ApplicationRecord[] = [
  {
    id: 'app_demo_1',
    jobId: 'job_demo_101',
    jobTitle: 'Junior Frontend Developer (Remote)',
    company: 'Aura Systems Inc.',
    location: 'Remote',
    appliedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    matchScore: 95,
    tailoredCV: `# Alex Morgan — Tailored Resume for Aura Systems Inc.
**Target Role:** Junior Frontend Developer (Remote)

### HIGHLIGHTED KEYWORD MATCHES
- **React, TypeScript, Tailwind CSS, REST APIs, Modular UI Architecture**

### SUMMARY
Entry-level Software Engineer with a B.S. in Computer Science (GPA 3.8) and hands-on internship experience building React and TypeScript applications. Reduced page load latency by 28% at CloudSpark Labs.

### RELEVANT PROJECTS
- **AutoApply AI**: Full-stack React, TypeScript, and Express application featuring live AI search grounding and PDF export.`,
    tailoredCoverLetter: `Dear Hiring Team at Aura Systems Inc.,

I am excited to apply for the Junior Frontend Developer (Remote) position. With a Computer Science degree and hands-on experience building modular React and TypeScript interfaces during my internship at CloudSpark Labs, I am eager to contribute clean, reliable code to your product team.

At CloudSpark Labs, I engineered reusable UI components with Tailwind CSS and integrated REST endpoints, reducing page load latency by 28%. My open-source work on AutoApply AI further demonstrates my ability to ship end-to-end TypeScript applications quickly.

Thank you for your time and consideration.

Sincerely,
Alex Morgan`,
    formFieldsFilled: [
      { fieldLabel: 'Full Name', fieldType: 'text', fieldName: 'fullName', valueToFill: 'Alex Morgan', explanation: 'Matched from Candidate Profile' },
      { fieldLabel: 'Email Address', fieldType: 'email', fieldName: 'email', valueToFill: 'alex.morgan@example.com', explanation: 'Matched from Candidate Profile' },
      { fieldLabel: 'Phone Number', fieldType: 'phone', fieldName: 'phone', valueToFill: '+1 (555) 014-8920', explanation: 'Matched from Candidate Profile' },
      { fieldLabel: 'Experience Level', fieldType: 'dropdown', fieldName: 'experienceLevel', valueToFill: 'Entry Level (0-2 yrs)', explanation: 'Auto-mapped to job requirement' },
      { fieldLabel: 'Work Authorization', fieldType: 'dropdown', fieldName: 'workAuth', valueToFill: 'Authorized for Remote Global Roles', explanation: 'Matched from Candidate Profile' },
      { fieldLabel: 'Why do you want to work at Aura Systems?', fieldType: 'textarea', fieldName: 'customEssay', valueToFill: 'I admire Aura Systems focus on clean frontend architecture. My hands-on experience with React, TypeScript, and Tailwind CSS aligns directly with your engineering stack.', explanation: 'AI-tailored response to job description' },
      { fieldLabel: 'Resume Attachment', fieldType: 'file_upload', fieldName: 'resumeFile', valueToFill: 'Alex_Morgan_Resume_AuraSystems.pdf', explanation: 'Generated tailored PDF CV' }
    ],
    applyMethod: 'company_portal',
    companyCareerPageUrl: 'https://aurasystems.example.com/careers/apply',
    confirmationDetails: 'Sample prepared application package (Ref #DEMO-98214).',
    status: 'applied',
    notes: 'Sample record — run the agent or edit your profile to create real tailored packages.'
  }
];

export const GITHUB_OPEN_SOURCE_TOOLS: GitHubTool[] = [
  {
    id: 'gh_1',
    name: 'Auto_Jobs_Applier_AIHawk',
    repo: 'federico-busato/Auto_Jobs_Applier_AIHawk',
    stars: 14200,
    description: 'An AI-powered automated job search and application tool that uses LLMs to customize resumes and fill out job forms automatically.',
    category: 'Full Automation',
    features: [
      'Automatic Job Search on LinkedIn',
      'AI Resume Tailoring per job description',
      'Automated Easy Apply form filling via Selenium',
      'Detailed application logs & YAML config'
    ],
    pythonCommand: 'git clone https://github.com/federico-busato/Auto_Jobs_Applier_AIHawk.git\ncd Auto_Jobs_Applier_AIHawk\npip install -r requirements.txt\npython main.py',
    githubUrl: 'https://github.com/federico-busato/Auto_Jobs_Applier_AIHawk',
    architectureNotes: 'Uses browser automation combined with LLM prompt pipelines to inspect form DOM elements, match candidate schema keys, and generate custom responses.'
  },
  {
    id: 'gh_2',
    name: 'JobSpy (python-jobspy)',
    repo: 'Bunsly/JobSpy',
    stars: 8900,
    description: 'Concurrent job scraper library supporting LinkedIn, Indeed, Glassdoor, ZipRecruiter, and Google Jobs with structured Pandas DataFrame output.',
    category: 'Web Scraping',
    features: [
      'Concurrent multi-board scraping (Indeed, LinkedIn, Glassdoor)',
      'Remote, job type, and date-posted filters',
      'Proxy & rate-limit support',
      'Clean CSV / JSON export'
    ],
    pythonCommand: 'pip install -U python-jobspy\npython -c "from jobspy import scrape_jobs; print(scrape_jobs(site_name=[\'indeed\'], search_term=\'software engineer\', is_remote=True))"',
    githubUrl: 'https://github.com/Bunsly/JobSpy',
    architectureNotes: 'Queries job board endpoints concurrently with clean normalization into unified job schemas.'
  },
  {
    id: 'gh_3',
    name: 'Resume-Matcher',
    repo: 'srbhr/Resume-Matcher',
    stars: 11500,
    description: 'Open-source ATS keyword matching and resume optimization tool that compares your resume against job descriptions.',
    category: 'CV Tailoring',
    features: [
      'ATS Keyword & Semantic Similarity scoring',
      'Extracts missing skills & phrasing from JDs',
      'Local LLM / vector embedding support',
      'Interactive analytics dashboard'
    ],
    pythonCommand: 'git clone https://github.com/srbhr/Resume-Matcher.git\ncd Resume-Matcher\npip install -r requirements.txt',
    githubUrl: 'https://github.com/srbhr/Resume-Matcher',
    architectureNotes: 'Parses resumes and job descriptions into structured tokens, then computes keyword coverage and vector similarity.'
  },
  {
    id: 'gh_4',
    name: 'Reactive-Resume',
    repo: 'AmruthPillai/Reactive-Resume',
    stars: 29000,
    description: 'Privacy-focused open-source resume builder with real-time Markdown/JSON editing and clean PDF export.',
    category: 'CV Tailoring',
    features: [
      'Multiple ATS-friendly templates',
      'JSON import/export & shareable links',
      'Self-hostable with Docker',
      'High-fidelity PDF rendering'
    ],
    pythonCommand: 'git clone https://github.com/AmruthPillai/Reactive-Resume.git\ncd Reactive-Resume\npnpm install && pnpm dev',
    githubUrl: 'https://github.com/AmruthPillai/Reactive-Resume',
    architectureNotes: 'Maintains a strict JSON Resume schema rendered cleanly into print-ready PDF layouts.'
  }
];

export const DEFAULT_LLM_CONFIG: LlmProviderConfig = {
  provider: 'gemini',
  model: 'gemini-3.1-flash-lite',
};

export const LLM_PROVIDER_CATALOG: LlmProviderMetadata[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    envKeyName: 'GEMINI_API_KEY',
    defaultModel: 'gemini-3.1-flash-lite',
    supportsWebSearch: true,
    description:
      'Uses high-quota free-tier Gemini 3.1 Flash Lite for search & tailoring, paired with gemini-decision-1 for zero-token calibrated job scoring.',
    models: [
      { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', note: 'Highest free-tier quota (Default)' },
      { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen', note: 'Balanced (20 RPD free limit)' },
      { id: 'gemini-4-neon', label: 'Gemini 4 Neon', note: 'Deep reasoning (Paid key)' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    envKeyName: 'OPENROUTER_API_KEY',
    defaultModel: 'openai/gpt-4o-mini',
    supportsWebSearch: true,
    description: 'Routes across 100+ models via OpenRouter with web search plugin support.',
    models: [
      { id: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o mini', note: 'Fast & affordable' },
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', note: 'Strong writing & JSON' },
      { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', note: 'Fast multimodal' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (Free)', note: 'Free tier' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    envKeyName: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
    supportsWebSearch: true,
    description: 'Uses OpenAI Chat Completions and Responses API with live web_search_preview.',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', note: 'Fast & cost-efficient' },
      { id: 'gpt-4o', label: 'GPT-4o', note: 'High accuracy' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', note: 'Structured JSON' },
      { id: 'gpt-4.1', label: 'GPT-4.1', note: 'Flagship reasoning' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    envKeyName: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-3-5-haiku-latest',
    supportsWebSearch: true,
    description: 'Uses Anthropic Messages API with native PDF parsing and web search.',
    models: [
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', note: 'Fast & economical' },
      { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet', note: 'Balanced reasoning' },
      { id: 'claude-sonnet-4-0', label: 'Claude Sonnet 4', note: 'High-precision tailoring' },
    ],
  },
];

