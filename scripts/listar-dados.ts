/**
 * Script para listar todos os dados do banco
 * Execute: npx tsx scripts/listar-dados.ts
 */

import prisma from '../src/config/database'

async function listarDados() {
  try {
    console.log('\n' + '='.repeat(50))
    console.log('📊 DADOS DO BANCO DE DADOS')
    console.log('='.repeat(50))

    // Usuários
    console.log('\n👥 USUÁRIOS:')
    console.log('-'.repeat(50))
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    })
    if (users.length === 0) {
      console.log('Nenhum usuário cadastrado.')
    } else {
      users.forEach((user) => {
        console.log(`ID: ${user.id}`)
        console.log(`  Nome: ${user.nome}`)
        console.log(`  Email: ${user.email}`)
        console.log(`  Role: ${user.role}`)
        console.log(`  Ativo: ${user.ativo ? 'Sim' : 'Não'}`)
        console.log(`  Criado em: ${user.createdAt}`)
        console.log('')
      })
    }

    // Empresas
    console.log('\n🏢 EMPRESAS:')
    console.log('-'.repeat(50))
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    })
    if (companies.length === 0) {
      console.log('Nenhuma empresa cadastrada.')
    } else {
      companies.forEach((company) => {
        const cnpjs = typeof company.cnpjs === 'string' ? JSON.parse(company.cnpjs) : company.cnpjs
        console.log(`ID: ${company.id}`)
        console.log(`  Nome: ${company.nome}`)
        console.log(`  CNPJs: ${Array.isArray(cnpjs) ? cnpjs.join(', ') : cnpjs}`)
        console.log(`  Ativo: ${company.ativo ? 'Sim' : 'Não'}`)
        console.log(`  Criado em: ${company.createdAt}`)
        console.log('')
      })
    }

    // Mensagens
    console.log('\n💬 MENSAGENS:')
    console.log('-'.repeat(50))
    const mensagens = await prisma.mensagem.findMany({
      orderBy: { dataHora: 'desc' },
      take: 10, // Últimas 10
    })
    if (mensagens.length === 0) {
      console.log('Nenhuma mensagem cadastrada.')
    } else {
      mensagens.forEach((msg) => {
        console.log(`ID: ${msg.id}`)
        console.log(`  Assunto: ${msg.assunto}`)
        console.log(`  Remetente: ${msg.remetente}`)
        console.log(`  Direção: ${msg.direcao}`)
        console.log(`  Lida: ${msg.lida ? 'Sim' : 'Não'}`)
        console.log(`  Data: ${msg.dataHora}`)
        console.log('')
      })
    }

    // Solicitações
    console.log('\n📋 SOLICITAÇÕES:')
    console.log('-'.repeat(50))
    const solicitacoes = await prisma.solicitacao.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10, // Últimas 10
    })
    if (solicitacoes.length === 0) {
      console.log('Nenhuma solicitação cadastrada.')
    } else {
      solicitacoes.forEach((sol) => {
        console.log(`ID: ${sol.id}`)
        console.log(`  Número: ${sol.numero}`)
        console.log(`  Título: ${sol.titulo}`)
        console.log(`  Status: ${sol.status}`)
        console.log(`  Estágio: ${sol.estagio}`)
        console.log(`  Criado em: ${sol.createdAt}`)
        console.log('')
      })
    }

    // Estatísticas
    console.log('\n📈 ESTATÍSTICAS:')
    console.log('-'.repeat(50))
    const totalUsers = await prisma.user.count()
    const totalCompanies = await prisma.company.count()
    const totalMensagens = await prisma.mensagem.count()
    const totalSolicitacoes = await prisma.solicitacao.count()
    const mensagensNaoLidas = await prisma.mensagem.count({ where: { lida: false } })

    console.log(`Total de usuários: ${totalUsers}`)
    console.log(`Total de empresas: ${totalCompanies}`)
    console.log(`Total de mensagens: ${totalMensagens}`)
    console.log(`Mensagens não lidas: ${mensagensNaoLidas}`)
    console.log(`Total de solicitações: ${totalSolicitacoes}`)

    console.log('\n' + '='.repeat(50))
  } catch (error) {
    console.error('Erro ao listar dados:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listarDados()
