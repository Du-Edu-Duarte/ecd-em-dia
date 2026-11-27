/*
 * servicos/pagamento.js
 * De onde vem o "link de pagamento" que vai na mensagem do aluno.
 *
 * FASE 1 (agora): usa o que o professor cadastrou em Ajustes
 *   (chave Pix, link de cartão, link de boleto), conforme a forma preferida do aluno.
 * FASE 2 (depois): esta função passa a pedir ao meio de pagamento (Asaas, Mercado Pago...)
 *   um link único por mensalidade, com Pix, boleto e cartão. A chave de API fica
 *   no servidor, nunca aqui. As telas não mudam, porque só chamam Pagamento.link().
 */
const Pagamento = {
  // Devolve { texto, ok }. "texto" vai no lugar de {link} na mensagem.
  link(mensalidade, aluno, formasPagamento) {
    const f = formasPagamento || {};
    // Fase 2: se a mensalidade já tiver link do meio de pagamento, ele tem prioridade
    if (mensalidade && mensalidade.linkPagamento) return { texto: mensalidade.linkPagamento, ok: true };

    const preferida = (aluno && aluno.formaPreferida) || "pix";
    const opcoes = {
      pix: f.pix ? `Pix, chave ${f.pix}` : "",
      cartao: f.linkCartao || "",
      boleto: f.linkBoleto || "",
    };
    if (opcoes[preferida]) return { texto: opcoes[preferida], ok: true };
    // Sem a forma preferida cadastrada: usa a primeira que existir
    const alguma = opcoes.pix || opcoes.cartao || opcoes.boleto;
    return alguma ? { texto: alguma, ok: true } : { texto: "", ok: false };
  },
};
