import { UserProfile, ScheduleConfig, JobListing, ApplicationRecord, GitHubTool } from '../types';

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'usr_1',
  fullName: 'Ashiqur Rahman',
  email: 'ashiqurrahman47th@gmail.com',
  phone: '+1 (555) 382-9012',
  location: 'Remote / Worldwide (Anywhere)',
  linkedinUrl: 'https://linkedin.com/in/ashiqur-rahman-leadgen',
  githubUrl: 'https://github.com/ashiqur-automation',
  portfolioUrl: 'https://ashiqur-leadgen.dev',
  experienceLevel: 'fresher',
  yearsExperience: 2,
  desiredSalary: '$50,000 - $75,000 / year',
  workAuthorization: '100% Remote / Worldwide (No US-only residency restrictions)',
  requiresSponsorship: false,
  noticePeriod: 'Immediately available',
  skills: [
    'Lead Generation', 'Email Marketing', 'Mailchimp', 'Email Automation',
    'Sheet Automation (Google Sheets / AppScript)', 'Data Entry & Mining',
    'AI Automation', 'AI Agent Building', 'Lead & Campaign Workflow Automation',
    'Zapier / n8n / Make.com', 'B2B Prospecting & Scraping', 'CRM Management'
  ],
  education: [
    {
      id: 'edu_1',
      degree: 'Bachelor Degree in Business & Marketing',
      institution: 'University of Information Technology',
      year: '2024',
      gpa: '3.8 / 4.0',
      fieldOfStudy: 'Digital Marketing & Automation Systems'
    }
  ],
  workHistory: [
    {
      id: 'wrk_1',
      company: 'GrowthFlow Digital Solutions',
      role: 'Lead Generation & Email Automation Specialist',
      duration: 'Jan 2024 - Present (2 yrs)',
      highlights: [
        'Built automated B2B lead generation pipelines using Google Sheets, AppScript, and scraping APIs.',
        'Managed end-to-end Mailchimp and cold email marketing campaigns with 45%+ open rates and automated drip sequences.',
        'Created custom AI agents and workflow webhooks using n8n and Zapier for automated lead enrichment.'
      ]
    }
  ],
  projects: [
    {
      id: 'prj_1',
      name: 'Automated Lead Extraction & Sheet Sync Agent',
      description: 'An AI-powered Google Sheet workflow that automatically extracts B2B leads, validates email deliverability, and feeds Mailchimp campaigns.',
      techStack: ['Google Sheets Automation', 'Mailchimp', 'AI Agents', 'Zapier', 'Lead Generation'],
      link: 'https://github.com/ashiqur-automation/sheet-lead-agent'
    },
    {
      id: 'prj_2',
      name: 'AI Agent Email Campaign Manager',
      description: 'Custom AI agent built to craft personalized email sequences and manage multi-step lead nurture workflows.',
      techStack: ['AI Automation', 'Email Marketing', 'Mailchimp API', 'Sheet Automation'],
      link: 'https://github.com/ashiqur-automation/ai-email-campaigns'
    }
  ],
  customBio: 'Expert in B2B Lead Generation, Email Marketing, Mailchimp, Email Automation, Google Sheet Automation, Data Entry, and AI Agent / Workflow Automation. Specialized in non-calling / text-driven campaign execution for remote global teams.',
  uploadedCVFiles: [
    {
      id: 'cv_file_1',
      fileName: 'Ashiqur_Rahman_LeadGen_Email_Automation_CV.pdf',
      fileSize: '135 KB',
      uploadedAt: '2026-08-03',
      fileType: 'pdf',
      isActive: true,
      contentPreview: 'Ashiqur Rahman - Lead Generation, Email Marketing, Mailchimp, Sheet & AI Automation Specialist CV.'
    }
  ],
  masterCV: `# Ashiqur Rahman
**Email:** ashiqurrahman47th@gmail.com | **Location:** Remote / Worldwide (Anywhere)
**LinkedIn:** linkedin.com/in/ashiqur-rahman-leadgen | **Portfolio:** ashiqur-leadgen.dev

---

### PROFESSIONAL SUMMARY
Results-driven **Lead Generation & Email Marketing Automation Specialist** with 2+ years of experience executing high-converting B2B lead generation campaigns, **Mailchimp email drip automation**, **Google Sheet workflow automation**, data entry/mining, and **building AI agents** for automated campaign execution. Specialized in 100% remote, non-voice / non-calling roles across global teams.

---

### CORE EXPERTISE & SKILLS
- **Lead Generation & Prospecting:** B2B Prospect Enrichment, Web Scraping, Data Mining, Verified Lead Lists
- **Email Marketing & Campaigns:** Mailchimp, Cold Email Automation, Drip Sequences, Deliverability Optimization
- **Automation & Tools:** Google Sheet Automation (AppScript/Macros), Zapier, Make.com, n8n, AI Agent Building
- **Data & CRM Management:** Data Entry, Data Cleaning, HubSpot, Notion, Excel/Sheets Advanced Formulas
- **Role Preferences:** 100% Remote (Worldwide/Anywhere), Non-Voice / Non-Calling Roles Only

---

### WORK EXPERIENCE
**Lead Generation & Email Automation Specialist** — GrowthFlow Digital *(2024 – Present)*
- Executed end-to-end B2B lead generation and targeted email marketing campaigns using Mailchimp and custom automation tools.
- Developed Google Sheet macros & AppScripts that automated lead cleaning, email verification, and daily CRM syncing.
- Built AI workflow agents to personalize email sequences, resulting in a 40%+ increase in positive response rates.

---

### EDUCATION
**Bachelor Degree in Business & Digital Marketing** *(Graduated 2024)*`
};

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  enabled: true,
  frequency: 'daily',
  daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  runTime: '09:00',
  maxAppsPerRun: 5,
  minMatchScore: 70,
  isRemoteOnly: true,
  fresherOnly: false,
  targetTitles: [
    'Lead Generation Specialist',
    'Email Marketing Specialist',
    'Mailchimp & Campaign Specialist',
    'Email Automation Specialist',
    'Sheet & Workflow Automation Specialist',
    'AI Automation & Agent Developer'
  ],
  locations: ['Remote', 'Worldwide', 'Anywhere'],
  excludedCompanies: ['Cold Call Telemarketing Inc', 'Outbound Sales Call Center', 'Voice Support Agency'],
  notifyViaEmail: true,
  syncGoogleTasks: true,
  savedSearchAlerts: [
    {
      id: 'alert_1',
      name: 'Remote Lead Generation & Email Marketing',
      queryKeywords: ['Lead Generation', 'Mailchimp', 'Email Marketing', 'Email Automation'],
      targetTitles: ['Lead Generation Specialist', 'Email Marketing Specialist', 'Mailchimp Specialist'],
      locationType: 'remote_only',
      experienceLevel: 'entry',
      datePosted: '24h',
      minSalary: '40k',
      isEnabled: true,
      lastRunAt: 'Today at 09:00 AM',
      matchesFoundCount: 12
    },
    {
      id: 'alert_2',
      name: 'Sheet Automation & AI Agent Build Jobs',
      queryKeywords: ['Sheet Automation', 'Google Sheets', 'AI Automation', 'AI Agent', 'Data Entry'],
      targetTitles: ['Workflow Automation Specialist', 'Data Entry & Automation Specialist', 'AI Automation Specialist'],
      locationType: 'remote_only',
      experienceLevel: 'fresher',
      datePosted: '3d',
      minSalary: '40k',
      isEnabled: true,
      lastRunAt: 'Yesterday',
      matchesFoundCount: 9
    }
  ]
};

