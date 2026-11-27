/*
 * regras/mensalidades.js
 * Regras das mensalidades, sem tela e sem Firebase (só cálculo).
 * Datas sempre no formato "aaaa-mm-dd" (texto), já no fuso de São Paulo.
 *
 * Situação calculada de cada mensalidade:
 *   paga       pagamento completo
 *   atrasada   passou do vencimento sem pagar tudo (mostra os dias de atraso)
 *   hoje       vence hoje
 *   breve      vence em até 5 dias
 *   aberta     vence em mais de 5 dias
 * "parcial" é um detalhe a mais: pagou uma parte e ainda tem saldo.
 */
const RegrasMensalidades = {
  DIAS_AVISO: 5, // "vence em breve" e lembrete D-5

  doisDigitos(n) {
    return String(n).padStart(2, "0");
  },

  // Último dia do mês (mes de 1 a 12)
  diasNoMes(ano, mes) {
    return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  },

  // Dia 31 em fevereiro cai no último dia do mês
  vencimentoEm(ano, mes, dia) {
    const d = Math.min(dia, this.diasNoMes(ano, mes));
    return `${ano}-${this.doisDigitos(mes)}-${this.doisDigitos(d)}`;
  },

  competencia(ano, mes) {
    return `${ano}-${this.doisDigitos(mes)}`;
  },

  // "2026-12" -> "dezembro de 2026"
  competenciaTexto(comp) {
    const [ano, mes] = comp.split("-").map(Number);
    const nome = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(ano, mes - 1, 1)));
    return `${nome} de ${ano}`;
  },

  somarMeses(ano, mes, n) {
    const total = ano * 12 + (mes - 1) + n;
    return [Math.floor(total / 12), (total % 12) + 1];
  },

  // Dias de A até B ("2026-11-27", "2026-12-02" -> 5)
  diasEntre(a, b) {
    const ms = (iso) => Date.UTC(...iso.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
    return Math.round((ms(b) - ms(a)) / 86400000);
  },

  saldo(m) {
    return Math.max(0, Math.round(((m.valor || 0) - (m.valorPago || 0)) * 100) / 100);
  },

  situacao(m, hoje) {
    const saldo = this.saldo(m);
    const parcial = (m.valorPago || 0) > 0 && saldo > 0;
    if (saldo === 0) return { codigo: "paga", rotulo: "Paga", saldo, parcial: false, dias: 0 };
    const dias = this.diasEntre(hoje, m.vencimento);
    if (dias < 0) {
      const atraso = -dias;
      return { codigo: "atrasada", rotulo: `Atrasada ${atraso} ${atraso === 1 ? "dia" : "dias"}`, saldo, parcial, dias: atraso };
    }
    if (dias === 0) return { codigo: "hoje", rotulo: "Vence hoje", saldo, parcial, dias: 0 };
    if (dias <= this.DIAS_AVISO) return { codigo: "breve", rotulo: dias === 1 ? "Vence amanhã" : `Vence em ${dias} dias`, saldo, parcial, dias };
    return { codigo: "aberta", rotulo: "Em aberto", saldo, parcial, dias };
  },

  /*
   * Quais mensalidades devem existir para um aluno ativo, até hoje.
   * - Começa no mês de início do aluno (ou no mês em que foi cadastrado, se for depois),
   *   para não cobrar meses antigos de quem já estava pagando antes do sistema.
   * - A primeira mensalidade é a do primeiro vencimento a partir da data de início.
   * - Vai até o mês atual, e inclui o mês seguinte se ele vence em até 5 dias (para o lembrete D-5).
   * - Plano trimestral, semestral ou anual: uma cobrança a cada 3, 6 ou 12 meses,
   *   contando da primeira (aluno.periodo; sem período, todo mês).
   */
  paraGerar(aluno, hoje, cadastradoEm) {
    if (aluno.status !== "ativo" || !aluno.diaVencimento || !(aluno.valor > 0)) return [];
    const inicio = aluno.inicio || cadastradoEm || hoje;
    // Mês da primeira cobrança: o do início, ou o seguinte se o vencimento daquele mês já tinha passado
    const passo = { trimestral: 3, semestral: 6, anual: 12 }[aluno.periodo] || 1;
    const [anoIni, mesIni] = inicio.split("-").map(Number);
    const primeiro = anoIni * 12 + mesIni + (this.vencimentoEm(anoIni, mesIni, aluno.diaVencimento) < inicio ? 1 : 0);
    const base = cadastradoEm && cadastradoEm > inicio ? cadastradoEm : inicio;
    let [ano, mes] = base.split("-").map(Number);
    const [anoHoje, mesHoje] = hoje.split("-").map(Number);
    const lista = [];
    for (let i = 0; i < 120; i++) { // trava de segurança: no máximo 10 anos
      const vencimento = this.vencimentoEm(ano, mes, aluno.diaVencimento);
      const depoisDeHoje = ano * 12 + mes > anoHoje * 12 + mesHoje;
      if (depoisDeHoje && this.diasEntre(hoje, vencimento) > this.DIAS_AVISO) break;
      const indice = ano * 12 + mes;
      if (indice >= primeiro && (indice - primeiro) % passo === 0) lista.push({ competencia: this.competencia(ano, mes), vencimento });
      if (depoisDeHoje) break;
      [ano, mes] = this.somarMeses(ano, mes, 1);
    }
    return lista;
  },

  // Id fixo por aluno e mês: dois aparelhos gerando ao mesmo tempo não duplicam
  idMensalidade(alunoId, competencia) {
    return `${alunoId}_${competencia}`;
  },

  // Aplica um pagamento. Devolve só os campos que mudam na mensalidade.
  registrarPagamento(m, { data, valor, forma, obs }) {
    const pagamentos = [...(m.pagamentos || []), { data, valor, forma, obs: obs || "" }];
    return this.recalcular(m, pagamentos);
  },

  // Desfaz um pagamento registrado por engano (pelo índice na lista)
  removerPagamento(m, indice) {
    const pagamentos = (m.pagamentos || []).filter((_, i) => i !== indice);
    return this.recalcular(m, pagamentos);
  },

  recalcular(m, pagamentos) {
    const valorPago = Math.round(pagamentos.reduce((s, p) => s + p.valor, 0) * 100) / 100;
    const quitada = valorPago >= m.valor;
    const ultimo = pagamentos[pagamentos.length - 1];
    return {
      pagamentos,
      valorPago,
      status: quitada ? "paga" : valorPago > 0 ? "parcial" : "aberta",
      pagoEm: quitada ? ultimo.data : null,
      forma: ultimo ? ultimo.forma : null,
    };
  },

  validarPagamento({ data, valor }, m) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data || "")) return "Informe a data do pagamento.";
    if (!(valor > 0)) return "Informe o valor pago, por exemplo 150,00.";
    if (valor > this.saldo(m) + 0.001) return `O valor passa do saldo devedor (${this.saldo(m).toFixed(2).replace(".", ",")}).`;
    return "";
  },

  /*
   * Multa e juros por atraso: desligados por padrão (Ajustes).
   * config = { multaAtiva, multaPercentual, jurosAtivo, jurosMensal }
   * Multa: percentual único sobre o saldo. Juros: percentual ao mês, proporcional aos dias.
   */
  encargos(m, hoje, config) {
    const c = config || {};
    const sit = this.situacao(m, hoje);
    const zero = { multa: 0, juros: 0, total: sit.saldo };
    if (sit.codigo !== "atrasada") return zero;
    const multa = c.multaAtiva ? sit.saldo * (Number(c.multaPercentual) || 0) / 100 : 0;
    const juros = c.jurosAtivo ? sit.saldo * (Number(c.jurosMensal) || 0) / 100 / 30 * sit.dias : 0;
    const r = (n) => Math.round(n * 100) / 100;
    return { multa: r(multa), juros: r(juros), total: r(sit.saldo + multa + juros) };
  },

  // Cartões do resumo do mês
  resumo(mensalidades, hoje) {
    const r = { total: 0, recebido: 0, aReceber: 0, atrasoValor: 0, atrasoQtd: 0 };
    mensalidades.forEach((m) => {
      const sit = this.situacao(m, hoje);
      r.total += m.valor;
      r.recebido += m.valorPago || 0;
      r.aReceber += sit.saldo;
      if (sit.codigo === "atrasada") { r.atrasoValor += sit.saldo; r.atrasoQtd++; }
    });
    Object.keys(r).forEach((k) => (r[k] = Math.round(r[k] * 100) / 100));
    return r;
  },

  // Filtros da lista: pendentes, atrasadas, breve (inclui hoje), pagas, todas
  filtrar(mensalidades, filtro, hoje) {
    const ordem = { atrasada: 0, hoje: 1, breve: 2, aberta: 3, paga: 4 };
    return mensalidades
      .map((m) => ({ m, sit: this.situacao(m, hoje) }))
      .filter(({ sit }) =>
        filtro === "todas" ||
        (filtro === "pendentes" && sit.codigo !== "paga") ||
        (filtro === "atrasadas" && sit.codigo === "atrasada") ||
        (filtro === "breve" && (sit.codigo === "breve" || sit.codigo === "hoje")) ||
        (filtro === "pagas" && sit.codigo === "paga"))
      .sort((a, b) => ordem[a.sit.codigo] - ordem[b.sit.codigo] || a.m.vencimento.localeCompare(b.m.vencimento));
  },
};

if (typeof module !== "undefined") module.exports = RegrasMensalidades;
