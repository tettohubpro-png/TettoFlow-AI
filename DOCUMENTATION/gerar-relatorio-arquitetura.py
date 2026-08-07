#!/usr/bin/env python3
"""Gera PDF com relatório de arquitetura do TettoFlow AI OS."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parent / "TettoFlow-AI-Arquitetura-Completa.pdf"

ACCENT = colors.HexColor("#0F766E")
DARK = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#475569")
LIGHT_BG = colors.HexColor("#F1F5F9")
BORDER = colors.HexColor("#CBD5E1")
WHITE = colors.white


def styles():
    base = getSampleStyleSheet()
    s = {
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=26,
            leading=32,
            textColor=DARK,
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=12,
            leading=16,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=ACCENT,
            spaceBefore=18,
            spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=DARK,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=DARK,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=DARK,
            leftIndent=4,
        ),
        "mono": ParagraphStyle(
            "mono",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7.5,
            leading=10,
            textColor=DARK,
            backColor=LIGHT_BG,
            leftIndent=6,
            rightIndent=6,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=10,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=10,
        ),
        "cell": ParagraphStyle(
            "cell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=DARK,
        ),
        "cell_bold": ParagraphStyle(
            "cell_bold",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=11,
            textColor=DARK,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
    }
    return s


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(1.8 * cm, A4[1] - 1.4 * cm, A4[0] - 1.8 * cm, A4[1] - 1.4 * cm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(1.8 * cm, A4[1] - 1.2 * cm, "TettoFlow AI OS — Relatório de Arquitetura")
    canvas.drawRightString(A4[0] - 1.8 * cm, A4[1] - 1.2 * cm, "Confidencial — TettoHub")
    canvas.line(1.8 * cm, 1.4 * cm, A4[0] - 1.8 * cm, 1.4 * cm)
    canvas.drawCentredString(A4[0] / 2, 0.9 * cm, f"Página {doc.page}")
    canvas.restoreState()


def table(data, col_widths, s):
    rows = []
    for i, row in enumerate(data):
        cells = []
        for j, val in enumerate(row):
            sty = s["cell_bold"] if i == 0 or j == 0 else s["cell"]
            if i == 0:
                sty = s["cell_bold"]
            cells.append(Paragraph(str(val), sty))
        rows.append(cells)
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("BACKGROUND", (0, 1), (-1, -1), WHITE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    # Force header text white via Paragraph override for first row
    header = []
    for val in data[0]:
        header.append(
            Paragraph(
                f'<font color="white"><b>{val}</b></font>',
                ParagraphStyle("hdr", fontName="Helvetica-Bold", fontSize=8, leading=11),
            )
        )
    rows[0] = header
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_BG]),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return t


def bullets(items, s):
    return ListFlowable(
        [ListItem(Paragraph(i, s["bullet"]), leftIndent=8, bulletColor=ACCENT) for i in items],
        bulletType="bullet",
        start="•",
        leftIndent=12,
        spaceBefore=2,
        spaceAfter=8,
    )


def build():
    s = styles()
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="TettoFlow AI OS — Arquitetura Completa",
        author="TettoHub",
    )
    story = []
    w = A4[0] - 3.6 * cm

    # —— CAPA ——
    story.append(Spacer(1, 3.5 * cm))
    story.append(Paragraph("TettoFlow AI OS", s["cover_title"]))
    story.append(HRFlowable(width="60%", thickness=2, color=ACCENT, spaceBefore=4, spaceAfter=12, hAlign="CENTER"))
    story.append(Paragraph("Relatório Completo de Arquitetura, Fluxos e Status", s["cover_sub"]))
    story.append(Paragraph("Sistema operacional interno da TettoHub", s["cover_sub"]))
    story.append(Spacer(1, 1.2 * cm))
    meta = [
        ["Campo", "Valor"],
        ["Versão do produto", "0.1.0"],
        ["Fase atual", "Fase 0 — MVP (~75–85%)"],
        ["Produto total (Fases 0–2)", "~25–35%"],
        ["Data do relatório", "04/08/2026"],
        ["Repositório produto", "TettoFlow-AI"],
        ["Wrapper Git", "finance.tt (quase vazio)"],
    ]
    story.append(table(meta, [6 * cm, 10 * cm], s))
    story.append(Spacer(1, 1.5 * cm))
    story.append(
        Paragraph(
            "Documento gerado a partir da análise do código, documentação e roadmap do projeto.",
            s["caption"],
        )
    )
    story.append(PageBreak())

    # —— 1. O QUE É ——
    story.append(Paragraph("1. O que é este projeto", s["h1"]))
    story.append(
        Paragraph(
            "A pasta <b>finance.tt</b> no GitHub está praticamente vazia (apenas .gitignore e "
            ".gitattributes). O produto real vive no repositório aninhado <b>TettoFlow-AI/</b>.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>TettoFlow AI OS</b> é o sistema nervoso central da TettoHub — CRM, operações "
            "(kanban), aprovações, briefing, departamentos e atendimento inteligente via WhatsApp. "
            "Não é um aplicativo financeiro/fintech; o nome da pasta pai é apenas o wrapper Git.",
            s["body"],
        )
    )
    story.append(
        Paragraph(
            "Proposta de valor: um lugar para ver clientes, projetos e atendimento — com IA que "
            "conhece a operação, respeita permissões e escala para humano quando necessário.",
            s["body"],
        )
    )

    # —— 2. ESTRUTURA ——
    story.append(Paragraph("2. Estrutura de pastas", s["h1"]))
    tree = """finance.tt/                          ← wrapper Git (quase vazio)
