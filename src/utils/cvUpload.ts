import { LlmProviderConfig, UploadedCVFile, UserProfile } from '../types';

export async function uploadAndParseCVFile(
  file: File,
  currentProfile: UserProfile,
  llmConfig?: LlmProviderConfig
): Promise<UserProfile> {
  let fileTextContent = '';
  let fileBase64 = '';
  const mimeType = file.type || 'application/pdf';

  if (file.type.includes('text') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
    fileTextContent = await file.text();
  } else {
    fileBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const res = await fetch('/api/agent/parse-cv-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileTextContent,
      fileBase64,
      mimeType,
      llmConfig,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.success || !data.parsedProfile) {
    throw new Error(data.error || 'Could not parse resume document.');
  }

  const parsed = data.parsedProfile;

  const newFileRecord: UploadedCVFile = {
    id: `cv_${Date.now()}`,
    fileName: file.name,
    fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
    uploadedAt: new Date().toLocaleDateString(),
    fileType: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.docx') ? 'docx' : 'txt',
    isActive: true,
    contentPreview: parsed.customBio || `Resume of ${parsed.fullName || file.name}`,
  };

  const existingCVs = (currentProfile.uploadedCVFiles || []).map((f) => ({ ...f, isActive: false }));

  return {
    ...currentProfile,
    id: `usr_${Date.now()}`,
    fullName: parsed.fullName || currentProfile.fullName,
    email: parsed.email || currentProfile.email,
    phone: parsed.phone || currentProfile.phone,
    location: parsed.location || currentProfile.location,
    linkedinUrl: parsed.linkedinUrl || currentProfile.linkedinUrl,
    githubUrl: parsed.githubUrl || currentProfile.githubUrl,
    portfolioUrl: parsed.portfolioUrl || currentProfile.portfolioUrl,
    skills: Array.isArray(parsed.skills) && parsed.skills.length > 0 ? parsed.skills : currentProfile.skills,
    targetJobTitles:
      Array.isArray(parsed.targetJobTitles) && parsed.targetJobTitles.length > 0
        ? parsed.targetJobTitles
        : currentProfile.targetJobTitles,
    experienceLevel: parsed.experienceLevel || currentProfile.experienceLevel,
    yearsExperience:
      typeof parsed.yearsExperience === 'number' ? parsed.yearsExperience : currentProfile.yearsExperience,
    desiredSalary: parsed.desiredSalary || currentProfile.desiredSalary,
    workAuthorization: parsed.workAuthorization || currentProfile.workAuthorization,
    workHistory:
      Array.isArray(parsed.workHistory) && parsed.workHistory.length > 0
        ? parsed.workHistory
        : currentProfile.workHistory,
    education:
      Array.isArray(parsed.education) && parsed.education.length > 0
        ? parsed.education
        : currentProfile.education,
    projects:
      Array.isArray(parsed.projects) && parsed.projects.length > 0
        ? parsed.projects
        : currentProfile.projects,
    certificationsList:
      Array.isArray(parsed.certificationsList) && parsed.certificationsList.length > 0
        ? parsed.certificationsList
        : currentProfile.certificationsList,
    masterCV: parsed.masterCV || currentProfile.masterCV,
    coverLetterTemplate: parsed.coverLetterTemplate || currentProfile.coverLetterTemplate,
    customBio: parsed.customBio || currentProfile.customBio,
    uploadedCVFiles: [newFileRecord, ...existingCVs],
  };
}
