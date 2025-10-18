export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          is_voice: boolean | null
          language: string | null
          message: string
          response: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_voice?: boolean | null
          language?: string | null
          message: string
          response?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_voice?: boolean | null
          language?: string | null
          message?: string
          response?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crop_calendar: {
        Row: {
          created_at: string | null
          crop_name: string
          expected_harvest_date: string | null
          field_location: string | null
          field_size: number | null
          id: string
          notes: string | null
          planting_date: string
          updated_at: string | null
          user_id: string
          variety: string | null
        }
        Insert: {
          created_at?: string | null
          crop_name: string
          expected_harvest_date?: string | null
          field_location?: string | null
          field_size?: number | null
          id?: string
          notes?: string | null
          planting_date: string
          updated_at?: string | null
          user_id: string
          variety?: string | null
        }
        Update: {
          created_at?: string | null
          crop_name?: string
          expected_harvest_date?: string | null
          field_location?: string | null
          field_size?: number | null
          id?: string
          notes?: string | null
          planting_date?: string
          updated_at?: string | null
          user_id?: string
          variety?: string | null
        }
        Relationships: []
      }
      crop_reminders: {
        Row: {
          created_at: string | null
          crop_calendar_id: string
          description: string | null
          id: string
          is_completed: boolean | null
          reminder_date: string
          reminder_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          crop_calendar_id: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          reminder_date: string
          reminder_type: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          crop_calendar_id?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          reminder_date?: string
          reminder_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_reminders_crop_calendar_id_fkey"
            columns: ["crop_calendar_id"]
            isOneToOne: false
            referencedRelation: "crop_calendar"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_detections: {
        Row: {
          confidence: number | null
          created_at: string | null
          crop_type: string | null
          disease_name: string | null
          id: string
          image_url: string
          remedies: Json | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          crop_type?: string | null
          disease_name?: string | null
          id?: string
          image_url: string
          remedies?: Json | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          crop_type?: string | null
          disease_name?: string | null
          id?: string
          image_url?: string
          remedies?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      farm_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          expense_date: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description?: string | null
          expense_date: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      government_schemes: {
        Row: {
          application_process: string | null
          benefits: string | null
          contact_info: string | null
          created_at: string | null
          description: string
          district: string | null
          eligibility: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          scheme_name: string
          scheme_type: string
          start_date: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          application_process?: string | null
          benefits?: string | null
          contact_info?: string | null
          created_at?: string | null
          description: string
          district?: string | null
          eligibility?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          scheme_name: string
          scheme_type: string
          start_date?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          application_process?: string | null
          benefits?: string | null
          contact_info?: string | null
          created_at?: string | null
          description?: string
          district?: string | null
          eligibility?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          scheme_name?: string
          scheme_type?: string
          start_date?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          created_at: string | null
          crop_name: string
          currency: string | null
          date: string
          district: string
          id: string
          market_name: string
          price_per_quintal: number
          state: string
          updated_at: string | null
          variety: string | null
        }
        Insert: {
          created_at?: string | null
          crop_name: string
          currency?: string | null
          date?: string
          district: string
          id?: string
          market_name: string
          price_per_quintal: number
          state: string
          updated_at?: string | null
          variety?: string | null
        }
        Update: {
          created_at?: string | null
          crop_name?: string
          currency?: string | null
          date?: string
          district?: string
          id?: string
          market_name?: string
          price_per_quintal?: number
          state?: string
          updated_at?: string | null
          variety?: string | null
        }
        Relationships: []
      }
      pest_alert_confirmations: {
        Row: {
          alert_id: string | null
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pest_alert_confirmations_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "pest_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      pest_alerts: {
        Row: {
          confirmed_count: number | null
          created_at: string | null
          crop_affected: string | null
          description: string
          district: string | null
          id: string
          image_url: string | null
          location: string
          pest_name: string
          severity: string
          state: string | null
          user_id: string
        }
        Insert: {
          confirmed_count?: number | null
          created_at?: string | null
          crop_affected?: string | null
          description: string
          district?: string | null
          id?: string
          image_url?: string | null
          location: string
          pest_name: string
          severity: string
          state?: string | null
          user_id: string
        }
        Update: {
          confirmed_count?: number | null
          created_at?: string | null
          crop_affected?: string | null
          description?: string
          district?: string | null
          id?: string
          image_url?: string | null
          location?: string
          pest_name?: string
          severity?: string
          state?: string | null
          user_id?: string
        }
        Relationships: []
      }
        soil_health_records: {
          Row: {
            id: string
            user_id: string | null
            soil_type: string | null
            ph: number | null
            n: number | null
            p: number | null
            k: number | null
            organic_carbon: number | null
            moisture: number | null
            date_created: string | null
          }
          Insert: {
            id?: string
            user_id?: string | null
            soil_type?: string | null
            ph?: number | null
            n?: number | null
            p?: number | null
            k?: number | null
            organic_carbon?: number | null
            moisture?: number | null
            date_created?: string | null
          }
          Update: {
            id?: string
            user_id?: string | null
            soil_type?: string | null
            ph?: number | null
            n?: number | null
            p?: number | null
            k?: number | null
            organic_carbon?: number | null
            moisture?: number | null
            date_created?: string | null
          }
          Relationships: []
        }
      pesticide_recommendations: {
        Row: {
          created_at: string | null
          crop_type: string
          disease: string | null
          dosage: string | null
          id: string
          is_government_approved: boolean | null
          name: string
          safety_period: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          crop_type: string
          disease?: string | null
          dosage?: string | null
          id?: string
          is_government_approved?: boolean | null
          name: string
          safety_period?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          crop_type?: string
          disease?: string | null
          dosage?: string | null
          id?: string
          is_government_approved?: boolean | null
          name?: string
          safety_period?: string | null
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          district: string | null
          full_name: string
          id: string
          language: string | null
          phone: string | null
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          district?: string | null
          full_name: string
          id?: string
          language?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          district?: string | null
          full_name?: string
          id?: string
          language?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weather_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          location: string
          message: string
          severity: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          location: string
          message: string
          severity: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          location?: string
          message?: string
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      yield_predictions: {
        Row: {
          confidence_level: number | null
          created_at: string | null
          crop_name: string
          expected_harvest_date: string | null
          factors: Json | null
          id: string
          predicted_yield: number
          prediction_date: string
          user_id: string
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string | null
          crop_name: string
          expected_harvest_date?: string | null
          factors?: Json | null
          id?: string
          predicted_yield: number
          prediction_date: string
          user_id: string
        }
        Update: {
          confidence_level?: number | null
          created_at?: string | null
          crop_name?: string
          expected_harvest_date?: string | null
          factors?: Json | null
          id?: string
          predicted_yield?: number
          prediction_date?: string
          user_id?: string
        }
        Relationships: []
      }
      yield_records: {
        Row: {
          created_at: string | null
          crop_name: string
          field_location: string | null
          harvest_date: string
          id: string
          quantity: number
          revenue: number | null
          unit: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          crop_name: string
          field_location?: string | null
          harvest_date: string
          id?: string
          quantity: number
          revenue?: number | null
          unit?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          crop_name?: string
          field_location?: string | null
          harvest_date?: string
          id?: string
          quantity?: number
          revenue?: number | null
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
