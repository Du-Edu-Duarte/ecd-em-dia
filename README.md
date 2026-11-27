# ECD Em Dia

Sistema da ECD Tecnologia para um professor de treino cadastrar alunos e cobrar mensalidades.
HTML, CSS e JavaScript puro, publicado no GitHub Pages.

## Estrutura

```
ecd-em-dia/
├── index.html        página única: topo, menus e área onde as telas aparecem
├── css/
│   └── estilo.css    visual ECD, mobile first (celular primeiro, computador no fim)
├── firestore.rules   regras de segurança do Firestore (quem pode ler e gravar o quê)
├── firebase.json     diz ao Firebase CLI onde estão as regras
├── js/
│   ├── config.js     nome do sistema, cores, e-mail do administrador e campos extras do cadastro
│   ├── firebase-config.js  dados públicos do projeto Firebase (não é senha)
│   ├── servicos/
│   │   ├── envio.js  monta a mensagem e o link do WhatsApp e registra cada envio (fase 2: envio automático)
│   │   ├── pagamento.js  de onde vem o {link} da mensagem (fase 1: dados do professor; fase 2: meio de pagamento)
│   │   ├── dados.js  ler, gravar e "ouvir" os dados do professor (sincroniza celular e computador)
│   │   └── acesso.js login, cadastro, confirmação de e-mail, aprovação (único arquivo que fala com o Firebase Auth)
│   ├── regras/
│   │   ├── turmas.js dias da semana, validação, dias por semana e treinos no mês (só cálculo)
│   │   ├── alunos.js WhatsApp, CPF, valor em R$, validação, busca e ocupação das turmas
│   │   ├── mensalidades.js vencimento (31 em fevereiro), situação, geração, pagamentos, multa e juros
│   │   ├── mensagens.js textos padrão dos lembretes (D-5, D-1, no dia, atraso) e troca das variáveis
│   │   ├── painel.js cartões, filtros por aluno e próximos vencimentos do Painel
│   │   ├── relatorios.js recebido x a receber, inadimplência, alunos por turma e a planilha CSV
│   │   └── cobrancas.js quem cobrar hoje (régua D-5, D-1, no dia, atraso) e se já foi enviado
│   ├── telas/
│   │   ├── painel.js tela inicial: cartões do mês, alunos com filtros e próximos vencimentos
│   │   ├── relatorios.js tela Relatórios do mês, com planilha (Excel) e PDF
│   │   ├── primeiro-acesso.js guia de 8 passos (abre sozinho na 1ª vez) e como instalar no celular
│   │   ├── aulas.js  tela Aulas e horários
│   │   ├── alunos.js tela Alunos: lista, ficha, novo e editar (#/alunos, #/alunos/ID, #/alunos/ID/editar)
│   │   ├── mensalidades.js tela Mensalidades: mês, resumo, filtros e registrar pagamento
│   │   ├── ajustes.js tela Ajustes: dados, formas de pagamento, textos, multa e juros, tema P&B
│   │   └── cobrancas.js tela Cobranças de hoje, com o botão Enviar no WhatsApp
│   ├── telas-acesso.js  telas Entrar, Criar conta, Esqueci a senha, Confirme seu e-mail, Aguardando aprovação
│   ├── formato.js    datas dd/mm/aaaa, valores em R$, "hoje" no fuso de São Paulo
│   ├── icones.js     ícones de traço (SVG), todos da mesma família
│   ├── telas.js      lista das telas, o desenho de cada uma e a tela Contas (administrador)
│   └── app.js        aplica o config, monta os menus e troca de tela pelo endereço (#/alunos)
├── testes/           testes das regras: node --test testes/*.test.js
├── manifest.webmanifest  nome, cores e ícones do app instalado (PWA)
├── sw.js             service worker: guarda os arquivos para abrir rápido e sem internet
└── img/              ícones do app: icone.svg é a fonte; PNG 192, 512, maskable, apple-touch-icon e favicon
```

## Rodar no computador

Abra a pasta no VS Code e use a extensão **Live Server** (botão "Go Live").
O login precisa do `js/firebase-config.js` preenchido. Sem ele, o sistema mostra o aviso "Firebase não configurado".

## Publicar no GitHub Pages

1. Crie o repositório no GitHub e suba os arquivos desta pasta (o `index.html` na raiz).
2. No repositório: **Settings > Pages > Branch: main / (root) > Save**.
3. Em 1 ou 2 minutos o endereço fica `https://du-edu-duarte.github.io/ecd-em-dia/`.

## Como funciona o acesso

