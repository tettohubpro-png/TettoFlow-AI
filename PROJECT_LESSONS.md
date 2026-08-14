# Memória Operacional — Erros e Aprendizados

## Como consultar este documento
- Pesquise primeiro por módulo, tecnologia, comando, código do erro ou sintoma.
- Priorize lições com status `Vigente` e maior confiança.
- Confirme se a versão e o ambiente ainda correspondem ao projeto atual.

## Índice rápido
| ID | Área | Tipo | Resumo | Status | Última validação |
| --- | --- | --- | --- | --- | --- |
| LES-0001 | Deploy `agent-whatsapp` | Incidente | Placeholder/stub deployado em produção 2x seguidas | Vigente | 2026-08-14 |
| LES-0002 | `agent-whatsapp` webhook | Erro | `fromMe:true` descartado incondicionalmente escondia respostas manuais reais | Vigente | 2026-08-13 |
| LES-0003 | Busca full-text (Postgres) | Erro | `to_tsvector`/query sem `unaccent` não bate texto sem acento | Vigente | 2026-08-14 |
| LES-0004 | Migrations / generated column | Erro | `to_tsvector` não é IMMUTABLE, não pode ir em `generated always as stored` | Vigente | 2026-08-13 |
| LES-0005 | Hermes/Tettolino — few-shot bias | Aprendizado | Histórico de conversa antigo pode fazer o modelo repetir padrão já corrigido no prompt | Vigente | 2026-08-11 |
| LES-0006 | Diagnóstico de bug relatado repetidamente | Aprendizado | Não reafirmar a mesma explicação 2x — reinvestigar com ceticismo na 3ª ocorrência | Vigente | 2026-08-13 |
| LES-0007 | `deno check` baseline | Limitação | ~24 erros pré-existentes de `SupabaseClient<any,"public",any>` não são bugs reais | Vigente | 2026-08-14 |
| LES-0008 | Canva Connect API | Aprendizado | Autofill/edição de elemento exige conta Enterprise; cópia+rename não | Vigente | 2026-08-14 |
| LES-0009 | Cadastro de cliente sem telefone | Erro | Cliente sem `client_contacts` gera duplicidade real quando manda mensagem de novo | Vigente | 2026-08-13 |
| LES-0010 | Ambiente da sessão vs caminho do usuário | Aprendizado | Prompt do usuário pode referenciar ambiente diferente (Windows) do real (Linux) — confirmar antes de agir | Vigente | 2026-08-14 |
| LES-0011 | Tettolino — confirmação pendente | Erro | Ação pendente sem expiração travava TODAS as mensagens seguintes num loop de "não entendi" | Vigente | 2026-08-14 |
| LES-0012 | Atendimento a cliente — fora do horário | Erro | Mensagem de "estamos fechados" ignorava delay/checagem de humano, atropelando resposta real da equipe fora do horário configurado | Vigente | 2026-08-14 |
| LES-0013 | Tettolino — encaminhar imagem | Erro | Foto sem legenda pro operador era descartada silenciosamente (nunca chegava); busca+envio sequencial de várias imagens quebrava a resposta inteira sem cair no catch | Vigente | 2026-08-14 |

## Regras preventivas consolidadas

### LES-0001 — Deploy de `agent-whatsapp` sem verificação byte a byte causou 2 incidentes de produção
- **Status:** Vigente
- **Tipo:** Incidente
- **Severidade:** Crítica
- **Área/módulo:** `supabase/functions/agent-whatsapp/index.ts` (arquivo grande, ~3200 linhas)
- **Tecnologia/versão:** Supabase Edge Functions (Deno), deploy via MCP `deploy_edge_function`
- **Ambiente:** produção (projeto Supabase `lniinjegcvdcrmsrzqkt`)
- **Primeira ocorrência:** anterior ao início do histórico coberto por esta auditoria (relatada
  pelo usuário/sessão anterior, não presenciada diretamente nesta sessão)
- **Última ocorrência:** não recorreu durante esta sessão (processo abaixo em uso desde então)
- **Última validação:** 2026-08-14 (deploy v42, verificado)
- **Sintoma:** código placeholder/stub foi enviado pro `agent-whatsapp` de produção, quebrando
  o atendimento real.
- **Contexto:** transcrição manual de um arquivo muito grande direto no parâmetro de uma
  chamada de ferramenta de deploy — risco de erro humano/do agente ao "digitar de memória"
  um arquivo de milhares de linhas.
- **Impacto:** bot de produção respondendo com conteúdo incorreto/quebrado.
- **Causa raiz:** o conteúdo enviado ao deploy não era lido fresco do disco imediatamente
  antes do envio — havia divergência entre o que existia localmente (correto) e o que foi
  de fato transmitido (placeholder).
- **Tentativas que falharam:** confiar em memória de contexto da conversa pra reconstruir o
  conteúdo do arquivo no momento do deploy.
