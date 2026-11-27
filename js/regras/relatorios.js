/*
 * regras/relatorios.js
 * Números dos Relatórios e a planilha CSV. Só cálculo, sem tela.
 *
 * Recebido x a receber: mensalidades do mês escolhido (competência).
 * Inadimplência: quanto do previsto no mês está atrasado, e a lista de quem deve (todos os meses).
 * Alunos por turma: alunos ativos em cada turma e quem está sem turma.
 */
const RegrasRelatorios = {
  FORMAS: { pix: "Pix", cartao: "Cartão", boleto: "Boleto", dinheiro: "Dinheiro" },

  r(n) {
    return Math.round(n * 100) / 100;
  },

  // Linhas das mensalidades do mês, em ordem de nome
  linhasDoMes(mensalidades, alunos, competencia, hoje) {
    const nome = (id) => (alunos.find((a) => a.id === id) || { nome: "Aluno excluído" }).nome;
    return mensalidades
      .filter((m) => m.competencia === competencia)
      .map((m) => {
        const sit = RegrasMensalidades.situacao(m, hoje);
        return {
          id: m.id, aluno: nome(m.alunoId), vencimento: m.vencimento, valor: m.valor,
          pago: m.valorPago || 0, saldo: sit.saldo, situacao: sit.rotulo + (sit.parcial ? " (parcial)" : ""),
          codigo: sit.codigo, pagoEm: m.pagoEm || "", forma: m.forma || "",
        };
      })
      .sort((a, b) => a.aluno.localeCompare(b.aluno, "pt-BR") || a.vencimento.localeCompare(b.vencimento));
  },

  // Recebido x a receber e inadimplência do mês
  resumoDoMes(mensalidades, competencia, hoje) {
    const doMes = mensalidades.filter((m) => m.competencia === competencia);
    const r = RegrasMensalidades.resumo(doMes, hoje);
    const pagas = doMes.filter((m) => RegrasMensalidades.situacao(m, hoje).codigo === "paga").length;
    return {
      ...r,
      quantidade: doMes.length,
      pagas,
      percentualRecebido: r.total ? Math.round((r.recebido / r.total) * 100) : 0,
      inadimplencia: r.total ? Math.round((r.atrasoValor / r.total) * 1000) / 10 : 0, // % com 1 casa
    };
  },

  // Quanto entrou em cada forma de pagamento nas mensalidades do mês
  porForma(mensalidades, competencia) {
    const soma = {};
    mensalidades.filter((m) => m.competencia === competencia)
      .forEach((m) => (m.pagamentos || []).forEach((p) => (soma[p.forma || "outro"] = this.r((soma[p.forma || "outro"] || 0) + p.valor))));
    return Object.entries(soma)
      .map(([forma, valor]) => ({ forma, rotulo: this.FORMAS[forma] || "Outro", valor }))
      .sort((a, b) => b.valor - a.valor);
  },

  // Quem está devendo hoje (todos os meses), do maior atraso para o menor
  inadimplentes(mensalidades, alunos, hoje) {
    const mapa = new Map();
    mensalidades.forEach((m) => {
      const sit = RegrasMensalidades.situacao(m, hoje);
      if (sit.codigo !== "atrasada") return;
      const aluno = alunos.find((a) => a.id === m.alunoId);
      const item = mapa.get(m.alunoId) || { alunoId: m.alunoId, aluno: aluno ? aluno.nome : "Aluno excluído",
        whatsapp: aluno ? aluno.whatsapp : "", quantidade: 0, devendo: 0, maisAntigo: m.vencimento, dias: 0 };
      item.quantidade++;
      item.devendo = this.r(item.devendo + sit.saldo);
      if (m.vencimento < item.maisAntigo) item.maisAntigo = m.vencimento;
      item.dias = Math.max(item.dias, sit.dias);
      mapa.set(m.alunoId, item);
    });
    return [...mapa.values()].sort((a, b) => b.dias - a.dias || b.devendo - a.devendo);
  },

  // Alunos ativos por turma (turmas já em ordem) e quem está sem turma
  porTurma(turmas, alunos) {
    const ativos = alunos.filter((a) => a.status === "ativo");
    const nomes = (lista) => lista.map((a) => a.nome).sort((x, y) => x.localeCompare(y, "pt-BR"));
    return {
      turmas: turmas.map((t) => {
        const dela = ativos.filter((a) => (a.turmas || []).includes(t.id));
        return { turma: t, quantidade: dela.length, alunos: nomes(dela), lotada: !!t.vagas && dela.length >= t.vagas };
      }),
      semTurma: nomes(ativos.filter((a) => !(a.turmas || []).some((id) => turmas.some((t) => t.id === id)))),
    };
  },

  // ---------- Planilha (CSV que o Excel abre direto) ----------
  // Separador ";" e vírgula nos centavos, que é o padrão do Excel em português
  numero(n) {
    return (Number(n) || 0).toFixed(2).replace(".", ",");
  },

  dataBR(iso) {
    if (!iso) return "";
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
  },

  celula(v) {
    const t = String(v ?? "");
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  },

  csv(linhas) {
    const cab = ["Aluno", "Vencimento", "Valor (R$)", "Pago (R$)", "Saldo (R$)", "Situação", "Pago em", "Forma"];
    const corpo = linhas.map((l) => [l.aluno, this.dataBR(l.vencimento), this.numero(l.valor), this.numero(l.pago),
      this.numero(l.saldo), l.situacao, this.dataBR(l.pagoEm), this.FORMAS[l.forma] || l.forma]);
    return [cab, ...corpo].map((linha) => linha.map((c) => this.celula(c)).join(";")).join("\r\n");
  },
};

if (typeof module !== "undefined") module.exports = RegrasRelatorios;
