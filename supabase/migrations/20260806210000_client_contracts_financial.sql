-- Cadastro de cliente mais completo + contratos + financeiro básico.
-- Inspirado em funcionalidades vistas num SaaS concorrente (Yelu App) —
-- apenas o comportamento foi replicado (campos, geração automática de
-- lançamentos), nada de layout/design foi copiado.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS segment TEXT,
  ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS origin TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS client_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  start_date DATE,
  file_url TEXT,
  service_description TEXT,
  monthly_value NUMERIC(12, 2),
  repetitions INTEGER,
  periodicity TEXT NOT NULL DEFAULT 'monthly' CHECK (periodicity IN ('weekly', 'monthly', 'yearly')),
  payment_method TEXT,
  first_billing_date DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_contracts_client_idx ON client_contracts (client_id);

CREATE TABLE IF NOT EXISTS financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES client_contracts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_entries_workspace_due_idx
  ON financial_entries (workspace_id, due_date);

-- Ao criar um contrato com valor/repetições/data definidos, gera as parcelas
-- previstas automaticamente em financial_entries — mesmo comportamento
-- descrito no formulário de referência ("preencha os dados do contrato pra
-- gerar entradas financeiras automaticamente").
CREATE OR REPLACE FUNCTION generate_contract_financial_entries()
RETURNS TRIGGER AS $$
DECLARE
  i INTEGER;
  entry_date DATE;
  step INTERVAL;
BEGIN
  IF NEW.monthly_value IS NULL OR NEW.repetitions IS NULL OR NEW.repetitions < 1
     OR NEW.first_billing_date IS NULL THEN
    RETURN NEW;
  END IF;

  step := CASE NEW.periodicity
    WHEN 'weekly' THEN INTERVAL '1 week'
    WHEN 'yearly' THEN INTERVAL '1 year'
    ELSE INTERVAL '1 month'
  END;

  FOR i IN 0..(NEW.repetitions - 1) LOOP
    entry_date := NEW.first_billing_date + (step * i);
    INSERT INTO financial_entries (
      workspace_id, client_id, contract_id, type, category, description, amount, due_date, status
    ) VALUES (
      NEW.workspace_id,
      NEW.client_id,
      NEW.id,
      'income',
      'client_contract',
      COALESCE(NEW.service_description, NEW.title) || ' — parcela ' || (i + 1) || '/' || NEW.repetitions,
      NEW.monthly_value,
      entry_date,
      'pending'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_contracts_generate_entries ON client_contracts;
CREATE TRIGGER client_contracts_generate_entries
  AFTER INSERT ON client_contracts
  FOR EACH ROW EXECUTE FUNCTION generate_contract_financial_entries();

ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;

-- Financeiro é dado sensível: leitura e escrita restritas a
-- OWNER/ADMIN/MANAGER (não MEMBER), diferente do padrão mais aberto de
-- client_ai_memory/operations. Isso antecipa parte do controle de acesso que
-- a hierarquia de papéis completa (pendente, planejada à parte) vai formalizar.
CREATE POLICY client_contracts_all ON client_contracts
  FOR ALL USING (
    has_workspace_role(workspace_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']::membership_role[])
  );

CREATE POLICY financial_entries_all ON financial_entries
  FOR ALL USING (
    has_workspace_role(workspace_id, ARRAY['OWNER', 'ADMIN', 'MANAGER']::membership_role[])
  );