- **Solução aplicada:** processo obrigatório de deploy: (1) ler o arquivo fonte do disco
  imediatamente antes do deploy (nunca de memória), (2) enviar o conteúdo lido, (3) buscar de
  volta o que foi de fato implantado via `get_edge_function`, (4) comparar via `diff` +
  `md5sum` contra o arquivo fonte, (5) só considerar o deploy concluído com "MATCH" exato.
  Pra arquivos grandes, delegar a um subagente com instruções passo a passo explícitas
  reduz o risco de a leitura ser truncada/resumida no meio do processo.
- **Validação da solução:** usado em ~10+ deploys consecutivos nesta sessão
  (`agent-whatsapp` v36 até v42, `flush-pending-replies`, `manage-team`, `drive-upload`)
  sem nenhum mismatch sobrevivendo à verificação.
- **Regra preventiva:** nunca considerar um deploy de edge function concluído sem ter rodado
  `diff`/`md5sum` entre o arquivo fonte local e o conteúdo buscado de volta do Supabase. Pra
  arquivos grandes (>1500 linhas), delegar o deploy+verificação a um subagente com
  instruções explícitas de ler do disco, não de memória.
- **Quando esta regra se aplica:** qualquer deploy de edge function em produção, especialmente
  arquivos grandes ou quando o contexto da conversa já está longo (mais chance de resumo/
  paráfrase acidental).
- **Quando não se aplica:** mudanças triviais de 1-2 linhas ainda merecem o mesmo cuidado —
  não há exceção segura conhecida.
- **Riscos da solução:** verificação consome tempo/tokens extra por deploy; aceito como custo
  necessário dado o histórico de incidente.
- **Skills relacionadas:** SKL-0002 (Supabase MCP / edge functions)
- **Referências:** commits com "Deploy vNN verificado byte a byte" nas mensagens (ex:
  `19cbc75`, `b9ffb74`, `c459d95`, `3fb1f26`, `cc7f1d9`).
- **Confiança:** Alta

### LES-0002 — `fromMe:true` descartado incondicionalmente escondia respostas manuais reais da equipe
- **Status:** Vigente
- **Tipo:** Erro
- **Severidade:** Alta
- **Área/módulo:** `agent-whatsapp` — `normalizePayload`, detecção de resposta humana
- **Tecnologia/versão:** Evolution API webhook (`MESSAGES_UPSERT`)
- **Primeira ocorrência:** não determinada (código original)
- **Última ocorrência:** 2026-08-13 (diagnosticada e corrigida)
- **Última validação:** 2026-08-13, teste ponta a ponta
- **Sintoma:** usuário relatou 3 vezes seguidas "a IA ainda responde rápido, não dá tempo da
  secretária responder", mesmo após ajustes de delay e janela de detecção de humano ativo.
- **Contexto:** o webhook da Evolution API dispara `MESSAGES_UPSERT` também pra mensagens que
  SAEM da conta da agência (`key.fromMe: true`) — tanto ecos do próprio bot quanto respostas
  reais digitadas por um humano direto no app do WhatsApp (não pelo compositor do CRM).
- **Impacto:** o sistema nunca via respostas manuais reais (só as mandadas pelo CRM), então a
  checagem "humano já respondeu" nunca disparava pra elas — a IA respondia por cima mesmo
  quando alguém já tinha atendido manualmente.
- **Causa raiz:** `if (key.fromMe) return skip` descartava toda mensagem `fromMe` sem
  distinguir eco de resposta real.
- **Tentativas que falharam:** ajustar só o tempo de delay (90s→45s) e a janela de detecção de
  "equipe ativa" (até 15min) — resolviam sintomas parecidos mas não a causa raiz; o usuário
  continuou reportando o mesmo problema porque a causa real não tinha sido tocada.
- **Solução aplicada:** guardar `evolution_message_id` em toda mensagem que o próprio sistema
  manda; ao receber um evento `fromMe:true`, comparar o `messageId` recebido com os
  armazenados — se bate, é eco (ignora); se não bate, é resposta manual real, loga como
  `outbound`/`is_ai:false` na conversa correta.
- **Validação da solução:** teste ponta a ponta com cliente fictício — resposta manual
  simulada foi logada corretamente e a resposta pendente da IA foi cancelada (`skipped`); eco
  com `messageId` conhecido não duplicou.
- **Regra preventiva:** ao investigar "a IA não está esperando o humano", verificar se TODOS
  os canais pelos quais um humano pode responder (CRM, WhatsApp direto, outro app) estão
  sendo capturados pelo sistema de detecção — não assumir que só o canal "oficial" (CRM) é
  usado na prática.
- **Quando esta regra se aplica:** qualquer lógica de "detectar se um humano já agiu" baseada
  em eventos de um sistema externo (webhook) que pode ter múltiplas origens (bot vs. humano)
  indistinguíveis à primeira vista.
- **Skills relacionadas:** SKL-0002
- **Referências:** commit `19cbc75`.
- **Confiança:** Alta

