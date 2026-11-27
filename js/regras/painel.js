/*
 * regras/painel.js
 * Números e listas do Painel (tela inicial). Só cálculo, sem tela.
 *
 * Cartões: a receber no mês, recebido no mês, em atraso (todos os meses) e alunos ativos.
 * Lista por aluno com os filtros Pendentes, Em dia, Vence hoje, Vence em 5 dias e Atrasados.
 * Próximos vencimentos: mensalidades ainda não pagas, do dia de hoje em diante.
 */
const RegrasPainel = {
  FILTROS: [
    { id: "pendentes", rotulo: "Pendentes" },
    { id: "emdia", rotulo: "Em dia" },
    { id: "hoje", rotulo: "Vence hoje" },
    { id: "breve", rotulo: "Vence em 5 dias" },
    { id: "atrasados", rotulo: "Atrasados" },
  ],

  // Cartões do topo
  cartoes(mensalidades, alunos, hoje) {
    const doMes = mensalidades.filter((m) => m.competencia === hoje.slice(0, 7));
    const mes = RegrasMensalidades.resumo(doMes, hoje);
    const geral = RegrasMensalidades.resumo(mensalidades, hoje);
    return {
      aReceber: mes.aReceber,
      recebido: mes.recebido,
      atrasoValor: geral.atrasoValor,
      atrasoQtd: geral.atrasoQtd,
      ativos: alunos.filter((a) => a.status === "ativo").length,
    };
  },

  /*
   * Um item por aluno ativo:
   *   abertas   mensalidades não pagas (com a situação), da mais antiga para a mais nova
   *   principal a que mais importa agora (a mais antiga não paga) ou null se está tudo pago
   *   atrasadas quantas estão atrasadas; devendo: soma dos saldos
   */
  porAluno(mensalidades, alunos, hoje) {
    return alunos
      .filter((a) => a.status === "ativo")
      .map((aluno) => {
        const abertas = mensalidades
          .filter((m) => m.alunoId === aluno.id)
          .map((m) => ({ m, sit: RegrasMensalidades.situacao(m, hoje) }))
          .filter((x) => x.sit.codigo !== "paga")
          .sort((a, b) => a.m.vencimento.localeCompare(b.m.vencimento));
        const atrasadas = abertas.filter((x) => x.sit.codigo === "atrasada").length;
        const devendo = Math.round(abertas.reduce((s, x) => s + x.sit.saldo, 0) * 100) / 100;
        return { aluno, abertas, principal: abertas[0] || null, atrasadas, devendo };
      });
  },

  // A mensalidade que o filtro quer mostrar daquele aluno (ou null se ele não entra no filtro)
  doFiltro(item, filtro) {
    const achar = (f) => item.abertas.find(f) || null;
    switch (filtro) {
      case "pendentes": return item.principal;
      case "emdia": return item.atrasadas ? null : (item.principal || { m: null, sit: null });
      case "hoje": return achar((x) => x.sit.codigo === "hoje");
      case "breve": return achar((x) => x.sit.codigo === "breve");
      case "atrasados": return achar((x) => x.sit.codigo === "atrasada");
      default: return null;
    }
  },

  // Lista do filtro: atrasados primeiro, depois quem vence antes, depois pelo nome
  filtrar(itens, filtro) {
    const ordem = { atrasada: 0, hoje: 1, breve: 2, aberta: 3 };
    return itens
      .map((item) => ({ ...item, mostrar: this.doFiltro(item, filtro) }))
      .filter((item) => item.mostrar)
      .sort((a, b) => {
        const sa = a.mostrar.sit, sb = b.mostrar.sit;
        const oa = sa ? ordem[sa.codigo] : 9, ob = sb ? ordem[sb.codigo] : 9;
        return oa - ob || (a.mostrar.m ? a.mostrar.m.vencimento : "9").localeCompare(b.mostrar.m ? b.mostrar.m.vencimento : "9") ||
          a.aluno.nome.localeCompare(b.aluno.nome, "pt-BR");
      });
  },

  contagem(itens) {
    const c = {};
    this.FILTROS.forEach((f) => (c[f.id] = itens.filter((item) => this.doFiltro(item, f.id)).length));
    return c;
  },

  // Próximos vencimentos (não pagos, de hoje em diante), agrupados por dia
  proximos(mensalidades, alunos, hoje, limite = 8) {
    const ativos = new Map(alunos.filter((a) => a.status === "ativo").map((a) => [a.id, a]));
    const lista = mensalidades
      .filter((m) => ativos.has(m.alunoId) && m.vencimento >= hoje)
      .map((m) => ({ m, aluno: ativos.get(m.alunoId), sit: RegrasMensalidades.situacao(m, hoje) }))
      .filter((x) => x.sit.codigo !== "paga")
      .sort((a, b) => a.m.vencimento.localeCompare(b.m.vencimento) || a.aluno.nome.localeCompare(b.aluno.nome, "pt-BR"))
      .slice(0, limite);
    const dias = [];
    lista.forEach((x) => {
      const ultimo = dias[dias.length - 1];
      if (ultimo && ultimo.dia === x.m.vencimento) ultimo.itens.push(x);
      else dias.push({ dia: x.m.vencimento, itens: [x] });
    });
    return dias;
  },
};

if (typeof module !== "undefined") module.exports = RegrasPainel;
