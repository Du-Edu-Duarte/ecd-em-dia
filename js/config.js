/*
 * config.js
 * ÚNICO lugar para trocar nome, cores e campos do cadastro.
 * Quando o professor informar o nome e a identidade visual dele,
 * altere só este arquivo. O resto do sistema lê daqui.
 */
window.ECD_CONFIG = {
  // Nome que aparece no topo e no título da aba.
  nomeSistema: "ECD Em Dia",

  // Nome do professor (cliente). Depois do login, o topo mostra
  // o nome que o professor cadastrou; este é só o padrão.
  nomeCliente: "Professor",

  // Cores. Hoje usamos o padrão ECD.
  // Se o cliente tiver identidade própria, troque os valores abaixo.
  cores: {
    preto: "#15110A",   // textos e menu
    dourado: "#E2B454", // destaque, item ativo, botão principal
    areia: "#ECE4D4",   // bordas e fundos de cartão secundário
    fundo: "#F7F4EE",   // fundo da página
  },

  // Administrador ECD: aprova contas e vê tudo.
  // ATENÇÃO: o mesmo e-mail está no arquivo firestore.rules. Se trocar aqui,
  // troque lá também (é a regra do Firestore que protege de verdade).
  emailAdmin: "eduardoduartecostaduarte@gmail.com",

  // Campos extras da tela de cadastro (além de nome, setor, e-mail e senha).
  // Para adicionar um campo, copie uma linha e mude id, rótulo e tipo.
  // tipo: "text", "tel", "email" ou "number". Os valores são salvos em "extras".
  camposExtrasCadastro: [
    { id: "telefone", rotulo: "WhatsApp com DDD", tipo: "tel", obrigatorio: true, dica: "(11) 91234-5678" },
  ],

  // Plano do sistema que cada cliente compra da ECD (tela Contas do administrador).
  // diasAviso: a partir de quantos dias antes do fim o plano aparece como "Vencendo" e o cliente vê o aviso.
  // diasTolerancia: dias depois do fim até travar o acesso sozinho (null = nunca trava sozinho).
  assinatura: {
    diasAviso: 15,
    diasTolerancia: 7,
  },

  // Contato da ECD mostrado ao cliente com o plano vencido (WhatsApp só com números, com DDD).
  contatoECD: {
    whatsapp: "",
    email: "eduardoduartecostaduarte@gmail.com",
  },

  // Formatos brasileiros (usados em js/formato.js).
  fuso: "America/Sao_Paulo",
  idioma: "pt-BR",
  moeda: "BRL",
};