### LES-0003 — Busca full-text sem `unaccent` falha com mensagem digitada sem acento
- **Status:** Vigente
- **Tipo:** Erro
- **Severidade:** Média
- **Área/módulo:** `knowledge_base`, função `search_knowledge_base`
- **Tecnologia/versão:** Postgres `tsvector`/`websearch_to_tsquery('portuguese', ...)`
- **Primeira ocorrência:** 2026-08-13, durante teste real da feature nova
- **Última ocorrência:** mesma data, corrigida no mesmo dia
- **Última validação:** 2026-08-14
- **Sintoma:** consulta direta via SQL com texto sem acento (`edicao`, `video`) não batia
  com conteúdo armazenado com acento (`edição`, `vídeo`) — resultado vazio quando deveria
  achar a entrada.
- **Contexto:** validação da busca da base de conhecimento usando um fato propositalmente
  inventado ("37 dias e meio") pra garantir que a resposta vinha da busca e não do modelo
  chutando.
- **Impacto:** cliente/equipe digitando sem acento no WhatsApp (comum) não encontraria
  conteúdo cadastrado corretamente acentuado.
- **Causa raiz:** `to_tsvector`/`websearch_to_tsquery` com o dicionário `portuguese` faz
  stemming sensível a acento — `edicao` e `edição` geram lexemas diferentes.
- **Tentativas que falharam:** nenhuma tentativa alternativa testada antes de identificar a
  causa — o teste com fato inventado já isolou o problema rapidamente.
- **Solução aplicada:** extensão `unaccent` (schema `extensions`) aplicada nos dois lados —
  no conteúdo indexado (trigger `knowledge_base_update_fts`) e na query (`search_knowledge_base`
  usa `extensions.unaccent(p_query)`).
- **Validação da solução:** mesmo teste (fato inventado "37 dias e meio") repetido com
  mensagem sem acento após o fix — encontrou corretamente.
- **Regra preventiva:** ao implementar busca full-text em português (ou qualquer idioma
  acentuado) que vai receber texto digitado por usuário real (WhatsApp, formulário livre),
  sempre aplicar `unaccent` nos dois lados (índice e query) desde o início — não assumir que
  o dicionário do Postgres já normaliza acento.
- **Quando esta regra se aplica:** qualquer nova busca full-text em conteúdo textual livre
  digitado por humanos.
- **Riscos da solução:** `unaccent()` é STABLE, não IMMUTABLE — não pode ir direto em
  `generated column`, precisa de trigger (ver LES-0004).
- **Skills relacionadas:** SKL-0003
- **Referências:** migration `20260814000000_knowledge_base_unaccent_search.sql`, commit
  `c459d95`.
- **Confiança:** Alta

### LES-0004 — `to_tsvector` não é IMMUTABLE, não funciona em `generated always as stored`
- **Status:** Vigente
- **Tipo:** Erro
- **Severidade:** Baixa (rápido de contornar uma vez conhecido)
- **Área/módulo:** migration `knowledge_base` (coluna `fts`)
- **Tecnologia/versão:** Postgres (versão do projeto Supabase, 17.6.1 confirmado nesta sessão)
- **Primeira ocorrência:** 2026-08-13, primeira tentativa de migration da `knowledge_base`
- **Última ocorrência:** mesma data
- **Última validação:** 2026-08-13
- **Sintoma:** `ERROR: 42P17: generation expression is not immutable` ao tentar criar
  `fts tsvector generated always as (to_tsvector(...)) stored`, mesmo usando
  `'portuguese'::regconfig` explícito.
- **Contexto:** criação da tabela `knowledge_base` com busca full-text.
- **Causa raiz:** `to_tsvector(regconfig, text)` é marcado `STABLE`, não `IMMUTABLE`, no
  catálogo do Postgres — mesmo com o argumento de configuração fixo, porque depende de
  dicionários que teoricamente podem ser alterados em runtime.
- **Tentativas que falharam:** `to_tsvector('portuguese'::regconfig, ...)` (cast explícito
  pra regconfig) — ainda rejeitado pelo mesmo motivo.
- **Solução aplicada:** trocar `generated column` por uma coluna `tsvector` normal + trigger
  `before insert or update` que calcula e atribui `new.fts` manualmente.
- **Validação da solução:** migration aplicada com sucesso; índice GIN funcionando.
- **Regra preventiva:** nunca tentar `to_tsvector`/`unaccent`/funções de busca textual direto
  numa `generated column` no Postgres — usar sempre coluna normal + trigger.
- **Quando esta regra se aplica:** qualquer coluna derivada de busca full-text
  (`tsvector`) que dependa de normalização de texto.
- **Skills relacionadas:** SKL-0001
- **Referências:** migration `20260813160000_knowledge_base.sql`.
- **Confiança:** Alta

