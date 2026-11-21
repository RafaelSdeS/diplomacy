
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
            "assinatura": {
                  Row: {
                    "comite_id": string,"criado_em": string,"delegacao_id": string,"documento_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"criado_em"?: string,"delegacao_id": string,"documento_id": string
                  }
                  Update: {
                    "comite_id"?: string,"criado_em"?: string,"delegacao_id"?: string,"documento_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assinatura_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "assinatura_documento_id_comite_id_fkey"
      columns: ["documento_id","comite_id"]
isOneToOne: false
      referencedRelation: "documento"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"assinatura_mocao": {
                  Row: {
                    "comite_id": string,"delegacao_id": string,"ponto_mocao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"delegacao_id": string,"ponto_mocao_id": string
                  }
                  Update: {
                    "comite_id"?: string,"delegacao_id"?: string,"ponto_mocao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assinatura_mocao_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "assinatura_mocao_ponto_mocao_id_fkey"
      columns: ["ponto_mocao_id"]
isOneToOne: false
      referencedRelation: "ponto_mocao"
      referencedColumns: ["id"]
    }
                  ]
                },"assinatura_push": {
                  Row: {
                    "auth": string,"criada_em": string,"endpoint": string,"p256dh": string,"pessoa_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"criada_em"?: string,"endpoint": string,"p256dh": string,"pessoa_id": string
                  }
                  Update: {
                    "auth"?: string,"criada_em"?: string,"endpoint"?: string,"p256dh"?: string,"pessoa_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assinatura_push_pessoa_id_fkey"
      columns: ["pessoa_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    }
                  ]
                },"atualizacao_comite": {
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
                },"aviso_chegada": {
                  Row: {
                    "comite_id": string,"criado_em": string,"delegacao_id": string,"sessao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"criado_em"?: string,"delegacao_id": string,"sessao_id": string
                  }
                  Update: {
                    "comite_id"?: string,"criado_em"?: string,"delegacao_id"?: string,"sessao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "aviso_chegada_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "aviso_chegada_sessao_id_comite_id_fkey"
      columns: ["sessao_id","comite_id"]
isOneToOne: false
      referencedRelation: "sessao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"bloco": {
                  Row: {
                    "comite_id": string,"criado_em": string,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"criado_em"?: string,"id"?: string,"nome": string
                  }
                  Update: {
                    "comite_id"?: string,"criado_em"?: string,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bloco_comite_id_fkey"
      columns: ["comite_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id"]
    }
                  ]
                },"bloco_membro": {
                  Row: {
                    "bloco_id": string,"comite_id": string,"delegacao_id": string,"redator": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "bloco_id": string,"comite_id": string,"delegacao_id": string,"redator"?: boolean
                  }
                  Update: {
                    "bloco_id"?: string,"comite_id"?: string,"delegacao_id"?: string,"redator"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "bloco_membro_bloco_id_comite_id_fkey"
      columns: ["bloco_id","comite_id"]
isOneToOne: false
      referencedRelation: "bloco"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "bloco_membro_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"bloqueio_bilhete": {
                  Row: {
                    "bloqueada_id": string,"comite_id": string,"criado_em": string,"delegacao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bloqueada_id": string,"comite_id": string,"criado_em"?: string,"delegacao_id": string
                  }
                  Update: {
                    "bloqueada_id"?: string,"comite_id"?: string,"criado_em"?: string,"delegacao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bloqueio_bilhete_bloqueada_id_comite_id_fkey"
      columns: ["bloqueada_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "bloqueio_bilhete_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"carta": {
                  Row: {
                    "autor_id": string | null,"comite_id": string,"corpo": string,"enviada_em": string,"id": string,"publica": boolean,"remetente_bloco_id": string | null,"remetente_delegacao_id": string | null,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"comite_id": string,"corpo": string,"enviada_em"?: string,"id"?: string,"publica"?: boolean,"remetente_bloco_id"?: string | null,"remetente_delegacao_id"?: string | null,"titulo": string
                  }
                  Update: {
                    "autor_id"?: string | null,"comite_id"?: string,"corpo"?: string,"enviada_em"?: string,"id"?: string,"publica"?: boolean,"remetente_bloco_id"?: string | null,"remetente_delegacao_id"?: string | null,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "carta_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "carta_comite_id_fkey"
      columns: ["comite_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "carta_remetente_bloco_id_comite_id_fkey"
      columns: ["remetente_bloco_id","comite_id"]
isOneToOne: false
      referencedRelation: "bloco"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "carta_remetente_delegacao_id_comite_id_fkey"
      columns: ["remetente_delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"carta_destinatario": {
                  Row: {
                    "bloco_id": string | null,"carta_id": string,"comite_id": string,"delegacao_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bloco_id"?: string | null,"carta_id": string,"comite_id": string,"delegacao_id"?: string | null
                  }
                  Update: {
                    "bloco_id"?: string | null,"carta_id"?: string,"comite_id"?: string,"delegacao_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "carta_destinatario_bloco_id_comite_id_fkey"
      columns: ["bloco_id","comite_id"]
isOneToOne: false
      referencedRelation: "bloco"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "carta_destinatario_carta_id_comite_id_fkey"
      columns: ["carta_id","comite_id"]
isOneToOne: false
      referencedRelation: "carta"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "carta_destinatario_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"certificado": {
                  Row: {
                    "codigo": string,"email": string,"emitido_em": string,"evento_id": string,"funcao": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo": string,"email": string,"emitido_em"?: string,"evento_id": string,"funcao": string,"nome": string
                  }
                  Update: {
                    "codigo"?: string,"email"?: string,"emitido_em"?: string,"evento_id"?: string,"funcao"?: string,"nome"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "certificado_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    }
                  ]
                },"checkin": {
                  Row: {
                    "dia": string,"em": string,"email": string,"evento_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dia"?: string,"em"?: string,"email": string,"evento_id": string
                  }
                  Update: {
                    "dia"?: string,"em"?: string,"email"?: string,"evento_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkin_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    }
                  ]
                },"citacao": {
                  Row: {
                    "delegacao_id": string,"noticia_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "delegacao_id": string,"noticia_id": string
                  }
                  Update: {
                    "delegacao_id"?: string,"noticia_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "citacao_delegacao_id_fkey"
      columns: ["delegacao_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citacao_noticia_id_fkey"
      columns: ["noticia_id"]
isOneToOne: false
      referencedRelation: "noticia"
      referencedColumns: ["id"]
    }
                  ]
                },"clausula": {
                  Row: {
                    "atualizado_em": string,"comite_id": string,"documento_id": string,"id": string,"ordem": number,"origem_id": string | null,"pai_id": string | null,"status": string,"texto": string,"tipo": string,"versao": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"comite_id": string,"documento_id": string,"id"?: string,"ordem": number,"origem_id"?: string | null,"pai_id"?: string | null,"status"?: string,"texto": string,"tipo": string,"versao"?: number
                  }
                  Update: {
                    "atualizado_em"?: string,"comite_id"?: string,"documento_id"?: string,"id"?: string,"ordem"?: number,"origem_id"?: string | null,"pai_id"?: string | null,"status"?: string,"texto"?: string,"tipo"?: string,"versao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "clausula_documento_id_comite_id_fkey"
      columns: ["documento_id","comite_id"]
isOneToOne: false
      referencedRelation: "documento"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "clausula_origem_id_fkey"
      columns: ["origem_id"]
isOneToOne: false
      referencedRelation: "clausula"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clausula_pai_id_fkey"
      columns: ["pai_id"]
isOneToOne: false
      referencedRelation: "clausula"
      referencedColumns: ["id"]
    }
                  ]
                },"coletiva": {
                  Row: {
                    "aberta": boolean,"criada_em": string,"evento_id": string,"id": string,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aberta"?: boolean,"criada_em"?: string,"evento_id": string,"id"?: string,"titulo": string
                  }
                  Update: {
                    "aberta"?: boolean,"criada_em"?: string,"evento_id"?: string,"id"?: string,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coletiva_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    }
                  ]
                },"coletiva_pergunta": {
                  Row: {
                    "autor_id": string | null,"coletiva_id": string,"comite_id": string,"criada_em": string,"delegacao_id": string,"id": string,"pergunta": string,"veiculo_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"coletiva_id": string,"comite_id": string,"criada_em"?: string,"delegacao_id": string,"id"?: string,"pergunta": string,"veiculo_id": string
                  }
                  Update: {
                    "autor_id"?: string | null,"coletiva_id"?: string,"comite_id"?: string,"criada_em"?: string,"delegacao_id"?: string,"id"?: string,"pergunta"?: string,"veiculo_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coletiva_pergunta_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coletiva_pergunta_coletiva_id_fkey"
      columns: ["coletiva_id"]
isOneToOne: false
      referencedRelation: "coletiva"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coletiva_pergunta_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "coletiva_pergunta_veiculo_id_comite_id_fkey"
      columns: ["veiculo_id","comite_id"]
isOneToOne: false
      referencedRelation: "veiculo"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"comentario": {
                  Row: {
                    "autor_id": string | null,"clausula_id": string,"comite_id": string,"criado_em": string,"delegacao_id": string | null,"documento_id": string,"estacionado": boolean,"id": string,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"clausula_id": string,"comite_id": string,"criado_em"?: string,"delegacao_id"?: string | null,"documento_id": string,"estacionado"?: boolean,"id"?: string,"texto": string
                  }
                  Update: {
                    "autor_id"?: string | null,"clausula_id"?: string,"comite_id"?: string,"criado_em"?: string,"delegacao_id"?: string | null,"documento_id"?: string,"estacionado"?: boolean,"id"?: string,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comentario_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comentario_clausula_id_fkey"
      columns: ["clausula_id"]
isOneToOne: false
      referencedRelation: "clausula"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comentario_documento_id_comite_id_fkey"
      columns: ["documento_id","comite_id"]
isOneToOne: false
      referencedRelation: "documento"
      referencedColumns: ["id","comite_id"]
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
                    "comite_id": string | null,"criado_em": string,"delegacao_id": string | null,"email": string,"evento_id": string,"id": string,"nome": string | null,"papel": Database["public"]['Enums']["papel"]
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id"?: string | null,"criado_em"?: string,"delegacao_id"?: string | null,"email": string,"evento_id": string,"id"?: string,"nome"?: string | null,"papel": Database["public"]['Enums']["papel"]
                  }
                  Update: {
                    "comite_id"?: string | null,"criado_em"?: string,"delegacao_id"?: string | null,"email"?: string,"evento_id"?: string,"id"?: string,"nome"?: string | null,"papel"?: Database["public"]['Enums']["papel"]
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
                },"credencial": {
                  Row: {
                    "criada_em": string,"email": string,"evento_id": string,"expira_em": string | null,"hash": string,"id": string,"revogada": boolean,"tipo": string,"usada_em": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "criada_em"?: string,"email": string,"evento_id": string,"expira_em"?: string | null,"hash": string,"id"?: string,"revogada"?: boolean,"tipo": string,"usada_em"?: string | null
                  }
                  Update: {
                    "criada_em"?: string,"email"?: string,"evento_id"?: string,"expira_em"?: string | null,"hash"?: string,"id"?: string,"revogada"?: boolean,"tipo"?: string,"usada_em"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "credencial_evento_id_fkey"
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
                },"denuncia": {
                  Row: {
                    "autor_id": string | null,"criado_em": string,"id": string,"motivo": string,"noticia_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"criado_em"?: string,"id"?: string,"motivo": string,"noticia_id": string
                  }
                  Update: {
                    "autor_id"?: string | null,"criado_em"?: string,"id"?: string,"motivo"?: string,"noticia_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "denuncia_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "denuncia_noticia_id_fkey"
      columns: ["noticia_id"]
isOneToOne: false
      referencedRelation: "noticia"
      referencedColumns: ["id"]
    }
                  ]
                },"denuncia_mensagem": {
                  Row: {
                    "autor_id": string | null,"comite_id": string,"criado_em": string,"id": string,"mensagem_id": string,"motivo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"comite_id": string,"criado_em"?: string,"id"?: string,"mensagem_id": string,"motivo": string
                  }
                  Update: {
                    "autor_id"?: string | null,"comite_id"?: string,"criado_em"?: string,"id"?: string,"mensagem_id"?: string,"motivo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "denuncia_mensagem_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "denuncia_mensagem_comite_id_fkey"
      columns: ["comite_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "denuncia_mensagem_mensagem_id_fkey"
      columns: ["mensagem_id"]
isOneToOne: false
      referencedRelation: "mensagem"
      referencedColumns: ["id"]
    }
                  ]
                },"documento": {
                  Row: {
                    "aprovacao": string | null,"atualizacao_crise_id": string | null,"bloco_id": string,"clausula_em_foco_id": string | null,"comite_id": string,"criado_em": string,"enviado_em": string | null,"id": string,"max_rodadas": number,"numero": number | null,"ponto_pauta_id": string | null,"status": string,"tipo": string,"titulo": string,"topico": number | null,"votacao_nominal": boolean,"exigir_topico_livre": undefined | null
                  }
                  ComputedFields: "exigir_topico_livre"
                  Insert: {
                    "aprovacao"?: string | null,"atualizacao_crise_id"?: string | null,"bloco_id": string,"clausula_em_foco_id"?: string | null,"comite_id": string,"criado_em"?: string,"enviado_em"?: string | null,"id"?: string,"max_rodadas"?: number,"numero"?: number | null,"ponto_pauta_id"?: string | null,"status"?: string,"tipo": string,"titulo": string,"topico"?: number | null,"votacao_nominal"?: boolean
                  }
                  Update: {
                    "aprovacao"?: string | null,"atualizacao_crise_id"?: string | null,"bloco_id"?: string,"clausula_em_foco_id"?: string | null,"comite_id"?: string,"criado_em"?: string,"enviado_em"?: string | null,"id"?: string,"max_rodadas"?: number,"numero"?: number | null,"ponto_pauta_id"?: string | null,"status"?: string,"tipo"?: string,"titulo"?: string,"topico"?: number | null,"votacao_nominal"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "documento_atualizacao_crise_id_fkey"
      columns: ["atualizacao_crise_id"]
isOneToOne: false
      referencedRelation: "atualizacao_crise"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documento_bloco_id_comite_id_fkey"
      columns: ["bloco_id","comite_id"]
isOneToOne: false
      referencedRelation: "bloco"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "documento_clausula_em_foco_id_fkey"
      columns: ["clausula_em_foco_id"]
isOneToOne: false
      referencedRelation: "clausula"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documento_ponto_pauta_id_fkey"
      columns: ["ponto_pauta_id"]
isOneToOne: false
      referencedRelation: "ponto_pauta"
      referencedColumns: ["id"]
    }
                  ]
                },"dpo": {
                  Row: {
                    "atualizado_em": string,"comentario_mesa": string | null,"comite_id": string,"delegacao_id": string,"enviado_em": string | null,"id": string,"referencias": (string)[],"status": string,"texto": string,"topico": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"comentario_mesa"?: string | null,"comite_id": string,"delegacao_id": string,"enviado_em"?: string | null,"id"?: string,"referencias"?: (string)[],"status"?: string,"texto"?: string,"topico": number
                  }
                  Update: {
                    "atualizado_em"?: string,"comentario_mesa"?: string | null,"comite_id"?: string,"delegacao_id"?: string,"enviado_em"?: string | null,"id"?: string,"referencias"?: (string)[],"status"?: string,"texto"?: string,"topico"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "dpo_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"emenda": {
                  Row: {
                    "acao": string,"clausula_id": string | null,"comite_id": string,"criada_em": string,"delegacao_id": string,"documento_id": string,"id": string,"status": string,"texto": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acao": string,"clausula_id"?: string | null,"comite_id": string,"criada_em"?: string,"delegacao_id": string,"documento_id": string,"id"?: string,"status"?: string,"texto"?: string | null
                  }
                  Update: {
                    "acao"?: string,"clausula_id"?: string | null,"comite_id"?: string,"criada_em"?: string,"delegacao_id"?: string,"documento_id"?: string,"id"?: string,"status"?: string,"texto"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "emenda_clausula_id_fkey"
      columns: ["clausula_id"]
isOneToOne: false
      referencedRelation: "clausula"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "emenda_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "emenda_documento_id_comite_id_fkey"
      columns: ["documento_id","comite_id"]
isOneToOne: false
      referencedRelation: "documento"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"emenda_assinatura": {
                  Row: {
                    "comite_id": string,"delegacao_id": string,"emenda_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"delegacao_id": string,"emenda_id": string
                  }
                  Update: {
                    "comite_id"?: string,"delegacao_id"?: string,"emenda_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "emenda_assinatura_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "emenda_assinatura_emenda_id_comite_id_fkey"
      columns: ["emenda_id","comite_id"]
isOneToOne: false
      referencedRelation: "emenda"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"entrevista": {
                  Row: {
                    "autor_id": string | null,"comite_id": string,"criada_em": string,"delegacao_id": string,"horario": string | null,"id": string,"status": string,"tema": string,"veiculo_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"comite_id": string,"criada_em"?: string,"delegacao_id": string,"horario"?: string | null,"id"?: string,"status"?: string,"tema": string,"veiculo_id": string
                  }
                  Update: {
                    "autor_id"?: string | null,"comite_id"?: string,"criada_em"?: string,"delegacao_id"?: string,"horario"?: string | null,"id"?: string,"status"?: string,"tema"?: string,"veiculo_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "entrevista_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entrevista_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "entrevista_veiculo_id_comite_id_fkey"
      columns: ["veiculo_id","comite_id"]
isOneToOne: false
      referencedRelation: "veiculo"
      referencedColumns: ["id","comite_id"]
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
                },"mensagem": {
                  Row: {
                    "autor_id": string | null,"comite_id": string,"criado_em": string,"crise_comite_id": string | null,"de_delegacao_id": string | null,"id": string,"oculta": boolean,"para_delegacao_id": string | null,"texto": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"comite_id": string,"criado_em"?: string,"crise_comite_id"?: never,"de_delegacao_id"?: string | null,"id": string,"oculta"?: boolean,"para_delegacao_id"?: string | null,"texto": string,"tipo": string
                  }
                  Update: {
                    "autor_id"?: string | null,"comite_id"?: string,"criado_em"?: string,"crise_comite_id"?: never,"de_delegacao_id"?: string | null,"id"?: string,"oculta"?: boolean,"para_delegacao_id"?: string | null,"texto"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mensagem_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mensagem_comite_id_fkey"
      columns: ["comite_id"]
isOneToOne: false
      referencedRelation: "comite"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mensagem_de_delegacao_id_comite_id_fkey"
      columns: ["de_delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "mensagem_para_delegacao_id_comite_id_fkey"
      columns: ["para_delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
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
                },"noticia": {
                  Row: {
                    "autor_id": string | null,"comite_id": string,"data_simulacao": string | null,"id": string,"imagem_descricao": string | null,"imagem_path": string | null,"linha_fina": string | null,"motivo_ocultacao": string | null,"publicada_em": string,"status": string,"texto": string,"tipo": string,"titulo": string,"veiculo_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"comite_id": string,"data_simulacao"?: string | null,"id": string,"imagem_descricao"?: string | null,"imagem_path"?: string | null,"linha_fina"?: string | null,"motivo_ocultacao"?: string | null,"publicada_em"?: string,"status"?: string,"texto": string,"tipo": string,"titulo": string,"veiculo_id": string
                  }
                  Update: {
                    "autor_id"?: string | null,"comite_id"?: string,"data_simulacao"?: string | null,"id"?: string,"imagem_descricao"?: string | null,"imagem_path"?: string | null,"linha_fina"?: string | null,"motivo_ocultacao"?: string | null,"publicada_em"?: string,"status"?: string,"texto"?: string,"tipo"?: string,"titulo"?: string,"veiculo_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "noticia_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "noticia_veiculo_id_comite_id_fkey"
      columns: ["veiculo_id","comite_id"]
isOneToOne: false
      referencedRelation: "veiculo"
      referencedColumns: ["id","comite_id"]
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
                },"passe": {
                  Row: {
                    "comite_id": string,"delegacao_id": string,"votacao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"delegacao_id": string,"votacao_id": string
                  }
                  Update: {
                    "comite_id"?: string,"delegacao_id"?: string,"votacao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "passe_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "passe_votacao_id_comite_id_fkey"
      columns: ["votacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "votacao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"pedido_exclusao": {
                  Row: {
                    "atendido_em": string | null,"criado_em": string,"id": string,"nome": string,"pessoa_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atendido_em"?: string | null,"criado_em"?: string,"id"?: string,"nome": string,"pessoa_id"?: string | null
                  }
                  Update: {
                    "atendido_em"?: string | null,"criado_em"?: string,"id"?: string,"nome"?: string,"pessoa_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedido_exclusao_pessoa_id_fkey"
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
                },"pedido_reabertura": {
                  Row: {
                    "clausula_id": string,"comite_id": string,"delegacao_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clausula_id": string,"comite_id": string,"delegacao_id": string
                  }
                  Update: {
                    "clausula_id"?: string,"comite_id"?: string,"delegacao_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedido_reabertura_clausula_id_fkey"
      columns: ["clausula_id"]
isOneToOne: false
      referencedRelation: "clausula"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_reabertura_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"pesquisa_respondida": {
                  Row: {
                    "evento_id": string,"pessoa_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "evento_id": string,"pessoa_id": string
                  }
                  Update: {
                    "evento_id"?: string,"pessoa_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pesquisa_respondida_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pesquisa_respondida_pessoa_id_fkey"
      columns: ["pessoa_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    }
                  ]
                },"pesquisa_resposta": {
                  Row: {
                    "criado_em": string,"evento_id": string,"id": string,"nota": number,"papel": Database["public"]['Enums']["papel"],"respostas": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"evento_id": string,"id"?: string,"nota": number,"papel": Database["public"]['Enums']["papel"],"respostas"?: NonNullable<Json>
                  }
                  Update: {
                    "criado_em"?: string,"evento_id"?: string,"id"?: string,"nota"?: number,"papel"?: Database["public"]['Enums']["papel"],"respostas"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "pesquisa_resposta_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    }
                  ]
                },"pessoa": {
                  Row: {
                    "avisos_vistos_em": string | null,"bio": string | null,"foto_path": string | null,"id": string,"idioma": string | null,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avisos_vistos_em"?: string | null,"bio"?: string | null,"foto_path"?: string | null,"id": string,"idioma"?: string | null,"nome": string
                  }
                  Update: {
                    "avisos_vistos_em"?: string | null,"bio"?: string | null,"foto_path"?: string | null,"id"?: string,"idioma"?: string | null,"nome"?: string
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
                    "comite_id": string,"delegacao_id": string,"marcada_em": string,"sessao_id": string,"situacao": Database["public"]['Enums']["situacao_presenca"]
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"delegacao_id": string,"marcada_em"?: string,"sessao_id": string,"situacao"?: Database["public"]['Enums']["situacao_presenca"]
                  }
                  Update: {
                    "comite_id"?: string,"delegacao_id"?: string,"marcada_em"?: string,"sessao_id"?: string,"situacao"?: Database["public"]['Enums']["situacao_presenca"]
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
                },"proposta_alteracao": {
                  Row: {
                    "clausula_id": string,"comite_id": string,"criado_em": string,"delegacao_id": string,"documento_id": string,"id": string,"status": string,"texto_novo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clausula_id": string,"comite_id": string,"criado_em"?: string,"delegacao_id": string,"documento_id": string,"id"?: string,"status"?: string,"texto_novo": string
                  }
                  Update: {
                    "clausula_id"?: string,"comite_id"?: string,"criado_em"?: string,"delegacao_id"?: string,"documento_id"?: string,"id"?: string,"status"?: string,"texto_novo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "proposta_alteracao_clausula_id_fkey"
      columns: ["clausula_id"]
isOneToOne: false
      referencedRelation: "clausula"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proposta_alteracao_delegacao_id_comite_id_fkey"
      columns: ["delegacao_id","comite_id"]
isOneToOne: false
      referencedRelation: "delegacao"
      referencedColumns: ["id","comite_id"]
    },{
      foreignKeyName: "proposta_alteracao_documento_id_comite_id_fkey"
      columns: ["documento_id","comite_id"]
isOneToOne: false
      referencedRelation: "documento"
      referencedColumns: ["id","comite_id"]
    }
                  ]
                },"push_enviado": {
                  Row: {
                    "chave": string,"em": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chave": string,"em"?: string
                  }
                  Update: {
                    "chave"?: string,"em"?: string
                  }
                  Relationships: [
                    
                  ]
                },"registro": {
                  Row: {
                    "acao": string,"alvo": string | null,"detalhe": string | null,"em": string,"evento_id": string,"id": number,"pessoa_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acao": string,"alvo"?: string | null,"detalhe"?: string | null,"em"?: string,"evento_id": string,"id"?: never,"pessoa_id"?: string | null
                  }
                  Update: {
                    "acao"?: string,"alvo"?: string | null,"detalhe"?: string | null,"em"?: string,"evento_id"?: string,"id"?: never,"pessoa_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "registro_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "evento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "registro_pessoa_id_fkey"
      columns: ["pessoa_id"]
isOneToOne: false
      referencedRelation: "pessoa"
      referencedColumns: ["id"]
    }
                  ]
                },"rodada": {
                  Row: {
                    "comite_id": string,"documento_id": string,"fim": string,"inicio": string,"numero": number
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"documento_id": string,"fim": string,"inicio"?: string,"numero": number
                  }
                  Update: {
                    "comite_id"?: string,"documento_id"?: string,"fim"?: string,"inicio"?: string,"numero"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "rodada_documento_id_comite_id_fkey"
      columns: ["documento_id","comite_id"]
isOneToOne: false
      referencedRelation: "documento"
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
                },"tentativa_login": {
                  Row: {
                    "em": string,"origem": string
                  }
                  ComputedFields: never
                  Insert: {
                    "em"?: string,"origem": string
                  }
                  Update: {
                    "em"?: string,"origem"?: string
                  }
                  Relationships: [
                    
                  ]
                },"veiculo": {
                  Row: {
                    "comite_id": string,"id": string,"linha_editorial": string | null,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comite_id": string,"id"?: string,"linha_editorial"?: string | null,"nome": string
                  }
                  Update: {
                    "comite_id"?: string,"id"?: string,"linha_editorial"?: string | null,"nome"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "veiculo_comite_id_fkey"
      columns: ["comite_id"]
isOneToOne: true
      referencedRelation: "comite"
      referencedColumns: ["id"]
    }
                  ]
                },"votacao": {
                  Row: {
                    "a_favor": number | null,"aberta": boolean,"abstencoes": number | null,"aprovada": boolean | null,"base": number | null,"comite_id": string,"contra": number | null,"criado_em": string,"documento_id": string | null,"emenda_id": string | null,"encerrada_em": string | null,"id": string,"necessario": number | null,"nominal": boolean,"objeto": string,"parte_clausulas": (string)[] | null,"parte_de": string | null,"partes": (string)[],"ponto_mocao_id": string | null,"regra": string,"sessao_id": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "a_favor"?: number | null,"aberta"?: boolean,"abstencoes"?: number | null,"aprovada"?: boolean | null,"base"?: number | null,"comite_id": string,"contra"?: number | null,"criado_em"?: string,"documento_id"?: string | null,"emenda_id"?: string | null,"encerrada_em"?: string | null,"id"?: string,"necessario"?: number | null,"nominal"?: boolean,"objeto": string,"parte_clausulas"?: (string)[] | null,"parte_de"?: string | null,"partes"?: (string)[],"ponto_mocao_id"?: string | null,"regra": string,"sessao_id": string,"tipo": string
                  }
                  Update: {
                    "a_favor"?: number | null,"aberta"?: boolean,"abstencoes"?: number | null,"aprovada"?: boolean | null,"base"?: number | null,"comite_id"?: string,"contra"?: number | null,"criado_em"?: string,"documento_id"?: string | null,"emenda_id"?: string | null,"encerrada_em"?: string | null,"id"?: string,"necessario"?: number | null,"nominal"?: boolean,"objeto"?: string,"parte_clausulas"?: (string)[] | null,"parte_de"?: string | null,"partes"?: (string)[],"ponto_mocao_id"?: string | null,"regra"?: string,"sessao_id"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "votacao_documento_id_fkey"
      columns: ["documento_id"]
isOneToOne: false
      referencedRelation: "documento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "votacao_emenda_id_fkey"
      columns: ["emenda_id"]
isOneToOne: false
      referencedRelation: "emenda"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "votacao_parte_de_fkey"
      columns: ["parte_de"]
isOneToOne: false
      referencedRelation: "documento"
      referencedColumns: ["id"]
    },{
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
            "abrir_coletiva":
{ Args: { "p_evento": string,"p_titulo": string }; Returns: string
                           },
"abrir_lista_especial":
{ Args: { "p_ponto": string }; Returns: undefined
                           },
"abrir_rodada":
{ Args: { "p_documento": string,"p_minutos": number }; Returns: undefined
                           },
"abrir_sessao":
{ Args: { "p_comite": string }; Returns: string
                           },
"abrir_votacao":
{ Args: { "p_ponto": string }; Returns: string
                           },
"abrir_votacao_emenda":
{ Args: { "p_emenda": string }; Returns: string
                           },
"abrir_votacao_livre":
{ Args: { "p_comite": string,"p_objeto": string,"p_tipo"?: string }; Returns: string
                           },
"abrir_votacao_parte":
{ Args: { "p_clausulas": (string)[],"p_documento": string }; Returns: string
                           },
"abrir_votacao_projeto":
{ Args: { "p_documento": string }; Returns: string
                           },
"adicionar_clausula":
{ Args: { "p_documento": string,"p_pai"?: string,"p_texto": string,"p_tipo": string }; Returns: string
                           },
"adotar_proposta":
{ Args: { "p_proposta": string }; Returns: undefined
                           },
"agenda_adotada":
{ Args: { "p_comite": string,"p_topico": number }; Returns: boolean
                           },
"agora":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"apagar_dados_pessoais":
{ Args: { "p_evento": string }; Returns: number
                           },
"apagar_pessoa":
{ Args: { "p_pessoa": string }; Returns: undefined
                           },
"aplicar_convites":
{ Args: { "p_email": string,"p_usuario": string }; Returns: undefined
                           },
"aplicar_forma":
{ Args: { "p_comite": string,"p_forma": Database["public"]['Enums']["forma_debate"],"p_minutos": number }; Returns: undefined
                           },
"apos_resolucao":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"aprovar_documento":
{ Args: { "p_aprovar": boolean,"p_documento": string }; Returns: undefined
                           },
"aprovar_noticia":
{ Args: { "p_noticia": string }; Returns: undefined
                           },
"aprovar_por_consenso":
{ Args: { "p_documento": string }; Returns: undefined
                           },
"arquivo_publico":
{ Args: { "p_evento": string }; Returns: Json
                           },
"assinar":
{ Args: { "p_assinar": boolean,"p_documento": string }; Returns: undefined
                           },
"assinar_emenda":
{ Args: { "p_emenda": string }; Returns: undefined
                           },
"assinar_mocao":
{ Args: { "p_ponto": string }; Returns: undefined
                           },
"assinaturas_desconfianca":
{ Args: { "p_comite": string }; Returns: number
                           },
"assumir_nota":
{ Args: { "p_id": string }; Returns: undefined
                           },
"assumir_presidencia":
{ Args: { "p_assumir": boolean,"p_comite": string }; Returns: undefined
                           },
"avaliar_dpo":
{ Args: { "p_comentario"?: string,"p_dpo": string,"p_status": string }; Returns: undefined
                           },
"avancar_plenaria":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"avisar_chegada":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"baixar_placa":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"bilhetes_denunciados_a_mim":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"bloquear_bilhetes":
{ Args: { "p_bloquear": boolean,"p_comite": string,"p_delegacao": string }; Returns: undefined
                           },
"checkin_por_cracha":
{ Args: { "p_codigo": string,"p_evento": string }; Returns: string
                           },
"codigo_curto":
{ Args: { "p_tamanho": number }; Returns: string
                           },
"comentar":
{ Args: { "p_clausula": string,"p_texto": string }; Returns: undefined
                           },
"comites_onde_a_mesa_le_bilhetes":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"copiar_evento":
{ Args: { "p_ano": number,"p_nome": string,"p_origem": string }; Returns: string
                           },
"criar_bloco":
{ Args: { "p_comite": string,"p_nome": string }; Returns: string
                           },
"criar_documento":
{ Args: { "p_atualizacao"?: string,"p_bloco": string,"p_ponto_pauta"?: string,"p_tipo": string,"p_titulo": string,"p_topico"?: number }; Returns: string
                           },
"dar_palavra":
{ Args: { "p_comite": string,"p_delegacao": string,"p_seg"?: number }; Returns: undefined
                           },
"definir_bilhetes":
{ Args: { "p_bloqueados": boolean,"p_comite": string,"p_mesa_le": boolean }; Returns: undefined
                           },
"definir_redator":
{ Args: { "p_bloco": string,"p_delegacao": string,"p_redator": boolean }; Returns: undefined
                           },
"denunciar_mensagem":
{ Args: { "p_mensagem": string,"p_motivo": string }; Returns: undefined
                           },
"denunciar_noticia":
{ Args: { "p_motivo": string,"p_noticia": string }; Returns: undefined
                           },
"dois_tercos":
{ Args: { "p_base": number }; Returns: number
                           },
"editar_agenda_adotada":
{ Args: { "p_itens": Json,"p_proposta": string }; Returns: undefined
                           },
"editar_clausula":
{ Args: { "p_clausula": string,"p_texto": string,"p_versao": number }; Returns: number
                           },
"eh_diretoria_press":
{ Args: { "p_evento": string }; Returns: boolean
                           },
"eh_participante":
{ Args: { "p_evento": string }; Returns: boolean
                           },
"eh_secretaria":
{ Args: { "p_evento": string }; Returns: boolean
                           },
"emitir_certificados":
{ Args: { "p_evento": string }; Returns: number
                           },
"emitir_codigo":
{ Args: { "p_email": string,"p_evento": string }; Returns: string
                           },
"emitir_crachas":
{ Args: { "p_emails"?: (string)[],"p_evento": string }; Returns: {
              "codigo": string,"email": string,"nome": string
            }[]
                           },
"encerrar_coletiva":
{ Args: { "p_coletiva": string }; Returns: undefined
                           },
"encerrar_sessao":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"encerrar_votacao":
{ Args: { "p_votacao": string }; Returns: undefined
                           },
"entrar_bloco":
{ Args: { "p_bloco": string }; Returns: undefined
                           },
"entrar_com_codigo":
{ Args: { "p_codigo": string,"p_origem": string }; Returns: {
              "email": string,"nome": string
            }[]
                           },
"enviar_carta":
{ Args: { "p_bloco_remetente"?: string,"p_blocos_destinatarios"?: (string)[],"p_comite": string,"p_corpo": string,"p_destinatarios"?: (string)[],"p_publica": boolean,"p_titulo": string }; Returns: string
                           },
"enviar_documento":
{ Args: { "p_aprovacao"?: string,"p_documento": string }; Returns: undefined
                           },
"enviar_dpo":
{ Args: { "p_dpo": string }; Returns: undefined
                           },
"enviar_mensagem":
{ Args: { "p_comite": string,"p_id": string,"p_para"?: string,"p_texto": string,"p_tipo": string }; Returns: undefined
                           },
"enviar_nota":
{ Args: { "p_comite": string,"p_id": string,"p_texto": string,"p_tipo": string,"p_titulo": string }; Returns: undefined
                           },
"enviar_ponto":
{ Args: { "p_comite": string,"p_detalhe"?: string,"p_minutos"?: number,"p_tipo": string,"p_topico"?: number }; Returns: undefined
                           },
"esquecer_assinaturas_push":
{ Args: { "p_endpoints": (string)[] }; Returns: undefined
                           },
"estacionar_comentario":
{ Args: { "p_comentario": string,"p_estacionado": boolean }; Returns: undefined
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
"exigir_editavel":
{ Args: { "p_documento": string }; Returns: {
              "aprovacao": string | null,
"atualizacao_crise_id": string | null,
"bloco_id": string,
"clausula_em_foco_id": string | null,
"comite_id": string,
"criado_em": string,
"enviado_em": string | null,
"id": string,
"max_rodadas": number,
"numero": number | null,
"ponto_pauta_id": string | null,
"status": string,
"tipo": string,
"titulo": string,
"topico": number | null,
"votacao_nominal": boolean
            }
                          SetofOptions: {
        from: "*"
        to: "documento"
        isOneToOne: true
        isSetofReturn: false
      } },
"exigir_membro":
{ Args: { "p_bloco": string }; Returns: string
                           },
"exigir_mesa":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"exigir_moderacao":
{ Args: { "p_noticia": string }; Returns: {
              "autor_id": string | null,
"comite_id": string,
"data_simulacao": string | null,
"id": string,
"imagem_descricao": string | null,
"imagem_path": string | null,
"linha_fina": string | null,
"motivo_ocultacao": string | null,
"publicada_em": string,
"status": string,
"texto": string,
"tipo": string,
"titulo": string,
"veiculo_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "noticia"
        isOneToOne: true
        isSetofReturn: false
      } },
"exigir_presidencia":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"exigir_redator":
{ Args: { "p_bloco": string }; Returns: undefined
                           },
"exigir_secretaria":
{ Args: { "p_evento": string }; Returns: undefined
                           },
"exigir_topico_livre":
{ Args: { "d": Omit<Database["public"]['Tables']["documento"]['Row'], Database["public"]['Tables']["documento"]['ComputedFields']> }; Returns: undefined
                           },
"focar_clausula":
{ Args: { "p_clausula": string,"p_documento": string }; Returns: undefined
                           },
"fotos_do_evento":
{ Args: { "p_evento": string }; Returns: string[]
                           },
"hash_codigo":
{ Args: { "p_codigo": string }; Returns: string
                           },
"idioma_da_pessoa":
{ Args: { "p_evento": string,"p_pessoa": string }; Returns: string
                           },
"importar_clausulas":
{ Args: { "p_clausulas": (string)[],"p_documento": string }; Returns: undefined
                           },
"iniciar_cronometro":
{ Args: { "p_comite": string,"p_seg": number }; Returns: undefined
                           },
"iniciar_votacao_projeto":
{ Args: { "p_documento": string }; Returns: undefined
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
"marcar_checkin":
{ Args: { "p_email": string,"p_evento": string,"p_presente"?: boolean }; Returns: undefined
                           },
"marcar_clausula":
{ Args: { "p_clausula": string,"p_status": string }; Returns: undefined
                           },
"marcar_parte":
{ Args: { "p_delegacao": string,"p_parte": boolean,"p_votacao": string }; Returns: undefined
                           },
"marcar_ponto_pauta":
{ Args: { "p_ponto": string,"p_status": string }; Returns: undefined
                           },
"marcar_todas_presentes":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"meus_comites":
{ Args: { "p_papeis": (Database["public"]['Enums']["papel"])[] }; Returns: string[]
                           },
"meus_dados":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"meus_dados_ate_o_passo_19":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"minha_delegacao":
{ Args: { "p_comite": string }; Returns: string
                           },
"minhas_delegacoes":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"mover_clausula":
{ Args: { "p_clausula": string,"p_para_cima": boolean }; Returns: undefined
                           },
"mudar_forma":
{ Args: { "p_comite": string,"p_forma": Database["public"]['Enums']["forma_debate"],"p_minutos"?: number }; Returns: undefined
                           },
"nome_do_convidado":
{ Args: { "p_email": string,"p_evento": string }; Returns: string
                           },
"ocultar_mensagem":
{ Args: { "p_mensagem": string,"p_motivo": string }; Returns: undefined
                           },
"ocultar_noticia":
{ Args: { "p_motivo": string,"p_noticia": string }; Returns: undefined
                           },
"participa_do_comite":
{ Args: { "p_comite": string }; Returns: boolean
                           },
"passar_presidencia":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"passar_vez":
{ Args: { "p_delegacao": string,"p_votacao": string }; Returns: undefined
                           },
"pausar":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"pedir_entrevista":
{ Args: { "p_delegacao": string,"p_tema": string }; Returns: string
                           },
"pedir_exclusao":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"pedir_reabertura":
{ Args: { "p_clausula": string }; Returns: undefined
                           },
"perguntar_na_coletiva":
{ Args: { "p_coletiva": string,"p_delegacao": string,"p_pergunta": string }; Returns: undefined
                           },
"pode_ouvir":
{ Args: { "p_topico": string }; Returns: boolean
                           },
"pode_presidir":
{ Args: { "p_comite": string }; Returns: boolean
                           },
"pode_ver_carta":
{ Args: { "p_carta": string }; Returns: boolean
                           },
"pode_ver_documento":
{ Args: { "p_documento": string }; Returns: boolean
                           },
"pode_ver_dpo":
{ Args: { "p_dpo": string }; Returns: boolean
                           },
"pode_ver_mensagem":
{ Args: { "p_mensagem": string }; Returns: boolean
                           },
"pode_ver_noticia":
{ Args: { "p_noticia": string }; Returns: boolean
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
"projeto_em_votacao":
{ Args: { "p_comite": string }; Returns: string
                           },
"propor_alteracao":
{ Args: { "p_clausula": string,"p_id"?: string,"p_texto": string }; Returns: undefined
                           },
"propor_emenda":
{ Args: { "p_acao": string,"p_clausula": string,"p_documento": string,"p_texto": string }; Returns: string
                           },
"publicar_atualizacao":
{ Args: { "p_comites": (string)[],"p_texto": string }; Returns: string
                           },
"publicar_noticia":
{ Args: { "p_citadas"?: (string)[],"p_data_simulacao"?: string,"p_id": string,"p_imagem_descricao"?: string,"p_imagem_path"?: string,"p_linha_fina"?: string,"p_texto": string,"p_tipo": string,"p_titulo": string,"p_veiculo": string }; Returns: string
                           },
"push_a_enviar":
{ Args: { "p_id": string,"p_tipo": string }; Returns: {
              "auth": string,"corpo": string,"endpoint": string,"p256dh": string,"titulo": string,"url": string
            }[]
                           },
"quorum":
{ Args: { "p_comite": string }; Returns: number
                           },
"quorum_votacao":
{ Args: { "p_comite": string }; Returns: number
                           },
"registrar_pedido_fala":
{ Args: { "p_comite": string,"p_delegacao": string }; Returns: undefined
                           },
"registrar_voto":
{ Args: { "p_delegacao": string,"p_escolha": Database["public"]['Enums']["escolha_voto"],"p_votacao": string }; Returns: undefined
                           },
"regra_substantiva":
{ Args: { "p_comite": string }; Returns: string
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
"remover_assinatura_push":
{ Args: { "p_endpoint": string }; Returns: undefined
                           },
"remover_clausula":
{ Args: { "p_clausula": string }; Returns: undefined
                           },
"responder_entrevista":
{ Args: { "p_aceitar": boolean,"p_entrevista": string,"p_horario"?: string }; Returns: undefined
                           },
"responder_notas":
{ Args: { "p_ids": (string)[],"p_resposta": string,"p_status": Database["public"]['Enums']["status_nota"] }; Returns: undefined
                           },
"responder_pesquisa":
{ Args: { "p_evento": string,"p_nota": number,"p_papel": Database["public"]['Enums']["papel"],"p_respostas": Json }; Returns: undefined
                           },
"responder_ponto":
{ Args: { "p_ponto": string,"p_status": string }; Returns: undefined
                           },
"responder_proposta":
{ Args: { "p_aceitar": boolean,"p_proposta": string }; Returns: undefined
                           },
"resultado":
{ Args: { "p_votacao": string }; Returns: {
              "a_favor": number,"abstencoes": number,"aprovada": boolean,"base": number,"contra": number,"necessario": number
            }[]
                           },
"resumo_sessao":
{ Args: { "p_sessao": string }; Returns: Json
                           },
"retirar_adocao":
{ Args: { "p_proposta": string }; Returns: undefined
                           },
"retomar":
{ Args: { "p_comite": string }; Returns: undefined
                           },
"revogar_credenciais":
{ Args: { "p_email": string,"p_evento": string }; Returns: undefined
                           },
"sair_bloco":
{ Args: { "p_bloco": string }; Returns: undefined
                           },
"salvar_assinatura_push":
{ Args: { "p_auth": string,"p_endpoint": string,"p_p256dh": string }; Returns: undefined
                           },
"salvar_dpo":
{ Args: { "p_comite": string,"p_referencias": (string)[],"p_texto": string,"p_topico": number }; Returns: string
                           },
"salvar_proposta_agenda":
{ Args: { "p_comite": string,"p_itens": Json,"p_topico": number }; Returns: string
                           },
"secretaria_da_pessoa":
{ Args: { "p_pessoa": string }; Returns: boolean
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
"sou_do_bloco":
{ Args: { "p_bloco": string }; Returns: boolean
                           },
"sou_redator":
{ Args: { "p_bloco": string }; Returns: boolean
                           },
"tecnologia_restrita_agora":
{ Args: { "p_comite": string }; Returns: boolean
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
"veiculo_da_pasta":
{ Args: { "p_nome": string }; Returns: {
              "comite_id": string,
"id": string,
"linha_editorial": string | null,
"nome": string
            }
                          SetofOptions: {
        from: "*"
        to: "veiculo"
        isOneToOne: true
        isSetofReturn: false
      } },
"verificar_certificado":
{ Args: { "p_codigo": string }; Returns: {
              "evento": string,"funcao": string,"nome": string
            }[]
                           },
"votar":
{ Args: { "p_escolha": Database["public"]['Enums']["escolha_voto"],"p_votacao": string }; Returns: undefined
                           }
          }
          Enums: {
            "escolha_voto": "a_favor"|"contra"|"abstencao","fase_comite": "plenaria"|"debate"|"acao"|"encerrado","forma_debate": "formal_formal"|"formal_informal"|"informal_informal","papel": "delegado"|"mesa"|"crise"|"press"|"secretaria"|"diretoria_press","situacao_delegacao": "membro"|"observadora"|"suspensa","situacao_presenca": "presente"|"presente_e_votando","status_nota": "pendente"|"em_analise"|"aprovada"|"rejeitada"|"pede_ajuste"
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
            "escolha_voto": ["a_favor", "contra", "abstencao"],"fase_comite": ["plenaria", "debate", "acao", "encerrado"],"forma_debate": ["formal_formal", "formal_informal", "informal_informal"],"papel": ["delegado", "mesa", "crise", "press", "secretaria", "diretoria_press"],"situacao_delegacao": ["membro", "observadora", "suspensa"],"situacao_presenca": ["presente", "presente_e_votando"],"status_nota": ["pendente", "em_analise", "aprovada", "rejeitada", "pede_ajuste"]
          }
        }
} as const
