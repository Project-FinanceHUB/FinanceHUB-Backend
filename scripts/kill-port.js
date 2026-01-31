/**
 * Script para encerrar processo que está usando uma porta específica
 * Uso: node scripts/kill-port.js 3001
 */

const port = process.argv[2] || process.env.PORT || 3001

if (!port) {
  console.error('❌ Por favor, informe a porta. Exemplo: node scripts/kill-port.js 3001')
  process.exit(1)
}

const { exec } = require('child_process')
const os = require('os')

const platform = os.platform()

console.log(`🔍 Procurando processo na porta ${port}...`)

if (platform === 'win32') {
  // Windows
  exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
    if (error || !stdout) {
      console.log(`✅ Nenhum processo encontrado na porta ${port}`)
      return
    }

    const lines = stdout.trim().split('\n')
    const pids = new Set()

    lines.forEach((line) => {
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && pid !== '0') {
        pids.add(pid)
      }
    })

    if (pids.size === 0) {
      console.log(`✅ Nenhum processo encontrado na porta ${port}`)
      return
    }

    console.log(`\n📋 Processos encontrados na porta ${port}:`)
    pids.forEach((pid) => console.log(`   PID: ${pid}`))

    pids.forEach((pid) => {
      exec(`taskkill /PID ${pid} /F`, (killError) => {
        if (killError) {
          console.error(`❌ Erro ao encerrar processo ${pid}:`, killError.message)
        } else {
          console.log(`✅ Processo ${pid} encerrado com sucesso`)
        }
      })
    })
  })
} else {
  // Linux/Mac
  exec(`lsof -ti :${port}`, (error, stdout, stderr) => {
    if (error || !stdout) {
      console.log(`✅ Nenhum processo encontrado na porta ${port}`)
      return
    }

    const pids = stdout.trim().split('\n').filter((pid) => pid)

    if (pids.length === 0) {
      console.log(`✅ Nenhum processo encontrado na porta ${port}`)
      return
    }

    console.log(`\n📋 Processos encontrados na porta ${port}:`)
    pids.forEach((pid) => console.log(`   PID: ${pid}`))

    pids.forEach((pid) => {
      exec(`kill -9 ${pid}`, (killError) => {
        if (killError) {
          console.error(`❌ Erro ao encerrar processo ${pid}:`, killError.message)
        } else {
          console.log(`✅ Processo ${pid} encerrado com sucesso`)
        }
      })
    })
  })
}
