
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
            "aviso": {
                  Row: {
                    "autor_id": string | null,"comite_id": string | null,"criado_em": string,"evento_id": string,"id": string,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"comite_id"?: string | null,"criado_em"?: string,"evento_id": string,"id"?: string,"texto": string
                  }
                  Update: {
                    "autor_id"?: string | null,"comite_id"?: string | null,"criado_em"?: string,"evento_id"?: string,"id"?: string,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "aviso_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "aviso_comite_id_evento_id_fkey"
      columns: ["comite_id","evento_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id","evento_id"]
    },{
      foreignKeyName: "aviso_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    }
                  ]
                },"comite": {
                  Row: {
                    "crise_ligada": boolean,"evento_id": string,"guia_url": string | null,"id": string,"idioma": string,"nome": string,"nome_oficial": string,"regras": NonNullable<Json>,"sigla": string,"tecnologia_restrita": boolean,"topicos": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "crise_ligada"?: boolean,"evento_id": string,"guia_url"?: string | null,"id"?: string,"idioma"?: string,"nome": string,"nome_oficial": string,"regras"?: NonNullable<Json>,"sigla": string,"tecnologia_restrita"?: boolean,"topicos"?: (string)[]
                  }
                  Update: {
                    "crise_ligada"?: boolean,"evento_id"?: string,"guia_url"?: string | null,"id"?: string,"idioma"?: string,"nome"?: string,"nome_oficial"?: string,"regras"?: NonNullable<Json>,"sigla"?: string,"tecnologia_restrita"?: boolean,"topicos"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "comite_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    }
                  ]
                },"convite": {
                  Row: {
                    "comite_id": string | null,"criado_em": string,"delegacao_id": string | null,"email": string,"evento_id": string,"id": string,"papel": Database["public"]['Enums']["papel"]
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id"?: string | null,"criado_em"?: string,"delegacao_id"?: string | null,"email": string,"evento_id": string,"id"?: string,"papel": Database["public"]['Enums']["papel"]
                  }
                  Update: {
                    "comite_id"?: string | null,"criado_em"?: string,"delegacao_id"?: string | null,"email"?: string,"evento_id"?: string,"id"?: string,"papel"?: Database["public"]['Enums']["papel"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "convite_comite_id_evento_id_fkey"
      columns: ["comite_id","evento_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id","evento_id"]
    },{
      foreignKeyName: "convite_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "convite_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    }
                  ]
                },"cronograma_item": {
                  Row: {
                    "comite_id": string | null,"evento_id": string,"fim": string,"id": string,"inicio": string,"local": string | null,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id"?: string | null,"evento_id": string,"fim": string,"id"?: string,"inicio": string,"local"?: string | null,"titulo": string
                  }
                  Update: {
                    "comite_id"?: string | null,"evento_id"?: string,"fim"?: string,"id"?: string,"inicio"?: string,"local"?: string | null,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cronograma_item_comite_id_evento_id_fkey"
      columns: ["comite_id","evento_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id","evento_id"]
    },{
      foreignKeyName: "cronograma_item_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    }
                  ]
                },"delegacao": {
                  Row: {
                    "bandeira": string | null,"comite_id": string,"id": string,"nome": string,"nome_oficial": string,"situacao": Database["public"]['Enums']["situacao_delegacao"]
                  }
                  ComputedFields: never
                  Insert: {
                    "bandeira"?: string | null,"comite_id": string,"id"?: string,"nome": string,"nome_oficial": string,"situacao"?: Database["public"]['Enums']["situacao_delegacao"]
                  }
                  Update: {
                    "bandeira"?: string | null,"comite_id"?: string,"id"?: string,"nome"?: string,"nome_oficial"?: string,"situacao"?: Database["public"]['Enums']["situacao_delegacao"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "delegacao_comite_id_fkey"
      columns: ["comite_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id"]
    }
                  ]
                },"evento": {
                  Row: {
                    "ano": number,"id": string,"nome": string,"regras_padrao": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "ano": number,"id"?: string,"nome": string,"regras_padrao"?: NonNullable<Json>
                  }
                  Update: {
                    "ano"?: number,"id"?: string,"nome"?: string,"regras_padrao"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"participacao": {
                  Row: {
                    "comite_id": string | null,"delegacao_id": string | null,"evento_id": string,"id": string,"papel": Database["public"]['Enums']["papel"],"pessoa_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id"?: string | null,"delegacao_id"?: string | null,"evento_id": string,"id"?: string,"papel": Database["public"]['Enums']["papel"],"pessoa_id": string
                  }
                  Update: {
                    "comite_id"?: string | null,"delegacao_id"?: string | null,"evento_id"?: string,"id"?: string,"papel"?: Database["public"]['Enums']["papel"],"pessoa_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "participacao_comite_id_evento_id_fkey"
      columns: ["comite_id","evento_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id","evento_id"]
    },{
      foreignKeyName: "participacao_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "participacao_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "participacao_pessoa_id_fkey"
      columns: ["pessoa_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    }
                  ]
                },"pessoa": {
                  Row: {
                    "avisos_vistos_em": string | null,"bio": string | null,"foto_path": string | null,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avisos_vistos_em"?: string | null,"bio"?: string | null,"foto_path"?: string | null,"id": string,"nome": string
                  }
                  Update: {
                    "avisos_vistos_em"?: string | null,"bio"?: string | null,"foto_path"?: string | null,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "minhas_participacoes": {
                  Row: {
                    "comite_id": string | null,"comite_nome": string | null,"comite_sigla": string | null,"delegacao_bandeira": string | null,"delegacao_id": string | null,"delegacao_nome": string | null,"evento_id": string,"evento_nome": string,"id": string,"papel": Database["public"]['Enums']["papel"]
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "participacao_comite_id_evento_id_fkey"
      columns: ["comite_id","evento_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id","evento_id"]
    },{
      foreignKeyName: "participacao_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "participacao_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "aplicar_convites":
{ Args: { "p_email": string,"p_usuario": string }; Returns: undefined
                           },
"dois_tercos":
{ Args: { "p_base": number }; Returns: number
                           },
"eh_participante":
{ Args: { "p_evento": string }; Returns: boolean
                           },
"eh_secretaria":
{ Args: { "p_evento": string }; Returns: boolean
                           },
"evento_do_comite":
{ Args: { "p_comite": string }; Returns: string
                           },
"maioria_simples":
{ Args: { "p_base": number }; Returns: number
                           },
"marcar_avisos_vistos":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"minha_delegacao":
{ Args: { "p_comite": string }; Returns: string
                           },
"participa_do_comite":
{ Args: { "p_comite": string }; Returns: boolean
                           },
"pode_ver_pessoa":
{ Args: { "p_pessoa": string }; Returns: boolean
                           },
"quorum":
{ Args: { "p_comite": string }; Returns: number
                           },
"regras":
{ Args: { "p_comite": string }; Returns: Json
                           },
"regras_do_guia":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"regras_validas":
{ Args: { "r": Json }; Returns: boolean
                           },
"tem_papel":
{ Args: { "p_comite": string,"p_papeis": (Database["public"]['Enums']["papel"])[] }; Returns: boolean
                           }
          }
          Enums: {
            "papel": "delegado"|"mesa"|"crise"|"press"|"secretaria","situacao_delegacao": "membro"|"observadora"|"suspensa"
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
            "papel": ["delegado", "mesa", "crise", "press", "secretaria"],"situacao_delegacao": ["membro", "observadora", "suspensa"]
          }
        }
} as const
