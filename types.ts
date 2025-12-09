
export interface User {
  username: string;
  createdAt: number;
}

export interface UserProfile {
  content: string;
  fileName: string;
}

export interface JobDetails {
  title: string;
  company: string;
  description: string;
}

export interface InterviewQuestion {
  question: string;
  context: string; // Why this is being asked
  suggestedAnswer: string; // Bullet points on how to answer
}

export interface EmailKit {
  linkedInConnection: string;
  followUpEmail: string;
}

export interface GeneratedAssets {
  resumeHtml: string;
  coverLetter?: string;
  strategyStory?: string;
  interviewPrep?: InterviewQuestion[];
  emailKit?: EmailKit;
}

export interface GenerationOptions {
  coverLetter: boolean;
  strategy: boolean;
  interviewPrep: boolean;
  outreach: boolean;
}

export type ApplicationStatus = 'active' | 'rejected' | 'hired' | 'ghosted';

export interface RecruitmentStage {
  id: string;
  label: string; // e.g. "Phone Screen", "Technical"
  completed: boolean;
  current: boolean;
  date?: string;
}

export interface ApplicationRecord {
  id: string;
  date: string;
  title: string;
  company: string;
  // Saved Context for future generation
  description: string; 
  profileContent: string;
  
  assets: GeneratedAssets;
  overallStatus: ApplicationStatus;
  stages: RecruitmentStage[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface AppState {
  status: AppStatus;
  userProfile: UserProfile | null;
  jobDetails: JobDetails;
  results: GeneratedAssets | null;
  error: string | null;
}

export interface UsageLog {
  timestamp: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  taskType: string;
}

export interface TokenStats {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  modelBreakdown: Record<string, { tokens: number; cost: number }>;
}