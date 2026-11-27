/*
 * config.js
 * ÚNICO lugar para trocar nome e cores do cliente.
 * Quando o professor informar o nome e a identidade visual dele,
 * altere só este arquivo. O resto do sistema lê daqui.
 */
window.ECD_CONFIG = {
  // Nome que aparece no topo e no título da aba.
  nomeSistema: "ECD Em Dia",

  // Nome do professor (cliente). Ainda não informado.
  nomeCliente: "Professor",

  // Cores. Hoje usamos o padrão ECD.
  // Se o cliente tiver identidade própria, troque os valores abaixo.
  cores: {
    preto: "#15110A",   // textos e menu
    dourado: "#E2B454", // destaque, item ativo, botão principal
    areia: "#ECE4D4",   // bordas e fundos de cartão secundário
    fundo: "#F7F4EE",   // fundo da página
  },

  // Formatos brasileiros (usados em js/formato.js).
  fuso: "America/Sao_Paulo",
  idioma: "pt-BR",
  moeda: "BRL",
};