1. A pessoa cria a conta (nome, setor, e-mail, WhatsApp e senha) e recebe um e-mail de confirmação.
2. Depois de confirmar o e-mail, a conta fica **Aguardando aprovação**.
3. O administrador (e-mail em `js/config.js` e em `firestore.rules`) entra, abre **Mais > Contas** e toca em **Aprovar**.
4. Só então o professor vê as telas do sistema. Quem bloqueia de verdade é o `firestore.rules`: conta pendente ou bloqueada não lê nem grava nenhum dado, mesmo mexendo no código do navegador.

## Como as mensalidades nascem

- Cada aluno **ativo** tem uma mensalidade por mês, com o valor e o dia de vencimento do cadastro. Se o mês não tem o dia (31 em fevereiro), vence no último dia.
- O sistema cria as que faltam ao entrar, ao abrir Mensalidades e ao salvar um aluno: do mês em que o aluno foi cadastrado até o mês atual, mais o mês seguinte se vencer em até 5 dias.
- A primeira mensalidade é a do primeiro vencimento a partir da data de início do aluno.
- Situação: **Paga**, **Vence em até 5 dias**, **Vence hoje**, **Atrasada** (a partir do dia seguinte ao vencimento) ou **Em aberto**. Pagamento parcial deixa o saldo devedor.
- Na fase 2, a mesma regra (`js/regras/mensalidades.js`) passa a rodar numa tarefa agendada no servidor.

## Como funcionam as cobranças

- **Cobranças de hoje** mostra quem está a 5 dias do vencimento, a 1 dia, vence hoje ou está atrasado. Quem já pagou, está trancado/inativo ou com os lembretes desligados não aparece.
- **Enviar no WhatsApp** abre a conversa com o texto do lembrete (de Ajustes) e a forma de pagamento já preenchidos. O professor só confirma o envio no WhatsApp.
- Cada toque fica registrado em `professores/{uid}/envios` com data e hora. O cartão passa para "Enviar de novo" e mostra a última cobrança.
- O botão **Cobrar** na mensalidade faz o mesmo a qualquer momento, fora da régua.
- Atrasados aparecem todos os dias até o pagamento (se deve repetir só a cada alguns dias ainda está em aberto com o cliente).
- Na fase 2, `js/servicos/envio.js` passa a enviar sozinho pelo servidor, gravando o mesmo registro.

## O Painel

- Cartões: **a receber no mês** e **recebido no mês** (mensalidades do mês atual), **em atraso** (de todos os meses, em R$ e quantidade) e **alunos ativos**.
- Atalho para as Cobranças de hoje com quantos lembretes faltam enviar.
- Alunos com os filtros Pendentes, Em dia (sem atraso), Vence hoje, Vence em 5 dias e Atrasados. Em cada um: **Cobrar**, **Registrar pagamento** e WhatsApp direto.
- Próximos vencimentos ainda não pagos, agrupados por dia.

## Relatórios

- Escolha o mês nas setas (`#/relatorios/2026-10` abre outubro).
- Recebido x a receber, recebido por forma de pagamento, inadimplência do mês (% do previsto que está atrasado), quem está devendo hoje (todos os meses) e alunos por turma.
- **Baixar planilha (Excel)**: arquivo CSV com separador `;` e centavos com vírgula, que o Excel em português abre direto e com acentos.
- **Salvar em PDF**: abre a janela de impressão; escolha "Salvar como PDF". Sai só o relatório, sem menus, com o nome do professor e a data.

## Aplicativo instalável (PWA) e Primeiro acesso

- O `manifest.webmanifest` e o `sw.js` deixam instalar o sistema na tela inicial do celular (Android pelo Chrome, iPhone pelo Safari em Compartilhar > Adicionar à Tela de Início) e no computador.
- O service worker busca sempre a versão nova na internet e só usa a cópia guardada quando está sem sinal. Os dados e o login não passam por ele.
- **Criou um arquivo novo em `js/`?** Coloque-o também na lista `ARQUIVOS` do `sw.js` e mude a `VERSAO` (ex.: `ecd-em-dia-v2`). O teste `testes/pwa.test.js` avisa se esquecer.
- Mudou o nome ou as cores em `js/config.js`? Mude também no `manifest.webmanifest` e gere os ícones de novo a partir de `img/icone.svg`.
- Na primeira vez que o professor entra, abre o guia **Primeiro acesso** (8 passos, um por tela). O passo 2 já grava o nome, o WhatsApp e a chave Pix. Quando ele conclui ou pula, o perfil ganha `guiaVisto: true` e o guia não abre mais sozinho; ele continua em **Mais > Primeiro acesso**.

## Etapas da Fase 1

1. Base e visual (feita)
2. Firebase e acesso (feita)
3. Aulas e horários (feita)
4. Alunos (feita)
5. Mensalidades (feita)
6. Ajustes (feita)
7. Botão Cobrar e Cobranças de hoje (feita)
8. Painel (feita)
9. Relatórios (feita)
10. PWA e Primeiro acesso (feita)
