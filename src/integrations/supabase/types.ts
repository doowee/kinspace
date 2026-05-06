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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_source: string
          class_id: string
          created_at: string
          id: string
          reminder_sent: boolean
          status: Database["public"]["Enums"]["booking_status"]
          studio_id: string
          user_id: string
        }
        Insert: {
          booking_source?: string
          class_id: string
          created_at?: string
          id?: string
          reminder_sent?: boolean
          status?: Database["public"]["Enums"]["booking_status"]
          studio_id: string
          user_id: string
        }
        Update: {
          booking_source?: string
          class_id?: string
          created_at?: string
          id?: string
          reminder_sent?: boolean
          status?: Database["public"]["Enums"]["booking_status"]
          studio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          capacity_booked: number
          capacity_total: number
          class_type: string | null
          created_at: string
          description: string | null
          id: string
          instructor_id: string | null
          name: string
          start_time: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          capacity_booked?: number
          capacity_total?: number
          class_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_id?: string | null
          name: string
          start_time: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          capacity_booked?: number
          capacity_total?: number
          class_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_id?: string | null
          name?: string
          start_time?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_requests: {
        Row: {
          class_id: string
          created_at: string
          eligible_count: number
          id: string
          requesting_instructor_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          eligible_count?: number
          id?: string
          requesting_instructor_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          eligible_count?: number
          id?: string
          requesting_instructor_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_requests_requesting_instructor_id_fkey"
            columns: ["requesting_instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_requests_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      instructors: {
        Row: {
          authorized_studios: string[] | null
          bio: string | null
          certified_class_types: string[] | null
          created_at: string
          display_order: number
          home_studio_id: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          photo_url: string | null
          pin_code: string | null
          studio_id: string | null
          user_id: string | null
        }
        Insert: {
          authorized_studios?: string[] | null
          bio?: string | null
          certified_class_types?: string[] | null
          created_at?: string
          display_order?: number
          home_studio_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          photo_url?: string | null
          pin_code?: string | null
          studio_id?: string | null
          user_id?: string | null
        }
        Update: {
          authorized_studios?: string[] | null
          bio?: string | null
          certified_class_types?: string[] | null
          created_at?: string
          display_order?: number
          home_studio_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          photo_url?: string | null
          pin_code?: string | null
          studio_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructors_home_studio_id_fkey"
            columns: ["home_studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructors_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          credits: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          price: number
          studio_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          price?: number
          studio_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          price?: number
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          access_scope: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          point_value: number | null
          price: number
          product_type: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          studio_id: string | null
          updated_at: string
        }
        Insert: {
          access_scope?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          point_value?: number | null
          price?: number
          product_type: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          studio_id?: string | null
          updated_at?: string
        }
        Update: {
          access_scope?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          point_value?: number | null
          price?: number
          product_type?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          studio_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          class_points: number
          created_at: string
          email: string
          first_name: string | null
          home_studio_id: string | null
          id: string
          injury_notes: string | null
          last_name: string | null
          membership_tier: string | null
          notification_preferences: Json
          organization_id: string | null
          phone: string | null
          sms_opted_out: boolean
          sms_opted_out_at: string | null
          staff_notes: string | null
          staff_ui_prefs: Json
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          class_points?: number
          created_at?: string
          email: string
          first_name?: string | null
          home_studio_id?: string | null
          id: string
          injury_notes?: string | null
          last_name?: string | null
          membership_tier?: string | null
          notification_preferences?: Json
          organization_id?: string | null
          phone?: string | null
          sms_opted_out?: boolean
          sms_opted_out_at?: string | null
          staff_notes?: string | null
          staff_ui_prefs?: Json
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          class_points?: number
          created_at?: string
          email?: string
          first_name?: string | null
          home_studio_id?: string | null
          id?: string
          injury_notes?: string | null
          last_name?: string | null
          membership_tier?: string | null
          notification_preferences?: Json
          organization_id?: string | null
          phone?: string | null
          sms_opted_out?: boolean
          sms_opted_out_at?: string | null
          staff_notes?: string | null
          staff_ui_prefs?: Json
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_home_studio_id_fkey"
            columns: ["home_studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_campaign_audit: {
        Row: {
          campaign_id: string | null
          created_at: string
          error_message: string | null
          id: string
          mode: string
          outcome: string
          reason: string | null
          recipient_email: string | null
          recipient_phone: string | null
          recipient_user_id: string | null
          sender_id: string
          studio_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          mode: string
          outcome: string
          reason?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          sender_id: string
          studio_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          mode?: string
          outcome?: string
          reason?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          sender_id?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_campaign_audit_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sms_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_campaigns: {
        Row: {
          body_preview: string | null
          created_at: string
          failed_count: number
          id: string
          mode: string
          recipient_count: number
          sender_id: string
          sent_count: number
          skipped_count: number
          studio_id: string
        }
        Insert: {
          body_preview?: string | null
          created_at?: string
          failed_count?: number
          id?: string
          mode: string
          recipient_count?: number
          sender_id: string
          sent_count?: number
          skipped_count?: number
          studio_id: string
        }
        Update: {
          body_preview?: string | null
          created_at?: string
          failed_count?: number
          id?: string
          mode?: string
          recipient_count?: number
          sender_id?: string
          sent_count?: number
          skipped_count?: number
          studio_id?: string
        }
        Relationships: []
      }
      studio_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["studio_role"]
          studio_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["studio_role"]
          studio_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["studio_role"]
          studio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_members_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_sms_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          mode: string
          studio_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          mode: string
          studio_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          mode?: string
          studio_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      studios: {
        Row: {
          brand_background: string | null
          brand_highlight: string | null
          brand_primary: string | null
          brand_secondary: string | null
          brand_text: string | null
          created_at: string
          currency: string
          id: string
          late_cancel_fee: number | null
          late_cancel_window_hours: number
          location: string | null
          logo_url: string | null
          name: string
          organization_id: string | null
          owner_id: string
          primary_color: string | null
          slug: string
          stripe_account_id: string | null
          subscription_tier: string
          timezone: string
          updated_at: string
        }
        Insert: {
          brand_background?: string | null
          brand_highlight?: string | null
          brand_primary?: string | null
          brand_secondary?: string | null
          brand_text?: string | null
          created_at?: string
          currency?: string
          id?: string
          late_cancel_fee?: number | null
          late_cancel_window_hours?: number
          location?: string | null
          logo_url?: string | null
          name: string
          organization_id?: string | null
          owner_id: string
          primary_color?: string | null
          slug: string
          stripe_account_id?: string | null
          subscription_tier?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          brand_background?: string | null
          brand_highlight?: string | null
          brand_primary?: string | null
          brand_secondary?: string | null
          brand_text?: string | null
          created_at?: string
          currency?: string
          id?: string
          late_cancel_fee?: number | null
          late_cancel_window_hours?: number
          location?: string | null
          logo_url?: string | null
          name?: string
          organization_id?: string | null
          owner_id?: string
          primary_color?: string | null
          slug?: string
          stripe_account_id?: string | null
          subscription_tier?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studios_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["transaction_status"]
          studio_id: string
          type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["transaction_status"]
          studio_id: string
          type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["transaction_status"]
          studio_id?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          product_id: string
          status: string
          studio_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          product_id: string
          status?: string
          studio_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          product_id?: string
          status?: string
          studio_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_class_with_credit: {
        Args: { p_class_id: string; p_studio_id: string }
        Returns: string
      }
      cancel_booking_logic: {
        Args: { _booking_id: string; _user_id: string }
        Returns: string
      }
      create_studio_with_membership: {
        Args: { _location?: string; _name: string; _slug: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_public_classes_by_studio_slug: {
        Args: { _slug: string }
        Returns: {
          capacity: number
          description: string
          id: string
          instructor_bio: string
          instructor_first_name: string
          instructor_last_name: string
          name: string
          start_time: string
        }[]
      }
      get_public_studio_by_slug: {
        Args: { _slug: string }
        Returns: {
          brand_background: string
          brand_highlight: string
          brand_primary: string
          brand_secondary: string
          brand_text: string
          id: string
          location: string
          logo_url: string
          name: string
          slug: string
        }[]
      }
      get_studio_role: {
        Args: { _studio_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["studio_role"]
      }
      handle_class_booking: {
        Args: { p_class_id: string; p_studio_id: string }
        Returns: string
      }
      increment_class_points: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_studio_member: {
        Args: { _studio_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_user_id_by_email: { Args: { _email: string }; Returns: string }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      booking_status:
        | "confirmed"
        | "cancelled"
        | "waitlist"
        | "late_cancelled"
        | "checked_in"
      payment_method: "card" | "cash" | "transfer" | "check"
      studio_role: "owner" | "instructor" | "student" | "admin" | "front_desk"
      transaction_status: "completed" | "refunded" | "failed"
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
    Enums: {
      booking_status: [
        "confirmed",
        "cancelled",
        "waitlist",
        "late_cancelled",
        "checked_in",
      ],
      payment_method: ["card", "cash", "transfer", "check"],
      studio_role: ["owner", "instructor", "student", "admin", "front_desk"],
      transaction_status: ["completed", "refunded", "failed"],
    },
  },
} as const
