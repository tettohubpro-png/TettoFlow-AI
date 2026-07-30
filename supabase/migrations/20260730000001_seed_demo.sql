-- Seed de demonstração (opcional — rodar manualmente após criar usuário owner no Auth)
-- UPDATE profiles SET role = 'owner' WHERE id = '<uuid-do-mairo>';

INSERT INTO clients (id, name, segment, plan, monthly_fee, status, notes)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'Cliente Piloto Geral',
    'general',
    'Essencial',
    2500.00,
    'active',
    'Cliente piloto Fase 0 — segmento não regulado'
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'Escritório Silva Advocacia',
    'legal',
    'Premium',
    4500.00,
    'active',
    'Segmento jurídico — handoff obrigatório'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (client_id, title, description, status, due_date)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'Campanha Instagram Q3',
    'Posts e stories mensais',
    'production',
    CURRENT_DATE
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'Landing Page Institucional',
    'Página com formulário de contato',
    'approval',
    CURRENT_DATE + 3
  );

INSERT INTO contacts (client_id, name, email, phone, is_primary)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'Ana Costa',
    'ana@exemplo.com',
    '98999990001',
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'Dr. Silva',
    'contato@silvaadv.com.br',
    '98999990002',
    true
  );
