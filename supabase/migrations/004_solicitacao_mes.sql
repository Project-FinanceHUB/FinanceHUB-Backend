-- Campo mes (1-12) para refletir no gráfico de progresso do contrato
ALTER TABLE solicitacao
ADD COLUMN IF NOT EXISTS mes INTEGER CHECK (mes >= 1 AND mes <= 12);

COMMENT ON COLUMN solicitacao.mes IS 'Mês do contrato (1 a 12) para exibição no gráfico de boletos';
