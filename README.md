# ECD Em Dia

Sistema da ECD Tecnologia para um professor de treino cadastrar alunos e cobrar mensalidades.
HTML, CSS e JavaScript puro, publicado no GitHub Pages.

## Estrutura

```
ecd-em-dia/
├── index.html        página única: topo, menus e área onde as telas aparecem
├── css/
│   └── estilo.css    visual ECD, mobile first (celular primeiro, computador no fim)
├── js/
│   ├── config.js     nome do sistema, nome do professor e cores (único lugar para trocar)
│   ├── formato.js    datas dd/mm/aaaa, valores em R$, "hoje" no fuso de São Paulo
│   ├── icones.js     ícones de traço (SVG), todos da mesma família
│   ├── telas.js      lista das telas e o desenho de cada uma
│   └── app.js        aplica o config, monta os menus e troca de tela pelo endereço (#/alunos)
└── img/              ícones do app (etapa 10)
```

## Rodar no computador

Abra a pasta no VS Code e use a extensão **Live Server** (botão "Go Live").
Abrir o `index.html` com dois cliques também funciona nesta etapa.

## Publicar no GitHub Pages

1. Crie o repositório no GitHub e suba os arquivos desta pasta (o `index.html` na raiz).
2. No repositório: **Settings > Pages > Branch: main / (root) > Save**.
3. Em 1 ou 2 minutos o endereço fica `https://du-edu-duarte.github.io/ecd-em-dia/`.

## Etapas da Fase 1

1. Base e visual (feita)
2. Firebase e acesso
3. Aulas e horários
4. Alunos
5. Mensalidades
6. Ajustes
7. Botão Cobrar e Cobranças de hoje
8. Painel
9. Relatórios
10. PWA e Primeiro acesso
