# 📧 Como Configurar Gmail para Envio de Emails

## ✅ Passo a Passo Completo

### 1. Habilitar Autenticação de 2 Fatores (OBRIGATÓRIO)

1. Acesse: https://myaccount.google.com/security
2. Faça login com sua conta Google
3. Procure por **"Verificação em duas etapas"** ou **"2-Step Verification"**
4. Clique em **"Ativar"** ou **"Get Started"**
5. Siga o processo de configuração:
   - Escolha método de verificação (SMS ou app autenticador)
   - Confirme o número de telefone
   - Complete a verificação

**⚠️ IMPORTANTE:** Sem autenticação de 2 fatores ativada, você NÃO conseguirá gerar senha de app!

---

### 2. Gerar Senha de App (OBRIGATÓRIO)

1. Acesse: https://myaccount.google.com/apppasswords
2. Faça login com sua conta Google
3. Se não aparecer a opção, significa que a autenticação de 2 fatores não está ativada
4. Preencha:
   - **Selecione app:** Escolha "Mail"
   - **Selecione dispositivo:** Escolha "Other (Custom name)"
   - **Digite:** `FinanceHUB`
5. Clique em **"Generate"** (Gerar)
6. **COPIE a senha gerada** (16 caracteres, sem espaços)
   - Exemplo: `abcd efgh ijkl mnop` → use `abcdefghijklmnop`
7. Cole no arquivo `.env`:
   ```env
   SMTP_PASS=abcdefghijklmnop
   ```

---

### 3. Verificar Configurações do Gmail

#### Opção A: Verificar se "Acesso a apps menos seguros" está habilitado
- ⚠️ **NOTA:** Esta opção está sendo descontinuada pelo Google
- Acesse: https://myaccount.google.com/lesssecureapps
- Se aparecer, habilite temporariamente (não recomendado)

#### Opção B: Usar Senha de App (RECOMENDADO)
- ✅ Use sempre senha de app (passo 2 acima)
- Mais seguro e recomendado pelo Google

---

### 4. Configurar o .env

Seu arquivo `.env` deve estar assim:

```env
ENABLE_REAL_EMAIL=true
FROM_EMAIL=brendowluucas@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=brendowluucas@gmail.com
SMTP_PASS=sua-senha-de-app-aqui
```

**⚠️ IMPORTANTE:**
- Use a **senha de app** (16 caracteres), NÃO sua senha normal do Gmail
- Não compartilhe sua senha de app publicamente
- Se a senha não funcionar, gere uma nova

---

### 5. Testar

1. Reinicie o backend completamente
2. Crie um usuário ou solicite código de login
3. Verifique:
   - **Console do backend:** Deve aparecer `✅ Email enviado para... via SMTP`
   - **Sua caixa de entrada:** Email deve chegar em alguns segundos

---

## 🔍 Troubleshooting

### Erro: "Invalid login"
- ✅ Verifique se está usando senha de app (não senha normal)
- ✅ Confirme que autenticação de 2 fatores está ativada
- ✅ Gere uma nova senha de app

### Erro: "Connection timeout"
- ✅ Verifique sua conexão com internet
- ✅ Confirme que a porta 587 não está bloqueada pelo firewall

### Erro: "Authentication failed"
- ✅ Verifique se `SMTP_USER` está correto (email completo)
- ✅ Confirme que `SMTP_PASS` é a senha de app (sem espaços)
- ✅ Tente gerar uma nova senha de app

### Emails não chegam
- ✅ Verifique a pasta de Spam/Lixo Eletrônico
- ✅ Confirme que o email de destino está correto
- ✅ Veja o console do backend para erros

---

## 📝 Resumo Rápido

1. ✅ Ativar autenticação de 2 fatores no Google
2. ✅ Gerar senha de app em https://myaccount.google.com/apppasswords
3. ✅ Colar senha de app no `.env` (SMTP_PASS)
4. ✅ Reiniciar backend
5. ✅ Testar criando usuário ou solicitando código

---

## 🔐 Segurança

- ✅ Nunca compartilhe sua senha de app
- ✅ Use senha de app diferente para cada aplicação
- ✅ Se suspeitar de comprometimento, revogue e gere nova senha
- ✅ Mantenha autenticação de 2 fatores sempre ativada
