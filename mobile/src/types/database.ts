
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "app_config": {
                  Row: {
                    "key": string,"value": string
                  }
                  Insert: {
                    "key": string,"value": string
                  }
                  Update: {
                    "key"?: string,"value"?: string
                  }
                  Relationships: [
                    
                  ]
                },"children": {
                  Row: {
                    "color": string,"created_at": string,"family_id": string,"first_name": string,"id": string
                  }
                  Insert: {
                    "color": string,"created_at"?: string,"family_id": string,"first_name": string,"id"?: string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"family_id"?: string,"first_name"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "children_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "child_id": string,"created_at": string,"created_by": string | null,"duration_min": number,"family_id": string,"first_date": string,"id": string,"kind": Database["public"]['Enums']["event_kind"],"location": string | null,"rrule": string | null,"start_time": string,"timezone": string,"title": string,"until_date": string | null
                  }
                  Insert: {
                    "child_id": string,"created_at"?: string,"created_by"?: string | null,"duration_min"?: number,"family_id": string,"first_date": string,"id"?: string,"kind"?: Database["public"]['Enums']["event_kind"],"location"?: string | null,"rrule"?: string | null,"start_time": string,"timezone"?: string,"title": string,"until_date"?: string | null
                  }
                  Update: {
                    "child_id"?: string,"created_at"?: string,"created_by"?: string | null,"duration_min"?: number,"family_id"?: string,"first_date"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["event_kind"],"location"?: string | null,"rrule"?: string | null,"start_time"?: string,"timezone"?: string,"title"?: string,"until_date"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_child_id_family_id_fkey"
      columns: ["child_id","family_id"]
isOneToOne: false
      referencedRelation: "children"
      referencedColumns: ["id","family_id"]
    },{
      foreignKeyName: "events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"families": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"family_members": {
                  Row: {
                    "created_at": string,"family_id": string,"role": Database["public"]['Enums']["family_role"],"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"family_id": string,"role": Database["public"]['Enums']["family_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"family_id"?: string,"role"?: Database["public"]['Enums']["family_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_members_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "family_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"invites": {
                  Row: {
                    "created_at": string,"created_by": string | null,"expires_at": string,"family_id": string,"id": string,"role": Database["public"]['Enums']["family_role"],"token_hash": string,"used_at": string | null,"used_by": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"family_id": string,"id"?: string,"role": Database["public"]['Enums']["family_role"],"token_hash": string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"family_id"?: string,"id"?: string,"role"?: Database["public"]['Enums']["family_role"],"token_hash"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_used_by_fkey"
      columns: ["used_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_outbox": {
                  Row: {
                    "body": string,"created_at": string,"dedupe_key": string | null,"id": number,"sent_at": string | null,"title": string,"user_id": string
                  }
                  Insert: {
                    "body": string,"created_at"?: string,"dedupe_key"?: string | null,"id"?: never,"sent_at"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"dedupe_key"?: string | null,"id"?: never,"sent_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_outbox_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"occurrences": {
                  Row: {
                    "assigned_to": string | null,"created_at": string,"ends_at": string,"event_id": string,"family_id": string,"id": string,"note": string | null,"starts_at": string,"status": Database["public"]['Enums']["occurrence_status"],"updated_at": string
                  }
                  Insert: {
                    "assigned_to"?: string | null,"created_at"?: string,"ends_at": string,"event_id": string,"family_id": string,"id"?: string,"note"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["occurrence_status"],"updated_at"?: string
                  }
                  Update: {
                    "assigned_to"?: string | null,"created_at"?: string,"ends_at"?: string,"event_id"?: string,"family_id"?: string,"id"?: string,"note"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["occurrence_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "occurrences_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "occurrences_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "occurrences_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"display_name"?: string,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_tokens": {
                  Row: {
                    "platform": string,"token": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "platform": string,"token": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "platform"?: string,"token"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "actor_name":
{ Args: { "p_user_id": string }; Returns: string
                           },
"cancel_occurrence":
{ Args: { "p_occurrence_id": string }; Returns: undefined
                           },
"claim_occurrence":
{ Args: { "p_occurrence_id": string }; Returns: boolean
                           },
"create_invite":
{ Args: { "p_family_id": string,"p_role": Database["public"]['Enums']["family_role"] }; Returns: {
              "code": string,"expires_at": string
            }[]
                           },
"deliver_notifications":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"describe_occurrence":
{ Args: { "p_occurrence_id": string }; Returns: string
                           },
"enqueue_notification":
{ Args: { "p_body": string,"p_dedupe_prefix"?: string,"p_title": string,"p_user_ids": (string)[] }; Returns: undefined
                           },
"enqueue_scheduled_notifications":
{ Args: { "p_now"?: string }; Returns: undefined
                           },
"family_member_ids":
{ Args: { "p_except": string,"p_family_id": string,"p_parents_only": boolean }; Returns: (string)[]
                           },
"generate_occurrences":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"generate_occurrences_for":
{ Args: { "p_event_id": string,"p_from": string,"p_to": string }; Returns: undefined
                           },
"invite_code_hash":
{ Args: { "p_code": string }; Returns: string
                           },
"is_family_member":
{ Args: { "p_family_id": string }; Returns: boolean
                           },
"redeem_invite":
{ Args: { "p_code": string,"p_user_id": string }; Returns: string
                           },
"register_push_token":
{ Args: { "p_platform": string,"p_token": string }; Returns: undefined
                           },
"release_occurrence":
{ Args: { "p_occurrence_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "event_kind": "ride"|"pickup"|"care"|"other","family_role": "parent"|"grandparent"|"other","occurrence_status": "open"|"claimed"|"cancelled"
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "event_kind": ["ride", "pickup", "care", "other"],"family_role": ["parent", "grandparent", "other"],"occurrence_status": ["open", "claimed", "cancelled"]
          }
        }
} as const

