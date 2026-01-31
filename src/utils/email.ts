/**
 * Utilitário para envio de emails
 * Por enquanto apenas simula o envio
 * Em produção, integrar com serviço de email (SendGrid, AWS SES, etc.)
 */

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Envia email
 * Em desenvolvimento: loga no console
 * Em produção: envia via serviço configurado (SendGrid, SMTP, etc.)
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html, text } = options

  // Verificar se há configuração para envio real
  const useRealEmail = process.env.ENABLE_REAL_EMAIL === 'true' || process.env.SENDGRID_API_KEY || process.env.SMTP_HOST

  // Em desenvolvimento sem configuração real, apenas loga
  if (process.env.NODE_ENV === 'development' && !useRealEmail) {
    console.log('\n' + '='.repeat(70))
    console.log('📧 EMAIL SIMULADO (Desenvolvimento)')
    console.log('='.repeat(70))
    console.log(`Para: ${to}`)
    console.log(`Assunto: ${subject}`)
    console.log('-' .repeat(70))
    if (text) {
      console.log(text)
    } else {
      // Extrair texto do HTML
      const textContent = html.replace(/<[^>]*>/g, '').trim()
      console.log(textContent)
    }
    console.log('='.repeat(70))
    console.log('💡 Para receber emails reais, configure ENABLE_REAL_EMAIL=true no .env')
    console.log('='.repeat(70) + '\n')
    return
  }

  // Tentar envio real se configurado
  if (useRealEmail) {
    try {
      // SendGrid
      if (process.env.SENDGRID_API_KEY) {
        const sgMail = require('@sendgrid/mail')
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        await sgMail.send({
          to,
          from: process.env.FROM_EMAIL || 'noreply@financehub.com',
          subject,
          html,
          text,
        })
        console.log(`✅ Email enviado para ${to} via SendGrid`)
        return
      }

      // SMTP (Nodemailer)
      if (process.env.SMTP_HOST) {
        const nodemailer = require('nodemailer')
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        })
        await transporter.sendMail({
          from: process.env.FROM_EMAIL || process.env.SMTP_USER,
          to,
          subject,
          html,
          text,
        })
        console.log(`✅ Email enviado para ${to} via SMTP`)
        return
      }
    } catch (error: any) {
      console.error('❌ Erro ao enviar email real:', error.message)
      // Em desenvolvimento, ainda loga mesmo se falhar
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📧 Fallback: Email simulado no console')
        console.log(`Para: ${to}`)
        console.log(`Assunto: ${subject}`)
        if (text) console.log(text)
      }
      throw error
    }
  }

  // Se chegou aqui e está em produção sem configuração, erro
  if (process.env.NODE_ENV === 'production' && !useRealEmail) {
    throw new Error('Envio de email não configurado. Configure SENDGRID_API_KEY ou SMTP no .env')
  }
}

/**
 * Gera template HTML para código de verificação
 */
export function generateAuthCodeEmail(code: string): { subject: string; html: string; text: string } {
  const subject = 'Seu código de verificação - FinanceHUB'
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #039a42 0%, #138e5d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">FinanceHUB</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #039a42; margin-top: 0;">Código de Verificação</h2>
        <p>Olá,</p>
        <p>Você solicitou acesso à sua conta no FinanceHUB. Use o código abaixo para fazer login:</p>
        <div style="background: white; border: 2px dashed #039a42; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #039a42; font-family: monospace;">
            ${code}
          </div>
        </div>
        <p style="color: #666; font-size: 14px;">
          Este código expira em <strong>10 minutos</strong> e só pode ser usado uma vez.
        </p>
        <p style="color: #666; font-size: 14px;">
          Se você não solicitou este código, ignore este email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          FinanceHUB - Sistema de Gestão Financeira
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
FinanceHUB - Código de Verificação

Olá,

Você solicitou acesso à sua conta no FinanceHUB. Use o código abaixo para fazer login:

${code}

Este código expira em 10 minutos e só pode ser usado uma vez.

Se você não solicitou este código, ignore este email.

---
FinanceHUB - Sistema de Gestão Financeira
  `.trim()

  return { subject, html, text }
}

/**
 * Gera template HTML para email de boas-vindas (criação de usuário)
 */
export function generateWelcomeEmail(nome: string, email: string, role: string): { subject: string; html: string; text: string } {
  const subject = 'Bem-vindo ao FinanceHUB!'
  
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    gerente: 'Gerente',
    usuario: 'Usuário',
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #039a42 0%, #138e5d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">FinanceHUB</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #039a42; margin-top: 0;">Bem-vindo ao FinanceHUB!</h2>
        <p>Olá <strong>${nome}</strong>,</p>
        <p>Sua conta foi criada com sucesso no FinanceHUB!</p>
        
        <div style="background: white; border-left: 4px solid #039a42; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Detalhes da sua conta:</strong></p>
          <p style="margin: 5px 0; font-size: 14px;">📧 E-mail: ${email}</p>
          <p style="margin: 5px 0; font-size: 14px;">👤 Tipo de conta: ${roleLabels[role] || role}</p>
        </div>
        
        <p>Para começar a usar o sistema, acesse a plataforma e faça login com seu e-mail:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3000" style="display: inline-block; background: #039a42; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar FinanceHUB</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          <strong>Como fazer login:</strong><br>
          1. Acesse a plataforma<br>
          2. Digite seu e-mail<br>
          3. Você receberá um código de verificação por email<br>
          4. Digite o código para acessar sua conta
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Se você não criou esta conta, entre em contato conosco imediatamente.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          FinanceHUB - Sistema de Gestão Financeira<br>
          Este é um email automático, por favor não responda.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
FinanceHUB - Bem-vindo!

Olá ${nome},

Sua conta foi criada com sucesso no FinanceHUB!

Detalhes da sua conta:
- E-mail: ${email}
- Tipo de conta: ${roleLabels[role] || role}

Para começar a usar o sistema, acesse: http://localhost:3000

Como fazer login:
1. Acesse a plataforma
2. Digite seu e-mail
3. Você receberá um código de verificação por email
4. Digite o código para acessar sua conta

Se você não criou esta conta, entre em contato conosco imediatamente.

---
FinanceHUB - Sistema de Gestão Financeira
Este é um email automático, por favor não responda.
  `.trim()

  return { subject, html, text }
}
