export type ExperienceLevel = 'fresher' | 'entry' | 'mid' | 'senior';

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  year: string;
  gpa?: string;
  fieldOfStudy?: string;
}

export interface WorkHistoryItem {
  id: string;
  company: string;
  role: string;
  duration: string;
  highlights: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  link?: string;
}

export interface UploadedCVFile {
  id: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  fileType: string; // 'pdf' | 'docx' | 'txt'
  contentPreview?: string;
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  experienceLevel: ExperienceLevel;
  yearsExperience: number;
  desiredSalary: string;
  workAuthorization: string; // e.g. "Authorized to work without sponsorship", "US Citizen", etc.
  requiresSponsorship: boolean;
  noticePeriod: string;
  skills: string[];
  education: EducationItem[];
  workHistory: WorkHistoryItem[];
  projects: ProjectItem[];
  masterCV: string; // Base Markdown/text resume
  customBio: string;
  uploadedCVFiles?: UploadedCVFile[];
}

export interface IndeedFilterState {
  datePosted: 'anytime' | '24h' | '3d' | '7d' | '14d';
  jobType: 'all' | 'fulltime' | 'parttime' | 'contract' | 'internship' | 'temporary';
  experienceLevel: 'fresher' | 'entry' | 'mid' | 'senior' | 'all';
  minSalary: 'any' | '40k' | '60k' | '80k' | '100k' | '120k';
  locationType: 'remote_only' | 'hybrid' | 'onsite' | 'all';
  companyType: 'direct_only' | 'agency_ok';
  sortBy: 'relevance' | 'date';
  radius: 'exact' | '25' | '50' | '100';
}

export interface SavedSearchAlert {
  id: string;
  name: string;
  queryKeywords: string[];
  targetTitles: string[];
  locationType: 'remote_only' | 'hybrid' | 'onsite' | 'all';
  experienceLevel: 'fresher' | 'entry' | 'mid' | 'senior' | 'all';
  datePosted: 'anytime' | '24h' | '3d' | '7d' | '14d';
  minSalary?: string;
  isEnabled: boolean;
  lastRunAt?: string;
  matchesFoundCount?: number;
}

export interface ScheduleConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekdays' | 'custom';
  daysOfWeek: string[]; // ['Mon', 'Wed', 'Fri']
  runTime: string; // "09:00"
  maxAppsPerRun: number;
  minMatchScore: number; // e.g., 75%
  isRemoteOnly: boolean;
  fresherOnly: boolean;
  targetTitles: string[];
  locations: string[];
  excludedCompanies: string[];
  notifyViaEmail: boolean;
  syncGoogleTasks: boolean;
  savedSearchAlerts?: SavedSearchAlert[];
}

export type JobApplyMethod = 'indeed_direct' | 'company_portal' | 'email_apply' | 'external_form';

export interface JobCompatibilityAnalysis {
  jobId: string;
  overallScore: number;
  scoreBreakdown: {
    skillsMatchScore: number;
    experienceMatchScore: number;
    educationMatchScore: number;
    domainKnowledgeScore: number;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  matchedRequirements: string[];
  missingRequirements: string[];
  strengths: string[];
  gapRecommendations: string[];
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  jobType: string; // Remote, Full-Time, Internship, Contract
  experienceReq: string; // Fresher / 0-1 Yrs / Entry Level
  source: 'Indeed' | 'LinkedIn' | 'Glassdoor' | 'Company Careers' | 'Direct Board';
  sourceUrl: string;
  postedDate: string;
  description: string;
  companyDomain?: string;
  careerPageUrl?: string;
  matchScore: number; // 0-100
  matchReasoning: string;
  requiredSkills: string[];
  applyMethod: JobApplyMethod;
  status: 'discovered' | 'company_found' | 'cv_tailored' | 'form_mapped' | 'applied' | 'failed' | 'skipped';
  discoveredAt: string;
}

export interface FormFieldMapping {
  fieldLabel: string;
  fieldType: 'text' | 'email' | 'phone' | 'dropdown' | 'radio' | 'textarea' | 'file_upload';
  fieldName: string;
  valueToFill: string;
  explanation: string;
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  appliedAt: string;
  matchScore: number;
  tailoredCV: string;
  tailoredCoverLetter: string;
  formFieldsFilled: FormFieldMapping[];
  applyMethod: JobApplyMethod;
  companyCareerPageUrl?: string;
  confirmationDetails: string;
  status: 'applied' | 'under_review' | 'interview_scheduled' | 'action_required' | 'rejected';
  notes: string;
}

export type AgentStep = 
  | 'IDLE'
  | 'SEARCHING_INDEED'
  | 'EVALUATING_MATCH'
  | 'FINDING_COMPANY_SITE'
  | 'DISCOVERING_CAREER_PAGE'
  | 'TAILORING_RESUME'
  | 'MAPPING_FORM'
  | 'SUBMITTING_APPLICATION'
  | 'COMPLETE'
  | 'ERROR';

export interface AgentLog {
  id: string;
  timestamp: string;
  step: AgentStep;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'thought';
  jobTitle?: string;
  company?: string;
  details?: Record<string, any>;
}

export interface GitHubTool {
  id: string;
  name: string;
  repo: string;
  stars: number;
  description: string;
  category: 'Full Automation' | 'CV Tailoring' | 'Web Scraping' | 'Browser Bot';
  features: string[];
  pythonCommand: string;
  githubUrl: string;
  architectureNotes: string;
}
