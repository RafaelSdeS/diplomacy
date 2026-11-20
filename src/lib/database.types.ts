
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
            "atualizacao_comite": {
                  Row: {
                    "atualizacao_id": string,"comite_id": string,"evento_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizacao_id": string,"comite_id": string,"evento_id": string
                  }
                  Update: {
                    "atualizacao_id"?: string,"comite_id"?: string,"evento_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "atualizacao_comite_atualizacao_id_evento_id_fkey"
      columns: ["atualizacao_id","evento_id"]
isOneToOne: false
      referencedRelation: "atualizacao_crise"
      referencedColumns: ["id","evento_id"]
    },{
      foreignKeyName: "atualizacao_comite_comite_id_evento_id_fkey"
      columns: ["comite_id","evento_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id","evento_id"]
    }
                  ]
                },"atualizacao_crise": {
                  Row: {
                    "autor_id": string | null,"evento_id": string,"id": string,"publicada_em": string,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"evento_id": string,"id"?: string,"publicada_em"?: string,"texto": string
                  }
                  Update: {
                    "autor_id"?: string | null,"evento_id"?: string,"id"?: string,"publicada_em"?: string,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "atualizacao_crise_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "atualizacao_crise_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    }
                  ]
                },"aviso": {
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
                },"estado_sessao": {
                  Row: {
                    "atualizado_em": string,"comite_id": string,"cronometro_duracao_seg": number | null,"cronometro_inicio": string | null,"cronometro_pausado_restante_seg": number | null,"etapa_plenaria": string,"fase": Database["public"]['Enums']["fase_comite"],"forma": Database["public"]['Enums']["forma_debate"],"mesa_assumiu": boolean,"orador_delegacao_id": string | null,"ordem_topicos": (number)[] | null,"sessao_id": string | null,"tempo_fala_seg": number,"topico_atual": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"comite_id": string,"cronometro_duracao_seg"?: number | null,"cronometro_inicio"?: string | null,"cronometro_pausado_restante_seg"?: number | null,"etapa_plenaria"?: string,"fase"?: Database["public"]['Enums']["fase_comite"],"forma"?: Database["public"]['Enums']["forma_debate"],"mesa_assumiu"?: boolean,"orador_delegacao_id"?: string | null,"ordem_topicos"?: (number)[] | null,"sessao_id"?: string | null,"tempo_fala_seg"?: number,"topico_atual"?: number | null
                  }
                  Update: {
                    "atualizado_em"?: string,"comite_id"?: string,"cronometro_duracao_seg"?: number | null,"cronometro_inicio"?: string | null,"cronometro_pausado_restante_seg"?: number | null,"etapa_plenaria"?: string,"fase"?: Database["public"]['Enums']["fase_comite"],"forma"?: Database["public"]['Enums']["forma_debate"],"mesa_assumiu"?: boolean,"orador_delegacao_id"?: string | null,"ordem_topicos"?: (number)[] | null,"sessao_id"?: string | null,"tempo_fala_seg"?: number,"topico_atual"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "estado_sessao_comite_id_fkey"
      columns: ["comite_id"]
isOneToOne: true
      referencedRelation: "comite"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "estado_sessao_orador_delegacao_id_comite_id_fkey"
      columns: ["orador_delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "estado_sessao_sessao_id_comite_id_fkey"
      columns: ["sessao_id","comite_id"]
isOneToOne: false
      referencedRelation: "sessao"
      referencedColumns: ["id","comite_id"]
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
                },"lista_oradores": {
                  Row: {
                    "comite_id": string,"delegacao_id": string,"falou": boolean,"id": string,"lado": string | null,"ordem": number,"ponto_mocao_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"delegacao_id": string,"falou"?: boolean,"id"?: string,"lado"?: string | null,"ordem": number,"ponto_mocao_id"?: string | null
                  }
                  Update: {
                    "comite_id"?: string,"delegacao_id"?: string,"falou"?: boolean,"id"?: string,"lado"?: string | null,"ordem"?: number,"ponto_mocao_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "lista_oradores_comite_id_fkey"
      columns: ["comite_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lista_oradores_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "lista_oradores_ponto_mocao_id_fkey"
      columns: ["ponto_mocao_id"]
isOneToOne: false
      referencedRelation: "ponto_mocao"
      referencedColumns: ["id"]
    }
                  ]
                },"nota_crise": {
                  Row: {
                    "autor_id": string | null,"comite_id": string,"criado_em": string,"delegacao_id": string,"id": string,"respondida_em": string | null,"responsavel_id": string | null,"resposta": string | null,"status": Database["public"]['Enums']["status_nota"],"texto": string,"tipo": string,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"comite_id": string,"criado_em"?: string,"delegacao_id": string,"id"?: string,"respondida_em"?: string | null,"responsavel_id"?: string | null,"resposta"?: string | null,"status"?: Database["public"]['Enums']["status_nota"],"texto": string,"tipo": string,"titulo": string
                  }
                  Update: {
                    "autor_id"?: string | null,"comite_id"?: string,"criado_em"?: string,"delegacao_id"?: string,"id"?: string,"respondida_em"?: string | null,"responsavel_id"?: string | null,"resposta"?: string | null,"status"?: Database["public"]['Enums']["status_nota"],"texto"?: string,"tipo"?: string,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "nota_crise_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nota_crise_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "nota_crise_responsavel_id_fkey"
      columns: ["responsavel_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    }
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
                },"pedido_fala": {
                  Row: {
                    "comite_id": string,"criado_em": string,"delegacao_id": string,"id": string,"sessao_id": string,"situacao": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"criado_em"?: string,"delegacao_id": string,"id"?: string,"sessao_id": string,"situacao"?: string
                  }
                  Update: {
                    "comite_id"?: string,"criado_em"?: string,"delegacao_id"?: string,"id"?: string,"sessao_id"?: string,"situacao"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedido_fala_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "pedido_fala_sessao_id_comite_id_fkey"
      columns: ["sessao_id","comite_id"]
isOneToOne: false
      referencedRelation: "sessao"
      referencedColumns: ["id","comite_id"]
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
                },"ponto_mocao": {
                  Row: {
                    "comite_id": string,"criado_em": string,"delegacao_id": string,"detalhe": string | null,"id": string,"minutos": number | null,"sessao_id": string,"status": string,"tipo": string,"topico": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"criado_em"?: string,"delegacao_id": string,"detalhe"?: string | null,"id"?: string,"minutos"?: number | null,"sessao_id": string,"status"?: string,"tipo": string,"topico"?: number | null
                  }
                  Update: {
                    "comite_id"?: string,"criado_em"?: string,"delegacao_id"?: string,"detalhe"?: string | null,"id"?: string,"minutos"?: number | null,"sessao_id"?: string,"status"?: string,"tipo"?: string,"topico"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ponto_mocao_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "ponto_mocao_sessao_id_comite_id_fkey"
      columns: ["sessao_id","comite_id"]
isOneToOne: false
      referencedRelation: "sessao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"ponto_pauta": {
                  Row: {
                    "comite_id": string,"id": string,"ordem": number,"pai_id": string | null,"proposta_id": string,"status": string,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"id"?: string,"ordem": number,"pai_id"?: string | null,"proposta_id": string,"status"?: string,"texto": string
                  }
                  Update: {
                    "comite_id"?: string,"id"?: string,"ordem"?: number,"pai_id"?: string | null,"proposta_id"?: string,"status"?: string,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ponto_pauta_pai_id_fkey"
      columns: ["pai_id"]
isOneToOne: false
      referencedRelation: "ponto_pauta"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ponto_pauta_proposta_id_comite_id_fkey"
      columns: ["proposta_id","comite_id"]
isOneToOne: false
      referencedRelation: "proposta_agenda"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"presenca": {
                  Row: {
                    "comite_id": string,"delegacao_id": string,"sessao_id": string,"situacao": Database["public"]['Enums']["situacao_presenca"]
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"delegacao_id": string,"sessao_id": string,"situacao"?: Database["public"]['Enums']["situacao_presenca"]
                  }
                  Update: {
                    "comite_id"?: string,"delegacao_id"?: string,"sessao_id"?: string,"situacao"?: Database["public"]['Enums']["situacao_presenca"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "presenca_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "presenca_sessao_id_comite_id_fkey"
      columns: ["sessao_id","comite_id"]
isOneToOne: false
      referencedRelation: "sessao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"proposta_agenda": {
                  Row: {
                    "adotada": boolean,"comite_id": string,"criado_em": string,"delegacao_id": string | null,"id": string,"topico": number
                  }
                  ComputedFields: never
                  Insert: {
                    "adotada"?: boolean,"comite_id": string,"criado_em"?: string,"delegacao_id"?: string | null,"id"?: string,"topico": number
                  }
                  Update: {
                    "adotada"?: boolean,"comite_id"?: string,"criado_em"?: string,"delegacao_id"?: string | null,"id"?: string,"topico"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "proposta_agenda_comite_id_fkey"
      columns: ["comite_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proposta_agenda_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"rodizio_presidencia": {
                  Row: {
                    "comite_id": string,"delegacao_id": string,"ordem": number,"vezes": number
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"delegacao_id": string,"ordem": number,"vezes"?: number
                  }
                  Update: {
                    "comite_id"?: string,"delegacao_id"?: string,"ordem"?: number,"vezes"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "rodizio_presidencia_comite_id_fkey"
      columns: ["comite_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rodizio_presidencia_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"sessao": {
                  Row: {
                    "comite_id": string,"fim": string | null,"id": string,"informal_min_usados": number,"inicio": string,"numero": number,"presidencia_delegacao_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"fim"?: string | null,"id"?: string,"informal_min_usados"?: number,"inicio"?: string,"numero": number,"presidencia_delegacao_id"?: string | null
                  }
                  Update: {
                    "comite_id"?: string,"fim"?: string | null,"id"?: string,"informal_min_usados"?: number,"inicio"?: string,"numero"?: number,"presidencia_delegacao_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessao_comite_id_fkey"
      columns: ["comite_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessao_presidencia_delegacao_id_comite_id_fkey"
      columns: ["presidencia_delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"votacao": {
                  Row: {
                    "a_favor": number | null,"aberta": boolean,"abstencoes": number | null,"aprovada": boolean | null,"base": number | null,"comite_id": string,"contra": number | null,"criado_em": string,"encerrada_em": string | null,"id": string,"necessario": number | null,"objeto": string,"ponto_mocao_id": string | null,"regra": string,"sessao_id": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "a_favor"?: number | null,"aberta"?: boolean,"abstencoes"?: number | null,"aprovada"?: boolean | null,"base"?: number | null,"comite_id": string,"contra"?: number | null,"criado_em"?: string,"encerrada_em"?: string | null,"id"?: string,"necessario"?: number | null,"objeto": string,"ponto_mocao_id"?: string | null,"regra": string,"sessao_id": string,"tipo": string
                  }
                  Update: {
                    "a_favor"?: number | null,"aberta"?: boolean,"abstencoes"?: number | null,"aprovada"?: boolean | null,"base"?: number | null,"comite_id"?: string,"contra"?: number | null,"criado_em"?: string,"encerrada_em"?: string | null,"id"?: string,"necessario"?: number | null,"objeto"?: string,"ponto_mocao_id"?: string | null,"regra"?: string,"sessao_id"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "votacao_ponto_mocao_id_fkey"
      columns: ["ponto_mocao_id"]
isOneToOne: false
      referencedRelation: "ponto_mocao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "votacao_sessao_id_comite_id_fkey"
      columns: ["sessao_id","comite_id"]
isOneToOne: false
      referencedRelation: "sessao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"voto": {
                  Row: {
                    "comite_id": string,"criado_em": string,"delegacao_id": string,"escolha": Database["public"]['Enums']["escolha_voto"],"registrado_pela_mesa": boolean,"votacao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"criado_em"?: string,"delegacao_id": string,"escolha": Database["public"]['Enums']["escolha_voto"],"registrado_pela_mesa"?: boolean,"votacao_id": string
                  }
                  Update: {
                    "comite_id"?: string,"criado_em"?: string,"delegacao_id"?: string,"escolha"?: Database["public"]['Enums']["escolha_voto"],"registrado_pela_mesa"?: boolean,"votacao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "voto_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "voto_votacao_id_comite_id_fkey"
      columns: ["votacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "votacao"
      referencedColumns: ["id","comite_id"]
    }
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
            "abrir_lista_especial":
{ Args: { "p_ponto": string }; Returns: undefined
                           },
"abrir_sessao":
{ Args: { "p_comite": string }; Returns: string
                           },
"abrir_votacao":
{ Args: { "p_ponto": string }; Returns: string
                           },
"abrir_votacao_livre":
{ Args: { "p_comite": string,"p_objeto": string,"p_tipo"?: string }; Returns: string
                           },
"adotar_proposta":
{ Args: { "p_proposta": string }; Returns: undefined
                           },
"agora":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"aplicar_convites":
{ Args: { "p_email": string,"p_usuario": string }; Returns: undefined
                           },
"aplicar_forma":
{ Args: { "p_comite": string,"p_forma": Database["public"]['Enums']["forma_debate"],"p_minutos": number }; Returns: undefined
                           },
"assumir_nota":
{ Args: { "p_id": string }; Returns: undefined
                           },
"assumir_presidencia":
{ Args: { "p_assumir": boolean,"p_comite": string }; Returns: undefined
                           },
"avancar_plenaria":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"baixar_placa":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"dar_palavra":
{ Args: { "p_comite": string,"p_delegacao": string,"p_seg"?: number }; Returns: undefined
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
"encerrar_sessao":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"encerrar_votacao":
{ Args: { "p_votacao": string }; Returns: undefined
                           },
"enviar_nota":
{ Args: { "p_comite": string,"p_id": string,"p_texto": string,"p_tipo": string,"p_titulo": string }; Returns: undefined
                           },
"enviar_ponto":
{ Args: { "p_comite": string,"p_detalhe"?: string,"p_minutos"?: number,"p_tipo": string,"p_topico"?: number }; Returns: undefined
                           },
"evento_do_comite":
{ Args: { "p_comite": string }; Returns: string
                           },
"exigir_crise":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"exigir_delegacao":
{ Args: { "p_comite": string }; Returns: string
                           },
"exigir_mesa":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"exigir_presidencia":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"iniciar_cronometro":
{ Args: { "p_comite": string,"p_seg": number }; Returns: undefined
                           },
"inscrever_lista":
{ Args: { "p_lado": string,"p_ponto": string }; Returns: undefined
                           },
"levantar_placa":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"maioria_simples":
{ Args: { "p_base": number }; Returns: number
                           },
"marcar_avisos_vistos":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"marcar_ponto_pauta":
{ Args: { "p_ponto": string,"p_status": string }; Returns: undefined
                           },
"minha_delegacao":
{ Args: { "p_comite": string }; Returns: string
                           },
"mudar_forma":
{ Args: { "p_comite": string,"p_forma": Database["public"]['Enums']["forma_debate"],"p_minutos"?: number }; Returns: undefined
                           },
"participa_do_comite":
{ Args: { "p_comite": string }; Returns: boolean
                           },
"passar_presidencia":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"pausar":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"pode_presidir":
{ Args: { "p_comite": string }; Returns: boolean
                           },
"pode_ver_pessoa":
{ Args: { "p_pessoa": string }; Returns: boolean
                           },
"posicao_na_fila":
{ Args: { "p_id": string }; Returns: number
                           },
"presentes":
{ Args: { "p_sessao": string }; Returns: number
                           },
"publicar_atualizacao":
{ Args: { "p_comites": (string)[],"p_texto": string }; Returns: string
                           },
"quorum":
{ Args: { "p_comite": string }; Returns: number
                           },
"quorum_votacao":
{ Args: { "p_comite": string }; Returns: number
                           },
"registrar_voto":
{ Args: { "p_delegacao": string,"p_escolha": Database["public"]['Enums']["escolha_voto"],"p_votacao": string }; Returns: undefined
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
"responder_notas":
{ Args: { "p_ids": (string)[],"p_resposta": string,"p_status": Database["public"]['Enums']["status_nota"] }; Returns: undefined
                           },
"responder_ponto":
{ Args: { "p_ponto": string,"p_status": string }; Returns: undefined
                           },
"resultado":
{ Args: { "p_votacao": string }; Returns: {
              "a_favor": number,"abstencoes": number,"aprovada": boolean,"base": number,"contra": number,"necessario": number
            }[]
                           },
"retomar":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"salvar_proposta_agenda":
{ Args: { "p_comite": string,"p_itens": Json,"p_topico": number }; Returns: string
                           },
"sessao_atual":
{ Args: { "p_comite": string }; Returns: string
                           },
"somar_segundos":
{ Args: { "p_comite": string,"p_seg": number }; Returns: undefined
                           },
"sortear_presidencia":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"tem_papel":
{ Args: { "p_comite": string,"p_papeis": (Database["public"]['Enums']["papel"])[] }; Returns: boolean
                           },
"tomar_proxima_presidencia":
{ Args: { "p_comite": string }; Returns: string
                           },
"validar_voto":
{ Args: { "p_delegacao": string,"p_escolha": Database["public"]['Enums']["escolha_voto"],"p_votacao": string }; Returns: string
                           },
"votar":
{ Args: { "p_escolha": Database["public"]['Enums']["escolha_voto"],"p_votacao": string }; Returns: undefined
                           }
          }
          Enums: {
            "escolha_voto": "a_favor"|"contra"|"abstencao","fase_comite": "plenaria"|"debate"|"acao"|"encerrado","forma_debate": "formal_formal"|"formal_informal"|"informal_informal","papel": "delegado"|"mesa"|"crise"|"press"|"secretaria","situacao_delegacao": "membro"|"observadora"|"suspensa","situacao_presenca": "presente"|"presente_e_votando","status_nota": "pendente"|"em_analise"|"aprovada"|"rejeitada"|"pede_ajuste"
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
            "escolha_voto": ["a_favor", "contra", "abstencao"],"fase_comite": ["plenaria", "debate", "acao", "encerrado"],"forma_debate": ["formal_formal", "formal_informal", "informal_informal"],"papel": ["delegado", "mesa", "crise", "press", "secretaria"],"situacao_delegacao": ["membro", "observadora", "suspensa"],"situacao_presenca": ["presente", "presente_e_votando"],"status_nota": ["pendente", "em_analise", "aprovada", "rejeitada", "pede_ajuste"]
          }
        }
} as const