└── TettoFlow-AI/                   ← PRODUTO REAL
    ├── src/                        ← Frontend React (SPA)
    ├── supabase/
    │   ├── migrations/             ← Schema Postgres
    │   └── functions/              ← Edge Functions (Deno)
    ├── n8n/workflows/              ← Orquestração WhatsApp
    ├── evolution/                  ← Docker Evolution API
    ├── DOCUMENTATION/              ← Visão, ADRs, módulos, roadmap
    ├── .cursor/rules/              ← Governança do agente Cursor
    ├── scripts/                    ← Setup Supabase
    ├── package.json                ← tettoflow-ai-os@0.1.0
    ├── netlify.toml / vercel.json  ← Deploy frontend
    └── .env.example                ← Variáveis públicas"""
    story.append(Preformatted(tree, s["mono"]))

    # —— 3. ARQUITETURA ——
    story.append(Paragraph("3. Arquitetura completa", s["h1"]))
    story.append(
        Paragraph(
            "Arquitetura BaaS (Backend as a Service): o frontend fala com o Supabase; "
            "WhatsApp entra pela Evolution API; o n8n orquestra; a Edge Function processa IA.",
            s["body"],
        )
    )
    arch = """Cliente (WhatsApp)
        │
        ▼
Evolution API  ──►  n8n  ──►  Edge Function agent-whatsapp (Groq)
                                      │
                                      ▼
                              Supabase (Postgres + Auth + RLS)
                                      ▲
                                      │
