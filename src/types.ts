export interface AnalysisReport {
  id: string;
  userId: string;
  imageUrl: string;
  imageName: string;
  feedback: string;
  createdAt: string;
  isFavorite: boolean;
  designType?: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  subscriptionPlan?: string;
  languagePreference?: string;
  darkMode?: boolean;
  bio?: string;
  jobTitle?: string;
  notifications?: boolean;
}

export interface SecurityConfig {
  geminiApiKey: string;
  modelName: string;
  temperature: number;
  maxTokens?: number;
  adminPin?: string;
}
