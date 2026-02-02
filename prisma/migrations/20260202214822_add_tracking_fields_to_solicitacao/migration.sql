-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Solicitacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "estagio" TEXT NOT NULL DEFAULT 'Pendente',
    "descricao" TEXT,
    "mensagem" TEXT,
    "boletoPath" TEXT,
    "notaFiscalPath" TEXT,
    "visualizado" BOOLEAN NOT NULL DEFAULT false,
    "visualizadoEm" DATETIME,
    "respondido" BOOLEAN NOT NULL DEFAULT false,
    "respondidoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Solicitacao" ("boletoPath", "createdAt", "descricao", "estagio", "id", "mensagem", "notaFiscalPath", "numero", "origem", "prioridade", "status", "titulo", "updatedAt") SELECT "boletoPath", "createdAt", "descricao", "estagio", "id", "mensagem", "notaFiscalPath", "numero", "origem", "prioridade", "status", "titulo", "updatedAt" FROM "Solicitacao";
DROP TABLE "Solicitacao";
ALTER TABLE "new_Solicitacao" RENAME TO "Solicitacao";
CREATE UNIQUE INDEX "Solicitacao_numero_key" ON "Solicitacao"("numero");
CREATE INDEX "Solicitacao_numero_idx" ON "Solicitacao"("numero");
CREATE INDEX "Solicitacao_status_idx" ON "Solicitacao"("status");
CREATE INDEX "Solicitacao_createdAt_idx" ON "Solicitacao"("createdAt");
CREATE INDEX "Solicitacao_visualizado_idx" ON "Solicitacao"("visualizado");
CREATE INDEX "Solicitacao_respondido_idx" ON "Solicitacao"("respondido");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
