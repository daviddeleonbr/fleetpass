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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      abastecimentos: {
        Row: {
          codigo: string
          combustivel: string
          created_at: string
          data: string
          empresa_id: string
          id: string
          litros: number
          motorista_id: string | null
          parceria_id: string | null
          posto_id: string
          requisicao_id: string | null
          status: Database["public"]["Enums"]["abastecimento_status"]
          updated_at: string
          validacao_id: string | null
          valor: number
          valor_unitario: number
          veiculo_id: string
        }
        Insert: {
          codigo: string
          combustivel: string
          created_at?: string
          data?: string
          empresa_id: string
          id?: string
          litros: number
          motorista_id?: string | null
          parceria_id?: string | null
          posto_id: string
          requisicao_id?: string | null
          status?: Database["public"]["Enums"]["abastecimento_status"]
          updated_at?: string
          validacao_id?: string | null
          valor: number
          valor_unitario: number
          veiculo_id: string
        }
        Update: {
          codigo?: string
          combustivel?: string
          created_at?: string
          data?: string
          empresa_id?: string
          id?: string
          litros?: number
          motorista_id?: string | null
          parceria_id?: string | null
          posto_id?: string
          requisicao_id?: string | null
          status?: Database["public"]["Enums"]["abastecimento_status"]
          updated_at?: string
          validacao_id?: string | null
          valor?: number
          valor_unitario?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abastecimentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_parceria_id_fkey"
            columns: ["parceria_id"]
            isOneToOne: false
            referencedRelation: "parcerias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "v_posto_stats"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "abastecimentos_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "requisicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_validacao_id_fkey"
            columns: ["validacao_id"]
            isOneToOne: false
            referencedRelation: "validacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      assinatura_tokens: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          parceria_id: string
          role: string
          used_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          parceria_id: string
          role: string
          used_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          parceria_id?: string
          role?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinatura_tokens_parceria_id_fkey"
            columns: ["parceria_id"]
            isOneToOne: false
            referencedRelation: "parcerias"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          comentario: string | null
          created_at: string
          empresa_id: string
          id: string
          nota: number
          posto_id: string
          util_count: number
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          nota: number
          posto_id: string
          util_count?: number
        }
        Update: {
          comentario?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nota?: number
          posto_id?: string
          util_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "v_posto_stats"
            referencedColumns: ["posto_id"]
          },
        ]
      }
      boletos: {
        Row: {
          asaas_payment_id: string
          bank_slip_url: string | null
          bar_code: string | null
          created_at: string
          faturamento_id: string
          id: string
          invoice_url: string | null
          pago_em: string | null
          status: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          asaas_payment_id: string
          bank_slip_url?: string | null
          bar_code?: string | null
          created_at?: string
          faturamento_id: string
          id?: string
          invoice_url?: string | null
          pago_em?: string | null
          status?: string
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          asaas_payment_id?: string
          bank_slip_url?: string | null
          bar_code?: string | null
          created_at?: string
          faturamento_id?: string
          id?: string
          invoice_url?: string | null
          pago_em?: string | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletos_faturamento_id_fkey"
            columns: ["faturamento_id"]
            isOneToOne: false
            referencedRelation: "faturamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          chave: string
          descricao: string | null
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          descricao?: string | null
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          descricao?: string | null
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      contas_posto: {
        Row: {
          assinatura_fim: string | null
          assinatura_inicio: string | null
          created_at: string
          id: string
          perfil_id: string
          plano_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_status:
            | Database["public"]["Enums"]["stripe_subscription_status"]
            | null
          updated_at: string
        }
        Insert: {
          assinatura_fim?: string | null
          assinatura_inicio?: string | null
          created_at?: string
          id?: string
          perfil_id: string
          plano_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?:
            | Database["public"]["Enums"]["stripe_subscription_status"]
            | null
          updated_at?: string
        }
        Update: {
          assinatura_fim?: string | null
          assinatura_inicio?: string | null
          created_at?: string
          id?: string
          perfil_id?: string
          plano_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?:
            | Database["public"]["Enums"]["stripe_subscription_status"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_posto_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_posto_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          assinado_empresa_em: string | null
          assinado_posto_em: string | null
          auth_cert_issuer: string | null
          auth_cert_serial: string | null
          auth_cert_subject: string | null
          auth_cert_validade: string | null
          auth_data: string | null
          auth_data_posto: string | null
          auth_dispositivo: string | null
          auth_dispositivo_posto: string | null
          auth_govbr_cpf: string | null
          auth_govbr_nivel: string | null
          auth_hash: string | null
          auth_hash_posto: string | null
          auth_ip: string | null
          auth_ip_posto: string | null
          auth_method: string | null
          auth_navegador: string | null
          auth_navegador_posto: string | null
          auth_signature: string | null
          created_at: string
          empresa_id: string
          exige_certificado: boolean
          id: string
          parceria_id: string
          posto_id: string
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          assinado_empresa_em?: string | null
          assinado_posto_em?: string | null
          auth_cert_issuer?: string | null
          auth_cert_serial?: string | null
          auth_cert_subject?: string | null
          auth_cert_validade?: string | null
          auth_data?: string | null
          auth_data_posto?: string | null
          auth_dispositivo?: string | null
          auth_dispositivo_posto?: string | null
          auth_govbr_cpf?: string | null
          auth_govbr_nivel?: string | null
          auth_hash?: string | null
          auth_hash_posto?: string | null
          auth_ip?: string | null
          auth_ip_posto?: string | null
          auth_method?: string | null
          auth_navegador?: string | null
          auth_navegador_posto?: string | null
          auth_signature?: string | null
          created_at?: string
          empresa_id: string
          exige_certificado?: boolean
          id?: string
          parceria_id: string
          posto_id: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          assinado_empresa_em?: string | null
          assinado_posto_em?: string | null
          auth_cert_issuer?: string | null
          auth_cert_serial?: string | null
          auth_cert_subject?: string | null
          auth_cert_validade?: string | null
          auth_data?: string | null
          auth_data_posto?: string | null
          auth_dispositivo?: string | null
          auth_dispositivo_posto?: string | null
          auth_govbr_cpf?: string | null
          auth_govbr_nivel?: string | null
          auth_hash?: string | null
          auth_hash_posto?: string | null
          auth_ip?: string | null
          auth_ip_posto?: string | null
          auth_method?: string | null
          auth_navegador?: string | null
          auth_navegador_posto?: string | null
          auth_signature?: string | null
          created_at?: string
          empresa_id?: string
          exige_certificado?: boolean
          id?: string
          parceria_id?: string
          posto_id?: string
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_parceria_id_fkey"
            columns: ["parceria_id"]
            isOneToOne: true
            referencedRelation: "parcerias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "v_posto_stats"
            referencedColumns: ["posto_id"]
          },
        ]
      }
      empresas: {
        Row: {
          cidade: string
          cnpj: string
          created_at: string
          estado: string
          id: string
          nome_empresa: string
          perfil_id: string
          plano_id: string | null
          segmento: Database["public"]["Enums"]["empresa_segmento"]
          updated_at: string
        }
        Insert: {
          cidade?: string
          cnpj: string
          created_at?: string
          estado?: string
          id?: string
          nome_empresa: string
          perfil_id: string
          plano_id?: string | null
          segmento?: Database["public"]["Enums"]["empresa_segmento"]
          updated_at?: string
        }
        Update: {
          cidade?: string
          cnpj?: string
          created_at?: string
          estado?: string
          id?: string
          nome_empresa?: string
          perfil_id?: string
          plano_id?: string | null
          segmento?: Database["public"]["Enums"]["empresa_segmento"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamento_abastecimentos: {
        Row: {
          abastecimento_id: string
          created_at: string
          faturamento_id: string
          id: string
        }
        Insert: {
          abastecimento_id: string
          created_at?: string
          faturamento_id: string
          id?: string
        }
        Update: {
          abastecimento_id?: string
          created_at?: string
          faturamento_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faturamento_abastecimentos_abastecimento_id_fkey"
            columns: ["abastecimento_id"]
            isOneToOne: false
            referencedRelation: "abastecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamento_abastecimentos_faturamento_id_fkey"
            columns: ["faturamento_id"]
            isOneToOne: false
            referencedRelation: "faturamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamento_counters: {
        Row: {
          ano: number
          seq: number
        }
        Insert: {
          ano: number
          seq?: number
        }
        Update: {
          ano?: number
          seq?: number
        }
        Relationships: []
      }
      faturamentos: {
        Row: {
          ciclo: string
          created_at: string
          data_faturamento: string
          data_vencimento: string
          desc_ciclo: string
          empresa_id: string
          id: string
          numero: string
          pago_em: string | null
          parceria_id: string
          periodo_fim: string
          periodo_inicio: string
          posto_id: string
          status: Database["public"]["Enums"]["faturamento_status"]
          total_abastecimentos: number
          total_litros: number
          total_valor: number
          updated_at: string
        }
        Insert: {
          ciclo?: string
          created_at?: string
          data_faturamento: string
          data_vencimento: string
          desc_ciclo?: string
          empresa_id: string
          id?: string
          numero?: string
          pago_em?: string | null
          parceria_id: string
          periodo_fim: string
          periodo_inicio: string
          posto_id: string
          status?: Database["public"]["Enums"]["faturamento_status"]
          total_abastecimentos?: number
          total_litros?: number
          total_valor?: number
          updated_at?: string
        }
        Update: {
          ciclo?: string
          created_at?: string
          data_faturamento?: string
          data_vencimento?: string
          desc_ciclo?: string
          empresa_id?: string
          id?: string
          numero?: string
          pago_em?: string | null
          parceria_id?: string
          periodo_fim?: string
          periodo_inicio?: string
          posto_id?: string
          status?: Database["public"]["Enums"]["faturamento_status"]
          total_abastecimentos?: number
          total_litros?: number
          total_valor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faturamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_parceria_id_fkey"
            columns: ["parceria_id"]
            isOneToOne: false
            referencedRelation: "parcerias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "v_posto_stats"
            referencedColumns: ["posto_id"]
          },
        ]
      }
      frentistas: {
        Row: {
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          perfil_id: string | null
          posto_id: string
          status: Database["public"]["Enums"]["status_ativo_inativo"]
          telefone: string | null
          turno: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          perfil_id?: string | null
          posto_id: string
          status?: Database["public"]["Enums"]["status_ativo_inativo"]
          telefone?: string | null
          turno?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          perfil_id?: string | null
          posto_id?: string
          status?: Database["public"]["Enums"]["status_ativo_inativo"]
          telefone?: string | null
          turno?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "frentistas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frentistas_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frentistas_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "v_posto_stats"
            referencedColumns: ["posto_id"]
          },
        ]
      }
      liberacao_veiculos: {
        Row: {
          liberacao_id: string
          veiculo_id: string
        }
        Insert: {
          liberacao_id: string
          veiculo_id: string
        }
        Update: {
          liberacao_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liberacao_veiculos_liberacao_id_fkey"
            columns: ["liberacao_id"]
            isOneToOne: false
            referencedRelation: "liberacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liberacao_veiculos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      liberacoes: {
        Row: {
          ativa: boolean
          created_at: string
          id: string
          limite_mensal: number | null
          limite_por_abast: number | null
          limite_tipo:
            | Database["public"]["Enums"]["liberacao_limite_tipo"]
            | null
          parceria_id: string
          updated_at: string
          usar_limite_mensal: boolean
          usar_limite_por_abast: boolean
          veiculos_config: Database["public"]["Enums"]["liberacao_veiculos_config"]
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          id?: string
          limite_mensal?: number | null
          limite_por_abast?: number | null
          limite_tipo?:
            | Database["public"]["Enums"]["liberacao_limite_tipo"]
            | null
          parceria_id: string
          updated_at?: string
          usar_limite_mensal?: boolean
          usar_limite_por_abast?: boolean
          veiculos_config?: Database["public"]["Enums"]["liberacao_veiculos_config"]
        }
        Update: {
          ativa?: boolean
          created_at?: string
          id?: string
          limite_mensal?: number | null
          limite_por_abast?: number | null
          limite_tipo?:
            | Database["public"]["Enums"]["liberacao_limite_tipo"]
            | null
          parceria_id?: string
          updated_at?: string
          usar_limite_mensal?: boolean
          usar_limite_por_abast?: boolean
          veiculos_config?: Database["public"]["Enums"]["liberacao_veiculos_config"]
        }
        Relationships: [
          {
            foreignKeyName: "liberacoes_parceria_id_fkey"
            columns: ["parceria_id"]
            isOneToOne: true
            referencedRelation: "parcerias"
            referencedColumns: ["id"]
          },
        ]
      }
      motorista_logs: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          id: string
          motivo: string | null
          motorista_id: string
          perfil_id: string
          perfil_nome: string
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          motivo?: string | null
          motorista_id: string
          perfil_id: string
          perfil_nome: string
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          motivo?: string | null
          motorista_id?: string
          perfil_id?: string
          perfil_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "motorista_logs_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motorista_logs_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      motoristas: {
        Row: {
          bloqueado: boolean
          cnh_categoria: Database["public"]["Enums"]["cnh_categoria"] | null
          cnh_numero: string | null
          cnh_validade: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          empresa_id: string
          id: string
          matricula: string | null
          nome: string
          observacao: string | null
          rg: string | null
          status: Database["public"]["Enums"]["motorista_status"]
          telefone: string | null
          updated_at: string
          vinculo: Database["public"]["Enums"]["motorista_vinculo"] | null
        }
        Insert: {
          bloqueado?: boolean
          cnh_categoria?: Database["public"]["Enums"]["cnh_categoria"] | null
          cnh_numero?: string | null
          cnh_validade?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          matricula?: string | null
          nome: string
          observacao?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["motorista_status"]
          telefone?: string | null
          updated_at?: string
          vinculo?: Database["public"]["Enums"]["motorista_vinculo"] | null
        }
        Update: {
          bloqueado?: boolean
          cnh_categoria?: Database["public"]["Enums"]["cnh_categoria"] | null
          cnh_numero?: string | null
          cnh_validade?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          matricula?: string | null
          nome?: string
          observacao?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["motorista_status"]
          telefone?: string | null
          updated_at?: string
          vinculo?: Database["public"]["Enums"]["motorista_vinculo"] | null
        }
        Relationships: [
          {
            foreignKeyName: "motoristas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      parceria_mensagens: {
        Row: {
          autor_id: string
          autor_tipo: Database["public"]["Enums"]["parceria_mensagem_autor"]
          conteudo: string | null
          created_at: string
          id: string
          lida_em: string | null
          proposta_id: string | null
          solicitacao_id: string
          tipo: Database["public"]["Enums"]["parceria_mensagem_tipo"]
        }
        Insert: {
          autor_id: string
          autor_tipo: Database["public"]["Enums"]["parceria_mensagem_autor"]
          conteudo?: string | null
          created_at?: string
          id?: string
          lida_em?: string | null
          proposta_id?: string | null
          solicitacao_id: string
          tipo?: Database["public"]["Enums"]["parceria_mensagem_tipo"]
        }
        Update: {
          autor_id?: string
          autor_tipo?: Database["public"]["Enums"]["parceria_mensagem_autor"]
          conteudo?: string | null
          created_at?: string
          id?: string
          lida_em?: string | null
          proposta_id?: string | null
          solicitacao_id?: string
          tipo?: Database["public"]["Enums"]["parceria_mensagem_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "parceria_mensagens_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parceria_mensagens_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      parcerias: {
        Row: {
          ciclo_intervalo_dias: number | null
          ciclo_prazo_recebimento: number
          ciclo_tipo: Database["public"]["Enums"]["ciclo_tipo"]
          combustiveis: Json
          created_at: string
          empresa_id: string
          encerrada_em: string | null
          id: string
          iniciada_em: string
          limite_credito: number | null
          posto_id: string
          proposta_id: string
          status: Database["public"]["Enums"]["parceria_status"]
          updated_at: string
          volume_minimo: number | null
        }
        Insert: {
          ciclo_intervalo_dias?: number | null
          ciclo_prazo_recebimento?: number
          ciclo_tipo: Database["public"]["Enums"]["ciclo_tipo"]
          combustiveis?: Json
          created_at?: string
          empresa_id: string
          encerrada_em?: string | null
          id?: string
          iniciada_em?: string
          limite_credito?: number | null
          posto_id: string
          proposta_id: string
          status?: Database["public"]["Enums"]["parceria_status"]
          updated_at?: string
          volume_minimo?: number | null
        }
        Update: {
          ciclo_intervalo_dias?: number | null
          ciclo_prazo_recebimento?: number
          ciclo_tipo?: Database["public"]["Enums"]["ciclo_tipo"]
          combustiveis?: Json
          created_at?: string
          empresa_id?: string
          encerrada_em?: string | null
          id?: string
          iniciada_em?: string
          limite_credito?: number | null
          posto_id?: string
          proposta_id?: string
          status?: Database["public"]["Enums"]["parceria_status"]
          updated_at?: string
          volume_minimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parcerias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcerias_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcerias_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "v_posto_stats"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "parcerias_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: true
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          cargo: string | null
          created_at: string
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      planos: {
        Row: {
          ativo: boolean
          created_at: string
          features: Json
          id: string
          max_postos: number | null
          nome: string
          preco_mensal: number
          stripe_price_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          features?: Json
          id: string
          max_postos?: number | null
          nome: string
          preco_mensal: number
          stripe_price_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          features?: Json
          id?: string
          max_postos?: number | null
          nome?: string
          preco_mensal?: number
          stripe_price_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      postos: {
        Row: {
          asaas_api_key: string | null
          asaas_id: string | null
          asaas_wallet_id: string | null
          bairro: string
          bandeira: Database["public"]["Enums"]["posto_bandeira"]
          capacidade: string | null
          cep: string
          cidade: string
          cnpj: string
          combustiveis: string[]
          complemento: string | null
          conta_posto_id: string
          created_at: string
          endereco: string
          estado: string
          id: string
          lat: number | null
          lng: number | null
          nome: string
          numero: string
          status: Database["public"]["Enums"]["status_ativo_inativo"]
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          asaas_api_key?: string | null
          asaas_id?: string | null
          asaas_wallet_id?: string | null
          bairro?: string
          bandeira?: Database["public"]["Enums"]["posto_bandeira"]
          capacidade?: string | null
          cep?: string
          cidade?: string
          cnpj: string
          combustiveis?: string[]
          complemento?: string | null
          conta_posto_id: string
          created_at?: string
          endereco?: string
          estado?: string
          id?: string
          lat?: number | null
          lng?: number | null
          nome: string
          numero?: string
          status?: Database["public"]["Enums"]["status_ativo_inativo"]
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          asaas_api_key?: string | null
          asaas_id?: string | null
          asaas_wallet_id?: string | null
          bairro?: string
          bandeira?: Database["public"]["Enums"]["posto_bandeira"]
          capacidade?: string | null
          cep?: string
          cidade?: string
          cnpj?: string
          combustiveis?: string[]
          complemento?: string | null
          conta_posto_id?: string
          created_at?: string
          endereco?: string
          estado?: string
          id?: string
          lat?: number | null
          lng?: number | null
          nome?: string
          numero?: string
          status?: Database["public"]["Enums"]["status_ativo_inativo"]
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "postos_conta_posto_id_fkey"
            columns: ["conta_posto_id"]
            isOneToOne: false
            referencedRelation: "contas_posto"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          ciclo_intervalo_dias: number | null
          ciclo_prazo_recebimento: number
          ciclo_tipo: Database["public"]["Enums"]["ciclo_tipo"]
          combustiveis: Json
          created_at: string
          empresa_id: string
          exige_certificado: boolean
          id: string
          limite_credito: number | null
          observacoes: string | null
          posto_id: string
          solicitacao_id: string
          status: Database["public"]["Enums"]["proposta_status"]
          updated_at: string
          validade_ate: string
          validade_dias: number
          versao: number
          volume_minimo: number | null
        }
        Insert: {
          ciclo_intervalo_dias?: number | null
          ciclo_prazo_recebimento?: number
          ciclo_tipo: Database["public"]["Enums"]["ciclo_tipo"]
          combustiveis?: Json
          created_at?: string
          empresa_id: string
          exige_certificado?: boolean
          id?: string
          limite_credito?: number | null
          observacoes?: string | null
          posto_id: string
          solicitacao_id: string
          status?: Database["public"]["Enums"]["proposta_status"]
          updated_at?: string
          validade_ate: string
          validade_dias?: number
          versao?: number
          volume_minimo?: number | null
        }
        Update: {
          ciclo_intervalo_dias?: number | null
          ciclo_prazo_recebimento?: number
          ciclo_tipo?: Database["public"]["Enums"]["ciclo_tipo"]
          combustiveis?: Json
          created_at?: string
          empresa_id?: string
          exige_certificado?: boolean
          id?: string
          limite_credito?: number | null
          observacoes?: string | null
          posto_id?: string
          solicitacao_id?: string
          status?: Database["public"]["Enums"]["proposta_status"]
          updated_at?: string
          validade_ate?: string
          validade_dias?: number
          versao?: number
          volume_minimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "v_posto_stats"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "propostas_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      requisicoes: {
        Row: {
          codigo: string
          combustivel: string
          created_at: string
          eh_livre: boolean
          empresa_id: string
          id: string
          limite_valor: number | null
          limite_volume: number | null
          motorista_id: string | null
          observacao: string | null
          parceria_id: string | null
          posto_id: string
          quilometragem: number | null
          status: Database["public"]["Enums"]["requisicao_status"]
          tipo_limite: Database["public"]["Enums"]["requisicao_tipo_limite"]
          updated_at: string
          validade: string
          veiculo_id: string
        }
        Insert: {
          codigo?: string
          combustivel: string
          created_at?: string
          eh_livre?: boolean
          empresa_id: string
          id?: string
          limite_valor?: number | null
          limite_volume?: number | null
          motorista_id?: string | null
          observacao?: string | null
          parceria_id?: string | null
          posto_id: string
          quilometragem?: number | null
          status?: Database["public"]["Enums"]["requisicao_status"]
          tipo_limite?: Database["public"]["Enums"]["requisicao_tipo_limite"]
          updated_at?: string
          validade: string
          veiculo_id: string
        }
        Update: {
          codigo?: string
          combustivel?: string
          created_at?: string
          eh_livre?: boolean
          empresa_id?: string
          id?: string
          limite_valor?: number | null
          limite_volume?: number | null
          motorista_id?: string | null
          observacao?: string | null
          parceria_id?: string | null
          posto_id?: string
          quilometragem?: number | null
          status?: Database["public"]["Enums"]["requisicao_status"]
          tipo_limite?: Database["public"]["Enums"]["requisicao_tipo_limite"]
          updated_at?: string
          validade?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisicoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_parceria_id_fkey"
            columns: ["parceria_id"]
            isOneToOne: false
            referencedRelation: "parcerias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisicoes_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "v_posto_stats"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "requisicoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          combustiveis: string[]
          created_at: string
          empresa_id: string
          id: string
          mensagem: string | null
          posto_id: string
          status: Database["public"]["Enums"]["solicitacao_status"]
          updated_at: string
          valor_estimado: number | null
          volume_estimado: string | null
        }
        Insert: {
          combustiveis?: string[]
          created_at?: string
          empresa_id: string
          id?: string
          mensagem?: string | null
          posto_id: string
          status?: Database["public"]["Enums"]["solicitacao_status"]
          updated_at?: string
          valor_estimado?: number | null
          volume_estimado?: string | null
        }
        Update: {
          combustiveis?: string[]
          created_at?: string
          empresa_id?: string
          id?: string
          mensagem?: string | null
          posto_id?: string
          status?: Database["public"]["Enums"]["solicitacao_status"]
          updated_at?: string
          valor_estimado?: number | null
          volume_estimado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "v_posto_stats"
            referencedColumns: ["posto_id"]
          },
        ]
      }
      validacoes: {
        Row: {
          created_at: string
          data_hora: string
          frentista_id: string | null
          hodometro: number | null
          id: string
          litros: number
          observacao: string | null
          requisicao_id: string
          updated_at: string
          valor_cobrado: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          data_hora?: string
          frentista_id?: string | null
          hodometro?: number | null
          id?: string
          litros: number
          observacao?: string | null
          requisicao_id: string
          updated_at?: string
          valor_cobrado: number
          valor_unitario: number
        }
        Update: {
          created_at?: string
          data_hora?: string
          frentista_id?: string | null
          hodometro?: number | null
          id?: string
          litros?: number
          observacao?: string | null
          requisicao_id?: string
          updated_at?: string
          valor_cobrado?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "validacoes_frentista_id_fkey"
            columns: ["frentista_id"]
            isOneToOne: false
            referencedRelation: "frentistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validacoes_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: true
            referencedRelation: "requisicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculo_bloqueios: {
        Row: {
          acao: string
          created_at: string
          id: string
          motivo: string
          perfil_id: string
          perfil_nome: string
          tipo: string | null
          veiculo_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          motivo: string
          perfil_id: string
          perfil_nome: string
          tipo?: string | null
          veiculo_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          motivo?: string
          perfil_id?: string
          perfil_nome?: string
          tipo?: string | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculo_bloqueios_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculo_bloqueios_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          bloqueado: boolean
          bloqueio_tipo: string | null
          combustivel: string
          created_at: string
          empresa_id: string
          exigir_quilometragem: boolean
          id: string
          limite_mensal: number | null
          modelo: string
          motorista_padrao_id: string | null
          placa: string
          status: Database["public"]["Enums"]["status_ativo_inativo"]
          updated_at: string
        }
        Insert: {
          bloqueado?: boolean
          bloqueio_tipo?: string | null
          combustivel?: string
          created_at?: string
          empresa_id: string
          exigir_quilometragem?: boolean
          id?: string
          limite_mensal?: number | null
          modelo?: string
          motorista_padrao_id?: string | null
          placa: string
          status?: Database["public"]["Enums"]["status_ativo_inativo"]
          updated_at?: string
        }
        Update: {
          bloqueado?: boolean
          bloqueio_tipo?: string | null
          combustivel?: string
          created_at?: string
          empresa_id?: string
          exigir_quilometragem?: boolean
          id?: string
          limite_mensal?: number | null
          modelo?: string
          motorista_padrao_id?: string | null
          placa?: string
          status?: Database["public"]["Enums"]["status_ativo_inativo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_motorista_padrao_id_fkey"
            columns: ["motorista_padrao_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_posto_stats: {
        Row: {
          posto_id: string | null
          posto_nome: string | null
          total_abastecimentos: number | null
          total_empresas_ativas: number | null
          total_litros: number | null
          total_valor: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aceitar_proposta: { Args: { p_proposta_id: string }; Returns: string }
      expire_propostas: { Args: never; Returns: undefined }
      expire_requisicoes: { Args: never; Returns: undefined }
    }
    Enums: {
      abastecimento_status: "faturado" | "pendente" | "contestado"
      ciclo_tipo: "diario" | "semanal" | "quinzenal" | "mensal"
      cnh_categoria: "A" | "B" | "C" | "D" | "E" | "AB" | "AC" | "AD" | "AE"
      empresa_segmento:
        | "Transportadora"
        | "Logística"
        | "Construção Civil"
        | "Agronegócio"
        | "Comércio"
        | "Prestação de Serviços"
        | "Outros"
      faturamento_status: "pendente" | "enviado" | "pago" | "atrasado"
      liberacao_limite_tipo: "valor" | "volume"
      liberacao_veiculos_config: "todos" | "selecionados"
      modal_preco: "bomba" | "acrescimo" | "desconto"
      motorista_status: "ativo" | "pendente" | "inativo"
      motorista_vinculo: "CLT" | "PJ" | "Autônomo" | "Cooperado" | "Temporário"
      parceria_mensagem_autor: "empresa" | "posto"
      parceria_mensagem_tipo:
        | "mensagem"
        | "proposta_enviada"
        | "proposta_revisada"
        | "proposta_recusada"
        | "proposta_aceita"
      parceria_status:
        | "ativa"
        | "suspensa"
        | "encerrada"
        | "pendente_assinatura"
      posto_bandeira:
        | "Shell"
        | "Ipiranga"
        | "Petrobras"
        | "Atlântica"
        | "Ale"
        | "Bandeira branca"
      proposta_status:
        | "pendente"
        | "aceita"
        | "rejeitada"
        | "substituida"
        | "expirada"
      requisicao_status:
        | "pendente"
        | "ativo"
        | "concluido"
        | "expirado"
        | "cancelado"
      requisicao_tipo_limite: "valor" | "volume" | "tanque"
      solicitacao_status:
        | "aguardando"
        | "proposta_recebida"
        | "em_negociacao"
        | "aceita"
        | "rejeitada"
        | "cancelada"
      status_ativo_inativo: "ativo" | "inativo"
      stripe_subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "unpaid"
      user_role: "empresa" | "posto" | "frentista" | "motorista" | "admin"
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
      abastecimento_status: ["faturado", "pendente", "contestado"],
      ciclo_tipo: ["diario", "semanal", "quinzenal", "mensal"],
      cnh_categoria: ["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"],
      empresa_segmento: [
        "Transportadora",
        "Logística",
        "Construção Civil",
        "Agronegócio",
        "Comércio",
        "Prestação de Serviços",
        "Outros",
      ],
      faturamento_status: ["pendente", "enviado", "pago", "atrasado"],
      liberacao_limite_tipo: ["valor", "volume"],
      liberacao_veiculos_config: ["todos", "selecionados"],
      modal_preco: ["bomba", "acrescimo", "desconto"],
      motorista_status: ["ativo", "pendente", "inativo"],
      motorista_vinculo: ["CLT", "PJ", "Autônomo", "Cooperado", "Temporário"],
      parceria_mensagem_autor: ["empresa", "posto"],
      parceria_mensagem_tipo: [
        "mensagem",
        "proposta_enviada",
        "proposta_revisada",
        "proposta_recusada",
        "proposta_aceita",
      ],
      parceria_status: [
        "ativa",
        "suspensa",
        "encerrada",
        "pendente_assinatura",
      ],
      posto_bandeira: [
        "Shell",
        "Ipiranga",
        "Petrobras",
        "Atlântica",
        "Ale",
        "Bandeira branca",
      ],
      proposta_status: [
        "pendente",
        "aceita",
        "rejeitada",
        "substituida",
        "expirada",
      ],
      requisicao_status: [
        "pendente",
        "ativo",
        "concluido",
        "expirado",
        "cancelado",
      ],
      requisicao_tipo_limite: ["valor", "volume", "tanque"],
      solicitacao_status: [
        "aguardando",
        "proposta_recebida",
        "em_negociacao",
        "aceita",
        "rejeitada",
        "cancelada",
      ],
      status_ativo_inativo: ["ativo", "inativo"],
      stripe_subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "unpaid",
      ],
      user_role: ["empresa", "posto", "frentista", "motorista", "admin"],
    },
  },
} as const