Equipe TettoHub  ◄──  React SPA (Vite)  ──►  Google Drive (uploads)"""
    story.append(Preformatted(arch, s["mono"]))
    story.append(Paragraph("Figura — fluxo técnico ponta a ponta", s["caption"]))

    story.append(Paragraph("3.1 Camadas e stack", s["h2"]))
    story.append(
        table(
            [
                ["Camada", "Tecnologia", "Caminho"],
                ["Frontend", "React 19, Vite 6, TypeScript, Tailwind 4, React Router 7", "src/"],
                ["BaaS", "Supabase (Auth, Postgres, RLS, Storage)", "supabase/"],
                ["Edge Functions", "Deno: agent-whatsapp, webhook, onboarding, drive", "supabase/functions/"],
                ["WhatsApp", "Evolution API v2 + Postgres + Redis", "evolution/"],
                ["Orquestração", "n8n (workflows JSON)", "n8n/workflows/"],
                ["LLM / STT", "Groq (Llama + Whisper)", "agent-whatsapp + n8n"],
                ["Arquivos", "Google Drive (service account)", "drive-upload"],
                ["Deploy FE", "Netlify e/ou Vercel", "netlify.toml, vercel.json"],
            ],
            [3.2 * cm, 8.3 * cm, 4.5 * cm],
            s,
        )
    )
    story.append(Spacer(1, 0.3 * cm))

    # —— 4. APLICAÇÕES ——
    story.append(Paragraph("4. Aplicações e telas — passo a passo", s["h1"]))
    story.append(
        Paragraph(
            "Entry point: <b>index.html → src/main.tsx → src/App.tsx</b>. Rotas protegidas "
            "exigem sessão Supabase Auth.",
            s["body"],
        )
    )

    apps = [
        (
            "4.1 Login / Auth — /login",
            "Equipe entra com email/senha (Supabase Auth). Contexto de app: users, memberships, "
            "workspaces. Papéis no front: OWNER | ADMIN | MANAGER | MEMBER | CLIENT.",
        ),
        (
            "4.2 Dashboard — /",
            "Visão geral operacional: clientes, operações, aprovações e agenda. Substitui a "
            "necessidade de perguntar status em várias ferramentas.",
        ),
        (
            "4.3 CRM — /crm e /crm/:clientId",
            "Cadastro de clientes, status, contatos. No detalhe: briefing (marca, produtos, "
            "memória de IA) e upload de arquivos para o Google Drive.",
        ),
        (
            "4.4 Projetos / Operações — /projetos",
            "Kanban tipo Trello. Cada pedido vira uma operation (DRAFT → … → DONE). É aqui que "
            "design e produção trabalham. Modal de solicitação, drag-and-drop entre colunas.",
        ),
        (
            "4.5 Departamentos — /departamentos",
            "Filas por área: social_media, design, videomaker, video_editor, traffic, manager, "
            "commercial, general.",
        ),
        (
            "4.6 Aprovações — /aprovacoes",
            "Rounds INTERNAL e CLIENT para validar entregas antes da publicação/entrega final.",
        ),
        (
            "4.7 IA interna — /ia",
            "Q&A operacional no browser com memória do cliente e status de operations "
            "(heurística contextual no MVP).",
        ),
        (
            "4.8 WhatsApp — /whatsapp",
            "Monitoramento/configuração do canal. O cérebro está nas Edge Functions + n8n + Groq.",
        ),
    ]
    for title, text in apps:
        story.append(Paragraph(title, s["h2"]))
        story.append(Paragraph(text, s["body"]))

    story.append(Paragraph("4.9 Edge Functions (backend)", s["h2"]))
    story.append(
        table(
            [
                ["Function", "Responsabilidade"],
                ["agent-whatsapp", "Identifica cliente, classifica intenção, responde (Groq), cria operation"],
                ["whatsapp-webhook", "Entrada alternativa de webhook WhatsApp"],
                ["client-onboarding", "Pacote automático ao ativar cliente (operations iniciais)"],
                ["drive-upload", "Upload de arquivos para Google Drive"],
            ],
            [4.5 * cm, 11.5 * cm],
            s,
        )
    )

    # —— 5. FLUXO E2E ——
    story.append(Paragraph("5. Fluxo end-to-end de negócio", s["h1"]))
    story.append(Paragraph("5.1 Funil comercial → operação → renovação", s["h2"]))
    funnel = """Novo Lead → CRM → Proposta → Contrato → Cliente Ativo
        → Onboarding inteligente (automação)
        → Produção (Social / Design / Vídeo / Editor)
        → Aprovação (cliente + gestor)
        → Entrega → Relatórios → Renovação"""
    story.append(Preformatted(funnel, s["mono"]))
    story.append(
        Paragraph(
            "Gaps: proposta, contrato, relatórios e renovação estão planejados (Fase 1+). "
            "Produção, aprovações e onboarding já têm base no modelo operations/automations.",
            s["body"],
        )
    )

    story.append(Paragraph("5.2 Jornada WhatsApp → Design (o coração do agente)", s["h2"]))
    wa = """1. Cliente manda WhatsApp: "quero 3 posts essa semana" (texto ou áudio)
