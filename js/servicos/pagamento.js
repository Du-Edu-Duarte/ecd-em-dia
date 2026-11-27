/*
 * servicos/pagamento.js
 * De onde vem o "link de pagamento" que vai na mensagem do aluno.
 *
 * FASE 1 (agora): usa as formas que o professor cadastrou em Ajustes (só as que ele tem:
 *   chave Pix, Pix copia e cola, link de pagamento, boleto ou outra), conforme a forma
 *   preferida do aluno. Sem preferida, vão todas. Regras em js/regras/formas.js.
 * FASE 2 (depois): esta função passa a pedir ao meio de pagamento (Asaas, Mercado Pago...)
 *   um link único por mensalidade, com Pix, boleto e cartão. A chave de API fica
 *   no servidor, nunca aqui. As telas não mudam, porque só chamam Pagamento.link().
 */
const Pagamento = {
  // Devolve { texto, ok }. "texto" vai no lugar de {link} na mensagem.
  // perfil = perfil do professor (as formas que ele cadastrou em Ajustes)
  link(mensalidade, aluno, perfil) {
    // Fase 2: se a mensalidade já tiver link do meio de pagamento, ele tem prioridade
    if (mensalidade && mensalidade.linkPagamento) return { texto: mensalidade.linkPagamento, ok: true };
    // Fase 1: a forma preferida do aluno, ou todas as formas do professor
    return RegrasFormas.paraMensagem(RegrasFormas.doPerfil(perfil), aluno && aluno.formaPreferida);
  },
};
