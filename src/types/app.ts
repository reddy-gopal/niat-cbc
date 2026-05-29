import type { Submission } from "@/types/database";

export type ChallengeStatus =
  | "not_started"
  | "pending"
  | "accepted"
  | "rejected";

export type Challenge = {
  id: number;
  title: string;
  day: string;
  points: number;
  description: string;
  /** Optional verifier guidance appended to AI evaluation prompts. */
  verificationHint?: string;
  /** Optional full system prompt override for this challenge's AI verification. */
  verificationPrompt?: string;
  requiresUpload: boolean;
  requiresText?: boolean;
  placeholder?: string;
  maxWords?: number;
  isReferral?: boolean;
  streakDays?: number;
};

export type StudentSession = {
  studentId: string;
  sectionId: string;
  bootcampId: string;
  regionId: string;
  fullName: string;
  mobile: string;
  teamId?: string;
  /** UTM source captured from the join URL, if present. */
  utmSource?: string;
  /** UTM medium captured from the join URL, if present. */
  utmMedium?: string;
  /** UTM campaign captured from the join URL, if present. */
  utmCampaign?: string;
  /** Bootcamp display name (for outbound referral URLs). */
  bootcampName?: string;
  /** Bootcamp date (used to derive default UTM source). */
  bootcampDate?: string;
  /** Region display name (used to derive default UTM source/campaign). */
  regionName?: string;
  /** Section display label, optionally scoped with region (for outbound referral URLs). */
  sectionLabel?: string;
};

export type LeaderboardEntry = {
  rank: number;
  studentId: string;
  fullName: string;
  totalPoints: number;
  completedChallenges: number;
  sectionLabel?: string;
  bootcampName?: string;
  regionName?: string;
  createdAt?: string;
};

export type TeamLeaderboardEntry = {
  rank: number;
  teamId: string;
  name: string;
  leaderName: string;
  averagePoints: number;
  totalPoints: number;
  memberCount: number;
  members: string[];
};

export type AdminUser = {
  id: string;
  email: string;
  role: string;
};

export type Team = {
  id: string;
  name: string;
  section_id: string;
  bootcamp_id: string;
  leader_id: string;
  invite_code: string;
  total_points: number;
  last_point_at: string;
  created_at: string;
};

export type ApiResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type SubmissionWithChallenge = Submission & {
  challengeTitle: string;
  challengePoints: number;
};
