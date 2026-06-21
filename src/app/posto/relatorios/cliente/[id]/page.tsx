'use client'

import { use, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Fuel, Lock, Unlock, UserPlus, UserX, UserCheck,
  Car, CreditCard, FileText, Receipt, Clock, Star,
  Users2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoEvento =
  | 'inicio_parceria' | 'contrato' | 'limite_ajustado'
  | 'abastecimento' | 'marco_abastecimento' | 'requisicao_expirada'
  | 'bloqueio_auto' | 'bloqueio_manual'
  | 'desbloqueio_credito' | 'desbloqueio_req' | 'desbloqueio_manual'
  | 'motorista_novo' | 'motorista_bloqueado' | 'motorista_reativado'
  | 'veiculo_novo' | 'veiculo_bloqueado' | 'veiculo_reativado'
  | 'faturamento_fechado'

interface Evento {
  id: string
  data: string         // 'YYYY-MM-DD'
  hora?: string
  tipo: TipoEvento
  titulo: string
  descricao: string
  ator?: string
  detalhes?: Record<string, string>
}

interface Cliente {
  id: number
  empresa: string
  cnpj: string
  cidade: string
  posto: string
  desde: string
  status: 'ativo' | 'bloqueado'
  eventos: Evento[]
}

// ─── Config visual ─────────────────────────────────────────────────────────────

type IconComp = React.ElementType
interface TipoConf { icon: IconComp; dot: string; text: string; bg: string; label: string; grupo: string }

const TIPO: Record<TipoEvento, TipoConf> = {
  inicio_parceria:     { icon: Users2,     dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100',  label: 'Início de parceria',    grupo: 'parceria'    },
  contrato:            { icon: FileText,   dot: 'bg-indigo-500',  text: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-100',    label: 'Contrato',             grupo: 'parceria'    },
  limite_ajustado:     { icon: CreditCard, dot: 'bg-violet-500',  text: 'text-violet-700',  bg: 'bg-violet-50 border-violet-100',    label: 'Ajuste de limite',     grupo: 'parceria'    },
  faturamento_fechado: { icon: Receipt,    dot: 'bg-gray-500',    text: 'text-gray-700',    bg: 'bg-gray-50 border-gray-100',        label: 'Fatura fechada',       grupo: 'parceria'    },
  abastecimento:       { icon: Fuel,       dot: 'bg-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50 border-blue-100',        label: 'Abastecimento',        grupo: 'abastec'     },
  marco_abastecimento: { icon: Star,       dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100',      label: 'Marco',                grupo: 'abastec'     },
  requisicao_expirada: { icon: Clock,      dot: 'bg-red-400',     text: 'text-red-700',     bg: 'bg-red-50 border-red-100',          label: 'Requisição expirada',  grupo: 'abastec'     },
  bloqueio_auto:       { icon: Lock,       dot: 'bg-red-600',     text: 'text-red-700',     bg: 'bg-red-50 border-red-200',          label: 'Bloqueio automático',  grupo: 'bloqueios'   },
  bloqueio_manual:     { icon: Lock,       dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50 border-red-200',          label: 'Bloqueio manual',      grupo: 'bloqueios'   },
  desbloqueio_credito: { icon: Unlock,     dot: 'bg-indigo-400',  text: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-100',    label: 'Desbloqueio (crédito)',grupo: 'bloqueios'   },
  desbloqueio_req:     { icon: Unlock,     dot: 'bg-indigo-400',  text: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-100',    label: 'Desbloqueio (req.)',   grupo: 'bloqueios'   },
  desbloqueio_manual:  { icon: Unlock,     dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100',  label: 'Desbloqueio manual',   grupo: 'bloqueios'   },
  motorista_novo:      { icon: UserPlus,   dot: 'bg-sky-400',     text: 'text-sky-700',     bg: 'bg-sky-50 border-sky-100',          label: 'Novo motorista',       grupo: 'pessoas'     },
  motorista_bloqueado: { icon: UserX,      dot: 'bg-orange-500',  text: 'text-orange-700',  bg: 'bg-orange-50 border-orange-100',    label: 'Motorista bloqueado',  grupo: 'pessoas'     },
  motorista_reativado: { icon: UserCheck,  dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100',  label: 'Motorista reativado',  grupo: 'pessoas'     },
  veiculo_novo:        { icon: Car,        dot: 'bg-sky-400',     text: 'text-sky-700',     bg: 'bg-sky-50 border-sky-100',          label: 'Novo veículo',         grupo: 'pessoas'     },
  veiculo_bloqueado:   { icon: Car,        dot: 'bg-orange-500',  text: 'text-orange-700',  bg: 'bg-orange-50 border-orange-100',    label: 'Veículo bloqueado',    grupo: 'pessoas'     },
  veiculo_reativado:   { icon: Car,        dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100',  label: 'Veículo reativado',    grupo: 'pessoas'     },
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const CLIENTES: Cliente[] = [
  {
    id: 1, empresa: 'TransLog Transportes', cnpj: '12.345.678/0001-99',
    cidade: 'São Paulo, SP', posto: 'Shell — Centro', desde: '15/01/2025', status: 'ativo',
    eventos: [
      { id: 'e01', data: '2025-01-15', hora: '09:00', tipo: 'inicio_parceria',
        titulo: 'Início da parceria',
        descricao: 'TransLog Transportes tornou-se parceira do Shell — Centro.',
        ator: 'Gestor do posto' },
      { id: 'e02', data: '2025-01-15', hora: '09:30', tipo: 'contrato',
        titulo: 'Contrato assinado',
        descricao: 'Contrato de abastecimento B2B formalizado com ciclo mensal.',
        ator: 'Gestor do posto',
        detalhes: { 'Combustíveis': 'Diesel S-10, Gasolina Aditivada', 'Limite mensal': 'R$ 15.000,00', 'Ciclo': 'Mensal (+5 dias)', 'Vigência': 'Indeterminado' } },
      { id: 'e03', data: '2025-01-16', hora: '14:00', tipo: 'motorista_novo',
        titulo: 'Motorista Roberto Lima cadastrado',
        descricao: 'Motorista autorizado para emissão de requisições.',
        detalhes: { 'CNH': '123456789', 'Validade CNH': '10/2027', 'Vínculo': 'CLT' } },
      { id: 'e04', data: '2025-01-16', hora: '14:15', tipo: 'veiculo_novo',
        titulo: 'Veículo ABC-1234 · Iveco Daily cadastrado',
        descricao: 'Veículo liberado para abastecimento.',
        detalhes: { 'Placa': 'ABC-1234', 'Modelo': 'Iveco Daily', 'Ano': '2021', 'Combustível': 'Diesel S-10' } },
      { id: 'e05', data: '2025-01-17', hora: '08:22', tipo: 'abastecimento',
        titulo: 'Primeiro abastecimento realizado',
        descricao: 'Abastecimento concluído por Roberto Lima no Shell — Centro.',
        ator: 'Frentista José Almeida',
        detalhes: { 'Requisição': 'FL-XK9-001', 'Motorista': 'Roberto Lima', 'Veículo': 'ABC-1234 · Iveco Daily', 'Combustível': 'Diesel S-10', 'Volume': '45,2 L', 'Valor cobrado': 'R$ 289,28', 'Hodômetro': '85.120 km' } },
      { id: 'e06', data: '2025-01-20', hora: '10:00', tipo: 'motorista_novo',
        titulo: 'Motorista Carlos Ferreira cadastrado',
        descricao: 'Segundo motorista autorizado pela empresa.',
        detalhes: { 'CNH': '987654321', 'Validade CNH': '03/2025', 'Vínculo': 'CLT' } },
      { id: 'e07', data: '2025-01-22', hora: '11:30', tipo: 'veiculo_novo',
        titulo: 'Veículo DEF-5678 · Mercedes Sprinter cadastrado',
        descricao: 'Veículo liberado para abastecimento.',
        detalhes: { 'Placa': 'DEF-5678', 'Modelo': 'Mercedes Sprinter 415', 'Ano': '2022', 'Combustível': 'Diesel S-10' } },
      { id: 'e08', data: '2025-02-05', hora: '09:15', tipo: 'motorista_novo',
        titulo: 'Motorista Ana Costa cadastrada',
        descricao: 'Terceira motorista autorizada pela empresa.',
        detalhes: { 'CNH': '456123789', 'Validade CNH': '08/2026', 'Vínculo': 'PJ' } },
      { id: 'e09', data: '2025-02-18', tipo: 'marco_abastecimento',
        titulo: '50º abastecimento atingido',
        descricao: 'Marco de 50 abastecimentos concluídos na parceria.',
        detalhes: { 'Volume acumulado': '2.318 L', 'Valor acumulado': 'R$ 14.835,00', 'Motorista mais ativo': 'Roberto Lima (32 abast.)' } },
      { id: 'e10', data: '2025-02-28', hora: '10:45', tipo: 'motorista_bloqueado',
        titulo: 'Motorista Carlos Ferreira bloqueado',
        descricao: 'Motorista suspenso por CNH vencida.',
        ator: 'Gestor do posto',
        detalhes: { 'Motivo': 'CNH vencida (03/2025)', 'Status anterior': 'Ativo', 'Requisições em aberto': '0' } },
      { id: 'e11', data: '2025-03-01', tipo: 'faturamento_fechado',
        titulo: 'Fatura de Janeiro/2025 fechada',
        descricao: 'Fatura do ciclo de janeiro enviada por e-mail e WhatsApp.',
        ator: 'Gestor do posto',
        detalhes: { 'Referência': 'Janeiro/2025', 'Abastecimentos': '28', 'Volume total': '1.285 L', 'Valor total': 'R$ 12.480,00', 'Enviado para': 'financeiro@translog.com.br' } },
      { id: 'e12', data: '2025-03-05', hora: '09:03', tipo: 'bloqueio_auto',
        titulo: 'Limite de crédito atingido — bloqueio automático',
        descricao: 'O limite mensal foi consumido integralmente. Novas requisições foram bloqueadas automaticamente.',
        detalhes: { 'Limite': 'R$ 15.000,00', 'Utilizado': 'R$ 15.000,00', 'Restante': 'R$ 0,00', 'Requisições bloqueadas': '3 em aberto canceladas' } },
      { id: 'e13', data: '2025-03-07', hora: '14:30', tipo: 'desbloqueio_credito',
        titulo: 'Desbloqueio com crédito adicional',
        descricao: 'Acesso liberado após adição de crédito suplementar para o ciclo atual.',
        ator: 'Gestor do posto',
        detalhes: { 'Crédito adicionado': 'R$ 2.000,00', 'Limite anterior': 'R$ 15.000,00', 'Novo limite': 'R$ 17.000,00', 'Motivo': 'Solicitação do cliente aprovada pelo gestor' } },
      { id: 'e14', data: '2025-03-10', tipo: 'faturamento_fechado',
        titulo: 'Fatura de Fevereiro/2025 fechada',
        descricao: 'Fatura do ciclo de fevereiro enviada por e-mail e WhatsApp.',
        ator: 'Gestor do posto',
        detalhes: { 'Referência': 'Fevereiro/2025', 'Abastecimentos': '34', 'Volume total': '1.742 L', 'Valor total': 'R$ 14.800,00', 'Enviado para': 'financeiro@translog.com.br' } },
      { id: 'e15', data: '2025-03-12', hora: '11:20', tipo: 'veiculo_bloqueado',
        titulo: 'Veículo DEF-5678 bloqueado',
        descricao: 'Veículo suspenso por documentação irregular.',
        ator: 'Gestor do posto',
        detalhes: { 'Veículo': 'DEF-5678 · Mercedes Sprinter', 'Motivo': 'Documentação irregular (CRLV vencido)', 'Status anterior': 'Ativo' } },
      { id: 'e16', data: '2025-03-13', hora: '08:55', tipo: 'requisicao_expirada',
        titulo: 'Requisição FL-AB4-7R1 expirou sem uso',
        descricao: 'A requisição foi emitida para Ana Costa mas não foi utilizada dentro do prazo de validade.',
        detalhes: { 'Requisição': 'FL-AB4-7R1', 'Motorista': 'Ana Costa', 'Veículo': 'DEF-5678 · Sprinter', 'Combustível': 'Diesel S-10', 'Limite': 'R$ 200,00', 'Validade': '10/03/2025' } },
    ],
  },
  {
    id: 2, empresa: 'LogBR Express', cnpj: '22.333.444/0001-55',
    cidade: 'São Paulo, SP', posto: 'Shell — Centro', desde: '01/03/2025', status: 'ativo',
    eventos: [
      { id: 'e01', data: '2025-03-01', hora: '10:00', tipo: 'inicio_parceria',
        titulo: 'Início da parceria', descricao: 'LogBR Express tornou-se parceira do Shell — Centro.', ator: 'Gestor do posto' },
      { id: 'e02', data: '2025-03-01', hora: '10:30', tipo: 'contrato',
        titulo: 'Contrato assinado', descricao: 'Contrato B2B formalizado.',
        detalhes: { 'Combustíveis': 'Diesel S-10', 'Limite mensal': 'R$ 20.000,00', 'Ciclo': 'Quinzenal (+7 dias)' } },
      { id: 'e03', data: '2025-03-02', tipo: 'motorista_novo',
        titulo: 'Motorista Fernanda Rocha cadastrada', descricao: 'Primeira motorista autorizada.' },
      { id: 'e04', data: '2025-03-02', tipo: 'veiculo_novo',
        titulo: 'Veículo MNO-7890 · Fiat Ducato cadastrado', descricao: 'Veículo liberado.',
        detalhes: { 'Placa': 'MNO-7890', 'Modelo': 'Fiat Ducato', 'Ano': '2023', 'Combustível': 'Diesel S-10' } },
      { id: 'e05', data: '2025-03-03', hora: '07:48', tipo: 'abastecimento',
        titulo: 'Primeiro abastecimento realizado', descricao: 'Abastecimento por Fernanda Rocha.',
        detalhes: { 'Requisição': 'FL-LB-001', 'Volume': '60,0 L', 'Valor cobrado': 'R$ 384,00', 'Hodômetro': '32.100 km' } },
      { id: 'e06', data: '2025-03-08', tipo: 'motorista_novo',
        titulo: 'Motorista Paulo Henrique cadastrado', descricao: 'Segundo motorista autorizado.' },
      { id: 'e07', data: '2025-03-12', tipo: 'motorista_novo',
        titulo: 'Motorista Sandra Melo cadastrada', descricao: 'Terceira motorista autorizada.' },
    ],
  },
  {
    id: 3, empresa: 'Construtora Alpha', cnpj: '98.765.432/0001-00',
    cidade: 'São Paulo, SP', posto: 'Shell — Norte', desde: '20/02/2025', status: 'bloqueado',
    eventos: [
      { id: 'e01', data: '2025-02-20', hora: '09:00', tipo: 'inicio_parceria',
        titulo: 'Início da parceria', descricao: 'Construtora Alpha tornou-se parceira do Shell — Norte.', ator: 'Gestor do posto' },
      { id: 'e02', data: '2025-02-20', hora: '09:20', tipo: 'contrato',
        titulo: 'Contrato assinado', descricao: 'Contrato B2B formalizado.',
        detalhes: { 'Combustíveis': 'Diesel S-10, Gasolina Comum', 'Limite mensal': 'R$ 8.000,00', 'Ciclo': 'Semanal (+3 dias)' } },
      { id: 'e03', data: '2025-02-20', tipo: 'motorista_novo',
        titulo: 'Motorista Marcos Alves cadastrado', descricao: 'Primeiro motorista autorizado.' },
      { id: 'e04', data: '2025-02-21', hora: '07:00', tipo: 'abastecimento',
        titulo: 'Primeiro abastecimento realizado', descricao: 'Abastecimento por Marcos Alves.',
        detalhes: { 'Volume': '80,0 L', 'Valor cobrado': 'R$ 512,00', 'Hodômetro': '120.500 km' } },
      { id: 'e05', data: '2025-02-28', hora: '16:00', tipo: 'bloqueio_auto',
        titulo: 'Limite de crédito atingido — bloqueio automático',
        descricao: 'O limite semanal foi consumido. Bloqueio automático ativado.',
        detalhes: { 'Limite': 'R$ 8.000,00', 'Utilizado': 'R$ 8.000,00' } },
      { id: 'e06', data: '2025-03-01', hora: '08:30', tipo: 'desbloqueio_req',
        titulo: 'Desbloqueio com 5 requisições extras',
        descricao: 'Acesso liberado para 5 abastecimentos adicionais no ciclo.',
        ator: 'Gestor do posto',
        detalhes: { 'Requisições extras': '5', 'Motivo': 'Solicitação urgente da obra' } },
      { id: 'e07', data: '2025-03-05', hora: '14:00', tipo: 'motorista_bloqueado',
        titulo: 'Motorista Marcos Alves bloqueado',
        descricao: 'Motorista suspenso preventivamente por suspeita de abastecimento fora do horário autorizado.',
        ator: 'Gestor do posto',
        detalhes: { 'Motivo': 'Abastecimento fora do horário autorizado', 'Investigação': 'Em andamento' } },
      { id: 'e08', data: '2025-03-10', hora: '09:00', tipo: 'motorista_reativado',
        titulo: 'Motorista Marcos Alves reativado',
        descricao: 'Investigação concluída. Motorista reativado.',
        ator: 'Gestor do posto',
        detalhes: { 'Conclusão': 'Sem irregularidade confirmada', 'Observação': 'Horário irregular foi exceção autorizada pela empresa' } },
      { id: 'e09', data: '2025-03-12', hora: '17:55', tipo: 'bloqueio_auto',
        titulo: 'Limite de crédito atingido — bloqueio automático',
        descricao: 'O limite mensal foi atingido novamente. Novas requisições bloqueadas.',
        detalhes: { 'Limite': 'R$ 8.000,00', 'Utilizado': 'R$ 8.000,00' } },
      { id: 'e10', data: '2025-03-14', tipo: 'limite_ajustado',
        titulo: 'Solicitação de ajuste de limite em análise',
        descricao: 'A empresa solicitou aumento do limite mensal para R$ 12.000,00.',
        ator: 'Financeiro Construtora Alpha',
        detalhes: { 'Limite atual': 'R$ 8.000,00', 'Limite solicitado': 'R$ 12.000,00', 'Status': 'Aguardando aprovação' } },
    ],
  },
  {
    id: 4, empresa: 'Turbo Fretes', cnpj: '33.444.555/0001-66',
    cidade: 'Guarulhos, SP', posto: 'Shell — Norte', desde: '20/02/2025', status: 'ativo',
    eventos: [
      { id: 'e01', data: '2025-02-20', tipo: 'inicio_parceria', titulo: 'Início da parceria', descricao: 'Turbo Fretes tornou-se parceira do Shell — Norte.' },
      { id: 'e02', data: '2025-02-20', tipo: 'contrato', titulo: 'Contrato assinado', descricao: 'Contrato B2B formalizado.',
        detalhes: { 'Combustíveis': 'Gasolina Comum, Etanol', 'Limite mensal': 'R$ 5.000,00', 'Ciclo': 'Mensal (+10 dias)' } },
      { id: 'e03', data: '2025-02-21', tipo: 'motorista_novo', titulo: 'Motorista João Pedro cadastrado', descricao: 'Primeiro motorista autorizado.' },
      { id: 'e04', data: '2025-02-21', tipo: 'veiculo_novo', titulo: 'Veículo TFR-0011 · VW Gol cadastrado', descricao: 'Veículo liberado.' },
      { id: 'e05', data: '2025-02-22', hora: '08:10', tipo: 'abastecimento', titulo: 'Primeiro abastecimento realizado', descricao: 'Abastecimento por João Pedro.',
        detalhes: { 'Volume': '40,0 L', 'Valor cobrado': 'R$ 248,00', 'Combustível': 'Gasolina Comum' } },
      { id: 'e06', data: '2025-03-01', tipo: 'motorista_novo', titulo: 'Motorista Bruna Silva cadastrada', descricao: 'Segunda motorista autorizada.' },
      { id: 'e07', data: '2025-03-05', tipo: 'veiculo_novo', titulo: 'Veículo TFR-0022 · Honda Fit cadastrado', descricao: 'Segundo veículo liberado.' },
      { id: 'e08', data: '2025-03-13', hora: '16:00', tipo: 'abastecimento', titulo: '3º abastecimento do ciclo atual', descricao: 'Abastecimento por Bruna Silva.',
        detalhes: { 'Volume': '38,0 L', 'Valor cobrado': 'R$ 235,60', 'Combustível': 'Etanol' } },
    ],
  },
  {
    id: 5, empresa: 'TransRota Logística', cnpj: '66.777.888/0001-99',
    cidade: 'São Paulo, SP', posto: 'Shell — Centro', desde: '10/01/2025', status: 'ativo',
    eventos: [
      { id: 'e01', data: '2025-01-10', hora: '08:00', tipo: 'inicio_parceria', titulo: 'Início da parceria', descricao: 'TransRota Logística tornou-se parceira do Shell — Centro.' },
      { id: 'e02', data: '2025-01-10', hora: '08:30', tipo: 'contrato', titulo: 'Contrato assinado', descricao: 'Contrato B2B formalizado.',
        detalhes: { 'Combustíveis': 'Diesel S-10, Diesel Comum', 'Limite mensal': 'R$ 12.000,00', 'Ciclo': 'Quinzenal (+5 dias)' } },
      { id: 'e03', data: '2025-01-10', tipo: 'motorista_novo', titulo: 'Motorista Luiz Antônio cadastrado', descricao: 'Primeiro motorista autorizado.' },
      { id: 'e04', data: '2025-01-11', hora: '06:50', tipo: 'abastecimento', titulo: 'Primeiro abastecimento realizado', descricao: 'Primeiro abastecimento B2B.',
        detalhes: { 'Volume': '90,0 L', 'Valor cobrado': 'R$ 576,00', 'Hodômetro': '65.200 km' } },
      { id: 'e05', data: '2025-02-03', hora: '13:00', tipo: 'motorista_bloqueado', titulo: 'Motorista Luiz Antônio bloqueado',
        descricao: 'Motorista suspenso após divergência no hodômetro registrado.',
        detalhes: { 'Motivo': 'Hodômetro inconsistente em 3 requisições consecutivas', 'Abastecimentos suspeitos': '3' } },
      { id: 'e06', data: '2025-02-10', tipo: 'motorista_novo', titulo: 'Motorista Ricardo Nunes cadastrado', descricao: 'Motorista substituto autorizado.' },
      { id: 'e07', data: '2025-02-15', tipo: 'faturamento_fechado', titulo: 'Fatura 1ª quinzena Jan/2025 fechada', descricao: 'Fatura do ciclo enviada.',
        detalhes: { 'Abastecimentos': '12', 'Valor total': 'R$ 8.640,00' } },
      { id: 'e08', data: '2025-03-08', hora: '09:30', tipo: 'motorista_reativado', titulo: 'Motorista Luiz Antônio reativado',
        descricao: 'Após auditoria interna, irregularidade não confirmada. Motorista reativado.',
        ator: 'Gestor do posto',
        detalhes: { 'Conclusão': 'Hodômetro estava sendo registrado em km parciais', 'Penalidade': 'Nenhuma' } },
      { id: 'e09', data: '2025-03-10', tipo: 'faturamento_fechado', titulo: 'Fatura Fevereiro/2025 fechada', descricao: 'Fatura do ciclo enviada.',
        detalhes: { 'Abastecimentos': '19', 'Valor total': 'R$ 13.680,00' } },
      { id: 'e10', data: '2025-03-12', tipo: 'motorista_novo', titulo: 'Motorista Carla Vieira cadastrada', descricao: 'Terceira motorista autorizada.' },
      { id: 'e11', data: '2025-03-13', tipo: 'veiculo_bloqueado', titulo: 'Veículo TRT-3344 bloqueado',
        descricao: 'Veículo bloqueado por CRLV vencido.',
        detalhes: { 'Veículo': 'TRT-3344 · Mercedes Accelo', 'Motivo': 'CRLV vencido em 28/02/2025' } },
    ],
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
function mesLabel(data: string) {
  const [y, m] = data.split('-')
  return `${MESES[parseInt(m) - 1]} ${y}`
}
function dataLabel(data: string) {
  const [y, m, d] = data.split('-')
  return `${d}/${m}/${y}`
}

const FILTROS = [
  { id: 'todos',     label: 'Todos' },
  { id: 'parceria',  label: 'Parceria' },
  { id: 'abastec',   label: 'Abastecimentos' },
  { id: 'bloqueios', label: 'Bloqueios' },
  { id: 'pessoas',   label: 'Pessoas e Veículos' },
]

// ─── Componente de evento ───────────────────────────────────────────────────────

function EventoCard({ evento, isLast }: { evento: Evento; isLast: boolean }) {
  const [expandido, setExpandido] = useState(false)
  const cfg = TIPO[evento.tipo]
  const Icon = cfg.icon
  const temDetalhes = evento.detalhes && Object.keys(evento.detalhes).length > 0

  return (
    <div className="flex gap-4">
      {/* Date */}
      <div className="w-28 text-right shrink-0 pt-1.5">
        <p className="text-xs font-medium text-gray-700">{dataLabel(evento.data)}</p>
        {evento.hora && <p className="text-[11px] text-gray-400">{evento.hora}</p>}
      </div>

      {/* Spine */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-8 h-8 rounded-full ${cfg.dot} flex items-center justify-center shrink-0 z-10 shadow-sm`}>
          <Icon size={14} className="text-white" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-100 mt-1" />}
      </div>

      {/* Card */}
      <div className={`flex-1 mb-4 border rounded-xl overflow-hidden ${cfg.bg}`}>
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{evento.titulo}</p>
              <p className="text-xs text-gray-500 mt-0.5">{evento.descricao}</p>
              {evento.ator && (
                <p className="text-[11px] text-gray-400 mt-1">por <span className="font-medium text-gray-500">{evento.ator}</span></p>
              )}
            </div>
            {temDetalhes && (
              <button
                onClick={() => setExpandido(v => !v)}
                className="shrink-0 flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
              >
                {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>

          {expandido && evento.detalhes && (
            <div className="mt-3 pt-3 border-t border-gray-200/60 grid grid-cols-2 gap-x-6 gap-y-1.5">
              {Object.entries(evento.detalhes).map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] text-gray-400">{k}</p>
                  <p className="text-xs font-medium text-gray-700">{v}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TimelineClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const cliente = CLIENTES.find(c => c.id === parseInt(id))

  const [filtro, setFiltro] = useState('todos')
  const [ordemDesc, setOrdemDesc] = useState(true)

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-gray-400 font-medium">Cliente não encontrado.</p>
        <Link href="/posto/relatorios/cliente" className="text-sm text-blue-500 hover:underline">Voltar à lista</Link>
      </div>
    )
  }

  const eventosFiltrados = useMemo(() => {
    let lista = [...cliente.eventos]
    if (filtro !== 'todos') lista = lista.filter(e => TIPO[e.tipo].grupo === filtro)
    lista.sort((a, b) => {
      const cmp = a.data.localeCompare(b.data) || (a.hora ?? '').localeCompare(b.hora ?? '')
      return ordemDesc ? -cmp : cmp
    })
    return lista
  }, [cliente, filtro, ordemDesc])

  // Group by month
  const grupos = useMemo(() => {
    const map = new Map<string, Evento[]>()
    for (const e of eventosFiltrados) {
      const key = mesLabel(e.data)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries())
  }, [eventosFiltrados])

  // KPIs
  const totalBloqueios  = cliente.eventos.filter(e => e.tipo === 'bloqueio_auto' || e.tipo === 'bloqueio_manual').length
  const totalAbast      = cliente.eventos.filter(e => e.tipo === 'abastecimento' || e.tipo === 'marco_abastecimento').length
  const totalFat        = cliente.eventos.filter(e => e.tipo === 'faturamento_fechado').length
  const totalPessoas    = cliente.eventos.filter(e => ['motorista_novo','motorista_bloqueado','motorista_reativado','veiculo_novo','veiculo_bloqueado','veiculo_reativado'].includes(e.tipo)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/posto/relatorios/cliente" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-3 transition-colors">
          <ArrowLeft size={14} /> Linha do Tempo
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cliente.status === 'bloqueado' ? 'bg-red-100' : 'bg-indigo-50'}`}>
                <span className={`text-sm font-bold ${cliente.status === 'bloqueado' ? 'text-red-600' : 'text-indigo-600'}`}>
                  {cliente.empresa.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{cliente.empresa}</h1>
                  <Badge variant={cliente.status === 'bloqueado' ? 'expirado' : 'ativo'} />
                </div>
                <p className="text-xs text-gray-400">{cliente.cnpj} · {cliente.cidade} · Parceiro desde {cliente.desde}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total de eventos', value: cliente.eventos.length, sub: 'desde o início', color: 'text-gray-900' },
          { label: 'Abastecimentos', value: totalAbast, sub: 'registrados', color: 'text-blue-600' },
          { label: 'Bloqueios',      value: totalBloqueios, sub: 'ao longo da parceria', color: totalBloqueios > 0 ? 'text-red-500' : 'text-gray-400' },
          { label: 'Faturas fechadas', value: totalFat, sub: `${totalPessoas} eventos de pessoas/veículos`, color: 'text-gray-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filtros + ordem */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filtro === f.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOrdemDesc(v => !v)}
          className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors"
        >
          {ordemDesc ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          {ordemDesc ? 'Mais recente primeiro' : 'Mais antigo primeiro'}
        </button>
      </div>

      {/* Timeline */}
      {eventosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm text-gray-400">Nenhum evento nesta categoria.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grupos.map(([mes, eventos]) => (
            <div key={mes}>
              {/* Month separator */}
              <div className="flex gap-4 items-center mb-3">
                <div className="w-28" />
                <div className="w-8" />
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{mes}</p>
                </div>
              </div>
              {eventos.map((e, i) => (
                <EventoCard key={e.id} evento={e} isLast={i === eventos.length - 1 && mes === grupos[grupos.length - 1][0]} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
