/*
 * telas.js
 * Lista de todas as telas do sistema.
 * Cada tela tem: id (vai na URL, ex.: #/alunos), título, ícone,
 * rótulo curto para o menu do celular e onde ela aparece no menu.
 *
 * Tela com "desenhar" já está pronta (o código fica em js/telas/).
 * Tela sem "desenhar" mostra o aviso "Tela em construção".
 */
const TELAS = [
  {
    id: "painel",
    titulo: "Painel",
    rotulo: "Painel",
    icone: "painel",
    menuInferior: true,
    etapa: 8,
    resumo: "Valores a receber, recebidos e em atraso, alunos ativos e próximos vencimentos.",
    desenhar: (container) => TelaPainel.desenhar(container),
  },
  {
    id: "alunos",
    titulo: "Alunos",
    rotulo: "Alunos",
    icone: "alunos",
    menuInferior: true,
    etapa: 4,
    resumo: "Lista de alunos com busca e filtros, ficha com anotações e histórico.",
    desenhar: (container, parametro) => TelaAlunos.desenhar(container, parametro),
  },
  {
    id: "cobrancas",
    titulo: "Cobranças de hoje",
    rotulo: "Cobranças",
    icone: "cobrancas",
    menuInferior: true,
    etapa: 7,
    resumo: "Quem vence em 5 dias, vence amanhã, vence hoje ou está atrasado, com o botão Cobrar.",
    desenhar: (container) => TelaCobrancas.desenhar(container),
  },
  {
    id: "mensalidades",
    titulo: "Mensalidades",
    rotulo: "Mensalidades",
    icone: "mensalidades",
    menuInferior: true,
    etapa: 5,
    resumo: "Mensalidades do mês e registro de pagamento.",
    desenhar: (container, parametro) => TelaMensalidades.desenhar(container, parametro),
  },
  {
    id: "aulas",
    titulo: "Aulas e horários",
    rotulo: "Aulas",
    icone: "aulas",
    menuInferior: false,
    etapa: 3,
    resumo: "Turmas com dias da semana, horário de início e fim e vagas.",
    desenhar: (container) => TelaAulas.desenhar(container),
  },
  {
    id: "relatorios",
    titulo: "Relatórios",
    rotulo: "Relatórios",
    icone: "relatorios",
    menuInferior: false,
    etapa: 9,
    resumo: "Recebido e a receber, inadimplência, alunos por turma e exportação.",
    desenhar: (container, parametro) => TelaRelatorios.desenhar(container, parametro),
  },
  {
    id: "ajustes",
    titulo: "Ajustes",
    rotulo: "Ajustes",
    icone: "ajustes",
    menuInferior: false,
    etapa: 6,
    resumo: "Dados do professor, formas de pagamento, textos dos lembretes, multa e juros, tema P&B.",
    desenhar: (container) => TelaAjustes.desenhar(container),
  },
  {
    id: "primeiro-acesso",
    titulo: "Primeiro acesso",
    rotulo: "Guia",
    icone: "guia",
    menuInferior: false,
    etapa: 10,
    resumo: "Guia passo a passo: dados, aulas, alunos, cobranças, pagamentos e como instalar no celular.",
    desenhar: (container, parametro) => TelaPrimeiroAcesso.desenhar(container, parametro),
  },
  {
    id: "contas",
    titulo: "Contas e planos",
    rotulo: "Contas",
    icone: "contas",
    menuInferior: false,
    apenasAdmin: true, // só aparece para o administrador ECD
    resumo: "Aprovar contas e controlar o plano do sistema de cada cliente.",
    desenhar: (container) => TelaContas.desenhar(container),
  },
];

// Tela aberta quando o endereço não indica nenhuma.
const TELA_INICIAL = "painel";

// Desenha o conteúdo de uma tela que ainda não foi construída (estado vazio).
function desenharTela(tela) {
  return `
    <div class="tela-cabecalho">
      <h1>${tela.titulo}</h1>
    </div>
    <div class="cartao vazio">
      <span class="vazio-icone">${Icones.svg(tela.icone, 32)}</span>
      <p class="vazio-titulo">Tela em construção</p>
      <p class="vazio-texto">${tela.resumo}</p>
      <p class="vazio-etapa">Chega na etapa ${tela.etapa}.</p>
    </div>
  `;
}

/*
 * Tela "Contas" (só administrador): lista os professores cadastrados,
 * com Aprovar e Bloquear. A regra do Firestore garante que só o
 * administrador consegue ler essa lista e mudar o status.
 */
// A tela Contas e planos (administrador) fica em js/telas/contas.js
