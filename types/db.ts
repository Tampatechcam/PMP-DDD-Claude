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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      buildings: {
        Row: {
          id: string
          name: string
          venue_id: string
        }
        Insert: {
          id?: string
          name: string
          venue_id: string
        }
        Update: {
          id?: string
          name?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          business_name: string | null
          business_website: string | null
          created_at: string | null
          default_class_type: string | null
          default_digital_budget: number | null
          default_mailer_rate: number | null
          default_mailer_type: string | null
          default_mailing_quantity: number | null
          description: string | null
          direct_mail_discount: string | null
          disclaimer: string | null
          ein: string | null
          ein_match_name: string | null
          id: string
          is_group: boolean | null
          is_non_profit: boolean | null
          name: string
          notes: string | null
          responsibility: string | null
          start_before_paid: boolean | null
          tech_sequences: string | null
        }
        Insert: {
          business_name?: string | null
          business_website?: string | null
          created_at?: string | null
          default_class_type?: string | null
          default_digital_budget?: number | null
          default_mailer_rate?: number | null
          default_mailer_type?: string | null
          default_mailing_quantity?: number | null
          description?: string | null
          direct_mail_discount?: string | null
          disclaimer?: string | null
          ein?: string | null
          ein_match_name?: string | null
          id?: string
          is_group?: boolean | null
          is_non_profit?: boolean | null
          name: string
          notes?: string | null
          responsibility?: string | null
          start_before_paid?: boolean | null
          tech_sequences?: string | null
        }
        Update: {
          business_name?: string | null
          business_website?: string | null
          created_at?: string | null
          default_class_type?: string | null
          default_digital_budget?: number | null
          default_mailer_rate?: number | null
          default_mailer_type?: string | null
          default_mailing_quantity?: number | null
          description?: string | null
          direct_mail_discount?: string | null
          disclaimer?: string | null
          ein?: string | null
          ein_match_name?: string | null
          id?: string
          is_group?: boolean | null
          is_non_profit?: boolean | null
          name?: string
          notes?: string | null
          responsibility?: string | null
          start_before_paid?: boolean | null
          tech_sequences?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          cc_processing: number | null
          created_at: string | null
          fl_state_tax: number | null
          id: string
          invoice_paid_date: string | null
          invoice_sent_date: string | null
          invoiced_digital: number | null
          invoiced_dm_rate: number | null
          invoiced_dm_total: number | null
          invoiced_tech: number | null
          order_id: string
          status: string
          total_invoice: number | null
        }
        Insert: {
          cc_processing?: number | null
          created_at?: string | null
          fl_state_tax?: number | null
          id?: string
          invoice_paid_date?: string | null
          invoice_sent_date?: string | null
          invoiced_digital?: number | null
          invoiced_dm_rate?: number | null
          invoiced_dm_total?: number | null
          invoiced_tech?: number | null
          order_id: string
          status?: string
          total_invoice?: number | null
        }
        Update: {
          cc_processing?: number | null
          created_at?: string | null
          fl_state_tax?: number | null
          id?: string
          invoice_paid_date?: string | null
          invoice_sent_date?: string | null
          invoiced_digital?: number | null
          invoiced_dm_rate?: number | null
          invoiced_dm_total?: number | null
          invoiced_tech?: number | null
          order_id?: string
          status?: string
          total_invoice?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_display_status"
            referencedColumns: ["id"]
          },
        ]
      }
      offices: {
        Row: {
          advisor_names: string[] | null
          business_address: Json | null
          cc_emails: string[] | null
          client_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          mailer_return_address: Json | null
          main_contact: Json | null
          name: string
          notes: string | null
          registration_phone: string | null
          registration_url_digital: string | null
          registration_url_direct: string | null
          secondary_contact: Json | null
          state: string | null
        }
        Insert: {
          advisor_names?: string[] | null
          business_address?: Json | null
          cc_emails?: string[] | null
          client_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          mailer_return_address?: Json | null
          main_contact?: Json | null
          name: string
          notes?: string | null
          registration_phone?: string | null
          registration_url_digital?: string | null
          registration_url_direct?: string | null
          secondary_contact?: Json | null
          state?: string | null
        }
        Update: {
          advisor_names?: string[] | null
          business_address?: Json | null
          cc_emails?: string[] | null
          client_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          mailer_return_address?: Json | null
          main_contact?: Json | null
          name?: string
          notes?: string | null
          registration_phone?: string | null
          registration_url_digital?: string | null
          registration_url_direct?: string | null
          secondary_contact?: Json | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_self_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor: string | null
          created_at: string | null
          event: string
          id: number
          order_id: string
          payload: Json | null
        }
        Insert: {
          actor?: string | null
          created_at?: string | null
          event: string
          id?: number
          order_id: string
          payload?: Json | null
        }
        Update: {
          actor?: string | null
          created_at?: string | null
          event?: string
          id?: number
          order_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_display_status"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          advisor_name: string | null
          building_id: string | null
          charity: string | null
          class_type: string | null
          client_approval_deadline: string | null
          client_id: string
          created_at: string | null
          created_by: string | null
          digital_budget: number | null
          digital_disclaimer: string | null
          digital_status: string | null
          display_ref: string | null
          dm_status: string | null
          end_time: string | null
          ethnicity_avoid: string | null
          event_1_date: string | null
          event_1_room: string | null
          event_2_date: string | null
          event_2_room: string | null
          event_3_date: string | null
          event_3_room: string | null
          event_4_date: string | null
          event_4_room: string | null
          first_class_day: string | null
          id: string
          invoice_status: string | null
          job_name: string | null
          landing_page_url_digital: string | null
          landing_page_url_direct: string | null
          mailer_return_address_override: Json | null
          mailer_type: string | null
          mailing_quantity: number | null
          main_status: string | null
          market: string | null
          needs_digital: boolean | null
          needs_direct_mail: boolean | null
          needs_google_sheet: boolean | null
          notes: string | null
          office_id: string | null
          order_instructions: string | null
          order_number: number
          order_sent_deadline: string | null
          privacy_company_name: string | null
          privacy_company_website: string | null
          qa_status: string | null
          qr_code_link: string | null
          room_id: string | null
          selected_mailer_design: string | null
          sending_list_folder_url: string | null
          sheet_needed: string | null
          start_time: string | null
          teledirect_added: string | null
          time_notes: string | null
          tp_status: string | null
          updated_at: string | null
          venue_address_text: string | null
          venue_id: string | null
          venue_text: string | null
        }
        Insert: {
          advisor_name?: string | null
          building_id?: string | null
          charity?: string | null
          class_type?: string | null
          client_approval_deadline?: string | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          digital_budget?: number | null
          digital_disclaimer?: string | null
          digital_status?: string | null
          display_ref?: string | null
          dm_status?: string | null
          end_time?: string | null
          ethnicity_avoid?: string | null
          event_1_date?: string | null
          event_1_room?: string | null
          event_2_date?: string | null
          event_2_room?: string | null
          event_3_date?: string | null
          event_3_room?: string | null
          event_4_date?: string | null
          event_4_room?: string | null
          first_class_day?: string | null
          id?: string
          invoice_status?: string | null
          job_name?: string | null
          landing_page_url_digital?: string | null
          landing_page_url_direct?: string | null
          mailer_return_address_override?: Json | null
          mailer_type?: string | null
          mailing_quantity?: number | null
          main_status?: string | null
          market?: string | null
          needs_digital?: boolean | null
          needs_direct_mail?: boolean | null
          needs_google_sheet?: boolean | null
          notes?: string | null
          office_id?: string | null
          order_instructions?: string | null
          order_number: number
          order_sent_deadline?: string | null
          privacy_company_name?: string | null
          privacy_company_website?: string | null
          qa_status?: string | null
          qr_code_link?: string | null
          room_id?: string | null
          selected_mailer_design?: string | null
          sending_list_folder_url?: string | null
          sheet_needed?: string | null
          start_time?: string | null
          teledirect_added?: string | null
          time_notes?: string | null
          tp_status?: string | null
          updated_at?: string | null
          venue_address_text?: string | null
          venue_id?: string | null
          venue_text?: string | null
        }
        Update: {
          advisor_name?: string | null
          building_id?: string | null
          charity?: string | null
          class_type?: string | null
          client_approval_deadline?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          digital_budget?: number | null
          digital_disclaimer?: string | null
          digital_status?: string | null
          display_ref?: string | null
          dm_status?: string | null
          end_time?: string | null
          ethnicity_avoid?: string | null
          event_1_date?: string | null
          event_1_room?: string | null
          event_2_date?: string | null
          event_2_room?: string | null
          event_3_date?: string | null
          event_3_room?: string | null
          event_4_date?: string | null
          event_4_room?: string | null
          first_class_day?: string | null
          id?: string
          invoice_status?: string | null
          job_name?: string | null
          landing_page_url_digital?: string | null
          landing_page_url_direct?: string | null
          mailer_return_address_override?: Json | null
          mailer_type?: string | null
          mailing_quantity?: number | null
          main_status?: string | null
          market?: string | null
          needs_digital?: boolean | null
          needs_direct_mail?: boolean | null
          needs_google_sheet?: boolean | null
          notes?: string | null
          office_id?: string | null
          order_instructions?: string | null
          order_number?: number
          order_sent_deadline?: string | null
          privacy_company_name?: string | null
          privacy_company_website?: string | null
          qa_status?: string | null
          qr_code_link?: string | null
          room_id?: string | null
          selected_mailer_design?: string | null
          sending_list_folder_url?: string | null
          sheet_needed?: string | null
          start_time?: string | null
          teledirect_added?: string | null
          time_notes?: string | null
          tp_status?: string | null
          updated_at?: string | null
          venue_address_text?: string | null
          venue_id?: string | null
          venue_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_self_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_self_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      proofs: {
        Row: {
          client_comment: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          id: string
          order_id: string
          status: string
          storage_path: string
          version: number
        }
        Insert: {
          client_comment?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          order_id: string
          status?: string
          storage_path: string
          version?: number
        }
        Update: {
          client_comment?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          order_id?: string
          status?: string
          storage_path?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_display_status"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          building_id: string
          capacity: number | null
          id: string
          name: string
        }
        Insert: {
          building_id: string
          capacity?: number | null
          id?: string
          name: string
        }
        Update: {
          building_id?: string
          capacity?: number | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: Json | null
          applicable_class_types: string[] | null
          asset_availability: string | null
          client_id: string
          created_at: string | null
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          address?: Json | null
          applicable_class_types?: string[] | null
          asset_availability?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          address?: Json | null
          applicable_class_types?: string[] | null
          asset_availability?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_self_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      client_self_view: {
        Row: {
          business_name: string | null
          business_website: string | null
          default_class_type: string | null
          default_digital_budget: number | null
          default_mailer_type: string | null
          default_mailing_quantity: number | null
          disclaimer: string | null
          ein: string | null
          id: string | null
          is_non_profit: boolean | null
          name: string | null
        }
        Insert: {
          business_name?: string | null
          business_website?: string | null
          default_class_type?: string | null
          default_digital_budget?: number | null
          default_mailer_type?: string | null
          default_mailing_quantity?: number | null
          disclaimer?: string | null
          ein?: string | null
          id?: string | null
          is_non_profit?: boolean | null
          name?: string | null
        }
        Update: {
          business_name?: string | null
          business_website?: string | null
          default_class_type?: string | null
          default_digital_budget?: number | null
          default_mailer_type?: string | null
          default_mailing_quantity?: number | null
          disclaimer?: string | null
          ein?: string | null
          id?: string | null
          is_non_profit?: boolean | null
          name?: string | null
        }
        Relationships: []
      }
      orders_with_display_status: {
        Row: {
          advisor_name: string | null
          building_id: string | null
          charity: string | null
          class_type: string | null
          client_approval_deadline: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          digital_budget: number | null
          digital_disclaimer: string | null
          digital_status: string | null
          display_ref: string | null
          display_status: string | null
          dm_status: string | null
          end_time: string | null
          ethnicity_avoid: string | null
          event_1_date: string | null
          event_1_room: string | null
          event_2_date: string | null
          event_2_room: string | null
          event_3_date: string | null
          event_3_room: string | null
          event_4_date: string | null
          event_4_room: string | null
          first_class_day: string | null
          id: string | null
          invoice_status: string | null
          job_name: string | null
          landing_page_url_digital: string | null
          landing_page_url_direct: string | null
          mailer_return_address_override: Json | null
          mailer_type: string | null
          mailing_quantity: number | null
          main_status: string | null
          market: string | null
          needs_digital: boolean | null
          needs_direct_mail: boolean | null
          needs_google_sheet: boolean | null
          notes: string | null
          office_id: string | null
          order_instructions: string | null
          order_number: number | null
          order_sent_deadline: string | null
          privacy_company_name: string | null
          privacy_company_website: string | null
          qa_status: string | null
          qr_code_link: string | null
          room_id: string | null
          selected_mailer_design: string | null
          sending_list_folder_url: string | null
          sheet_needed: string | null
          start_time: string | null
          teledirect_added: string | null
          time_notes: string | null
          tp_status: string | null
          updated_at: string | null
          venue_address_text: string | null
          venue_id: string | null
          venue_text: string | null
        }
        Insert: {
          advisor_name?: string | null
          building_id?: string | null
          charity?: string | null
          class_type?: string | null
          client_approval_deadline?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          digital_budget?: number | null
          digital_disclaimer?: string | null
          digital_status?: string | null
          display_ref?: string | null
          display_status?: never
          dm_status?: string | null
          end_time?: string | null
          ethnicity_avoid?: string | null
          event_1_date?: string | null
          event_1_room?: string | null
          event_2_date?: string | null
          event_2_room?: string | null
          event_3_date?: string | null
          event_3_room?: string | null
          event_4_date?: string | null
          event_4_room?: string | null
          first_class_day?: string | null
          id?: string | null
          invoice_status?: string | null
          job_name?: string | null
          landing_page_url_digital?: string | null
          landing_page_url_direct?: string | null
          mailer_return_address_override?: Json | null
          mailer_type?: string | null
          mailing_quantity?: number | null
          main_status?: string | null
          market?: string | null
          needs_digital?: boolean | null
          needs_direct_mail?: boolean | null
          needs_google_sheet?: boolean | null
          notes?: string | null
          office_id?: string | null
          order_instructions?: string | null
          order_number?: number | null
          order_sent_deadline?: string | null
          privacy_company_name?: string | null
          privacy_company_website?: string | null
          qa_status?: string | null
          qr_code_link?: string | null
          room_id?: string | null
          selected_mailer_design?: string | null
          sending_list_folder_url?: string | null
          sheet_needed?: string | null
          start_time?: string | null
          teledirect_added?: string | null
          time_notes?: string | null
          tp_status?: string | null
          updated_at?: string | null
          venue_address_text?: string | null
          venue_id?: string | null
          venue_text?: string | null
        }
        Update: {
          advisor_name?: string | null
          building_id?: string | null
          charity?: string | null
          class_type?: string | null
          client_approval_deadline?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          digital_budget?: number | null
          digital_disclaimer?: string | null
          digital_status?: string | null
          display_ref?: string | null
          display_status?: never
          dm_status?: string | null
          end_time?: string | null
          ethnicity_avoid?: string | null
          event_1_date?: string | null
          event_1_room?: string | null
          event_2_date?: string | null
          event_2_room?: string | null
          event_3_date?: string | null
          event_3_room?: string | null
          event_4_date?: string | null
          event_4_room?: string | null
          first_class_day?: string | null
          id?: string | null
          invoice_status?: string | null
          job_name?: string | null
          landing_page_url_digital?: string | null
          landing_page_url_direct?: string | null
          mailer_return_address_override?: Json | null
          mailer_type?: string | null
          mailing_quantity?: number | null
          main_status?: string | null
          market?: string | null
          needs_digital?: boolean | null
          needs_direct_mail?: boolean | null
          needs_google_sheet?: boolean | null
          notes?: string | null
          office_id?: string | null
          order_instructions?: string | null
          order_number?: number | null
          order_sent_deadline?: string | null
          privacy_company_name?: string | null
          privacy_company_website?: string | null
          qa_status?: string | null
          qr_code_link?: string | null
          room_id?: string | null
          selected_mailer_design?: string | null
          sending_list_folder_url?: string | null
          sheet_needed?: string | null
          start_time?: string | null
          teledirect_added?: string | null
          time_notes?: string | null
          tp_status?: string | null
          updated_at?: string | null
          venue_address_text?: string | null
          venue_id?: string | null
          venue_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_self_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_client_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
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