### LES-0005 — Histórico de conversa antigo pode enviesar o modelo a repetir um padrão já corrigido
- **Status:** Vigente
- **Tipo:** Aprendizado
- **Severidade:** Média
- **Área/módulo:** Tettolino/Hermes — `hermes_messages` (memória de curto prazo)
- **Tecnologia/versão:** Claude Sonnet 5 via Anthropic Messages API, tool-calling
- **Primeira ocorrência:** 2026-08-11
- **Última ocorrência:** mesma data
- **Última validação:** 2026-08-11
- **Sintoma:** `send_message` continuava pedindo confirmação em texto ("Confirma? Responda
  sim ou não") mesmo depois do `system prompt` ser corrigido pra dizer que a ferramenta deve
  ser chamada imediatamente, sem confirmação.
- **Contexto:** regra nova adicionada ao `system prompt`, mas o comportamento antigo
  persistia.
- **Causa raiz:** as últimas ~20 mensagens de `hermes_messages` (poucos-shots de exemplo,
  injetadas no histórico da conversa) continham vários exemplos do padrão antigo ("Confirma?
  Responda sim ou não") — o modelo imitava o precedente do próprio histórico mesmo com a
  regra nova no prompt.
- **Tentativas que falharam:** só reforçar o texto da regra no `system prompt`, sem tocar no
  histórico — não foi suficiente sozinho.
- **Solução aplicada:** (a) reforçar a regra no `system prompt` explicitando que ela
  substitui qualquer precedente do histórico ("mesmo que o histórico mostre você tendo
  perguntado isso antes, esse comportamento mudou"), e (b) limpar `hermes_messages` pra
  remover os exemplos enviesadores.
- **Validação da solução:** comportamento corrigido após as duas mudanças juntas.
- **Regra preventiva:** ao mudar uma regra de comportamento de um agente com memória
  conversacional persistente, considerar que o histórico antigo pode conter exemplos do
  comportamento errado — ou limpar o histórico, ou instruir explicitamente o modelo a
  ignorar precedente do histórico nesse ponto específico.
- **Quando esta regra se aplica:** qualquer mudança de comportamento num agente que usa
  histórico de conversa como parte do contexto (few-shot implícito).
- **Skills relacionadas:** SKL-0004
- **Referências:** commits `9ae38af`, `06cd586`.
- **Confiança:** Alta

### LES-0006 — Não reafirmar a mesma explicação 2x quando o usuário repete a reclamação — reinvestigar
- **Status:** Vigente
- **Tipo:** Aprendizado
- **Severidade:** Média
- **Área/módulo:** processo de diagnóstico, não específico de um módulo técnico
- **Primeira ocorrência:** 2026-08-13
- **Última validação:** 2026-08-13
- **Sintoma:** usuário reportou "a IA ainda responde rápido" 3 vezes seguidas. Nas duas
  primeiras, a explicação dada (ele estava testando pelo próprio número de operador, que
  roteia pro Tettolino, sempre instantâneo por design) era verdadeira mas incompleta — havia
  uma causa raiz adicional real (LES-0002) que só foi investigada na 3ª repetição.
- **Causa raiz do diagnóstico incompleto:** aceitar a primeira explicação plausível como
  suficiente e reafirmá-la quando o sintoma se repete, em vez de tratar a repetição como
  sinal de que a explicação anterior não cobre o caso todo.
- **Solução aplicada:** na 3ª ocorrência, reinvestigar com mais ceticismo em vez de repetir a
  mesma explicação — isso revelou o bug real do `fromMe` (LES-0002).
- **Regra preventiva:** quando um usuário relata o MESMO sintoma pela 2ª ou 3ª vez após uma
  explicação/correção já ter sido dada, tratar isso como sinal forte de causa raiz adicional
  não coberta — reinvestigar do zero em vez de reafirmar a explicação anterior.
- **Quando esta regra se aplica:** qualquer relato repetido do mesmo sintoma pelo usuário,
  mesmo que a explicação anterior pareça correta.
- **Confiança:** Alta

### LES-0007 — Baseline de ~24 erros de `deno check` em `agent-whatsapp` não são bugs funcionais
- **Status:** Vigente
- **Tipo:** Limitação
- **Severidade:** Baixa
- **Área/módulo:** `supabase/functions/agent-whatsapp/index.ts`
- **Tecnologia/versão:** Deno, TypeScript, `@supabase/supabase-js` 2.49.1
- **Última validação:** 2026-08-14 (24 erros, ver `deno check index.ts`)
- **Sintoma:** `deno check` sempre reporta uma dúzia de erros do tipo
  `Argument of type 'SupabaseClient<any, "public", any>' is not assignable to parameter of
  type 'SupabaseClient<unknown, never, GenericSchema>'`.
- **Causa raiz:** padrão sistêmico de tipagem solta em toda função auxiliar que recebe
  `supabase: ReturnType<typeof createClient>` como parâmetro — não é um bug de lógica, é
  incompatibilidade estrutural de generics do client Supabase sem tipos gerados do schema.
- **Solução aplicada:** nenhuma correção definitiva — aceito como baseline conhecido.
  Verificação usada a cada mudança: comparar a contagem de erros ANTES (`git show
  HEAD:<arquivo> | deno check`) e DEPOIS da mudança — se a diferença for só +1/+2 do mesmo
  padrão `SupabaseClient<...>`, é seguro; se aparecer um erro de tipo diferente
  (ex: `Property 'length' does not exist on type '{}'`), é bug real introduzido pela mudança
  e precisa ser corrigido antes do deploy.
- **Regra preventiva:** nunca usar "zero erros" como critério de aceite pra esse arquivo —
  usar "mesma contagem do baseline + no máximo N novas instâncias do padrão
  `SupabaseClient<any,"public",any>`" como critério, e investigar qualquer erro de tipo
  diferente antes de deployar.
- **Quando esta regra se aplica:** toda mudança em `agent-whatsapp/index.ts` (e
  provavelmente nas outras edge functions com o mesmo padrão de client).
- **Skills relacionadas:** SKL-0002
- **Confiança:** Alta

### LES-0008 — API do Canva: edição automática de elemento exige Enterprise; cópia+rename não
- **Status:** Vigente
- **Tipo:** Aprendizado
- **Severidade:** Média
- **Área/módulo:** Integração Canva (planejada — automação de nota de pesar)
- **Primeira ocorrência:** 2026-08-14
- **Última validação:** 2026-08-14 (consulta à documentação oficial via WebFetch)
- **Sintoma:** usuário queria trocar nome/foto dentro de um design automaticamente; o menu do
  Canva dele não mostrava a opção "Modelos de marca" (Brand Templates) — só "Salvar como
  modelo" (recurso diferente, sem campos nomeados pra API).
- **Causa raiz confirmada:** a API de Autofill do Canva (`create_from_brand_template`,
  `create_from_design` com campos, `update_design`) exige que a integração atue em nome de
  um usuário membro de uma organização Canva **Enterprise**. Sem isso, não há endpoint
  público pra editar elementos de um design existente.
- **O que FUNCIONA sem Enterprise:** `POST /v1/designs` com `type: "design"` e um
  `design_id` de origem cria uma cópia, e aceita `title` na mesma chamada — ou seja,
  copiar+renomear um design existente é possível no plano padrão (recurso listado como
  "Preview Feature" na doc, mas sem menção de exigência de Enterprise).
- **Solução aplicada:** desenhar a automação em duas camadas — copiar+renomear
  automaticamente (viável) e deixar a edição de conteúdo (nome/foto) manual, em vez de
  prometer uma automação completa que o plano do cliente não suporta.
- **Regra preventiva:** antes de prometer qualquer automação via API de terceiro
  (Canva, Google, etc.) que envolva edição de conteúdo existente, verificar nos docs oficiais
  se há exigência de plano/tier específico — não assumir que "a API existe" significa "está
  disponível no plano do cliente".
- **Quando esta regra se aplica:** qualquer integração nova com API de SaaS de terceiro que
  tenha tiers de plano.
- **Referências:** `https://www.canva.dev/docs/connect/api-reference/autofills/create-design-autofill-job/`,
  `https://www.canva.dev/docs/connect/api-reference/designs/create-design/`.
- **Confiança:** Alta (confirmado direto na documentação oficial, não inferido)

### LES-0009 — Cliente ativo sem telefone cadastrado gera duplicidade real quando manda mensagem de novo
- **Status:** Vigente
- **Tipo:** Erro
- **Severidade:** Alta
- **Área/módulo:** `resolveClient` (`agent-whatsapp`), `client_contacts`
- **Primeira ocorrência:** não determinada (dados legados)
- **Última ocorrência:** confirmada em 2026-08-13 (achado real na base, "Barbearia Bom Corte"
  duplicada: um registro ACTIVE sem telefone e um lead separado criado pelo bot)
- **Última validação:** 2026-08-13
- **Sintoma:** cliente já cadastrado como ACTIVE manda mensagem de novo e o sistema não
  reconhece — cria um lead novo do zero, rodando qualificação de vendas nele.
- **Causa raiz:** `resolveClient` busca por telefone em `client_contacts` — se o cliente não
  tem nenhum contato cadastrado com telefone, a busca sempre falha, mesmo que o cliente já
  exista.
- **Impacto:** duplicidade de cadastro, retrabalho, experiência ruim pro cliente (é tratado
  como desconhecido).
- **Solução aplicada:** nenhuma correção de código (o comportamento de `resolveClient` está
  correto — o problema é dado ausente); recomendação registrada em `PROJECT_CONTEXT.md`
  pra cadastrar telefone dos 13 clientes ativos identificados sem contato.
- **Regra preventiva:** ao investigar duplicidade de cliente, checar primeiro se o cliente
  "duplicado" tem `client_contacts` cadastrado — a causa mais provável é ausência de
  telefone, não um bug de lógica.
- **Quando esta regra se aplica:** qualquer investigação de cliente duplicado/não
  reconhecido no atendimento automático.
- **Confiança:** Alta

### LES-0010 — Prompt do usuário pode referenciar um ambiente diferente do real da sessão
- **Status:** Vigente
- **Tipo:** Aprendizado
- **Severidade:** Média
- **Área/módulo:** processo geral, não específico de código
- **Primeira ocorrência:** 2026-08-14
- **Última validação:** 2026-08-14
- **Sintoma:** usuário pediu pra criar uma pasta em `C:\Projetos` (caminho Windows) e um novo
  repositório GitHub "com o mesmo nome", numa sessão que roda em ambiente Linux e já opera
  num repositório existente (`tettohubpro-png/TettoFlow-AI`, já clonado, commitado e
  sincronizado).
- **Contexto:** o usuário colou um prompt-template (provavelmente reaproveitado de outra
  sessão/ambiente, possivelmente uma instância local no Windows) sem adaptar ao contexto
  desta sessão.
- **Causa raiz:** instrução genérica reaproveitada entre ambientes diferentes sem ajuste.
- **Solução aplicada:** identificar o descompasso (caminho Windows inacessível + repo já
  existente) e perguntar ao usuário antes de criar pasta/repositório novo, em vez de
  executar cegamente ou ignorar a instrução silenciosamente.
- **Regra preventiva:** quando uma instrução do usuário referenciar um caminho de sistema de
  arquivos, sistema operacional ou recurso (ex: repositório) incompatível com o ambiente
  real da sessão, ou redundante com algo que já existe, parar e confirmar a intenção antes
  de agir — não presumir nem ignorar.
- **Quando esta regra se aplica:** qualquer instrução que mencione caminhos, SOs, ou criação
  de recursos externos (repositórios, pastas) que pareçam não bater com o ambiente
  observável da sessão atual.
- **Confiança:** Alta

### LES-0011 — Ação pendente sem expiração travava toda mensagem seguinte num loop de "não entendi"
- **Status:** Vigente
- **Tipo:** Erro
- **Severidade:** Alta
- **Área/módulo:** `agent-whatsapp` — `handleHermesMessage`, `handlePendingConfirmation`,
  tabela `agent_actions_log`
- **Primeira ocorrência:** não determinada (mecanismo existia desde a implementação
  original do Hermes, 2026-08-11)
- **Última ocorrência:** 2026-08-14, confirmada em dados reais de produção (usuário
  mandou "ainda tem mais, nao se preocupe..." e "precisa aprender o quanto antes" e
  recebeu a mesma resposta engessada duas vezes seguidas)
- **Última validação:** 2026-08-14, teste real via webhook simulando o mesmo padrão
- **Sintoma:** usuário reportou (com print) o Tettolino respondendo "Não entendi.
  Confirma essa ação? Responda sim ou não." de forma **idêntica** 4 vezes seguidas pra
  mensagens completamente diferentes entre si.
- **Contexto:** usuário dava uma instrução que gerava uma ação de escrita pendente
  (ex: create_task), e todas as mensagens seguintes — mesmo sendo sobre assuntos
  diferentes, inclusive recados pra outra pessoa da equipe — eram capturadas pela
  checagem de "tem pendência? então isso deve ser sim/não" e não pela conversa normal.
- **Causa raiz:** `handleHermesMessage` busca por qualquer linha em
  `agent_actions_log` com `status='pending_confirmation'` pro operador; se existir,
  TODA mensagem seguinte passa por `interpretConfirmation` (regex estrita) antes de
  qualquer outra coisa. Se não bater com sim/não, `handlePendingConfirmation` retornava
  um texto FIXO repetido, sem limite de tentativas nem expiração — travando a conversa
  indefinidamente até o usuário digitar literalmente algo que combine com a regex.
- **Impacto:** usuário ficava "preso" numa conversa que não avançava, tinha que digitar
  exatamente "sim"/"não" pra escapar, mesmo quando claramente tinha mudado de assunto.
- **Tentativas que falharam:** nenhuma tentada antes desta — o bug não tinha sido
  diagnosticado até então (relatos anteriores do usuário foram interpretados como pedido
  de ajuste de comportamento geral, não como um bug de estado travado).
- **Solução aplicada:** quando `interpretConfirmation` retorna `'unclear'`, a ação
  pendente é marcada como `'superseded'` (novo status, adicionado ao check constraint) e
  a mensagem é processada normalmente pelo fluxo do Tettolino (com tool-calling completo)
  em vez de repetir o texto fixo. O histórico recente de conversa ainda dá contexto pro
  modelo, então se o usuário só reformulou o mesmo pedido, ele percebe e propõe de novo.
- **Validação da solução:** teste real via webhook — mensagem "unclear" após uma
  pendência não repetiu o texto fixo, foi processada como pedido novo (buscou na base de
  conhecimento, e re-propôs a ação original com nova confirmação, já que o contexto
  ainda era relevante); confirmado no banco que a ação antiga ficou `superseded` e uma
  nova `pending_confirmation` foi criada.
- **Regra preventiva:** qualquer mecanismo de "estado pendente que bloqueia a próxima
  mensagem" (confirmação, formulário multi-passo, etc.) precisa ter uma saída que não
  dependa só do usuário acertar o formato exato esperado — supere a pendência quando a
  mensagem não bater com o formato esperado, em vez de repetir a mesma cobrança
  indefinidamente.
- **Quando esta regra se aplica:** qualquer fluxo conversacional com estado pendente
  (confirmações, wizards, coleta de dados em etapas).
- **Skills relacionadas:** SKL-0004
- **Referências:** migration `20260814090000_agent_actions_log_superseded_status.sql`.
- **Confiança:** Alta (reproduzido e corrigido, com evidência de dados reais de produção
  mostrando o bug acontecendo antes do fix)

### LES-0012 — Mensagem de "estamos fechados" atropelava resposta real da equipe fora do horário
- **Status:** Vigente
- **Tipo:** Erro
- **Severidade:** Alta
- **Área/módulo:** `agent-whatsapp` — fluxo principal e fluxo de lead-intake (branch
  `!withinHours`)
- **Primeira ocorrência:** não determinada (existia desde a introdução do delay de 90s,
  `c1c4d35`, 2026-08-12)
- **Última ocorrência:** confirmada em dados reais de produção em 2026-08-14 (conversa
  com "AM Consultoria" — funcionária respondendo ao vivo às 20h08/20h12, e no meio dessa
  troca real o bot mandou a mensagem de horário de atendimento por cima)
- **Última validação:** 2026-08-14
- **Sintoma:** usuário reportou "o fluxo de resposta ainda não está fazendo sentido" sem
  print desta vez — investigado direto nos dados reais em vez de pedir mais detalhes
  (aplicando LES-0006).
- **Contexto:** fora do horário comercial configurado (8h30-12h/14h-17h, seg-sex), o
  código mandava a mensagem "estamos fechados" IMEDIATAMENTE, sem o delay de 90s nem a
  checagem de "humano já respondeu" que o fluxo dentro do horário já tinha.
- **Causa raiz:** a suposição original ("fora do horário ninguém da equipe vai responder
  mesmo, então não faz sentido esperar" — comentário literal que estava no código) era
  falsa na prática: dados reais mostram a equipe respondendo clientes fora do horário
  configurado com frequência.
- **Impacto:** cliente recebia a mensagem automática de "fora do horário" por cima de uma
  conversa que um humano já estava conduzindo ativamente — parecia (e era) um bug de
  verdade, não só uma questão de tempo de espera.
- **Solução aplicada:** unificado o fluxo — a resposta (seja o texto gerado normalmente
  ou a mensagem de horário) sempre passa por `scheduleDeferredReply`/
  `pending_bot_replies`, dentro ou fora do horário. Removido o branch que mandava
  direto via `sendEvolutionText` fora do horário.
- **Validação da solução:** `deno check` sem erro novo (na verdade caiu de 24 pra 22,
  já que menos pontos de chamada geram menos instâncias do padrão sistêmico). Teste real
  confirmou que a mensagem fica em `pending_bot_replies` com delay de 90s
  independente do horário (testado dentro do horário — o código não tem mais branch
  condicional pro caminho de envio, então vale igual pros dois casos por construção).
  Deploy v44 verificado byte a byte.
- **Regra preventiva:** desconfiar de comentários/suposições no código do tipo "fora
  desse horário/condição, ninguém vai fazer X mesmo" — validar contra dados reais antes
  de usar isso pra pular uma proteção (delay, checagem, etc.).
- **Quando esta regra se aplica:** qualquer lógica condicional que pula uma proteção
  (delay, confirmação, checagem) baseada numa suposição sobre quando humanos estão
  "disponíveis" ou "não vão agir".
- **Skills relacionadas:** SKL-0002
- **Referências:** commit a ser criado nesta tarefa.
- **Confiança:** Alta (evidência direta em dados reais de produção, não inferência)

### LES-0013 — Foto sem legenda pro operador era descartada; envio sequencial de várias imagens quebrava a resposta
- **Status:** Vigente
- **Tipo:** Erro
- **Severidade:** Crítica (bloqueava uma necessidade real e urgente do dono da agência)
- **Área/módulo:** `agent-whatsapp` — `normalizePayload`, `handleHermesMessage`,
  `executeWriteTool('send_message')`
- **Primeira ocorrência:** 2026-08-14 (uso real — dono tentou mandar 2 fotos de vaga de
  emprego pro cliente "AM Consultoria" e falhou 4 vezes seguidas)
- **Última validação:** 2026-08-14, testado com sucesso após as duas correções
- **Sintoma 1:** Tettolino respondia "não consigo enviar imagens/não recebi nenhuma
  imagem" pra TODO pedido de encaminhar foto, mesmo depois de uma feature de
  encaminhamento de imagem já estar implantada (v45).
- **Causa raiz 1:** WhatsApp manda várias fotos selecionadas juntas como mensagens
  SEPARADAS, a maioria (ou todas) sem legenda — só a legenda visual da UI parece estar
  "junto" da foto, mas tecnicamente chega como mensagem de texto puro depois. O código só
  deixava passar imagem sem legenda em GRUPO (`hasImage && isGroup`); no 1:1 com o
  operador, a foto sem legenda batia no `{kind:'skip'}` e nunca chegava nem a ser
  processada — confirmado nos logs (chamadas de ~100ms, rápido demais pra terem passado
  pelo LLM). Além disso, mesmo se a imagem chegasse, o modelo não tinha nenhum sinal
  explícito de que uma imagem existia (só via na hora de chamar a ferramenta), e o
  histórico de conversa (`hermes_messages`) já tinha 4 negações anteriores reforçando o
  padrão errado (viés de few-shot, mesma classe do LES-0005).
- **Solução aplicada 1:** `normalizePayload` deixa passar QUALQUER imagem (grupo ou 1:1)
  mesmo sem legenda. Nova tabela `operator_pending_media`: foto sem legenda pro operador
  vira uma "mídia pendente" (fila), confirmada com uma resposta rápida sem gastar chamada
  de LLM; quando uma mensagem de texto puro chega depois, `resolveOperatorMediaContext`
  busca as fotos pendentes dos últimos 5min e as anexa como contexto pro `send_message`.
  Histórico enviesado (`hermes_messages`) limpo manualmente.
- **Sintoma 2 (achado testando a correção 1):** com a fila de mídia funcionando, ao
  tentar encaminhar 2 imagens de uma vez, a resposta inteira quebrava ("Deu ruim aqui do
  meu lado processando seu pedido"), SEM cair em nenhum catch nem registrar nada em
  `agent_actions_log` — indicando que a function morria no meio, provavelmente por tempo
  de execução (busca de cada imagem tinha timeout de até 8s, em SÉRIE pra cada imagem,
  somado à chamada da IA).
- **Causa raiz 2:** loop sequencial (`for` com `await` dentro) pra buscar+mandar cada
  imagem, sem proteção de try/catch ao redor do loop inteiro.
- **Solução aplicada 2:** loop trocado por `Promise.all` (busca+envio de todas as imagens
  em paralelo, não em série) e todo o bloco envolto em try/catch — qualquer falha aqui
  agora cai pra texto puro em vez de derrubar a resposta inteira.
- **Validação da solução:** testado com 2 mensagens de imagem sem legenda (message IDs
  fictícios, propositalmente inválidos) seguidas de uma instrução de texto — antes da
  correção 2, quebrava com "Deu ruim"; depois, respondeu corretamente "as imagens
  falharam no envio" (esperado, já que os IDs eram fictícios) sem derrubar a resposta.
  Deploy v46 (correção 1) e v47 (correção 2) verificados byte a byte.
- **Regra preventiva:** (a) nunca assumir que "legenda + mídia" chegam sempre juntas no
  mesmo evento de webhook — testar o caso de mídia separada da legenda. (b) qualquer loop
  que faz I/O externo (rede) por item de uma lista deve rodar em paralelo
  (`Promise.all`) quando a ordem não importa, e sempre envolto em try/catch — não deixar
  uma falha de rede em UM item derrubar a operação inteira sem fallback.
- **Quando esta regra se aplica:** qualquer feature nova envolvendo mídia do WhatsApp
  (recebimento ou envio), e qualquer loop com chamadas de rede por item.
- **Skills relacionadas:** SKL-0002, SKL-0004
- **Referências:** commit a ser criado nesta tarefa; migration
  `20260814200000_operator_pending_media.sql`.
- **Confiança:** Alta (reproduzido, corrigido e revalidado em produção)

## Registro rápido durante a tarefa

Nenhuma lição em status `Em investigação` no momento desta linha de base.

## Aprendizados positivos

- **Processo de deploy com verificação byte a byte (LES-0001)** — usado consistentemente
  desde sua adoção, zero incidentes de deploy quebrado no restante desta sessão. Marcar como
  `Solução comprovada`.
- **Teste com fato propositalmente inventado** (ex: "37 dias e meio" pra validar
  `search_knowledge_base`) — método eficaz pra provar que uma resposta vem de fato de uma
  busca/fonte de dados, e não de o modelo "chutar" algo plausível. Reutilizável pra validar
  qualquer feature de RAG/busca. Marcar como `Solução comprovada`.
- **Simular webhook real via `curl` direto no endpoint da edge function** (em vez de só
  revisão de código) pra validar lógica de grupo/detecção — usado com sucesso nos testes de
  `INTERNAL_GROUP_JIDS`, `fromMe`, `search_team`, `search_knowledge`. Marcar como `Solução
  comprovada`.
