export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string | null
          student_class: string | null
          roll_no: string | null
          avatar: string | null
          created_at: string
        }
        Insert: {
          id: string
          name?: string
          email?: string | null
          student_class?: string | null
          roll_no?: string | null
          avatar?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          student_class?: string | null
          roll_no?: string | null
          avatar?: string | null
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: "super_admin" | "staff" | "student"
        }
        Insert: {
          id?: string
          user_id: string
          role: "super_admin" | "staff" | "student"
        }
        Update: {
          id?: string
          user_id?: string
          role?: "super_admin" | "staff" | "student"
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          color: string
          motto: string
          captain_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          motto?: string
          captain_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          motto?: string
          captain_id?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      team_members: {
        Row: {
          team_id: string
          user_id: string
        }
        Insert: {
          team_id: string
          user_id: string
        }
        Update: {
          team_id?: string
          user_id?: string
        }
      }
      exams: {
        Row: {
          id: string
          name: string
          subject: string
          date: string
          total_marks: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          subject?: string
          date: string
          total_marks?: number
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          subject?: string
          date?: string
          total_marks?: number
          created_by?: string | null
          created_at?: string
        }
      }
      marks: {
        Row: {
          exam_id: string
          student_id: string
          marks: number
          updated_at: string
        }
        Insert: {
          exam_id: string
          student_id: string
          marks?: number
          updated_at?: string
        }
        Update: {
          exam_id?: string
          student_id?: string
          marks?: number
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          kind: string
          title: string
          body: string | null
          audience: string
          user_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          kind: string
          title: string
          body?: string | null
          audience?: string
          user_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          kind?: string
          title?: string
          body?: string | null
          audience?: string
          user_id?: string | null
          read?: boolean
          created_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          target_id: string | null
          target_label: string | null
          detail: string | null
          created_at: string
        }
        Insert: {
          id?: string
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          target_id?: string | null
          target_label?: string | null
          detail?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          target_id?: string | null
          target_label?: string | null
          detail?: string | null
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      get_user_role: {
        Args: { uid: string }
        Returns: string
      }
      has_role: {
        Args: { _user_id: string; _role: "super_admin" | "staff" | "student" }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "staff" | "student"
    }
  }
}
