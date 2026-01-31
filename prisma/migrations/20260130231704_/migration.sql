-- CreateTable
CREATE TABLE "Solicitacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "estagio" TEXT NOT NULL DEFAULT 'Pendente',
    "descricao" TEXT,
    "boletoPath" TEXT,
    "notaFiscalPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "solicitacaoId" TEXT,
    "direcao" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "remetente" TEXT NOT NULL,
    "dataHora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "anexo" TEXT,
    CONSTRAINT "Mensagem_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "Solicitacao" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cnpjs" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'usuario',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuthCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Solicitacao_numero_key" ON "Solicitacao"("numero");

-- CreateIndex
CREATE INDEX "Solicitacao_numero_idx" ON "Solicitacao"("numero");

-- CreateIndex
CREATE INDEX "Solicitacao_status_idx" ON "Solicitacao"("status");

-- CreateIndex
CREATE INDEX "Solicitacao_createdAt_idx" ON "Solicitacao"("createdAt");

-- CreateIndex
CREATE INDEX "Mensagem_solicitacaoId_idx" ON "Mensagem"("solicitacaoId");

-- CreateIndex
CREATE INDEX "Mensagem_dataHora_idx" ON "Mensagem"("dataHora");

-- CreateIndex
CREATE INDEX "Mensagem_lida_idx" ON "Mensagem"("lida");

-- CreateIndex
CREATE INDEX "Company_nome_idx" ON "Company"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_ativo_idx" ON "User"("ativo");

-- CreateIndex
CREATE INDEX "AuthCode_email_idx" ON "AuthCode"("email");

-- CreateIndex
CREATE INDEX "AuthCode_code_idx" ON "AuthCode"("code");

-- CreateIndex
CREATE INDEX "AuthCode_expiresAt_idx" ON "AuthCode"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthCode_used_idx" ON "AuthCode"("used");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
