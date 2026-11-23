import React, { useState, useRef, useEffect } from 'react';
import {
  Save,
  Sparkles,
  Trash2,
  Check,
  RefreshCw,
  Upload,
  RotateCcw,
  X,
} from 'lucide-react';
import { UserProfile, ExperienceLevel, LlmProviderConfig } from '../types';
import { uploadAndParseCVFile } from '../utils/cvUpload';
import { agentFetch } from '../utils/llmClient';

interface CandidateProfileEditorProps {
  userProfile: UserProfile;
  llmConfig?: LlmProviderConfig;
  onSaveProfile: (updatedProfile: UserProfile) => void;
  onResetDemoData?: () => void;
}

export const CandidateProfileEditor: React.FC<CandidateProfileEditorProps> = ({
  userProfile,
  llmConfig,
  onSaveProfile,
  onResetDemoData,
}) => {
  const [profile, setProfile] = useState<UserProfile>(userProfile);
  const [isSaved, setIsSaved] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newTitleInput, setNewTitleInput] = useState('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isUploadingCV, setIsUploadingCV] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(userProfile);
  }, [userProfile]);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleAddSkill = () => {
    if (newSkillInput.trim() && !profile.skills.includes(newSkillInput.trim())) {
      setProfile((prev) => ({ ...prev, skills: [...prev.skills, newSkillInput.trim()] }));
      setNewSkillInput('');
      setIsSaved(false);
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skillToRemove) }));
    setIsSaved(false);
  };

  const handleAddTargetTitle = () => {
    const val = newTitleInput.trim();
    const current = profile.targetJobTitles || [];
    if (val && !current.includes(val)) {
      setProfile((prev) => ({ ...prev, targetJobTitles: [...current, val] }));
      setNewTitleInput('');
      setIsSaved(false);
    }
  };

  const handleRemoveTargetTitle = (titleToRemove: string) => {
    const current = profile.targetJobTitles || [];
    setProfile((prev) => ({ ...prev, targetJobTitles: current.filter((t) => t !== titleToRemove) }));
    setIsSaved(false);
  };

  const handleSave = () => {
    const cleanedProfile: UserProfile = {
      ...profile,
      id: profile.id === 'usr_demo_1' ? `usr_${Date.now()}` : profile.id,
    };
    setProfile(cleanedProfile);
    onSaveProfile(cleanedProfile);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const processCVFile = async (file: File) => {
    setIsUploadingCV(true);
    setUploadMessage({ text: `Parsing "${file.name}"...`, isError: false });

    try {
      const updatedProfile = await uploadAndParseCVFile(file, profile, llmConfig);
      setProfile(updatedProfile);
      onSaveProfile(updatedProfile);

      setUploadMessage({
        text: `Imported profile fields and Markdown CV from "${file.name}".`,
        isError: false,
      });
    } catch (err: any) {
      setUploadMessage({
        text: err.message || 'Failed to parse CV file.',
        isError: true,
      });
    } finally {
      setIsUploadingCV(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCVFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processCVFile(file);
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processCVFile(file);
    }
  };

  const handleSetActiveCV = (cvId: string) => {
    const updatedCVs = (profile.uploadedCVFiles || []).map((f) => ({
      ...f,
      isActive: f.id === cvId,
    }));
    setProfile((prev) => ({ ...prev, uploadedCVFiles: updatedCVs }));
  };

  const handleDeleteUploadedCV = (cvId: string) => {
    const updatedCVs = (profile.uploadedCVFiles || []).filter((f) => f.id !== cvId);
    setProfile((prev) => ({ ...prev, uploadedCVFiles: updatedCVs }));
  };

  const handleAnalyzeCV = async () => {
    setIsAnalyzing(true);
    setAiFeedback(null);
    const benchmarkTitle = profile.targetJobTitles?.[0] || 'Software Engineer';

    try {
      const response = await agentFetch(
        '/api/agent/tailor-resume',
        {
          userProfile: profile,
          jobListing: {
            title: benchmarkTitle,
            company: 'Industry Benchmark',
            description: `Target role: ${benchmarkTitle}. Required skills: ${profile.skills.join(', ')}.`,
          },
        },
        llmConfig
      );
      const data = await response.json();
      if (!response.ok || !data.success || !data.result) {
        throw new Error(data.error || 'Failed to analyze CV.');
      }

      const matched = Array.isArray(data.result.matchedKeywords)
        ? data.result.matchedKeywords.join(', ')
        : profile.skills.slice(0, 6).join(', ');

      setAiFeedback(
        `Benchmark (${benchmarkTitle}) · Estimated ATS Fit: ${data.result.matchScore || 88}%\nMatched Keywords: ${matched}\nNotes: ${data.result.summaryReasoning || 'Well-structured for ATS parsing.'}`
      );
    } catch (err: any) {
      setAiFeedback(`Analysis Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Save Actions */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
            Candidate Profile &amp; Base CV
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Stored locally in your browser. Used across job searches, ATS audits, and PDF resume exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onResetDemoData && (
            <button
              type="button"
              onClick={onResetDemoData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow-2xs transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Demo</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAnalyzeCV}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-zinc-800 dark:text-zinc-100 shadow-2xs transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
            <span>Analyze CV</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors ${
              isSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Saved' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Resume Upload Panel */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={handleFileDrop}
        className={`bg-white dark:bg-zinc-900 border rounded-2xl p-6 sm:p-8 space-y-5 transition-colors ${
          isDraggingFile
            ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
            : 'border-zinc-200 dark:border-zinc-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Import Existing Resume</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Drag &amp; drop or upload a .pdf, .docx, .txt, or .md file to auto-fill contact details, skills, and Markdown CV.
            </p>
          </div>

          <div className="shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCVFileUpload}
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingCV}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-60"
            >
              {isUploadingCV ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Parsing Resume...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Resume</span>
                </>
              )}
            </button>
          </div>
        </div>

        {uploadMessage && (
          <div
            className={`px-4 py-3 rounded-xl border text-sm flex items-center justify-between ${
              uploadMessage.isError
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-200'
                : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
            }`}
          >
            <span>{uploadMessage.text}</span>
            <button
              type="button"
              onClick={() => setUploadMessage(null)}
              aria-label="Dismiss upload message"
              className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-1 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {profile.uploadedCVFiles && profile.uploadedCVFiles.length > 0 && (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            {profile.uploadedCVFiles.map((doc) => (
              <div key={doc.id} className="px-5 py-4 flex items-center justify-between gap-4 text-sm">
                <div className="min-w-0 space-y-0.5">
                  <div className="font-semibold text-zinc-950 dark:text-zinc-100 truncate">{doc.fileName}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {doc.fileSize} · Uploaded {doc.uploadedAt}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {doc.isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      <Check className="w-4 h-4" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetActiveCV(doc.id)}
                      className="px-3.5 py-1.5 rounded-xl text-sm font-semibold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 text-blue-700 dark:text-blue-300"
                    >
                      Set Active
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteUploadedCV(doc.id)}
                    aria-label="Delete uploaded file"
                    className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {aiFeedback && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
          {aiFeedback}
        </div>
      )}

      {/* Main Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
          {/* Contact & Personal */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 text-sm">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              Contact &amp; Links
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Full Name</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Phone Number</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Location</label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">LinkedIn</label>
                <input
                  type="text"
                  value={profile.linkedinUrl}
                  onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">GitHub</label>
                <input
                  type="text"
                  value={profile.githubUrl}
                  onChange={(e) => handleChange('githubUrl', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Portfolio</label>
                <input
                  type="text"
                  value={profile.portfolioUrl}
                  onChange={(e) => handleChange('portfolioUrl', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Role Targeting & Work Auth */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 text-sm">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              Experience &amp; ATS Defaults
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Experience Level</label>
                <select
                  value={profile.experienceLevel}
                  onChange={(e) => handleChange('experienceLevel', e.target.value as ExperienceLevel)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="fresher">Fresher (0-1 yrs)</option>
                  <option value="entry">Entry Level (0-2 yrs)</option>
                  <option value="mid">Mid Level (2-5 yrs)</option>
                  <option value="senior">Senior Level (5+ yrs)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Years of Experience</label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={profile.yearsExperience}
                  onChange={(e) => handleChange('yearsExperience', Number(e.target.value))}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 tabular-nums focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Work Authorization</label>
              <input
                type="text"
                value={profile.workAuthorization}
                onChange={(e) => handleChange('workAuthorization', e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Desired Compensation</label>
                <input
                  type="text"
                  value={profile.desiredSalary}
                  onChange={(e) => handleChange('desiredSalary', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Notice Period</label>
                <input
                  type="text"
                  value={profile.noticePeriod}
                  onChange={(e) => handleChange('noticePeriod', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Professional Summary</label>
              <textarea
                rows={3}
                value={profile.customBio}
                onChange={(e) => handleChange('customBio', e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 leading-relaxed"
              />
            </div>
          </section>

          {/* Target Job Titles & Skills */}
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 text-sm">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              Target Roles &amp; Skills
            </h2>

            <div className="space-y-2.5">
              <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Target Job Titles</label>
              <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl min-h-[44px]">
                {(profile.targetJobTitles || []).map((title) => (
                  <span
                    key={title}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-medium"
                  >
                    <span>{title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTargetTitle(title)}
                      aria-label={`Remove ${title}`}
                      className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  placeholder="Add target title..."
                  value={newTitleInput}
                  onChange={(e) => setNewTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTargetTitle())}
                  className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddTargetTitle}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 font-semibold whitespace-nowrap shadow-xs"
                >
                  Add Title
                </button>
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <label className="text-zinc-700 dark:text-zinc-300 font-medium block">Core Skills</label>
              <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl min-h-[44px]">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-medium"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      aria-label={`Remove ${skill}`}
                      className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  placeholder="Add skill (e.g. Docker, SQL)..."
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 font-semibold whitespace-nowrap shadow-xs"
                >
                  Add Skill
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Master Base Resume Markdown */}
        <div className="lg:col-span-6">
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Master Resume (Markdown)</h2>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">Plaintext / .md</span>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              This Markdown document serves as the source of truth when tailoring resumes and generating PDF exports.
            </p>

            <textarea
              value={profile.masterCV}
              onChange={(e) => handleChange('masterCV', e.target.value)}
              rows={26}
              className="w-full flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 leading-relaxed resize-none"
              placeholder="Paste your master resume in Markdown..."
            />
          </section>
        </div>
      </div>
    </div>
  );
};
