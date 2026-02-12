/**
 * Script para listar todos os dados do banco (Supabase)
 * Execute: npm run listar-dados
 */

import 'dotenv/config'
import supabase from '../src/config/supabase'
import { toCamel } from '../src/utils/caseMap'

async function listarDados() {
  try {
    console.log('\n' + '='.repeat(50))
    console.log('📊 DADOS DO BANCO DE DADOS (Supabase)')
    console.log('='.repeat(50))

    const { data: users } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    const listUsers = (users || []).map((r) => toCamel(r) as Record<string, unknown>)

    console.log('\n👥 USUÁRIOS:')
    console.log('-'.repeat(50))
    if (listUsers.length === 0) {
      console.log('Nenhum usuário cadastrado.')
    } else {
      listUsers.forEach((user: any) => {
        console.log(`ID: ${user.id}`)
        console.log(`  Nome: ${user.nome}`)
        console.log(`  Email: ${user.email}`)
        console.log(`  Role: ${user.role}`)
        console.log(`  Ativo: ${user.ativo ? 'Sim' : 'Não'}`)
        console.log(`  Criado em: ${user.createdAt}`)
        console.log('')
      })
    }

    const { data: companies } = await supabase.from('company').select('*').order('created_at', { ascending: false })
    const listCompanies = (companies || []).map((r) => toCamel(r) as Record<string, unknown>)

    console.log('\n🏢 EMPRESAS:')
    console.log('-'.repeat(50))
    if (listCompanies.length === 0) {
      console.log('Nenhuma empresa cadastrada.')
    } else {
      listCompanies.forEach((company: any) => {
        const cnpjs = typeof company.cnpjs === 'string' ? JSON.parse(company.cnpjs) : company.cnpjs
        console.log(`ID: ${company.id}`)
        console.log(`  Nome: ${company.nome}`)
        console.log(`  CNPJs: ${Array.isArray(cnpjs) ? cnpjs.join(', ') : cnpjs}`)
        console.log(`  Ativo: ${company.ativo ? 'Sim' : 'Não'}`)
        console.log(`  Criado em: ${company.createdAt}`)
        console.log('')
      })
    }

    const { data: mensagens } = await supabase
      .from('mensagem')
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(10)
    const listMensagens = (mensagens || []).map((r) => toCamel(r) as Record<string, unknown>)

    console.log('\n💬 MENSAGENS (últimas 10):')
    console.log('-'.repeat(50))
    if (listMensagens.length === 0) {
      console.log('Nenhuma mensagem cadastrada.')
    } else {
      listMensagens.forEach((msg: any) => {
        console.log(`ID: ${msg.id}`)
        console.log(`  Assunto: ${msg.assunto}`)
        console.log(`  Remetente: ${msg.remetente}`)
        console.log(`  Direção: ${msg.direcao}`)
        console.log(`  Lida: ${msg.lida ? 'Sim' : 'Não'}`)
        console.log(`  Data: ${msg.dataHora}`)
        console.log('')
      })
    }

    const { data: solicitacoes } = await supabase
      .from('solicitacao')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    const listSolicitacoes = (solicitacoes || []).map((r) => toCamel(r) as Record<string, unknown>)

    console.log('\n📋 SOLICITAÇÕES (últimas 10):')
    console.log('-'.repeat(50))
    if (listSolicitacoes.length === 0) {
      console.log('Nenhuma solicitação cadastrada.')
    } else {
      listSolicitacoes.forEach((sol: any) => {
        console.log(`ID: ${sol.id}`)
        console.log(`  Número: ${sol.numero}`)
        console.log(`  Título: ${sol.titulo}`)
        console.log(`  Status: ${sol.status}`)
        console.log(`  Estágio: ${sol.estagio}`)
        console.log(`  Criado em: ${sol.createdAt}`)
        console.log('')
      })
    }

    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true })
    const { count: totalCompanies } = await supabase.from('company').select('*', { count: 'exact', head: true })
    const { count: totalMensagens } = await supabase.from('mensagem').select('*', { count: 'exact', head: true })
    const { count: totalSolicitacoes } = await supabase.from('solicitacao').select('*', { count: 'exact', head: true })
    const { count: mensagensNaoLidas } = await supabase
      .from('mensagem')
      .select('*', { count: 'exact', head: true })
      .eq('lida', false)

    console.log('\n📈 ESTATÍSTICAS:')
    console.log('-'.repeat(50))
    console.log(`Total de usuários: ${totalUsers ?? 0}`)
    console.log(`Total de empresas: ${totalCompanies ?? 0}`)
    console.log(`Total de mensagens: ${totalMensagens ?? 0}`)
    console.log(`Mensagens não lidas: ${mensagensNaoLidas ?? 0}`)
    console.log(`Total de solicitações: ${totalSolicitacoes ?? 0}`)

    console.log('\n' + '='.repeat(50))
  } catch (error) {
    console.error('Erro ao listar dados:', error)
    process.exit(1)
  }
}

listarDados()