2. Evolution API recebe a mensagem
3. n8n normaliza payload; se áudio → Groq Whisper → texto
4. n8n mostra "digitando…" e chama Edge Function agent-whatsapp
5. Agente: identifica cliente pelo telefone, carrega client_ai_memory
6. Classifica intenção + departamento (ex.: social_media / design)
7. Compliance: temas OAB/ANVISA/TSE → handoff humano
8. Gera resposta humanizada (Groq) e, se preciso, cria operation no kanban
9. n8n envia resposta via Evolution; notifica equipe do departamento
10. Designer/equipe vê a tarefa na fila, produz, sobe Drive → aprovação → entrega"""
    story.append(Preformatted(wa, s["mono"]))

    story.append(Paragraph("5.3 Roteamento de intenções", s["h2"]))
    story.append(
        table(
            [
                ["Intenção do cliente", "Departamento", "Exemplo"],
                ["Post, story, reel, calendário", "social_media", "Quero 3 posts essa semana"],
                ["Gravação, filmagem, agenda", "videomaker", "Marcar gravação sexta 14h"],
                ["Edição, corte, after", "video_editor", "Ainda não saiu o vídeo?"],
                ["Ads, Meta Ads, Google Ads", "traffic", "Pausar campanha do Instagram"],
                ["Aprovação, prazo, reclamação", "manager", "Quem aprova o post?"],
                ["Novo serviço, proposta", "commercial", "Incluir tráfego no contrato"],
                ["FAQ / dúvida geral", "general", "Qual o horário de vocês?"],
            ],
            [5.2 * cm, 3.5 * cm, 7.3 * cm],
            s,
        )
    )

    # —— 6. DOMÍNIO ——
    story.append(PageBreak())
    story.append(Paragraph("6. Modelo de domínio", s["h1"]))
    story.append(
        Paragraph(
            "Entidades principais no código atual (types/database.ts e schema workspace-centric):",
            s["body"],
        )
    )
    story.append(
        bullets(
            [
                "<b>Workspace</b> + Membership + AppUser",
                "<b>Client</b> / ClientContact / ClientBrand / ClientProduct",
                "<b>Operation</b> (kanban) + templates",
                "<b>Approval</b> / ApprovalRound",
                "<b>ClientFile</b> / caminhos Drive",
                "<b>ClientAiMemory</b> (PREFERENCES, BRIEFING, BRAND…)",
                "<b>Automation</b> / AutomationRun (ex.: client.onboarded)",
                "Segmentos compliance: legal, health_aesthetics, electoral, general",
            ],
            s,
        )
    )
    story.append(
        Paragraph(
            "<b>Atenção — dualidade de schema:</b> migrations antigas usam profiles/clients/"
            "projects; o código atual e a doc operacional usam workspaces/memberships/operations. "
            "A fonte da verdade pretendida é o modelo workspace/operations.",
            s["body"],
        )
    )

    # —— 7. MATURIDADE ——
    story.append(Paragraph("7. Fase do projeto e percentuais", s["h1"]))
    story.append(
        table(
            [
                ["Escopo", "% estimado", "Leitura"],
                ["Fase 0 (MVP documentado)", "75–85%", "Telas, docs e workflows existem; falta uso real estável, testes amplos, CI e sync de schema"],
                ["Produto completo (Fases 0+1+2)", "25–35%", "Financeiro, Instagram, calendário social, portal cliente, RH, relatórios ainda não"],
                ["Pronto para produção diária", "50–60%", "Há dist/ e deploy configs; milestones M4/M5 ainda não validados"],
            ],
            [4.5 * cm, 2.8 * cm, 8.7 * cm],
            s,
        )
    )
    story.append(Spacer(1, 0.35 * cm))
    story.append(Paragraph("7.1 Status Fase 0 (roadmap)", s["h2"]))
    story.append(
        table(
            [
                ["#", "Módulo", "Doc", "Impl", "Testes"],
                ["1", "Autenticação + RBAC", "OK", "OK", "Pendente"],
                ["2", "CRM básico", "OK", "OK", "Pendente"],
                ["3", "Pipeline de projeto", "OK", "OK", "Pendente"],
                ["4", "Atendimento IA (WhatsApp)", "OK", "OK", "OK (utils)"],
                ["5", "Dashboard", "OK", "OK", "Pendente"],
            ],
            [1.2 * cm, 5.5 * cm, 2.5 * cm, 2.5 * cm, 4.3 * cm],
            s,
        )
    )
    story.append(Spacer(1, 0.35 * cm))
    story.append(Paragraph("7.2 Fase 1 (após ~30 dias de uso real)", s["h2"]))
    story.append(
        bullets(
            [
                "Instagram + Messenger (atendimento IA)",
                "Financeiro (mensalidades, fluxo de caixa)",
                "Social media (calendário, aprovação, publicação)",
                "Relatórios",
                "IA interna expandida",
            ],
            s,
        )
    )
    story.append(Paragraph("7.3 Fase 2 (se a operação justificar)", s["h2"]))
    story.append(
        bullets(
            [
                "RH",
                "Automações multi-etapa",
                "Centro de Inteligência",
                "Telegram, Email",
                "Campanhas eleitorais",
            ],
            s,
        )
    )
    story.append(Paragraph("7.4 Indicadores de maturidade", s["h2"]))
    story.append(
        table(
            [
                ["Aspecto", "Status"],
                ["README + docs master + ADRs + módulos", "Forte"],
                ["Código Fase 0 (telas + hooks + edges)", "Implementado"],
                ["Testes Vitest (utils IA/compliance/intent)", "Parcial (7 unitários)"],
                ["CI GitHub Actions", "Ausente"],
                ["Migrations SQL", "Existem (3) — com drift vs runtime"],
                ["Docker full-stack", "Só Evolution"],
                ["Portal web do cliente", "Não implementado"],
                ["Stripe / pagamentos", "Ausente"],
            ],
            [7 * cm, 9 * cm],
            s,
        )
    )

    # —— 8. IA ——
    story.append(Paragraph("8. Integração com agente de IA — vai funcionar?", s["h1"]))
    story.append(
        Paragraph(
            "<b>Sim.</b> A integração cliente → solicitação → fila de design já está no desenho "
            "e parcialmente no código. Esse é o fluxo principal do módulo WhatsApp Agent.",
            s["body"],
        )
    )
    story.append(
        table(
            [
                ["Pergunta", "Resposta"],
                ["O sistema pode rodar?", "Sim, como MVP interno"],
                ["Cliente pede no WhatsApp e o design recebe a tarefa?", "Sim — fluxo principal do agente"],
                ["Já está plug and play em produção?", "Ainda não — falta infra + validação real"],
                ["Portal web do cliente solicitar sozinho?", "Ainda não (só WhatsApp no MVP)"],
                ["Financeiro / Instagram / publicação auto?", "Fase 1+"],
            ],
            [7.5 * cm, 8.5 * cm],
            s,
        )
    )
    story.append(Spacer(1, 0.35 * cm))
    story.append(Paragraph("8.1 Arquivos-chave do agente", s["h2"]))
    story.append(
        bullets(
            [
                "supabase/functions/agent-whatsapp/index.ts",
                "n8n/workflows/whatsapp-agent-operacional.json",
                "src/utils/intentRouter.ts, compliance.ts, aiReply.ts",
                "DOCUMENTATION/05-MODULES/whatsapp-agent.md",
                "Kanban: ProjectsPage + OperationModal + departamentos",
            ],
            s,
        )
    )
    story.append(Paragraph("8.2 Checklist de go-live (ordem sugerida)", s["h2"]))
    story.append(
        bullets(
            [
                "Alinhar schema remoto Supabase ao modelo workspaces/operations",
                "Configurar .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) e secrets das edges",
                "Deploy das Edge Functions (agent-whatsapp, drive-upload, client-onboarding)",
                "Subir Evolution API (Docker) e conectar número comercial dedicado via QR",
                "Subir/importar n8n com whatsapp-agent-operacional.json + chaves Groq",
                "Testar 1 solicitação ponta a ponta até o card aparecer no kanban do design",
                "Piloto com 1–2 clientes; validar compliance (OAB/ANVISA/TSE)",
                "Equipe usar o kanban no dia a dia por algumas semanas (critério de saída Fase 0)",
            ],
            s,
        )
    )

    # —— 9. CAMINHOS ——
    story.append(Paragraph("9. Caminhos importantes", s["h1"]))
    story.append(
        table(
            [
                ["Caminho", "Propósito"],
                ["src/App.tsx", "Rotas da SPA"],
                ["src/contexts/AuthContext.tsx", "Sessão + workspace"],
                ["src/types/database.ts", "Modelo de domínio TypeScript"],
                ["src/pages/*.tsx", "Telas do MVP"],
                ["src/hooks/*.ts", "Dados Supabase"],
                ["supabase/migrations/*.sql", "Schema versionado"],
                ["supabase/functions/*/index.ts", "Backend Deno"],
                ["n8n/workflows/*.json", "Automações WhatsApp"],
                ["evolution/docker-compose.yml", "Stack WhatsApp local"],
                ["DOCUMENTATION/00-MASTER/*.md", "Visão, estratégia, fluxo"],
                ["DOCUMENTATION/01-ADR/*.md", "Isolamento de dados + RAG"],
                ["DOCUMENTATION/ROADMAP.md", "Fases 0–2"],
                [".cursor/rules/*.mdc", "Governança do agente Cursor"],
            ],
            [7 * cm, 9 * cm],
            s,
        )
    )

    # —— 10. CONCLUSÃO ——
    story.append(Paragraph("10. Conclusão", s["h1"]))
    story.append(
        bullets(
            [
                "<b>finance.tt ≠ produto</b> — o sistema é TettoFlow-AI.",
                "App única full-stack BaaS: React SPA + Supabase + n8n/Evolution/Groq/Drive.",
                "Domínio: OS interno de agência (CRM → operations → aprovações → WhatsApp IA).",
                "Fase 0 ~80% em código; produto total ~30%; produção diária segura ~55%.",
                "Cliente solicitar e design produzir: <b>já desenhado e parcialmente implementado</b>.",
                "Próximo passo crítico: go-live controlado (infra + piloto + validação de compliance).",
            ],
            s,
        )
    )
    story.append(Spacer(1, 0.8 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceBefore=4, spaceAfter=10))
    story.append(
        Paragraph(
            "TettoHub · TettoFlow AI OS · Relatório de arquitetura · 04/08/2026",
            s["caption"],
        )
    )

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return OUT


if __name__ == "__main__":
    path = build()
    print(path)
