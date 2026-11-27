/*
 * telas.js
 * Lista de todas as telas do sistema.
 * Cada tela tem: id (vai na URL, ex.: #/alunos), título, ícone,
 * rótulo curto para o menu do celular e onde ela aparece no menu.
 *
 * Nesta etapa 1 as telas estão vazias. Cada etapa seguinte troca
 * o "desenhar" da tela pelo conteúdo de verdade.
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
  },
  {
    id: "alunos",
    titulo: "Alunos",
    rotulo: "Alunos",
    icone: "alunos",
    menuInferior: true,
    etapa: 4,
    resumo: "Lista de alunos com busca e filtros, ficha com anotações e histórico.",
  },
  {
    id: "cobrancas",
    titulo: "Cobranças de hoje",
    rotulo: "Cobranças",
    icone: "cobrancas",
    menuInferior: true,
    etapa: 7,
    resumo: "Quem vence em 5 dias, vence amanhã, vence hoje ou está atrasado, com o botão Cobrar.",
  },
  {
    id: "mensalidades",
    titulo: "Mensalidades",
    rotulo: "Mensalidades",
    icone: "mensalidades",
    menuInferior: true,
    etapa: 5,
    resumo: "Mensalidades do mês e registro de pagamento.",
  },
  {
    id: "aulas",
    titulo: "Aulas e horários",
    rotulo: "Aulas",
    icone: "aulas",
    menuInferior: false,
    etapa: 3,
    resumo: "Turmas com dias da semana, horário de início e fim e vagas.",
  },
  {
    id: "relatorios",
    titulo: "Relatórios",
    rotulo: "Relatórios",
    icone: "relatorios",
    menuInferior: false,
    etapa: 9,
    resumo: "Recebido e a receber, inadimplência, alunos por turma e exportação.",
  },
  {
    id: "ajustes",
    titulo: "Ajustes",
    rotulo: "Ajustes",
    icone: "ajustes",
    menuInferior: false,
    etapa: 6,
    resumo: "Dados do professor, formas de pagamento, textos dos lembretes, multa e juros, tema P&B.",
  },
];

// Tela aberta quando o endereço não indica nenhuma.
const TELA_INICIAL = "painel";

// Desenha o conteúdo de uma tela. Por enquanto, todas mostram o estado vazio.
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
