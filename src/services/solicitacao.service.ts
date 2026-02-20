import supabase from '../config/supabase'
import { SolicitacaoCreateInput, SolicitacaoUpdateInput } from '../types/solicitacao'
import { toCamel, toSnake } from '../utils/caseMap'

const TABLE = 'solicitacao'

// Colunas da tabela solicitacao (inclui 'mes' para refletir o mês do contrato no frontend)
const COLUMNS =
  'id,numero,titulo,origem,prioridade,status,estagio,descricao,mensagem,mes,boleto_path,nota_fiscal_path,visualizado,visualizado_em,respondido,respondido_em,created_at,updated_at'

export class SolicitacaoService {
  private async generateNumero(): Promise<string> {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `${timestamp}-${random}`
  }

  async create(data: SolicitacaoCreateInput & { boletoPath?: string; notaFiscalPath?: string }) {
    const numero = data.numero || (await this.generateNumero())

    const { data: existing } = await supabase.from(TABLE).select('id').eq('numero', numero).maybeSingle()
    if (existing) throw new Error('Número de solicitação já existe')

    // Status definido automaticamente pela fila do SaaS; cliente não pode alterar
    const statusInicial = 'aberto'

    const row = toSnake({
      numero,
      titulo: data.titulo,
      origem: data.origem,
      prioridade: data.prioridade || 'media',
      status: statusInicial,
      estagio: data.estagio || 'Pendente',
      descricao: data.descricao,
      mensagem: data.mensagem,
      mes: data.mes,
      boletoPath: data.boletoPath,
      notaFiscalPath: data.notaFiscalPath,
      visualizado: data.visualizado ?? false,
      respondido: data.respondido ?? false,
    }) as Record<string, unknown>

    const { data: solicitacao, error } = await supabase.from(TABLE).insert(row).select(COLUMNS).single()
    if (error) throw new Error(error.message)
    return toCamel(solicitacao)
  }

  async findAll(page: number = 1, limit: number = 10, filters?: { status?: string; search?: string }) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from(TABLE)
      .select(COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.search) {
      query = query.or(
        `titulo.ilike.%${filters.search}%,numero.ilike.%${filters.search}%,origem.ilike.%${filters.search}%`
      )
    }

    const { data: solicitacoes, error, count } = await query

    if (error) throw new Error(error.message)
    const total = count ?? 0

    const ids = (solicitacoes || []).map((s) => s.id)
    const { data: mensagensBySolicitacao } =
      ids.length > 0
        ? await supabase
            .from('mensagem')
            .select('*')
            .in('solicitacao_id', ids)
            .order('data_hora', { ascending: false })
        : { data: [] }

    const mensagensMap = new Map<string, unknown[]>()
    for (const m of mensagensBySolicitacao || []) {
      const sid = m.solicitacao_id
      if (!sid) continue
      if (!mensagensMap.has(sid)) mensagensMap.set(sid, [])
      const arr = mensagensMap.get(sid)!
      if (arr.length < 1) arr.push(toCamel(m))
    }

    const solicitacoesWithMensagens = (solicitacoes || []).map((s) => ({
      ...(toCamel(s) as Record<string, unknown>),
      mensagens: mensagensMap.get(s.id) ?? [],
    }))

    return {
      solicitacoes: solicitacoesWithMensagens,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findById(id: string) {
    const { data: solicitacao, error } = await supabase.from(TABLE).select(COLUMNS).eq('id', id).single()
    if (error || !solicitacao) throw new Error('Solicitação não encontrada')

    const { data: mensagens } = await supabase
      .from('mensagem')
      .select('*')
      .eq('solicitacao_id', id)
      .order('data_hora', { ascending: false })

    return {
      ...(toCamel(solicitacao) as Record<string, unknown>),
      mensagens: (mensagens || []).map((m) => toCamel(m)),
    }
  }

  async findByNumero(numero: string) {
    const { data: solicitacao, error } = await supabase.from(TABLE).select(COLUMNS).eq('numero', numero).single()
    if (error || !solicitacao) throw new Error('Solicitação não encontrada')

    const { data: mensagens } = await supabase
      .from('mensagem')
      .select('*')
      .eq('solicitacao_id', solicitacao.id)
      .order('data_hora', { ascending: false })

    return {
      ...(toCamel(solicitacao) as Record<string, unknown>),
      mensagens: (mensagens || []).map((m) => toCamel(m)),
    }
  }

  async update(id: string, data: SolicitacaoUpdateInput & { boletoPath?: string; notaFiscalPath?: string }) {
    await this.findById(id)
    // Montar payload apenas com colunas permitidas e valores primitivos (evita "{}" em timestamp)
    const row: Record<string, string | number | boolean> = {
      updated_at: new Date().toISOString(),
    }
    if (data.titulo != null) row.titulo = data.titulo
    if (data.origem != null) row.origem = data.origem
    if (data.prioridade != null) row.prioridade = data.prioridade
    if (data.status != null) row.status = data.status
    if (data.estagio != null) row.estagio = data.estagio
    if (data.mes != null) row.mes = data.mes
    if (data.descricao != null) row.descricao = data.descricao
    if (data.mensagem != null) row.mensagem = data.mensagem
    if (data.visualizado != null) row.visualizado = data.visualizado
    if (data.respondido != null) row.respondido = data.respondido
    if (data.boletoPath != null) row.boleto_path = data.boletoPath
    if (data.notaFiscalPath != null) row.nota_fiscal_path = data.notaFiscalPath
    const { data: updated, error } = await supabase.from(TABLE).update(row).eq('id', id).select(COLUMNS).single()
    if (error) throw new Error(error.message)
    return toCamel(updated)
  }

  async delete(id: string) {
    await this.findById(id)
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { message: 'Solicitação deletada com sucesso' }
  }
}

export default new SolicitacaoService()
