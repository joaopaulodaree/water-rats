export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          account_created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          account_created_at?: string;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      water_logs: {
        Row: {
          id: string;
          user_id: string;
          amount_ml: number;
          photo_url: string | null;
          caption: string | null;
          logged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_ml: number;
          photo_url?: string | null;
          caption?: string | null;
          logged_at?: string;
          created_at?: string;
        };
        Update: {
          photo_url?: string | null;
          caption?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "water_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      reactions: {
        Row: {
          id: string;
          log_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          log_id: string;
          user_id: string;
          emoji: string;
        };
        Update: {
          emoji?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reactions_log_id_fkey";
            columns: ["log_id"];
            isOneToOne: false;
            referencedRelation: "water_logs";
            referencedColumns: ["id"];
          }
        ];
      };
      comments: {
        Row: {
          id: string;
          log_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          log_id: string;
          user_id: string;
          body: string;
        };
        Update: {
          body?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_log_id_fkey";
            columns: ["log_id"];
            isOneToOne: false;
            referencedRelation: "water_logs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      achievements: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          condition_type: string;
          condition_value: number;
          is_secret: boolean;
          hidden_name: string | null;
          hidden_description: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          icon: string;
          condition_type: string;
          condition_value: number;
          is_secret?: boolean;
          hidden_name?: string | null;
          hidden_description?: string | null;
        };
        Update: {
          name?: string;
          description?: string;
          icon?: string;
          is_secret?: boolean;
          hidden_name?: string | null;
          hidden_description?: string | null;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          earned_at?: string;
        };
        Update: {
          earned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_achievements: {
        Args: { p_user_id: string; p_log_id: string };
        Returns: string[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