export const SAMPLE_DISCOVERED_JOBS: JobListing[] = [
  {
    id: 'job_1',
    title: 'Lead Generation & Email Marketing Specialist (100% Remote - Worldwide)',
    company: 'Apex Digital Growth',
    location: 'Remote (Worldwide / Anywhere)',
    salary: '$50,000 - $65,000 / year',
    jobType: 'Full-time Remote',
    experienceReq: '1-2 Years / Beginner Welcome',
    source: 'Indeed',
    sourceUrl: 'https://www.indeed.com/viewjob?jk=apex_leadgen_01',
    postedDate: '4 hours ago',
    description: `We are seeking a detail-oriented Lead Generation & Email Marketing Specialist to join our global remote team. No cold calling required! All communication and campaigns are purely email & text workflow based.

Key Responsibilities:
- Build targeted B2B lead lists using web research, scraping, and lead generation tools.
- Setup and manage Mailchimp email automation campaigns and drip workflows.
- Utilize Google Sheets automation to organize, clean, and verify prospect data.
- Integrate AI automation tools to personalize outreach and campaign reporting.

Requirements:
- Hands-on experience with Lead Generation, Mailchimp, and Email Automation.
- Proficiency with Google Sheets, Excel formulas, and Sheet Automation.
- Knowledge of AI tools or AI Agent automation is a strong plus.
- Absolutely NO phone calling or voice calls involved. 100% text/email based.
- Open to candidates worldwide (no US residency restriction).`,
    companyDomain: 'apexdigitalgrowth.io',
    careerPageUrl: 'https://apexdigitalgrowth.io/careers/lead-generation-specialist',
    matchScore: 98,
    matchReasoning: 'Perfect 100% fit! Matches all your core strengths: Lead Generation, Mailchimp, Email Automation, Sheet Automation, AI Agent workflows. 100% Remote Worldwide with zero calling/voice required.',
    requiredSkills: ['Lead Generation', 'Email Marketing', 'Mailchimp', 'Email Automation', 'Sheet Automation', 'Data Entry'],
    applyMethod: 'company_portal',
    status: 'cv_tailored',
    discoveredAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'job_2',
    title: 'Sheet Automation & Email Campaign Specialist',
    company: 'Nexus Marketing Systems',
    location: 'Remote (Anywhere)',
    salary: '$45,000 - $60,000 / year',
    jobType: 'Full-time Remote',
    experienceReq: 'Fresher / 0-2 Years',
    source: 'Indeed',
    sourceUrl: 'https://www.indeed.com/viewjob?jk=nexus_sheet_02',
    postedDate: '1 day ago',
    description: `Nexus Marketing Systems is hiring a Remote Sheet Automation & Email Campaign Specialist.
    
Role Overview:
- Manage automated lead pipelines using Google Sheets, AppScript, and Mailchimp.
- Perform high-accuracy data entry, prospect data verification, and list enrichment.
- Build automated email sequences and monitor campaign open/click-through performance.
- Utilize AI tools to assist in lead research and workflow automation.

Qualifications:
- Demonstrated skills in Google Sheets automation, Mailchimp, and Email Marketing.
- Experience in lead generation and data entry.
- 100% non-voice role; no phone calling required.
- Global remote applicants welcome.`,
    companyDomain: 'nexusmarketingsystems.com',
    careerPageUrl: 'https://nexusmarketingsystems.com/jobs/sheet-automation-specialist',
    matchScore: 95,
    matchReasoning: 'Excellent alignment! Role focuses on Sheet Automation, Mailchimp, Data Entry, and Email Automation. Non-voice, 100% remote worldwide.',
    requiredSkills: ['Sheet Automation', 'Mailchimp', 'Email Automation', 'Data Entry', 'Lead Generation', 'AI Automation'],
    applyMethod: 'company_portal',
    status: 'discovered',
    discoveredAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: 'job_3',
    title: 'AI Automation & Lead Workflow Specialist',
    company: 'FlowBot AI Agency',
    location: 'Remote (Worldwide)',
    salary: '$55,000 - $70,000 / year',
    jobType: 'Full-time Remote',
    experienceReq: 'Beginner / 1-2 Years',
    source: 'LinkedIn',
    sourceUrl: 'https://www.linkedin.com/jobs/view/flowbot_ai_03',
    postedDate: '2 days ago',
    description: `FlowBot AI Agency is looking for a Remote AI Automation & Lead Workflow Specialist to build automated AI agents for lead generation and campaign workflows.

Responsibilities:
- Build AI agent workflows (Zapier, n8n, Make, or custom API scripts) for lead capture and enrichment.
- Connect Google Sheets, CRM databases, and email automation platforms.
- Create automated email sequences in Mailchimp and custom AI email generators.

Requirements:
- Passion for AI Automation, AI Agent building, and Lead Generation.
- Expertise in Google Sheet automation and Mailchimp / Email Marketing.
- Completely non-voice role. Remote anywhere in the world.`,
    companyDomain: 'flowbotai.agency',
    careerPageUrl: 'https://flowbotai.agency/careers/ai-lead-workflow-specialist',
    matchScore: 94,
    matchReasoning: 'Great match for your AI Agent building & AI automation skills combined with Lead Generation and Email Marketing!',
    requiredSkills: ['AI Automation', 'AI Agent Build', 'Lead Generation', 'Sheet Automation', 'Mailchimp', 'Email Marketing'],
    applyMethod: 'company_portal',
    status: 'discovered',
    discoveredAt: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

export const SAMPLE_APPLICATIONS: ApplicationRecord[] = [
  {
    id: 'app_1',
    jobId: 'job_101',
    jobTitle: 'Junior Frontend Developer (Remote)',
    company: 'Aura Systems Inc.',
    location: 'Remote',
    appliedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    matchScore: 95,
    tailoredCV: `# Alex Vance - Customized Resume for Aura Systems Inc.
**Role Target:** Junior Frontend Developer

### HIGHLIGHTED KEYWORD MATCHES
- **React, TypeScript, Tailwind CSS, REST APIs, Component State Optimization**

### SUMMARY
Fresher Computer Science Graduate (GPA 3.8) specializing in React and TypeScript. Delivered 12+ production React components during internship at TechStart Lab. Built AI-integrated web tools using Node.js and REST APIs.

### TAILORED PROJECTS
- **TaskPulse AI Planner**: Built with React, TypeScript, and Express. Perfectly aligned with Aura Systems' frontend architecture goals.`,
    tailoredCoverLetter: `Dear Hiring Team at Aura Systems Inc.,

I am thrilled to submit my application for the Junior Frontend Developer position. As a recent Computer Science graduate with hands-on experience building React and TypeScript web applications, I have followed Aura Systems' work in building intuitive user interfaces with great admiration.

During my internship at TechStart Lab, I developed modular UI components with Tailwind CSS and integrated RESTful endpoints, improving frontend performance by 25%. My personal projects, such as TaskPulse AI Planner, further demonstrate my ability to deliver clean, maintainable code rapidly.

I am eager to bring my strong technical fundamentals, enthusiasm, and remote productivity mindset to Aura Systems. Thank you for your time and consideration.

Sincerely,
Alex Vance`,
    formFieldsFilled: [
      { fieldLabel: 'Full Name', fieldType: 'text', fieldName: 'fullName', valueToFill: 'Alex Vance', explanation: 'Matched from Master Candidate Profile' },
      { fieldLabel: 'Email Address', fieldType: 'email', fieldName: 'email', valueToFill: 'ashiqurrahman47th@gmail.com', explanation: 'Matched from Master Candidate Profile' },
      { fieldLabel: 'Phone Number', fieldType: 'phone', fieldName: 'phone', valueToFill: '+1 (555) 382-9012', explanation: 'Matched from Master Candidate Profile' },
      { fieldLabel: 'Experience Level', fieldType: 'dropdown', fieldName: 'experienceLevel', valueToFill: 'Fresher / Entry Level (0-1 yrs)', explanation: 'Auto-mapped to job requirement' },
      { fieldLabel: 'Work Authorization', fieldType: 'dropdown', fieldName: 'workAuth', valueToFill: 'Authorized for any employer', explanation: 'No visa sponsorship needed' },
      { fieldLabel: 'Why do you want to work at Aura Systems?', fieldType: 'textarea', fieldName: 'customEssay', valueToFill: 'I am inspired by Aura Systems focus on modular frontend architecture. My background in React and TypeScript makes this an ideal environment for me to contribute immediately while growing alongside senior mentors.', explanation: 'AI Generated response tailored to Aura Systems JD' },
      { fieldLabel: 'Resume Attachment', fieldType: 'file_upload', fieldName: 'resumeFile', valueToFill: 'Alex_Vance_Tailored_Resume_AuraSystems.pdf', explanation: 'Dynamically generated tailored PDF CV' }
    ],
    applyMethod: 'company_portal',
    companyCareerPageUrl: 'https://aurasystems.com/careers/apply?jobId=101',
    confirmationDetails: 'Successfully submitted via Aura Systems Careers ATS Portal. Reference #AS-98214.',
    status: 'applied',
    notes: 'Confirmation email received. Automated follow-up task scheduled in 7 days.'
  }
];

export const GITHUB_OPEN_SOURCE_TOOLS: GitHubTool[] = [
  {
    id: 'gh_1',
    name: 'Auto_Jobs_Applier_AIHawk',
    repo: 'federico-busato/Auto_Jobs_Applier_AIHawk',
    stars: 14200,
    description: 'An AI-powered automated job search and application tool that uses LLMs (Gemini / OpenAI) to customize resumes and fill out job forms automatically.',
    category: 'Full Automation',
    features: [
      'Automatic Job Search on Indeed & LinkedIn',
      'AI Resume Tailoring per job description',
      'Automatic Easy Apply form filling using Playwright/Selenium',
      'Detailed JSON application logs & stats dashboard'
    ],
    pythonCommand: 'git clone https://github.com/federico-busato/Auto_Jobs_Applier_AIHawk.git\ncd Auto_Jobs_Applier_AIHawk\npip install -r requirements.txt\npython main.py',
    githubUrl: 'https://github.com/federico-busato/Auto_Jobs_Applier_AIHawk',
    architectureNotes: 'Uses Playwright browser automation combined with LLM prompt pipelines to inspect form DOM elements, match candidate schema keys, and generate custom text responses for tricky questions.'
  },
  {
    id: 'gh_2',
    name: 'Indeed-Bot-Auto-Applier',
    repo: 'job-hunter-ai/Indeed-Bot',
    stars: 8900,
    description: 'Lightweight scraper and automated application script for Indeed job listings focusing on Remote, Entry Level, and Fresher filters.',
    category: 'Browser Bot',
    features: [
      'Headless browser scraping on Indeed search queries',
      'Filters out scam jobs and recruiter agencies',
      'Directly parses external company career URLs',
      'Automates form submission on Workday, Greenhouse, & Lever'
    ],
    pythonCommand: 'pip install indeed-bot-ai\nindeed-bot run --config config.yaml --remote-only --fresher',
    githubUrl: 'https://github.com/job-hunter-ai/Indeed-Bot',
    architectureNotes: 'Uses BeautifulSoup and Puppeteer to extract company website links when Indeed listings redirect to external corporate portals.'
  },
  {
    id: 'gh_3',
    name: 'Open-Resume-Tailor-AI',
    repo: 'open-source-labs/ResumeTailor',
    stars: 11500,
    description: 'CLI & API tool that takes a master Markdown resume and a target Job Description, returning an ATS-optimized PDF resume with target keywords.',
    category: 'CV Tailoring',
    features: [
      'ATS Keyword Density analyzer',
      'Generates LaTeX and PDF resumes on the fly',
      'Tailors bullet points based on JD action verbs',
      'Outputs cover letter alongside customized resume'
    ],
    pythonCommand: 'npm install -g open-resume-tailor\nresume-tailor --resume my_cv.md --jd job.txt --output tailored_cv.pdf',
    githubUrl: 'https://github.com/open-source-labs/ResumeTailor',
    architectureNotes: 'Applies Gemini / GPT-4 prompt templates to analyze JD skill gaps and reweight resume bullet points without inventing false experience.'
  },
  {
    id: 'gh_4',
    name: 'Career-Portal-Form-Extractor',
    repo: 'agent-tools/form-extractor',
    stars: 6400,
    description: 'Scrapes and maps form inputs on popular ATS systems like Greenhouse, Lever, Workday, BambooHR, and custom HTML job forms.',
    category: 'Web Scraping',
    features: [
      'Detects common form field types (Work Auth, Salary, Essay)',
      'Automated file attachment handler for PDFs',
      'Bypasses basic anti-bot captcha traps with human emulation',
      'Outputs structured form mapping JSON'
    ],
    pythonCommand: 'python form_extractor.py --url https://company.lever.co/job-123',
    githubUrl: 'https://github.com/agent-tools/form-extractor',
    architectureNotes: 'Performs semantic element labeling on HTML input tags to match user profile fields (e.g. mapping "linkedin_profile_url" -> "linkedin").'
  }
];
