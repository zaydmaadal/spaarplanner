
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "admin_audit": {
                  Row: {
                    "action": string,"admin_id": string | null,"created_at": string,"id": string,"target_user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"admin_id"?: string | null,"created_at"?: string,"id"?: string,"target_user_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string | null,"created_at"?: string,"id"?: string,"target_user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"budget_lines": {
                  Row: {
                    "amount_cents": number,"category": string,"id": string,"is_estimate": boolean,"kind": string,"name": string,"sort": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"category": string,"id"?: string,"is_estimate"?: boolean,"kind": string,"name": string,"sort"?: number,"user_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"category"?: string,"id"?: string,"is_estimate"?: boolean,"kind"?: string,"name"?: string,"sort"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"checklist_items": {
                  Row: {
                    "body": string | null,"certainty_level": number | null,"certainty_reason": string | null,"dismissed_at": string | null,"done_at": string | null,"due_on": string | null,"id": string,"rule_key": string | null,"source": string,"title": string,"urgency": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"certainty_level"?: number | null,"certainty_reason"?: string | null,"dismissed_at"?: string | null,"done_at"?: string | null,"due_on"?: string | null,"id"?: string,"rule_key"?: string | null,"source"?: string,"title": string,"urgency"?: string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"certainty_level"?: number | null,"certainty_reason"?: string | null,"dismissed_at"?: string | null,"done_at"?: string | null,"due_on"?: string | null,"id"?: string,"rule_key"?: string | null,"source"?: string,"title"?: string,"urgency"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"feedback": {
                  Row: {
                    "created_at": string,"handled_at": string | null,"id": string,"kind": string,"message": string,"page": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"handled_at"?: string | null,"id"?: string,"kind": string,"message": string,"page"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"handled_at"?: string | null,"id"?: string,"kind"?: string,"message"?: string,"page"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"goals": {
                  Row: {
                    "color_token": string | null,"created_at": string,"deadline": string | null,"id": string,"is_main": boolean,"kind": string,"name": string,"priority": number,"status": string,"target_cents": number,"target_is_estimate": boolean,"user_id": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "color_token"?: string | null,"created_at"?: string,"deadline"?: string | null,"id"?: string,"is_main"?: boolean,"kind": string,"name": string,"priority": number,"status"?: string,"target_cents": number,"target_is_estimate"?: boolean,"user_id": string,"weight"?: number
                  }
                  Update: {
                    "color_token"?: string | null,"created_at"?: string,"deadline"?: string | null,"id"?: string,"is_main"?: boolean,"kind"?: string,"name"?: string,"priority"?: number,"status"?: string,"target_cents"?: number,"target_is_estimate"?: boolean,"user_id"?: string,"weight"?: number
                  }
                  Relationships: [
                    
                  ]
                },"income_sources": {
                  Row: {
                    "active": boolean,"amount_cents": number,"amount_low_cents": number | null,"date": string | null,"frequency": string,"id": string,"is_estimate": boolean,"kind": string,"month": number | null,"name": string,"payday_rule": NonNullable<Json>,"user_id": string,"variability": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"amount_cents": number,"amount_low_cents"?: number | null,"date"?: string | null,"frequency": string,"id"?: string,"is_estimate"?: boolean,"kind": string,"month"?: number | null,"name": string,"payday_rule"?: NonNullable<Json>,"user_id": string,"variability"?: string
                  }
                  Update: {
                    "active"?: boolean,"amount_cents"?: number,"amount_low_cents"?: number | null,"date"?: string | null,"frequency"?: string,"id"?: string,"is_estimate"?: boolean,"kind"?: string,"month"?: number | null,"name"?: string,"payday_rule"?: NonNullable<Json>,"user_id"?: string,"variability"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notification_log": {
                  Row: {
                    "created_at": string,"for_date": string,"id": string,"kind": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"for_date": string,"id"?: string,"kind": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"for_date"?: string,"id"?: string,"kind"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"plans": {
                  Row: {
                    "emergency_share_pct": number,"include_one_off_income": boolean,"income_mode": string,"monthly_savings_cents": number | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "emergency_share_pct"?: number,"include_one_off_income"?: boolean,"income_mode"?: string,"monthly_savings_cents"?: number | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "emergency_share_pct"?: number,"include_one_off_income"?: boolean,"income_mode"?: string,"monthly_savings_cents"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"currency": string,"display_name": string | null,"id": string,"locale": string,"onboarding_completed_at": string | null,"onboarding_step": number,"prefs": NonNullable<Json>,"timezone": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency"?: string,"display_name"?: string | null,"id": string,"locale"?: string,"onboarding_completed_at"?: string | null,"onboarding_step"?: number,"prefs"?: NonNullable<Json>,"timezone"?: string,"username": string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"display_name"?: string | null,"id"?: string,"locale"?: string,"onboarding_completed_at"?: string | null,"onboarding_step"?: number,"prefs"?: NonNullable<Json>,"timezone"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"failure_count": number,"id": string,"last_success_at": string | null,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"failure_count"?: number,"id"?: string,"last_success_at"?: string | null,"p256dh": string,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"failure_count"?: number,"id"?: string,"last_success_at"?: string | null,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"transactions": {
                  Row: {
                    "amount_cents": number,"client_ref": string,"created_at": string,"goal_id": string,"id": string,"note": string | null,"occurred_on": string,"source": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"client_ref": string,"created_at"?: string,"goal_id": string,"id"?: string,"note"?: string | null,"occurred_on": string,"source"?: string,"user_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"client_ref"?: string,"created_at"?: string,"goal_id"?: string,"id"?: string,"note"?: string | null,"occurred_on"?: string,"source"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transactions_goal_id_user_id_fkey"
      columns: ["goal_id","user_id"]
isOneToOne: false
      referencedRelation: "goal_balances"
      referencedColumns: ["goal_id","user_id"]
    },{
      foreignKeyName: "transactions_goal_id_user_id_fkey"
      columns: ["goal_id","user_id"]
isOneToOne: false
      referencedRelation: "goals"
      referencedColumns: ["id","user_id"]
    }
                  ]
                }
          }
          Views: {
            "goal_balances": {
                  Row: {
                    "balance_cents": number | null,"goal_id": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
