export type JsonObject = Record<string, unknown>;

export type SubmissionStatus =
  | "not_started"
  | "pending"
  | "accepted"
  | "rejected";

export type Database = {
  public: {
    Tables: {
      regions: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      bootcamps: {
        Row: {
          id: string;
          region_id: string;
          name: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          region_id: string;
          name: string;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          region_id?: string;
          name?: string;
          date?: string;
          created_at?: string;
        };
      };
      sections: {
        Row: {
          id: string;
          bootcamp_id: string;
          label: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bootcamp_id: string;
          label: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          bootcamp_id?: string;
          label?: string;
          slug?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: string;
          created_at?: string;
        };
      };
      teams: {
        Row: {
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
        Insert: {
          id?: string;
          name: string;
          section_id: string;
          bootcamp_id: string;
          leader_id: string;
          invite_code: string;
          total_points?: number;
          last_point_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          section_id?: string;
          bootcamp_id?: string;
          leader_id?: string;
          invite_code?: string;
          total_points?: number;
          last_point_at?: string;
          created_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          full_name: string;
          mobile: string;
          section_id: string;
          bootcamp_id: string;
          region_id: string;
          team_id: string | null;
          referred_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          mobile: string;
          section_id: string;
          bootcamp_id: string;
          region_id: string;
          team_id?: string | null;
          referred_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          mobile?: string;
          section_id?: string;
          bootcamp_id?: string;
          region_id?: string;
          team_id?: string | null;
          referred_by?: string | null;
          created_at?: string;
        };
      };
      submissions: {
        Row: {
          id: string;
          student_id: string;
          bootcamp_id: string;
          section_id: string;
          region_id: string;
          task_id: number;
          streak_day: number | null;
          file_url: string | null;
          file_hash: string | null;
          status: SubmissionStatus;
          points: number;
          ai_reason: string | null;
          text_response: string | null;
          resubmit_count: number;
          verification_attempts: number;
          last_attempted_at: string | null;
          verified_at: string | null;
          override_by: string | null;
          override_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          bootcamp_id: string;
          section_id: string;
          region_id: string;
          task_id: number;
          streak_day?: number | null;
          file_url?: string | null;
          file_hash?: string | null;
          status?: SubmissionStatus;
          points?: number;
          ai_reason?: string | null;
          text_response?: string | null;
          resubmit_count?: number;
          verification_attempts?: number;
          last_attempted_at?: string | null;
          verified_at?: string | null;
          override_by?: string | null;
          override_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          bootcamp_id?: string;
          section_id?: string;
          region_id?: string;
          task_id?: number;
          streak_day?: number | null;
          file_url?: string | null;
          file_hash?: string | null;
          status?: SubmissionStatus;
          points?: number;
          ai_reason?: string | null;
          text_response?: string | null;
          resubmit_count?: number;
          verification_attempts?: number;
          last_attempted_at?: string | null;
          verified_at?: string | null;
          override_by?: string | null;
          override_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      submission_attempts: {
        Row: {
          id: string;
          submission_id: string;
          student_id: string;
          task_id: number;
          bootcamp_id: string;
          attempt_number: number;
          file_url: string | null;
          file_hash: string | null;
          status: string;
          prompt_type: "challenge_specific" | "global_fallback" | null;
          prompt_key: string | null;
          prompt_version: string | null;
          ai_reason: string | null;
          text_response: string | null;
          points: number;
          verification_attempts: number;
          last_attempted_at: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          student_id: string;
          task_id: number;
          bootcamp_id: string;
          attempt_number: number;
          file_url?: string | null;
          file_hash?: string | null;
          status?: string;
          prompt_type?: "challenge_specific" | "global_fallback" | null;
          prompt_key?: string | null;
          prompt_version?: string | null;
          ai_reason?: string | null;
          text_response?: string | null;
          points?: number;
          verification_attempts?: number;
          last_attempted_at?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          student_id?: string;
          task_id?: number;
          bootcamp_id?: string;
          attempt_number?: number;
          file_url?: string | null;
          file_hash?: string | null;
          status?: string;
          prompt_type?: "challenge_specific" | "global_fallback" | null;
          prompt_key?: string | null;
          prompt_version?: string | null;
          ai_reason?: string | null;
          text_response?: string | null;
          points?: number;
          verification_attempts?: number;
          last_attempted_at?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          entity: string;
          entity_id: string;
          note: string | null;
          metadata: JsonObject | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          action: string;
          entity: string;
          entity_id: string;
          note?: string | null;
          metadata?: JsonObject | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string;
          note?: string | null;
          metadata?: JsonObject | null;
          created_at?: string;
        };
      };
      otp_attempts: {
        Row: {
          id: string;
          mobile: string;
          request_id: string;
          verified: boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          mobile: string;
          request_id: string;
          verified?: boolean;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          mobile?: string;
          request_id?: string;
          verified?: boolean;
          expires_at?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Region = Database["public"]["Tables"]["regions"]["Row"];
export type Bootcamp = Database["public"]["Tables"]["bootcamps"]["Row"];
export type Section = Database["public"]["Tables"]["sections"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type Submission = Database["public"]["Tables"]["submissions"]["Row"];
export type SubmissionAttemptRow = Database["public"]["Tables"]["submission_attempts"]["Row"];

/** Application shape for a single upload attempt (matches `submission_attempts` row semantics). */
export interface SubmissionAttempt {
  id: string;
  submission_id: string;
  student_id: string;
  task_id: number;
  bootcamp_id: string;
  attempt_number: number;
  file_url: string | null;
  file_hash: string | null;
  status: "pending" | "accepted" | "rejected";
  prompt_type?: "challenge_specific" | "global_fallback" | null;
  prompt_key?: string | null;
  prompt_version?: string | null;
  ai_reason: string | null;
  text_response: string | null;
  points: number;
  verification_attempts: number;
  last_attempted_at: string | null;
  verified_at: string | null;
  created_at: string;
}

/** Client-safe attempt row (storage paths never exposed). */
export interface SafeAttempt
  extends Omit<SubmissionAttempt, "file_url" | "file_hash"> {
  hasProof: boolean;
  text_response: string | null;
}
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type OtpAttempt = Database["public"]["Tables"]["otp_attempts"]["Row"];
