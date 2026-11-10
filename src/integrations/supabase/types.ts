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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      employee_tasks: {
        Row: {
          id: string
          org_id: string
          employee_id: string
          title: string
          description: string | null
          status_id: string | null
          status: string
          priority: string
          due_date: string | null
          due_time: string | null
          assigned_by: string | null
          assigned_by_name: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          employee_id: string
          title: string
          description?: string | null
          status_id?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          due_time?: string | null
          assigned_by?: string | null
          assigned_by_name?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          employee_id?: string
          title?: string
          description?: string | null
          status_id?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          due_time?: string | null
          assigned_by?: string | null
          assigned_by_name?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "task_statuses"
            referencedColumns: ["id"]
          }
        ]
      }
      task_statuses: {
        Row: {
          id: string
          org_id: string
          name: string
          color: string
          is_default: boolean
          is_completed: boolean
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          color?: string
          is_default?: boolean
          is_completed?: boolean
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          color?: string
          is_default?: boolean
          is_completed?: boolean
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_statuses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      accounts: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          org_id: string
          parent_id: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          org_id: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          org_id?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          body: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          lead_id: string | null
          opportunity_id: string | null
          org_id: string
          owner_id: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          body?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          org_id: string
          owner_id?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          body?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          lead_id?: string | null
          opportunity_id?: string | null
          org_id?: string
          owner_id?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attendance_date: string
          clock_in_location: Json | null
          clock_in_time: string | null
          clock_out_location: Json | null
          clock_out_time: string | null
          computed_status: string | null
          created_at: string
          employee_id: string
          hr_note: string | null
          id: string
          leave_deducted: boolean | null
          leave_id: string | null
          notes: string | null
          org_id: string
          override_status: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
        }
        Insert: {
          attendance_date: string
          clock_in_location?: Json | null
          clock_in_time?: string | null
          clock_out_location?: Json | null
          clock_out_time?: string | null
          computed_status?: string | null
          created_at?: string
          employee_id: string
          hr_note?: string | null
          id?: string
          leave_deducted?: boolean | null
          leave_id?: string | null
          notes?: string | null
          org_id: string
          override_status?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          clock_in_location?: Json | null
          clock_in_time?: string | null
          clock_out_location?: Json | null
          clock_out_time?: string | null
          computed_status?: string | null
          created_at?: string
          employee_id?: string
          hr_note?: string | null
          id?: string
          leave_deducted?: boolean | null
          leave_id?: string | null
          notes?: string | null
          org_id?: string
          override_status?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_leave_id_fkey"
            columns: ["leave_id"]
            isOneToOne: false
            referencedRelation: "leaves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_regularizations: {
        Row: {
          approved_by: string | null
          attendance_id: string | null
          created_at: string | null
          date: string
          employee_id: string
          id: string
          org_id: string
          reason: string
          requested_clock_in: string | null
          requested_clock_out: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          attendance_id?: string | null
          created_at?: string | null
          date: string
          employee_id: string
          id?: string
          org_id: string
          reason: string
          requested_clock_in?: string | null
          requested_clock_out?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          attendance_id?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string
          id?: string
          org_id?: string
          reason?: string
          requested_clock_in?: string | null
          requested_clock_out?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_regularizations_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_regularizations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_regularizations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendances: {
        Row: {
          clock_in_location: Json | null
          clock_in_time: string | null
          clock_out_location: Json | null
          clock_out_time: string | null
          computed_status: string | null
          created_at: string | null
          date: string
          employee_id: string
          id: string
          org_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          clock_in_location?: Json | null
          clock_in_time?: string | null
          clock_out_location?: Json | null
          clock_out_time?: string | null
          computed_status?: string | null
          created_at?: string | null
          date: string
          employee_id: string
          id?: string
          org_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          clock_in_location?: Json | null
          clock_in_time?: string | null
          clock_out_location?: Json | null
          clock_out_time?: string | null
          computed_status?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string
          id?: string
          org_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          org_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          org_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_id: string | null
          account_number: string | null
          account_type: string
          bank_name: string | null
          created_at: string
          currency: string | null
          current_balance: number
          id: string
          ifsc: string | null
          is_active: boolean
          name: string
          notes: string | null
          opening_balance: number
          org_id: string
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          account_id?: string | null
          account_number?: string | null
          account_type?: string
          bank_name?: string | null
          created_at?: string
          currency?: string | null
          current_balance?: number
          id?: string
          ifsc?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          org_id: string
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          account_id?: string | null
          account_number?: string | null
          account_type?: string
          bank_name?: string | null
          created_at?: string
          currency?: string | null
          current_balance?: number
          id?: string
          ifsc?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          org_id?: string
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          bank_account_id: string
          counterparty: string | null
          created_at: string
          description: string | null
          direction: string
          id: string
          matched_id: string | null
          matched_type: string | null
          notes: string | null
          org_id: string
          reconciled: boolean
          reconciled_at: string | null
          reference: string | null
          source: string | null
          txn_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          bank_account_id: string
          counterparty?: string | null
          created_at?: string
          description?: string | null
          direction: string
          id?: string
          matched_id?: string | null
          matched_type?: string | null
          notes?: string | null
          org_id: string
          reconciled?: boolean
          reconciled_at?: string | null
          reference?: string | null
          source?: string | null
          txn_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          bank_account_id?: string
          counterparty?: string | null
          created_at?: string
          description?: string | null
          direction?: string
          id?: string
          matched_id?: string | null
          matched_type?: string | null
          notes?: string | null
          org_id?: string
          reconciled?: boolean
          reconciled_at?: string | null
          reference?: string | null
          source?: string | null
          txn_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_lines: {
        Row: {
          account_id: string | null
          amount: number | null
          bill_id: string
          created_at: string
          description: string
          discount: number | null
          hsn: string | null
          id: string
          item_id: string | null
          org_id: string
          quantity: number | null
          rate: number | null
          sort_order: number | null
          sub_unit: string | null
          sub_unit_conversion_rate: number | null
          tax_amount: number | null
          tax_rate: number | null
          unit: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          bill_id: string
          created_at?: string
          description: string
          discount?: number | null
          hsn?: string | null
          id?: string
          item_id?: string | null
          org_id: string
          quantity?: number | null
          rate?: number | null
          sort_order?: number | null
          sub_unit?: string | null
          sub_unit_conversion_rate?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          bill_id?: string
          created_at?: string
          description?: string
          discount?: number | null
          hsn?: string | null
          id?: string
          item_id?: string | null
          org_id?: string
          quantity?: number | null
          rate?: number | null
          sort_order?: number | null
          sub_unit?: string | null
          sub_unit_conversion_rate?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount: number
          bill_id: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          exchange_rate: number | null
          id: string
          notes: string | null
          org_id: string
          payment_date: string
          payment_method: string | null
          reference: string | null
          tds_amount: number | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount?: number
          bill_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          org_id: string
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          tds_amount?: number | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          tds_amount?: number | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          adjustment: number
          adjustment_name: string | null
          amount_paid: number | null
          balance_due: number | null
          bill_date: string
          bill_number: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          discount: number | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          due_date: string | null
          exchange_rate: number | null
          grn_id: string | null
          id: string
          metadata: Json | null
          notes: string | null
          org_id: string
          po_id: string | null
          round_off: number | null
          shipping_charge: number
          status: Database["public"]["Enums"]["bill_status"] | null
          subtotal: number | null
          tax_total: number | null
          tds_amount: number | null
          tds_section_id: string | null
          tds_tcs_amount: number | null
          tds_tcs_applicable: boolean | null
          tds_tcs_rate: number | null
          tds_tcs_type: string | null
          terms: string | null
          total: number | null
          updated_at: string
          vendor_bill_number: string | null
          vendor_id: string
        }
        Insert: {
          adjustment?: number
          adjustment_name?: string | null
          amount_paid?: number | null
          balance_due?: number | null
          bill_date?: string
          bill_number: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          discount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          due_date?: string | null
          exchange_rate?: number | null
          grn_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          org_id: string
          po_id?: string | null
          round_off?: number | null
          shipping_charge?: number
          status?: Database["public"]["Enums"]["bill_status"] | null
          subtotal?: number | null
          tax_total?: number | null
          tds_amount?: number | null
          tds_section_id?: string | null
          tds_tcs_amount?: number | null
          tds_tcs_applicable?: boolean | null
          tds_tcs_rate?: number | null
          tds_tcs_type?: string | null
          terms?: string | null
          total?: number | null
          updated_at?: string
          vendor_bill_number?: string | null
          vendor_id: string
        }
        Update: {
          adjustment?: number
          adjustment_name?: string | null
          amount_paid?: number | null
          balance_due?: number | null
          bill_date?: string
          bill_number?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          discount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          due_date?: string | null
          exchange_rate?: number | null
          grn_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          org_id?: string
          po_id?: string | null
          round_off?: number | null
          shipping_charge?: number
          status?: Database["public"]["Enums"]["bill_status"] | null
          subtotal?: number | null
          tax_total?: number | null
          tds_amount?: number | null
          tds_section_id?: string | null
          tds_tcs_amount?: number | null
          tds_tcs_applicable?: boolean | null
          tds_tcs_rate?: number | null
          tds_tcs_type?: string | null
          terms?: string | null
          total?: number | null
          updated_at?: string
          vendor_bill_number?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_tds_section_id_fkey"
            columns: ["tds_section_id"]
            isOneToOne: false
            referencedRelation: "tds_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: Json | null
          code: string | null
          created_at: string
          gstin: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          address?: Json | null
          code?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          address?: Json | null
          code?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          is_recurring: boolean
          org_id: string
          recurring_frequency: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean
          org_id: string
          recurring_frequency?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean
          org_id?: string
          recurring_frequency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          client_id: string | null
          created_at: string
          error: string | null
          id: string
          name: string | null
          org_id: string
          provider_message_id: string | null
          sent_at: string | null
          status: string
          to_address: string
          vars: Json | null
        }
        Insert: {
          campaign_id: string
          client_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          name?: string | null
          org_id: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          to_address: string
          vars?: Json | null
        }
        Update: {
          campaign_id?: string
          client_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          name?: string | null
          org_id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          to_address?: string
          vars?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_filter: Json | null
          audience_type: string
          channel: string
          created_at: string
          failed_count: number
          id: string
          name: string
          org_id: string
          scheduled_at: string | null
          sent_count: number
          status: string
          template_id: string | null
          total_count: number
          updated_at: string
        }
        Insert: {
          audience_filter?: Json | null
          audience_type?: string
          channel: string
          created_at?: string
          failed_count?: number
          id?: string
          name: string
          org_id: string
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          template_id?: string | null
          total_count?: number
          updated_at?: string
        }
        Update: {
          audience_filter?: Json | null
          audience_type?: string
          channel?: string
          created_at?: string
          failed_count?: number
          id?: string
          name?: string
          org_id?: string
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          template_id?: string | null
          total_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_connections: {
        Row: {
          created_at: string
          id: string
          org_id: string
          receiver_id: string
          sender_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          receiver_id: string
          sender_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          receiver_id?: string
          sender_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_connections_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_connections_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_group_members: {
        Row: {
          employee_id: string
          group_id: string
          joined_at: string
        }
        Insert: {
          employee_id: string
          group_id: string
          joined_at?: string
        }
        Update: {
          employee_id?: string
          group_id?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_group_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          is_read: boolean | null
          message: string
          org_id: string
          receiver_id: string | null
          sender_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          org_id: string
          receiver_id?: string | null
          sender_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          org_id?: string
          receiver_id?: string | null
          sender_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          billing_address: Json | null
          company_name: string | null
          created_at: string
          credit_limit: number
          currency_code: string | null
          display_name: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          mobile: string | null
          notes: string | null
          opening_balance: number
          org_id: string
          payment_terms: number | null
          phone: string | null
          shipping_address: Json | null
          status: Database["public"]["Enums"]["client_status"]
          tags: string[] | null
          tax_number: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          billing_address?: Json | null
          company_name?: string | null
          created_at?: string
          credit_limit?: number
          currency_code?: string | null
          display_name: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          opening_balance?: number
          org_id: string
          payment_terms?: number | null
          phone?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["client_status"]
          tags?: string[] | null
          tax_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          billing_address?: Json | null
          company_name?: string | null
          created_at?: string
          credit_limit?: number
          currency_code?: string | null
          display_name?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          opening_balance?: number
          org_id?: string
          payment_terms?: number | null
          phone?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["client_status"]
          tags?: string[] | null
          tax_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary: boolean
          last_name: string
          phone: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean
          last_name: string
          phone?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean
          last_name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          discount_applied: number | null
          id: string
          org_id: string
          redeemed_at: string
          subscription_id: string | null
        }
        Insert: {
          coupon_id: string
          discount_applied?: number | null
          id?: string
          org_id: string
          redeemed_at?: string
          subscription_id?: string | null
        }
        Update: {
          coupon_id?: string
          discount_applied?: number | null
          id?: string
          org_id?: string
          redeemed_at?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_cycles: Json
          applicable_plans: Json
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_cycles?: Json
          applicable_plans?: Json
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_cycles?: Json
          applicable_plans?: Json
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      credit_note_lines: {
        Row: {
          amount: number
          credit_note_id: string
          description: string | null
          discount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          hsn_code: string | null
          id: string
          item_id: string | null
          name: string
          quantity: number
          rate: number
          sort_order: number
          sub_unit: string | null
          sub_unit_conversion_rate: number | null
          tax_amount: number
          tax_id: string | null
          unit: string | null
        }
        Insert: {
          amount?: number
          credit_note_id: string
          description?: string | null
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          hsn_code?: string | null
          id?: string
          item_id?: string | null
          name: string
          quantity?: number
          rate?: number
          sort_order?: number
          sub_unit?: string | null
          sub_unit_conversion_rate?: number | null
          tax_amount?: number
          tax_id?: string | null
          unit?: string | null
        }
        Update: {
          amount?: number
          credit_note_id?: string
          description?: string | null
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          hsn_code?: string | null
          id?: string
          item_id?: string | null
          name?: string
          quantity?: number
          rate?: number
          sort_order?: number
          sub_unit?: string | null
          sub_unit_conversion_rate?: number | null
          tax_amount?: number
          tax_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_lines_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_lines_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          branch_id: string | null
          client_id: string
          created_at: string
          credit_note_number: string
          currency_code: string
          discount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          exchange_rate: number
          id: string
          invoice_id: string | null
          issue_date: string
          notes: string | null
          org_id: string
          reference_number: string | null
          restock_inventory: boolean
          status: Database["public"]["Enums"]["credit_note_status"]
          subtotal: number
          terms_conditions: string | null
          total: number
          total_discount: number
          total_tax: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          client_id: string
          created_at?: string
          credit_note_number: string
          currency_code?: string
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          exchange_rate?: number
          id?: string
          invoice_id?: string | null
          issue_date?: string
          notes?: string | null
          org_id: string
          reference_number?: string | null
          restock_inventory?: boolean
          status?: Database["public"]["Enums"]["credit_note_status"]
          subtotal?: number
          terms_conditions?: string | null
          total?: number
          total_discount?: number
          total_tax?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          client_id?: string
          created_at?: string
          credit_note_number?: string
          currency_code?: string
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          exchange_rate?: number
          id?: string
          invoice_id?: string | null
          issue_date?: string
          notes?: string | null
          org_id?: string
          reference_number?: string | null
          restock_inventory?: boolean
          status?: Database["public"]["Enums"]["credit_note_status"]
          subtotal?: number
          terms_conditions?: string | null
          total?: number
          total_discount?: number
          total_tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_automations: {
        Row: {
          action_type: string
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          org_id: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_type: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_automations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          created_at: string
          entity_type: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_required: boolean
          org_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          entity_type: string
          field_name: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean
          org_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          entity_type?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean
          org_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          created_at: string
          entity_id: string
          field_id: string
          id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          field_id: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          field_id?: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_challan_lines: {
        Row: {
          batch_no: string | null
          created_at: string
          dc_id: string
          description: string
          id: string
          item_id: string | null
          org_id: string
          quantity: number
          serial_no: string | null
          sort_order: number | null
          unit: string | null
        }
        Insert: {
          batch_no?: string | null
          created_at?: string
          dc_id: string
          description: string
          id?: string
          item_id?: string | null
          org_id: string
          quantity?: number
          serial_no?: string | null
          sort_order?: number | null
          unit?: string | null
        }
        Update: {
          batch_no?: string | null
          created_at?: string
          dc_id?: string
          description?: string
          id?: string
          item_id?: string | null
          org_id?: string
          quantity?: number
          serial_no?: string | null
          sort_order?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_challan_lines_dc_id_fkey"
            columns: ["dc_id"]
            isOneToOne: false
            referencedRelation: "delivery_challans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challan_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challan_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_challans: {
        Row: {
          branch_id: string | null
          challan_date: string
          challan_number: string
          client_id: string | null
          created_at: string
          created_by: string | null
          destination: string | null
          driver_name: string | null
          driver_phone: string | null
          eway_bill_number: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          org_id: string
          status: string
          transporter: string | null
          updated_at: string
          vehicle_number: string | null
          warehouse_id: string | null
        }
        Insert: {
          branch_id?: string | null
          challan_date?: string
          challan_number: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          destination?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          eway_bill_number?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          org_id: string
          status?: string
          transporter?: string | null
          updated_at?: string
          vehicle_number?: string | null
          warehouse_id?: string | null
        }
        Update: {
          branch_id?: string | null
          challan_date?: string
          challan_number?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          destination?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          eway_bill_number?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          org_id?: string
          status?: string
          transporter?: string | null
          updated_at?: string
          vehicle_number?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_challans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challans_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challans_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html_template: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          org_id: string | null
          subject_template: string
          type: string
        }
        Insert: {
          body_html_template: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          org_id?: string | null
          subject_template: string
          type?: string
        }
        Update: {
          body_html_template?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          org_id?: string | null
          subject_template?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          created_at: string | null
          direction: string | null
          from_email: string
          id: string
          org_id: string | null
          resend_id: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          status: string | null
          subject: string | null
          to_email: string
        }
        Insert: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          direction?: string | null
          from_email: string
          id?: string
          org_id?: string | null
          resend_id?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string | null
          subject?: string | null
          to_email: string
        }
        Update: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          direction?: string | null
          from_email?: string
          id?: string
          org_id?: string | null
          resend_id?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: string | null
          subject?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          doc_type: string
          employee_id: string
          file_name: string
          file_path: string
          id: string
          org_id: string
          uploaded_at: string
        }
        Insert: {
          doc_type?: string
          employee_id: string
          file_name: string
          file_path: string
          id?: string
          org_id: string
          uploaded_at?: string
        }
        Update: {
          doc_type?: string
          employee_id?: string
          file_name?: string
          file_path?: string
          id?: string
          org_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_leave_balances: {
        Row: {
          accrued: number | null
          created_at: string | null
          employee_id: string
          id: string
          leave_type: string
          org_id: string
          updated_at: string | null
          used: number | null
        }
        Insert: {
          accrued?: number | null
          created_at?: string | null
          employee_id: string
          id?: string
          leave_type: string
          org_id: string
          updated_at?: string | null
          used?: number | null
        }
        Update: {
          accrued?: number | null
          created_at?: string | null
          employee_id?: string
          id?: string
          leave_type?: string
          org_id?: string
          updated_at?: string | null
          used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leave_balances_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shifts: {
        Row: {
          created_at: string | null
          effective_from: string
          employee_id: string
          id: string
          org_id: string
          shift_id: string
        }
        Insert: {
          created_at?: string | null
          effective_from?: string
          employee_id: string
          id?: string
          org_id: string
          shift_id: string
        }
        Update: {
          created_at?: string | null
          effective_from?: string
          employee_id?: string
          id?: string
          org_id?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          auth_user_id: string | null
          avatar_url: string | null
          bank_account: string | null
          bank_ifsc: string | null
          basic_percent: number
          created_at: string
          daily_rate: number | null
          designation: string | null
          email: string | null
          employee_code: string | null
          esic_applicable: boolean
          hourly_rate: number | null
          hra_percent: number
          id: string
          is_active: boolean
          joining_date: string | null
          monthly_salary: number
          name: string
          notes: string | null
          org_id: string
          paid_leaves_per_month: number
          pan: string | null
          pf_applicable: boolean
          phone: string | null
          salary_structure: Json | null
          shift_id: string | null
          updated_at: string
          username: string | null
          wage_type: string | null
          weekly_offs: number[] | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          basic_percent?: number
          created_at?: string
          daily_rate?: number | null
          designation?: string | null
          email?: string | null
          employee_code?: string | null
          esic_applicable?: boolean
          hourly_rate?: number | null
          hra_percent?: number
          id?: string
          is_active?: boolean
          joining_date?: string | null
          monthly_salary?: number
          name: string
          notes?: string | null
          org_id: string
          paid_leaves_per_month?: number
          pan?: string | null
          pf_applicable?: boolean
          phone?: string | null
          salary_structure?: Json | null
          shift_id?: string | null
          updated_at?: string
          username?: string | null
          wage_type?: string | null
          weekly_offs?: number[] | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          basic_percent?: number
          created_at?: string
          daily_rate?: number | null
          designation?: string | null
          email?: string | null
          employee_code?: string | null
          esic_applicable?: boolean
          hourly_rate?: number | null
          hra_percent?: number
          id?: string
          is_active?: boolean
          joining_date?: string | null
          monthly_salary?: number
          name?: string
          notes?: string | null
          org_id?: string
          paid_leaves_per_month?: number
          pan?: string | null
          pf_applicable?: boolean
          phone?: string | null
          salary_structure?: Json | null
          shift_id?: string | null
          updated_at?: string
          username?: string | null
          wage_type?: string | null
          weekly_offs?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_lines: {
        Row: {
          amount: number
          description: string | null
          discount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          estimate_id: string
          hsn_code: string | null
          id: string
          item_id: string | null
          name: string
          quantity: number
          rate: number
          sort_order: number
          sub_unit: string | null
          sub_unit_conversion_rate: number | null
          tax_amount: number
          tax_id: string | null
          unit: string | null
        }
        Insert: {
          amount?: number
          description?: string | null
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          estimate_id: string
          hsn_code?: string | null
          id?: string
          item_id?: string | null
          name: string
          quantity?: number
          rate?: number
          sort_order?: number
          sub_unit?: string | null
          sub_unit_conversion_rate?: number | null
          tax_amount?: number
          tax_id?: string | null
          unit?: string | null
        }
        Update: {
          amount?: number
          description?: string | null
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          estimate_id?: string
          hsn_code?: string | null
          id?: string
          item_id?: string | null
          name?: string
          quantity?: number
          rate?: number
          sort_order?: number
          sub_unit?: string | null
          sub_unit_conversion_rate?: number | null
          tax_amount?: number
          tax_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_lines_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_lines_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          accepted_at: string | null
          adjustment: number
          adjustment_name: string | null
          branch_id: string | null
          client_id: string
          converted_invoice_id: string | null
          created_at: string
          currency_code: string
          declined_at: string | null
          discount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          estimate_number: string
          exchange_rate: number
          expiry_date: string
          id: string
          issue_date: string
          notes: string | null
          org_id: string
          reference_number: string | null
          sent_at: string | null
          shipping_charge: number
          status: Database["public"]["Enums"]["estimate_status"]
          subtotal: number
          terms_conditions: string | null
          total: number
          total_discount: number
          total_tax: number
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          adjustment?: number
          adjustment_name?: string | null
          branch_id?: string | null
          client_id: string
          converted_invoice_id?: string | null
          created_at?: string
          currency_code?: string
          declined_at?: string | null
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          estimate_number: string
          exchange_rate?: number
          expiry_date?: string
          id?: string
          issue_date?: string
          notes?: string | null
          org_id: string
          reference_number?: string | null
          sent_at?: string | null
          shipping_charge?: number
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal?: number
          terms_conditions?: string | null
          total?: number
          total_discount?: number
          total_tax?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          adjustment?: number
          adjustment_name?: string | null
          branch_id?: string | null
          client_id?: string
          converted_invoice_id?: string | null
          created_at?: string
          currency_code?: string
          declined_at?: string | null
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          estimate_number?: string
          exchange_rate?: number
          expiry_date?: string
          id?: string
          issue_date?: string
          notes?: string | null
          org_id?: string
          reference_number?: string | null
          sent_at?: string | null
          shipping_charge?: number
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal?: number
          terms_conditions?: string | null
          total?: number
          total_discount?: number
          total_tax?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          fetched_at: string
          id: string
          rate: number
          target_currency: string
        }
        Insert: {
          base_currency?: string
          fetched_at?: string
          id?: string
          rate: number
          target_currency: string
        }
        Update: {
          base_currency?: string
          fetched_at?: string
          id?: string
          rate?: number
          target_currency?: string
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          message: string | null
          org_id: string | null
          request_type: string | null
          status: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          message?: string | null
          org_id?: string | null
          request_type?: string | null
          status?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          message?: string | null
          org_id?: string | null
          request_type?: string | null
          status?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_lines: {
        Row: {
          amount: number
          batch_no: string | null
          created_at: string
          description: string
          expiry_date: string | null
          grn_id: string
          id: string
          item_id: string | null
          org_id: string
          po_line_id: string | null
          quantity: number
          serial_no: string | null
          sort_order: number | null
          unit_cost: number
        }
        Insert: {
          amount?: number
          batch_no?: string | null
          created_at?: string
          description: string
          expiry_date?: string | null
          grn_id: string
          id?: string
          item_id?: string | null
          org_id: string
          po_line_id?: string | null
          quantity?: number
          serial_no?: string | null
          sort_order?: number | null
          unit_cost?: number
        }
        Update: {
          amount?: number
          batch_no?: string | null
          created_at?: string
          description?: string
          expiry_date?: string | null
          grn_id?: string
          id?: string
          item_id?: string | null
          org_id?: string
          po_line_id?: string | null
          quantity?: number
          serial_no?: string | null
          sort_order?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "grn_lines_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_lines_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      grns: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          grn_date: string
          grn_number: string
          id: string
          notes: string | null
          org_id: string
          po_id: string | null
          status: string
          transporter: string | null
          updated_at: string
          vehicle_number: string | null
          vendor_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          grn_date?: string
          grn_number: string
          id?: string
          notes?: string | null
          org_id: string
          po_id?: string | null
          status?: string
          transporter?: string | null
          updated_at?: string
          vehicle_number?: string | null
          vendor_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          grn_date?: string
          grn_number?: string
          id?: string
          notes?: string | null
          org_id?: string
          po_id?: string | null
          status?: string
          transporter?: string | null
          updated_at?: string
          vehicle_number?: string | null
          vendor_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grns_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          name: string
          org_id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          name: string
          org_id: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          name?: string
          org_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holidays_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          amount: number
          description: string | null
          discount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          hsn_code: string | null
          id: string
          invoice_id: string
          item_id: string | null
          name: string
          quantity: number
          rate: number
          sort_order: number
          sub_unit: string | null
          sub_unit_conversion_rate: number | null
          tax_amount: number
          tax_id: string | null
          unit: string | null
        }
        Insert: {
          amount?: number
          description?: string | null
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          hsn_code?: string | null
          id?: string
          invoice_id: string
          item_id?: string | null
          name: string
          quantity?: number
          rate?: number
          sort_order?: number
          sub_unit?: string | null
          sub_unit_conversion_rate?: number | null
          tax_amount?: number
          tax_id?: string | null
          unit?: string | null
        }
        Update: {
          amount?: number
          description?: string | null
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          hsn_code?: string | null
          id?: string
          invoice_id?: string
          item_id?: string | null
          name?: string
          quantity?: number
          rate?: number
          sort_order?: number
          sub_unit?: string | null
          sub_unit_conversion_rate?: number | null
          tax_amount?: number
          tax_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          ack_date: string | null
          ack_no: string | null
          adjustment: number
          adjustment_name: string | null
          amount_paid: number
          balance_due: number
          bank_details: Json | null
          billing_address: Json | null
          branch_id: string | null
          client_id: string
          created_at: string
          currency_code: string
          deduct_stock: boolean
          discount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          due_date: string
          eway_bill_no: string | null
          eway_distance_km: number | null
          eway_transport_mode: string | null
          eway_valid_until: string | null
          eway_vehicle_no: string | null
          exchange_rate: number
          expenses: number
          id: string
          invoice_number: string
          irn: string | null
          irn_qr: string | null
          issue_date: string
          last_reminder_at: string | null
          metadata: Json | null
          notes: string | null
          org_id: string
          paid_at: string | null
          reference_number: string | null
          reminder_count: number
          sent_at: string | null
          shipping_address: Json | null
          shipping_charge: number
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tds_tcs_amount: number | null
          tds_tcs_applicable: boolean | null
          tds_tcs_rate: number | null
          tds_tcs_type: string | null
          terms_conditions: string | null
          total: number
          total_discount: number
          total_tax: number
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          ack_date?: string | null
          ack_no?: string | null
          adjustment?: number
          adjustment_name?: string | null
          amount_paid?: number
          balance_due?: number
          bank_details?: Json | null
          billing_address?: Json | null
          branch_id?: string | null
          client_id: string
          created_at?: string
          currency_code?: string
          deduct_stock?: boolean
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          due_date?: string
          eway_bill_no?: string | null
          eway_distance_km?: number | null
          eway_transport_mode?: string | null
          eway_valid_until?: string | null
          eway_vehicle_no?: string | null
          exchange_rate?: number
          expenses?: number
          id?: string
          invoice_number: string
          irn?: string | null
          irn_qr?: string | null
          issue_date?: string
          last_reminder_at?: string | null
          metadata?: Json | null
          notes?: string | null
          org_id: string
          paid_at?: string | null
          reference_number?: string | null
          reminder_count?: number
          sent_at?: string | null
          shipping_address?: Json | null
          shipping_charge?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tds_tcs_amount?: number | null
          tds_tcs_applicable?: boolean | null
          tds_tcs_rate?: number | null
          tds_tcs_type?: string | null
          terms_conditions?: string | null
          total?: number
          total_discount?: number
          total_tax?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          ack_date?: string | null
          ack_no?: string | null
          adjustment?: number
          adjustment_name?: string | null
          amount_paid?: number
          balance_due?: number
          bank_details?: Json | null
          billing_address?: Json | null
          branch_id?: string | null
          client_id?: string
          created_at?: string
          currency_code?: string
          deduct_stock?: boolean
          discount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          due_date?: string
          eway_bill_no?: string | null
          eway_distance_km?: number | null
          eway_transport_mode?: string | null
          eway_valid_until?: string | null
          eway_vehicle_no?: string | null
          exchange_rate?: number
          expenses?: number
          id?: string
          invoice_number?: string
          irn?: string | null
          irn_qr?: string | null
          issue_date?: string
          last_reminder_at?: string | null
          metadata?: Json | null
          notes?: string | null
          org_id?: string
          paid_at?: string | null
          reference_number?: string | null
          reminder_count?: number
          sent_at?: string | null
          shipping_address?: Json | null
          shipping_charge?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tds_tcs_amount?: number | null
          tds_tcs_applicable?: boolean | null
          tds_tcs_rate?: number | null
          tds_tcs_type?: string | null
          terms_conditions?: string | null
          total?: number
          total_discount?: number
          total_tax?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      item_party_prices: {
        Row: {
          created_at: string
          id: string
          item_id: string
          org_id: string
          party_id: string
          party_type: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          org_id: string
          party_id: string
          party_type: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          org_id?: string
          party_id?: string
          party_type?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_party_prices_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_party_prices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          discount: number | null
          discount_type: string | null
          expiry_date: string | null
          has_expiry: boolean | null
          hsn_code: string | null
          id: string
          is_active: boolean
          low_stock_threshold: number | null
          name: string
          org_id: string
          purchase_price: number | null
          purchase_price_type: string | null
          sales_price_type: string | null
          show_online: boolean | null
          sku: string | null
          stock_quantity: number
          sub_unit: string | null
          sub_unit_conversion_rate: number | null
          tax_id: string | null
          track_batches: boolean | null
          track_serials: boolean | null
          type: Database["public"]["Enums"]["item_type"]
          unit: string | null
          unit_price: number
          updated_at: string
          valuation_method: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          discount?: number | null
          discount_type?: string | null
          expiry_date?: string | null
          has_expiry?: boolean | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number | null
          name: string
          org_id: string
          purchase_price?: number | null
          purchase_price_type?: string | null
          sales_price_type?: string | null
          show_online?: boolean | null
          sku?: string | null
          stock_quantity?: number
          sub_unit?: string | null
          sub_unit_conversion_rate?: number | null
          tax_id?: string | null
          track_batches?: boolean | null
          track_serials?: boolean | null
          type?: Database["public"]["Enums"]["item_type"]
          unit?: string | null
          unit_price?: number
          updated_at?: string
          valuation_method?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          discount?: number | null
          discount_type?: string | null
          expiry_date?: string | null
          has_expiry?: boolean | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number | null
          name?: string
          org_id?: string
          purchase_price?: number | null
          purchase_price_type?: string | null
          sales_price_type?: string | null
          show_online?: boolean | null
          sku?: string | null
          stock_quantity?: number
          sub_unit?: string | null
          sub_unit_conversion_rate?: number | null
          tax_id?: string | null
          track_batches?: boolean | null
          track_serials?: boolean | null
          type?: Database["public"]["Enums"]["item_type"]
          unit?: string | null
          unit_price?: number
          updated_at?: string
          valuation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          is_posted: boolean | null
          narration: string | null
          org_id: string
          reference: string | null
          source_id: string | null
          source_type: string | null
          total_credit: number | null
          total_debit: number | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          is_posted?: boolean | null
          narration?: string | null
          org_id: string
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          is_posted?: boolean | null
          narration?: string | null
          org_id?: string
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          branch_id: string | null
          created_at: string
          credit: number | null
          debit: number | null
          description: string | null
          entry_id: string
          id: string
          org_id: string
          sort_order: number | null
        }
        Insert: {
          account_id: string
          branch_id?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id: string
          id?: string
          org_id: string
          sort_order?: number | null
        }
        Update: {
          account_id?: string
          branch_id?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id?: string
          id?: string
          org_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_enrollments: {
        Row: {
          client_id: string | null
          completed_at: string | null
          current_step: number
          entity_id: string | null
          entity_type: string | null
          id: string
          journey_id: string
          next_run_at: string
          org_id: string
          started_at: string
          status: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          current_step?: number
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          journey_id: string
          next_run_at?: string
          org_id: string
          started_at?: string
          status?: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          current_step?: number
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          journey_id?: string
          next_run_at?: string
          org_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_enrollments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_enrollments_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_enrollments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_steps: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          journey_id: string
          org_id: string
          sort_order: number
          step_type: string
          template_id: string | null
          wait_hours: number | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          journey_id: string
          org_id: string
          sort_order?: number
          step_type: string
          template_id?: string | null
          wait_hours?: number | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          journey_id?: string
          org_id?: string
          sort_order?: number
          step_type?: string
          template_id?: string | null
          wait_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_steps_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_steps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      journeys: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          org_id: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journeys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          org_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          org_id: string
          provider: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          org_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_team: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_team_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          converted_client_id: string | null
          created_at: string
          email: string | null
          estimated_value: number
          id: string
          name: string
          notes: string | null
          org_id: string
          owner_id: string | null
          phone: string | null
          priority: string
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tags: string[]
          updated_at: string
        }
        Insert: {
          company?: string | null
          converted_client_id?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number
          id?: string
          name: string
          notes?: string | null
          org_id: string
          owner_id?: string | null
          phone?: string | null
          priority?: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          company?: string | null
          converted_client_id?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          owner_id?: string | null
          phone?: string | null
          priority?: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          annual_limit: number
          created_at: string | null
          id: string
          leave_type: string
          monthly_accrual: number | null
          org_id: string
          updated_at: string | null
        }
        Insert: {
          annual_limit?: number
          created_at?: string | null
          id?: string
          leave_type: string
          monthly_accrual?: number | null
          org_id: string
          updated_at?: string | null
        }
        Update: {
          annual_limit?: number
          created_at?: string | null
          id?: string
          leave_type?: string
          monthly_accrual?: number | null
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          employee_id: string
          expiry_date: string | null
          id: string
          leave_type: string
          org_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          employee_id: string
          expiry_date?: string | null
          id?: string
          leave_type: string
          org_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          employee_id?: string
          expiry_date?: string | null
          id?: string
          leave_type?: string
          org_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leaves: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          org_id: string
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id: string
          end_date: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          org_id: string
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          org_id?: string
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaves_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          body: string | null
          campaign_id: string | null
          channel: string
          client_id: string | null
          error: string | null
          id: string
          journey_id: string | null
          org_id: string
          provider_message_id: string | null
          sent_at: string
          status: string
          template_id: string | null
          to_address: string
        }
        Insert: {
          body?: string | null
          campaign_id?: string | null
          channel: string
          client_id?: string | null
          error?: string | null
          id?: string
          journey_id?: string | null
          org_id: string
          provider_message_id?: string | null
          sent_at?: string
          status: string
          template_id?: string | null
          to_address: string
        }
        Update: {
          body?: string | null
          campaign_id?: string | null
          channel?: string
          client_id?: string | null
          error?: string | null
          id?: string
          journey_id?: string | null
          org_id?: string
          provider_message_id?: string | null
          sent_at?: string
          status?: string
          template_id?: string | null
          to_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          category: string | null
          channel: string
          created_at: string
          id: string
          name: string
          org_id: string
          subject: string | null
          updated_at: string
          variables: Json | null
          wa_approved: boolean | null
          wa_language: string | null
          wa_template_name: string | null
        }
        Insert: {
          body: string
          category?: string | null
          channel: string
          created_at?: string
          id?: string
          name: string
          org_id: string
          subject?: string | null
          updated_at?: string
          variables?: Json | null
          wa_approved?: boolean | null
          wa_language?: string | null
          wa_template_name?: string | null
        }
        Update: {
          body?: string
          category?: string | null
          channel?: string
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          subject?: string | null
          updated_at?: string
          variables?: Json | null
          wa_approved?: boolean | null
          wa_language?: string | null
          wa_template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          org_id: string
          reference_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          org_id: string
          reference_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          org_id?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          currency: string
          expected_close_date: string | null
          id: string
          lead_id: string | null
          notes: string | null
          org_id: string
          owner_id: string | null
          probability: number
          sort_order: number
          stage_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          org_id: string
          owner_id?: string | null
          probability?: number
          sort_order?: number
          stage_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          org_id?: string
          owner_id?: string | null
          probability?: number
          sort_order?: number
          stage_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      org_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          org_id: string
          preview: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          org_id: string
          preview: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          org_id?: string
          preview?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_deletion_requests: {
        Row: {
          created_at: string
          id: string
          org_id: string
          org_name: string
          requested_by: string
          scheduled_delete_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          org_name: string
          requested_by: string
          scheduled_delete_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          org_name?: string
          requested_by?: string
          scheduled_delete_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_deletion_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          org_id: string
          secret: string | null
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          org_id: string
          secret?: string | null
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          org_id?: string
          secret?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_webhooks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_whatsapp_purchases: {
        Row: {
          amount_paid: number
          id: string
          messages_added: number
          org_id: string | null
          pack_id: string | null
          purchased_at: string | null
        }
        Insert: {
          amount_paid: number
          id?: string
          messages_added: number
          org_id?: string | null
          pack_id?: string | null
          purchased_at?: string | null
        }
        Update: {
          amount_paid?: number
          id?: string
          messages_added?: number
          org_id?: string | null
          pack_id?: string | null
          purchased_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_whatsapp_purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_whatsapp_purchases_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_addon_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_email_settings: {
        Row: {
          created_at: string | null
          dns_records: Json | null
          domain_name: string | null
          domain_status: string | null
          from_email: string | null
          from_name: string | null
          id: string
          org_id: string
          provider_type: string | null
          resend_domain_id: string | null
          smtp_host: string | null
          smtp_pass: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_user: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dns_records?: Json | null
          domain_name?: string | null
          domain_status?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          org_id: string
          provider_type?: string | null
          resend_domain_id?: string | null
          smtp_host?: string | null
          smtp_pass?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dns_records?: Json | null
          domain_name?: string | null
          domain_status?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          org_id?: string
          provider_type?: string | null
          resend_domain_id?: string | null
          smtp_host?: string | null
          smtp_pass?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_email_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          permissions: Json | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          created_at: string | null
          enabled_features: Json | null
          org_id: string
          plan_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled_features?: Json | null
          org_id: string
          plan_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled_features?: Json | null
          org_id?: string
          plan_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: Json | null
          attendance_location_compulsory: boolean | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_details_enabled: boolean | null
          bank_ifsc: string | null
          bank_name: string | null
          bill_prefix: string | null
          created_at: string
          credit_note_next_number: number
          credit_note_prefix: string
          currency_code: string
          daily_wages_enabled: boolean | null
          date_format: string
          dc_next_number: number | null
          dc_prefix: string | null
          default_notes: string | null
          default_terms: string | null
          email: string | null
          enable_individual_week_offs: boolean | null
          enabled_features: Json | null
          estimate_next_number: number
          estimate_prefix: string
          fiscal_year_start: number
          grn_next_number: number | null
          grn_prefix: string | null
          gst_enabled: boolean
          gst_number: string | null
          id: string
          inventory_enabled: boolean
          invoice_next_number: number
          invoice_prefix: string
          irp_gsp_provider: string | null
          irp_username: string | null
          logo_url: string | null
          low_stock_threshold: number
          multi_warehouse_enabled: boolean
          name: string
          next_bill_number: number | null
          org_type: string | null
          owner_id: string | null
          payment_prefix: string
          payment_terms: number
          phone: string | null
          po_next_number: number | null
          po_prefix: string | null
          qr_code_enabled: boolean
          show_client_gst: boolean
          sub_unit_enabled: boolean | null
          subscription_end_date: string | null
          subscription_interval: string | null
          subscription_plan: string | null
          tax_name: string | null
          tax_number: string | null
          template_accent_color: string
          template_font: string
          template_paper_size: string
          template_show_logo: boolean
          template_style: string
          timezone: string
          updated_at: string
          upi_id: string | null
          website: string | null
          weekly_offs: number[] | null
          whatsapp_msg_limit: number | null
          whatsapp_msg_used: number | null
          whatsapp_quota: number | null
          whatsapp_quota_reset_date: string | null
        }
        Insert: {
          address?: Json | null
          attendance_location_compulsory?: boolean | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_details_enabled?: boolean | null
          bank_ifsc?: string | null
          bank_name?: string | null
          bill_prefix?: string | null
          created_at?: string
          credit_note_next_number?: number
          credit_note_prefix?: string
          currency_code?: string
          daily_wages_enabled?: boolean | null
          date_format?: string
          dc_next_number?: number | null
          dc_prefix?: string | null
          default_notes?: string | null
          default_terms?: string | null
          email?: string | null
          enable_individual_week_offs?: boolean | null
          enabled_features?: Json | null
          estimate_next_number?: number
          estimate_prefix?: string
          fiscal_year_start?: number
          grn_next_number?: number | null
          grn_prefix?: string | null
          gst_enabled?: boolean
          gst_number?: string | null
          id?: string
          inventory_enabled?: boolean
          invoice_next_number?: number
          invoice_prefix?: string
          irp_gsp_provider?: string | null
          irp_username?: string | null
          logo_url?: string | null
          low_stock_threshold?: number
          multi_warehouse_enabled?: boolean
          name: string
          next_bill_number?: number | null
          org_type?: string | null
          owner_id?: string | null
          payment_prefix?: string
          payment_terms?: number
          phone?: string | null
          po_next_number?: number | null
          po_prefix?: string | null
          qr_code_enabled?: boolean
          show_client_gst?: boolean
          sub_unit_enabled?: boolean | null
          subscription_end_date?: string | null
          subscription_interval?: string | null
          subscription_plan?: string | null
          tax_name?: string | null
          tax_number?: string | null
          template_accent_color?: string
          template_font?: string
          template_paper_size?: string
          template_show_logo?: boolean
          template_style?: string
          timezone?: string
          updated_at?: string
          upi_id?: string | null
          website?: string | null
          weekly_offs?: number[] | null
          whatsapp_msg_limit?: number | null
          whatsapp_msg_used?: number | null
          whatsapp_quota?: number | null
          whatsapp_quota_reset_date?: string | null
        }
        Update: {
          address?: Json | null
          attendance_location_compulsory?: boolean | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_details_enabled?: boolean | null
          bank_ifsc?: string | null
          bank_name?: string | null
          bill_prefix?: string | null
          created_at?: string
          credit_note_next_number?: number
          credit_note_prefix?: string
          currency_code?: string
          daily_wages_enabled?: boolean | null
          date_format?: string
          dc_next_number?: number | null
          dc_prefix?: string | null
          default_notes?: string | null
          default_terms?: string | null
          email?: string | null
          enable_individual_week_offs?: boolean | null
          enabled_features?: Json | null
          estimate_next_number?: number
          estimate_prefix?: string
          fiscal_year_start?: number
          grn_next_number?: number | null
          grn_prefix?: string | null
          gst_enabled?: boolean
          gst_number?: string | null
          id?: string
          inventory_enabled?: boolean
          invoice_next_number?: number
          invoice_prefix?: string
          irp_gsp_provider?: string | null
          irp_username?: string | null
          logo_url?: string | null
          low_stock_threshold?: number
          multi_warehouse_enabled?: boolean
          name?: string
          next_bill_number?: number | null
          org_type?: string | null
          owner_id?: string | null
          payment_prefix?: string
          payment_terms?: number
          phone?: string | null
          po_next_number?: number | null
          po_prefix?: string | null
          qr_code_enabled?: boolean
          show_client_gst?: boolean
          sub_unit_enabled?: boolean | null
          subscription_end_date?: string | null
          subscription_interval?: string | null
          subscription_plan?: string | null
          tax_name?: string | null
          tax_number?: string | null
          template_accent_color?: string
          template_font?: string
          template_paper_size?: string
          template_show_logo?: boolean
          template_style?: string
          timezone?: string
          updated_at?: string
          upi_id?: string | null
          website?: string | null
          weekly_offs?: number[] | null
          whatsapp_msg_limit?: number | null
          whatsapp_msg_used?: number | null
          whatsapp_quota?: number | null
          whatsapp_quota_reset_date?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          branch_id: string | null
          client_id: string
          created_at: string
          currency_code: string
          id: string
          invoice_id: string | null
          notes: string | null
          org_id: string
          payment_date: string
          payment_mode: string
          payment_number: string
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          branch_id?: string | null
          client_id: string
          created_at?: string
          currency_code?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          org_id: string
          payment_date?: string
          payment_mode?: string
          payment_number: string
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          branch_id?: string | null
          client_id?: string
          created_at?: string
          currency_code?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          org_id?: string
          payment_date?: string
          payment_mode?: string
          payment_number?: string
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          org_id: string
          period_month: string
          start_date: string | null
          status: Database["public"]["Enums"]["payroll_status"]
          total_deductions: number
          total_gross: number
          total_net: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          org_id: string
          period_month: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["payroll_status"]
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          period_month?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["payroll_status"]
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          allowances: number
          basic: number
          created_at: string
          details: Json | null
          employee_id: string
          esic_employee: number
          gross_salary: number
          hra: number
          id: string
          lop_days: number
          net_pay: number
          org_id: string
          other_deductions: number
          paid_leave_days: number
          payment_date: string | null
          payment_status: string
          pf_employee: number
          present_days: number
          run_id: string
          tds: number
          updated_at: string
          working_days: number
        }
        Insert: {
          allowances?: number
          basic?: number
          created_at?: string
          details?: Json | null
          employee_id: string
          esic_employee?: number
          gross_salary?: number
          hra?: number
          id?: string
          lop_days?: number
          net_pay?: number
          org_id: string
          other_deductions?: number
          paid_leave_days?: number
          payment_date?: string | null
          payment_status?: string
          pf_employee?: number
          present_days?: number
          run_id: string
          tds?: number
          updated_at?: string
          working_days?: number
        }
        Update: {
          allowances?: number
          basic?: number
          created_at?: string
          details?: Json | null
          employee_id?: string
          esic_employee?: number
          gross_salary?: number
          hra?: number
          id?: string
          lop_days?: number
          net_pay?: number
          org_id?: string
          other_deductions?: number
          paid_leave_days?: number
          payment_date?: string | null
          payment_status?: string
          pf_employee?: number
          present_days?: number
          run_id?: string
          tds?: number
          updated_at?: string
          working_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          org_id: string
          sort_order: number
          win_probability: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          org_id: string
          sort_order?: number
          win_probability?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          org_id?: string
          sort_order?: number
          win_probability?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          client_limit: number | null
          created_at: string
          display_name: string
          employee_limit: number | null
          employee_price_extra: number | null
          platform_employee_limit: number | null
          platform_employee_price_extra: number | null
          feature_keys: Json | null
          features: Json
          id: string
          invoice_limit: number | null
          is_active: boolean
          item_limit: number | null
          name: string
          plan_type: string
          price_monthly: number
          price_yearly: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          client_limit?: number | null
          created_at?: string
          display_name: string
          employee_limit?: number | null
          employee_price_extra?: number | null
          platform_employee_limit?: number | null
          platform_employee_price_extra?: number | null
          feature_keys?: Json | null
          features?: Json
          id?: string
          invoice_limit?: number | null
          is_active?: boolean
          item_limit?: number | null
          name: string
          plan_type?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          client_limit?: number | null
          created_at?: string
          display_name?: string
          employee_limit?: number | null
          employee_price_extra?: number | null
          platform_employee_limit?: number | null
          platform_employee_price_extra?: number | null
          feature_keys?: Json | null
          features?: Json
          id?: string
          invoice_limit?: number | null
          is_active?: boolean
          item_limit?: number | null
          name?: string
          plan_type?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      portal_ads: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Relationships: []
      }
      portal_tokens: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          org_id: string
          token: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          org_id: string
          token?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          org_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      poster_templates: {
        Row: {
          bg_gradient: string | null
          bg_image_url: string | null
          created_at: string
          default_text: string | null
          festival_name: string
          id: string
          name: string
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          bg_gradient?: string | null
          bg_image_url?: string | null
          created_at?: string
          default_text?: string | null
          festival_name: string
          id?: string
          name: string
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          bg_gradient?: string | null
          bg_image_url?: string | null
          created_at?: string
          default_text?: string | null
          festival_name?: string
          id?: string
          name?: string
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          org_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          org_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          org_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          amount: number
          created_at: string
          description: string
          hsn: string | null
          id: string
          item_id: string | null
          org_id: string
          po_id: string
          quantity: number
          rate: number
          received_quantity: number
          sort_order: number | null
          sub_unit: string | null
          sub_unit_conversion_rate: number | null
          tax_rate: number | null
          unit: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          hsn?: string | null
          id?: string
          item_id?: string | null
          org_id: string
          po_id: string
          quantity?: number
          rate?: number
          received_quantity?: number
          sort_order?: number | null
          sub_unit?: string | null
          sub_unit_conversion_rate?: number | null
          tax_rate?: number | null
          unit?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          hsn?: string | null
          id?: string
          item_id?: string | null
          org_id?: string
          po_id?: string
          quantity?: number
          rate?: number
          received_quantity?: number
          sort_order?: number | null
          sub_unit?: string | null
          sub_unit_conversion_rate?: number | null
          tax_rate?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          expected_date: string | null
          id: string
          notes: string | null
          org_id: string
          po_date: string
          po_number: string
          status: string
          subtotal: number
          tax_amount: number
          tds_tcs_amount: number | null
          tds_tcs_applicable: boolean | null
          tds_tcs_rate: number | null
          tds_tcs_type: string | null
          terms: string | null
          total: number
          updated_at: string
          vendor_id: string | null
          warehouse_id: string | null
          metadata: Json | null
          discount: number | null
          discount_type: Database["public"]["Enums"]["discount_type"] | null
          shipping_charge: number | null
          adjustment: number | null
          adjustment_name: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          org_id: string
          po_date?: string
          po_number: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tds_tcs_amount?: number | null
          tds_tcs_applicable?: boolean | null
          tds_tcs_rate?: number | null
          tds_tcs_type?: string | null
          terms?: string | null
          total?: number
          updated_at?: string
          vendor_id?: string | null
          warehouse_id?: string | null
          metadata?: Json | null
          discount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          shipping_charge?: number | null
          adjustment?: number | null
          adjustment_name?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          po_date?: string
          po_number?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tds_tcs_amount?: number | null
          tds_tcs_applicable?: boolean | null
          tds_tcs_rate?: number | null
          tds_tcs_type?: string | null
          terms?: string | null
          total?: number
          updated_at?: string
          vendor_id?: string | null
          warehouse_id?: string | null
          metadata?: Json | null
          discount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          shipping_charge?: number | null
          adjustment?: number | null
          adjustment_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoices: {
        Row: {
          client_id: string
          created_at: string
          currency_code: string
          frequency: string
          id: string
          is_active: boolean
          last_generated_at: string | null
          next_run_date: string
          notes: string | null
          org_id: string
          template_invoice_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          currency_code?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          next_run_date?: string
          notes?: string | null
          org_id: string
          template_invoice_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          currency_code?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_generated_at?: string | null
          next_run_date?: string
          notes?: string | null
          org_id?: string
          template_invoice_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_template_invoice_id_fkey"
            columns: ["template_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          end_time: string
          grace_minutes: number | null
          half_day_end: string | null
          half_day_start: string | null
          id: string
          is_default: boolean
          late_end: string | null
          late_start: string | null
          name: string
          org_id: string
          start_time: string
          updated_at: string
          working_days: number[]
        }
        Insert: {
          created_at?: string
          end_time?: string
          grace_minutes?: number | null
          half_day_end?: string | null
          half_day_start?: string | null
          id?: string
          is_default?: boolean
          late_end?: string | null
          late_start?: string | null
          name: string
          org_id: string
          start_time?: string
          updated_at?: string
          working_days?: number[]
        }
        Update: {
          created_at?: string
          end_time?: string
          grace_minutes?: number | null
          half_day_end?: string | null
          half_day_start?: string | null
          id?: string
          is_default?: boolean
          late_end?: string | null
          late_start?: string | null
          name?: string
          org_id?: string
          start_time?: string
          updated_at?: string
          working_days?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "shifts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          balance_after: number | null
          batch_no: string | null
          change_qty: number
          created_at: string
          created_by: string | null
          expiry_date: string | null
          id: string
          item_id: string
          org_id: string
          reason: string
          ref_id: string | null
          ref_number: string | null
          ref_type: string | null
          serial_no: string | null
          unit_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          balance_after?: number | null
          batch_no?: string | null
          change_qty: number
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          item_id: string
          org_id: string
          reason: string
          ref_id?: string | null
          ref_number?: string | null
          ref_type?: string | null
          serial_no?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          balance_after?: number | null
          batch_no?: string | null
          change_qty?: number
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string
          org_id?: string
          reason?: string
          ref_id?: string | null
          ref_number?: string | null
          ref_type?: string | null
          serial_no?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          admin_notes: string | null
          billing_cycle: string
          coupon_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          discounted_price: number | null
          employee_count: number
          platform_employee_count: number
          id: string
          manual_disabled_features: Json
          manual_override_features: Json
          org_id: string
          plan_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          trial_ends_at: string | null
          trial_plan_name: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          billing_cycle?: string
          coupon_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          discounted_price?: number | null
          employee_count?: number
          platform_employee_count?: number
          id?: string
          manual_disabled_features?: Json
          manual_override_features?: Json
          org_id: string
          plan_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          trial_ends_at?: string | null
          trial_plan_name?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          billing_cycle?: string
          coupon_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          discounted_price?: number | null
          employee_count?: number
          platform_employee_count?: number
          id?: string
          manual_disabled_features?: Json
          manual_override_features?: Json
          org_id?: string
          plan_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          trial_ends_at?: string | null
          trial_plan_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          components: Json | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          org_id: string
          rate: number
          type: Database["public"]["Enums"]["tax_type"]
        }
        Insert: {
          components?: Json | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          org_id: string
          rate: number
          type?: Database["public"]["Enums"]["tax_type"]
        }
        Update: {
          components?: Json | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          org_id?: string
          rate?: number
          type?: Database["public"]["Enums"]["tax_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_deductions: {
        Row: {
          base_amount: number
          created_at: string
          deduction_date: string
          id: string
          org_id: string
          rate: number
          section_id: string
          source_id: string
          source_type: string
          tds_amount: number
          vendor_id: string | null
        }
        Insert: {
          base_amount: number
          created_at?: string
          deduction_date?: string
          id?: string
          org_id: string
          rate: number
          section_id: string
          source_id: string
          source_type: string
          tds_amount: number
          vendor_id?: string | null
        }
        Update: {
          base_amount?: number
          created_at?: string
          deduction_date?: string
          id?: string
          org_id?: string
          rate?: number
          section_id?: string
          source_id?: string
          source_type?: string
          tds_amount?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tds_deductions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_deductions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "tds_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_deductions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_sections: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          org_id: string
          rate: number
          threshold: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
          rate?: number
          threshold?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
          rate?: number
          threshold?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tds_sections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          lead_id: string | null
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          ticket_number: string | null
          notification_channel: string | null
          resolution_note: string | null
          closing_comment: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          lead_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          ticket_number?: string | null
          notification_channel?: string | null
          resolution_note?: string | null
          closing_comment?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          lead_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          ticket_number?: string | null
          notification_channel?: string | null
          resolution_note?: string | null
          closing_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          balance_due: number | null
          billing_address: Json | null
          created_at: string
          currency: string | null
          display_name: string | null
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          opening_balance: number | null
          org_id: string
          pan: string | null
          payment_terms: number | null
          phone: string | null
          shipping_address: Json | null
          tags: string[] | null
          tds_section_id: string | null
          updated_at: string
        }
        Insert: {
          balance_due?: number | null
          billing_address?: Json | null
          created_at?: string
          currency?: string | null
          display_name?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          opening_balance?: number | null
          org_id: string
          pan?: string | null
          payment_terms?: number | null
          phone?: string | null
          shipping_address?: Json | null
          tags?: string[] | null
          tds_section_id?: string | null
          updated_at?: string
        }
        Update: {
          balance_due?: number | null
          billing_address?: Json | null
          created_at?: string
          currency?: string | null
          display_name?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          opening_balance?: number | null
          org_id?: string
          pan?: string | null
          payment_terms?: number | null
          phone?: string | null
          shipping_address?: Json | null
          tags?: string[] | null
          tds_section_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_tds_section_fk"
            columns: ["tds_section_id"]
            isOneToOne: false
            referencedRelation: "tds_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: Json | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          address?: Json | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          address?: Json | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_addon_packs: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          message_count: number
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_count: number
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_count?: number
          name?: string
          price?: number
        }
        Relationships: []
      }
      whatsapp_chats: {
        Row: {
          archived_session: string | null
          client_name: string | null
          client_phone: string | null
          contact_name: string | null
          created_at: string
          id: string
          last_message_at: string
          last_message_text: string | null
          org_id: string | null
          phone_number: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          archived_session?: string | null
          client_name?: string | null
          client_phone?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_text?: string | null
          org_id?: string | null
          phone_number?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          archived_session?: string | null
          client_name?: string | null
          client_phone?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_text?: string | null
          org_id?: string | null
          phone_number?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chats_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          chat_id: string | null
          content: string | null
          created_at: string
          direction: string | null
          id: string
          message_id: string | null
          message_text: string | null
          org_id: string | null
          phone_number: string | null
          sender: string | null
          status: string | null
          timestamp: string
        }
        Insert: {
          chat_id?: string | null
          content?: string | null
          created_at?: string
          direction?: string | null
          id?: string
          message_id?: string | null
          message_text?: string | null
          org_id?: string | null
          phone_number?: string | null
          sender?: string | null
          status?: string | null
          timestamp?: string
        }
        Update: {
          chat_id?: string | null
          content?: string | null
          created_at?: string
          direction?: string | null
          id?: string
          message_id?: string | null
          message_text?: string | null
          org_id?: string | null
          phone_number?: string | null
          sender?: string | null
          status?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          created_at: string
          id: string
          org_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string | null
          org_id: string
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string | null
          org_id: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string | null
          org_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_org_plan: {
        Args: {
          p_billing_cycle?: string
          p_employee_count?: number
          platform_employee_count?: number
          p_org_id: string
          p_plan_name: string
          p_razorpay_order_id?: string
          p_razorpay_payment_id?: string
        }
        Returns: Json
      }
      admin_set_features: {
        Args: { p_features: Json; p_org_id: string }
        Returns: undefined
      }
      admin_set_plan: {
        Args: { p_org_id: string; p_plan_name: string }
        Returns: undefined
      }
      admin_set_plans: {
        Args: { p_org_id: string; p_plan_names: string[] }
        Returns: undefined
      }
      archive_whatsapp_session: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      create_organization_for_current_user: {
        Args: { org_name: string }
        Returns: {
          address: Json | null
          attendance_location_compulsory: boolean | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_details_enabled: boolean | null
          bank_ifsc: string | null
          bank_name: string | null
          bill_prefix: string | null
          created_at: string
          credit_note_next_number: number
          credit_note_prefix: string
          currency_code: string
          daily_wages_enabled: boolean | null
          date_format: string
          dc_next_number: number | null
          dc_prefix: string | null
          default_notes: string | null
          default_terms: string | null
          email: string | null
          enable_individual_week_offs: boolean | null
          enabled_features: Json | null
          estimate_next_number: number
          estimate_prefix: string
          fiscal_year_start: number
          grn_next_number: number | null
          grn_prefix: string | null
          gst_enabled: boolean
          gst_number: string | null
          id: string
          inventory_enabled: boolean
          invoice_next_number: number
          invoice_prefix: string
          irp_gsp_provider: string | null
          irp_username: string | null
          logo_url: string | null
          low_stock_threshold: number
          multi_warehouse_enabled: boolean
          name: string
          next_bill_number: number | null
          org_type: string | null
          owner_id: string | null
          payment_prefix: string
          payment_terms: number
          phone: string | null
          po_next_number: number | null
          po_prefix: string | null
          qr_code_enabled: boolean
          show_client_gst: boolean
          sub_unit_enabled: boolean | null
          subscription_end_date: string | null
          subscription_interval: string | null
          subscription_plan: string | null
          tax_name: string | null
          tax_number: string | null
          template_accent_color: string
          template_font: string
          template_paper_size: string
          template_show_logo: boolean
          template_style: string
          timezone: string
          updated_at: string
          upi_id: string | null
          website: string | null
          weekly_offs: number[] | null
          whatsapp_msg_limit: number | null
          whatsapp_msg_used: number | null
          whatsapp_quota: number | null
          whatsapp_quota_reset_date: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dearmor: { Args: { "": string }; Returns: string }
      deduct_whatsapp_quota: { Args: { p_org_id: string }; Returns: boolean }
      gen_random_uuid: { Args: never; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      get_all_feature_requests: { Args: never; Returns: Json }
      get_current_org_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_my_org_subscription: { Args: { p_org_id: string }; Returns: Json }
      get_my_orgs_with_plans: {
        Args: never
        Returns: {
          org_id: string
          org_name: string
          plan_display: string
          plan_name: string
          sub_status: string
        }[]
      }
      get_org_members_with_status: {
        Args: { target_org_id: string }
        Returns: {
          email: string
          member_id: string
          permissions: Json
          role: string
          status: string
          user_id: string
        }[]
      }
      get_platform_dashboard_data: { Args: never; Returns: Json }
      get_platform_dashboard_data_test: { Args: never; Returns: Json }
      get_portal_bundle: { Args: { p_token: string }; Returns: Json }
      get_user_id_by_email: { Args: { user_email: string }; Returns: string }
      get_user_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_used: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      is_platform_admin: { Args: { check_user_id: string }; Returns: boolean }
      mark_portal_viewed: { Args: { p_token: string }; Returns: undefined }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      seed_default_accounting: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      seed_default_pipeline: { Args: { p_org_id: string }; Returns: undefined }
      start_org_trial: {
        Args: { p_org_id: string; p_plan_name?: string }
        Returns: undefined
      }
      test_employees_rls: {
        Args: { test_uid: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      test_get_org: { Args: { test_uid: string }; Returns: string }
      test_rls_read: {
        Args: { test_uid: string }
        Returns: {
          id: string
          name: string
          org_id: string
        }[]
      }
      update_org_subscription:
        | {
            Args: { p_features?: Json; p_org_id: string; p_plan_name?: string }
            Returns: undefined
          }
        | {
            Args: {
              p_admin_notes?: string
              p_extend_trial_days?: number
              p_features?: Json
              p_force_off_features?: Json
              p_force_on_features?: Json
              p_org_id: string
              p_plan_id?: string
              p_plan_name?: string
              p_status?: string
            }
            Returns: undefined
          }
      update_plan_price: {
        Args: {
          p_plan_name: string
          p_price_monthly: number
          p_price_yearly: number
        }
        Returns: undefined
      }
      update_platform_setting: {
        Args: { p_key: string; p_value: string }
        Returns: undefined
      }
      validate_coupon: {
        Args: { p_billing_cycle?: string; p_code: string; p_plan_name?: string }
        Returns: Json
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "income" | "expense"
      activity_type: "call" | "meeting" | "email" | "note" | "task" | "whatsapp"
      app_role:
        | "owner"
        | "admin"
        | "staff"
        | "read_only"
        | "manager"
        | "accountant"
        | "sales executive"
        | "sales_executive"
      attendance_status:
        | "present"
        | "absent"
        | "half_day"
        | "paid_leave"
        | "holiday"
      bill_status: "draft" | "received" | "partial" | "paid" | "cancelled"
      client_status: "active" | "inactive"
      credit_note_status: "draft" | "sent" | "void"
      discount_type: "percentage" | "fixed"
      estimate_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "declined"
        | "expired"
        | "converted"
      invoice_status:
        | "draft"
        | "sent"
        | "viewed"
        | "partial"
        | "paid"
        | "overdue"
        | "void"
      item_type: "service" | "product"
      lead_status: "new" | "contacted" | "qualified" | "converted" | "lost"
      leave_status: "pending" | "approved" | "rejected"
      leave_type:
        | "casual"
        | "sick"
        | "paid"
        | "unpaid"
        | "other"
        | "el_pl"
        | "comp_off"
        | "maternity"
        | "paternity"
        | "bereavement"
        | "marriage"
        | "study"
        | "jury_duty"
        | "od"
        | "wfh"
        | "half_day"
        | "lwp"
        | "ncns"
      payroll_status: "draft" | "approved" | "paid"
      tax_type: "simple" | "compound"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: ["asset", "liability", "equity", "income", "expense"],
      activity_type: ["call", "meeting", "email", "note", "task", "whatsapp"],
      app_role: [
        "owner",
        "admin",
        "staff",
        "read_only",
        "manager",
        "accountant",
        "sales executive",
        "sales_executive",
      ],
      attendance_status: [
        "present",
        "absent",
        "half_day",
        "paid_leave",
        "holiday",
      ],
      bill_status: ["draft", "received", "partial", "paid", "cancelled"],
      client_status: ["active", "inactive"],
      credit_note_status: ["draft", "sent", "void"],
      discount_type: ["percentage", "fixed"],
      estimate_status: [
        "draft",
        "sent",
        "viewed",
        "accepted",
        "declined",
        "expired",
        "converted",
      ],
      invoice_status: [
        "draft",
        "sent",
        "viewed",
        "partial",
        "paid",
        "overdue",
        "void",
      ],
      item_type: ["service", "product"],
      lead_status: ["new", "contacted", "qualified", "converted", "lost"],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: [
        "casual",
        "sick",
        "paid",
        "unpaid",
        "other",
        "el_pl",
        "comp_off",
        "maternity",
        "paternity",
        "bereavement",
        "marriage",
        "study",
        "jury_duty",
        "od",
        "wfh",
        "half_day",
        "lwp",
        "ncns",
      ],
      payroll_status: ["draft", "approved", "paid"],
      tax_type: ["simple", "compound"],
    },
  },
} as const
