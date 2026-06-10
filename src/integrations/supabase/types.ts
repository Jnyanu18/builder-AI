export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      approvals: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          decision: string;
          drift_report_id: string;
          finding: Json;
          finding_index: number;
          id: string;
          note: string | null;
          project_id: string;
          resulting_blueprint_version_id: string | null;
        };
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision?: string;
          drift_report_id: string;
          finding: Json;
          finding_index: number;
          id?: string;
          note?: string | null;
          project_id: string;
          resulting_blueprint_version_id?: string | null;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision?: string;
          drift_report_id?: string;
          finding?: Json;
          finding_index?: number;
          id?: string;
          note?: string | null;
          project_id?: string;
          resulting_blueprint_version_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "approvals_drift_report_id_fkey";
            columns: ["drift_report_id"];
            isOneToOne: false;
            referencedRelation: "drift_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approvals_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approvals_resulting_blueprint_version_id_fkey";
            columns: ["resulting_blueprint_version_id"];
            isOneToOne: false;
            referencedRelation: "blueprint_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      blueprint_versions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          architecture: Json;
          constraints: Json;
          created_at: string;
          functional_reqs: Json;
          id: string;
          is_draft: boolean;
          milestones: Json;
          nonfunctional_reqs: Json;
          personas: Json;
          project_id: string;
          success_metrics: Json;
          updated_at: string;
          version_number: number;
          vision: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          architecture?: Json;
          constraints?: Json;
          created_at?: string;
          functional_reqs?: Json;
          id?: string;
          is_draft?: boolean;
          milestones?: Json;
          nonfunctional_reqs?: Json;
          personas?: Json;
          project_id: string;
          success_metrics?: Json;
          updated_at?: string;
          version_number: number;
          vision?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          architecture?: Json;
          constraints?: Json;
          created_at?: string;
          functional_reqs?: Json;
          id?: string;
          is_draft?: boolean;
          milestones?: Json;
          nonfunctional_reqs?: Json;
          personas?: Json;
          project_id?: string;
          success_metrics?: Json;
          updated_at?: string;
          version_number?: number;
          vision?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blueprint_versions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      change_history: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          payload: Json;
          project_id: string;
          title: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          payload?: Json;
          project_id: string;
          title: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          payload?: Json;
          project_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "change_history_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          is_ai: boolean;
          project_id: string;
          role: string;
          user_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          is_ai?: boolean;
          project_id: string;
          role?: string;
          user_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          is_ai?: boolean;
          project_id?: string;
          role?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      docs: {
        Row: {
          content: Json;
          created_at: string;
          created_by: string;
          icon: string | null;
          id: string;
          parent_id: string | null;
          position: number;
          project_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          content?: Json;
          created_at?: string;
          created_by: string;
          icon?: string | null;
          id?: string;
          parent_id?: string | null;
          position?: number;
          project_id: string;
          title?: string;
          updated_at?: string;
        };
        Update: {
          content?: Json;
          created_at?: string;
          created_by?: string;
          icon?: string | null;
          id?: string;
          parent_id?: string | null;
          position?: number;
          project_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "docs_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "docs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "docs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      drift_reports: {
        Row: {
          alignment_score: number;
          blueprint_version_id: string | null;
          created_at: string;
          drift_score: number;
          feature_coverage: Json;
          findings: Json;
          id: string;
          project_id: string;
          reality_model_id: string | null;
          summary: string | null;
        };
        Insert: {
          alignment_score?: number;
          blueprint_version_id?: string | null;
          created_at?: string;
          drift_score?: number;
          feature_coverage?: Json;
          findings?: Json;
          id?: string;
          project_id: string;
          reality_model_id?: string | null;
          summary?: string | null;
        };
        Update: {
          alignment_score?: number;
          blueprint_version_id?: string | null;
          created_at?: string;
          drift_score?: number;
          feature_coverage?: Json;
          findings?: Json;
          id?: string;
          project_id?: string;
          reality_model_id?: string | null;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "drift_reports_blueprint_version_id_fkey";
            columns: ["blueprint_version_id"];
            isOneToOne: false;
            referencedRelation: "blueprint_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drift_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drift_reports_reality_model_id_fkey";
            columns: ["reality_model_id"];
            isOneToOne: false;
            referencedRelation: "reality_models";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_invites: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          id: string;
          invited_by: string;
          project_id: string;
          role: Database["public"]["Enums"]["project_role"];
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          invited_by: string;
          project_id: string;
          role?: Database["public"]["Enums"]["project_role"];
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          invited_by?: string;
          project_id?: string;
          role?: Database["public"]["Enums"]["project_role"];
        };
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          created_at: string;
          id: string;
          project_id: string;
          role: Database["public"]["Enums"]["project_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          project_id: string;
          role?: Database["public"]["Enums"]["project_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          project_id?: string;
          role?: Database["public"]["Enums"]["project_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          api_token: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          owner_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          api_token?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          api_token?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reality_models: {
        Row: {
          api_routes: Json;
          backend: string | null;
          created_at: string;
          database: string | null;
          dependencies: Json;
          features: Json;
          frontend: string | null;
          id: string;
          infrastructure: Json;
          project_id: string;
          scan_id: string;
          services: Json;
          summary: string | null;
        };
        Insert: {
          api_routes?: Json;
          backend?: string | null;
          created_at?: string;
          database?: string | null;
          dependencies?: Json;
          features?: Json;
          frontend?: string | null;
          id?: string;
          infrastructure?: Json;
          project_id: string;
          scan_id: string;
          services?: Json;
          summary?: string | null;
        };
        Update: {
          api_routes?: Json;
          backend?: string | null;
          created_at?: string;
          database?: string | null;
          dependencies?: Json;
          features?: Json;
          frontend?: string | null;
          id?: string;
          infrastructure?: Json;
          project_id?: string;
          scan_id?: string;
          services?: Json;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reality_models_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reality_models_scan_id_fkey";
            columns: ["scan_id"];
            isOneToOne: false;
            referencedRelation: "repository_scans";
            referencedColumns: ["id"];
          },
        ];
      };
      repositories: {
        Row: {
          access_token: string | null;
          branch: string;
          created_at: string;
          github_owner: string;
          github_repo: string;
          id: string;
          last_commit_sha: string | null;
          last_scan_at: string | null;
          project_id: string;
          status: string;
          updated_at: string;
          webhook_secret: string;
        };
        Insert: {
          access_token?: string | null;
          branch?: string;
          created_at?: string;
          github_owner: string;
          github_repo: string;
          id?: string;
          last_commit_sha?: string | null;
          last_scan_at?: string | null;
          project_id: string;
          status?: string;
          updated_at?: string;
          webhook_secret?: string;
        };
        Update: {
          access_token?: string | null;
          branch?: string;
          created_at?: string;
          github_owner?: string;
          github_repo?: string;
          id?: string;
          last_commit_sha?: string | null;
          last_scan_at?: string | null;
          project_id?: string;
          status?: string;
          updated_at?: string;
          webhook_secret?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repositories_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      repository_scans: {
        Row: {
          commit_sha: string | null;
          error: string | null;
          finished_at: string | null;
          id: string;
          project_id: string;
          raw_files: Json;
          repository_id: string;
          started_at: string;
          status: string;
        };
        Insert: {
          commit_sha?: string | null;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          project_id: string;
          raw_files?: Json;
          repository_id: string;
          started_at?: string;
          status?: string;
        };
        Update: {
          commit_sha?: string | null;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          project_id?: string;
          raw_files?: Json;
          repository_id?: string;
          started_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repository_scans_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "repository_scans_repository_id_fkey";
            columns: ["repository_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_project_member: {
        Args: { _project_id: string; _user_id: string };
        Returns: boolean;
      };
      owns_project: { Args: { _project_id: string }; Returns: boolean };
    };
    Enums: {
      project_role: "owner" | "editor" | "viewer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      project_role: ["owner", "editor", "viewer"],
    },
  },
} as const;
