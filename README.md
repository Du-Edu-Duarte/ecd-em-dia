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
│   │   ├── dados.js  ler, gravar e "ouvir" os dados do professor (sincroniza celular e computador)
│   │   └── acesso.js login, cadastro, confirmação de e-mail, aprovação (único arquivo que fala com o Firebase Auth)
│   ├── regras/
│   │   └── turmas.js dias da semana, validação, dias por semana e treinos no mês (só cálculo)
│   ├── telas/
│   │   └── aulas.js  tela Aulas e horários
│   ├── telas-acesso.js  telas Entrar, Criar conta, Esqueci a senha, Confirme seu e-mail, Aguardando aprovação
│   ├── formato.js    datas dd/mm/aaaa, valores em R$, "hoje" no fuso de São Paulo
│   ├── icones.js     ícones de traço (SVG), todos da mesma família
│   ├── telas.js      lista das telas, o desenho de cada uma e a tela Contas (administrador)
│   └── app.js        aplica o config, monta os menus e troca de tela pelo endereço (#/alunos)
├── testes/           testes das regras: node --test testes/*.test.js
└── img/              ícones do app (etapa 10)
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

## Etapas da Fase 1

1. Base e visual (feita)
2. Firebase e acesso (feita)
3. Aulas e horários (feita)
4. Alunos
5. Mensalidades
6. Ajustes
7. Botão Cobrar e Cobranças de hoje
8. Painel
9. Relatórios
10. PWA e Primeiro acesso
