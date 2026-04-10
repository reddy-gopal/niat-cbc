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
  requiresUpload: boolean;
};

export type StudentSession = {
  studentId: string;
  sectionId: string;
  bootcampId: string;
  regionId: string;
  fullName: string;
  mobile: string;
};

export type LeaderboardEntry = {
  rank: number;
  studentId: string;
  fullName: string;
  totalPoints: number;
  completedChallenges: number;
};

export type AdminUser = {
  id: string;
  email: string;
  role: string;
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
