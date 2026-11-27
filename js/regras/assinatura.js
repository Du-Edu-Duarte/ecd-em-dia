/*
 * regras/assinatura.js
 * Plano do SISTEMA que cada cliente (professor) compra da ECD. Só cálculo, sem tela.
 * (Os planos dos ALUNOS ficam em regras/planos.js.)
 *
 * No perfil do professor, só o administrador grava:
 *   plano: { meses, valor, inicio, fim, liberadoAte, historico: [{ em, meses, valor, de, ate }] }
 *   inicio / fim: primeiro e último dia liberado ("aaaa-mm-dd", fim incluído)
 *   liberadoAte:  último dia de acesso, já com a tolerância (fim + N dias). As regras do
 *                 Firestore travam o acesso depois dele. null = não trava sozinho.
 * Sem plano (null): sem controle de prazo (contas antigas e cortesias).
 */
const RegrasAssinatura = {
  PERIODOS: [
    { meses: 1, rotulo: "Mensal" },
    { meses: 3, rotulo: "Trimestral" },
    { meses: 6, rotulo: "Semestral" },
    { meses: 12, rotulo: "Anual" },
  ],

  rotulo(meses) {
    const p = this.PERIODOS.find((x) => x.meses === meses);
    return p ? p.rotulo : `${meses} meses`;
  },

  // "aaaa-mm-dd" + n dias
  somarDias(iso, n) {
    const [a, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
  },

  // "aaaa-mm-dd" + n meses (31/01 + 1 mês = 28/02 ou 29/02)
  somarMeses(iso, n) {
    const [a, m, d] = iso.split("-").map(Number);
    const total = a * 12 + (m - 1) + n;
    const ano = Math.floor(total / 12), mes = (total % 12) + 1;
    const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    return `${ano}-${String(mes).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
  },

  diasEntre(a, b) {
    const ms = (iso) => Date.UTC(...iso.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
    return Math.round((ms(b) - ms(a)) / 86400000);
  },

  /*
   * Libera ou renova. Se o plano ainda está valendo, os meses novos começam depois do fim atual
   * (o cliente não perde dias por renovar antes). Se já venceu, começam hoje.
   * tolerancia: dias depois do fim até travar (null = não trava sozinho).
   */
  renovar(plano, meses, valor, hoje, tolerancia) {
    const atual = plano && plano.fim && plano.fim >= hoje ? plano : null;
    const de = atual ? this.somarDias(atual.fim, 1) : hoje;
    // Fim = véspera do mesmo dia N meses depois. Se o mês não tem o dia (31/01 + 1 mês),
    // o fim é o último dia daquele mês.
    const mesmoDia = this.somarMeses(de, meses);
    const ate = mesmoDia.slice(8) === de.slice(8) ? this.somarDias(mesmoDia, -1) : mesmoDia;
    return {
      meses,
      valor,
      inicio: atual ? atual.inicio : de,
      fim: ate,
      liberadoAte: tolerancia === null || tolerancia === undefined ? null : this.somarDias(ate, tolerancia),
      historico: [...((plano && plano.historico) || []), { em: hoje, meses, valor, de, ate }],
    };
  },

  /*
   * Situação do plano hoje:
   *   sem-plano   sem controle de prazo
   *   ativo       dentro do prazo, faltando mais de diasAviso dias
   *   vencendo    faltam diasAviso dias ou menos (hora de cobrar a renovação)
   *   tolerancia  venceu, mas ainda está nos dias de tolerância (ou não trava sozinho)
   *   vencido     passou da tolerância: acesso travado
   */
  situacao(plano, hoje, config) {
    const c = config || {};
    if (!plano || !plano.fim) return { codigo: "sem-plano", rotulo: "Sem plano", dias: null };
    const faltam = this.diasEntre(hoje, plano.fim);
    if (faltam >= 0) {
      const rotulo = faltam === 0 ? "Vence hoje" : faltam === 1 ? "Falta 1 dia" : `Faltam ${faltam} dias`;
      return { codigo: faltam <= (c.diasAviso ?? 15) ? "vencendo" : "ativo", rotulo, dias: faltam };
    }
    const atraso = -faltam;
    const venceuHa = `Venceu há ${atraso} ${atraso === 1 ? "dia" : "dias"}`;
    if (plano.liberadoAte && hoje > plano.liberadoAte) return { codigo: "vencido", rotulo: `${venceuHa} · travado`, dias: atraso };
    return { codigo: "tolerancia", rotulo: venceuHa, dias: atraso, bloqueioEm: plano.liberadoAte || null };
  },

  // Quanto do período atual já foi usado (0 a 100), para a barra
  usado(plano, hoje) {
    if (!plano || !plano.fim || !plano.historico || !plano.historico.length) return 0;
    const ultimo = plano.historico[plano.historico.length - 1];
    const total = this.diasEntre(ultimo.de, ultimo.ate) + 1;
    const passou = this.diasEntre(ultimo.de, hoje) + 1;
    return Math.max(0, Math.min(100, Math.round((passou / total) * 100)));
  },

  // Totais para os cartões da tela Contas (só contas de professores, sem o administrador)
  resumo(contas, hoje, config) {
    const r = { pendentes: 0, ativos: 0, vencendo: 0, vencidos: 0, semPlano: 0, bloqueadas: 0, receitaAno: 0 };
    contas.forEach((c) => {
      if (c.status === "pendente") return r.pendentes++;
      if (c.status === "bloqueado") return r.bloqueadas++;
      const sit = this.situacao(c.plano, hoje, config).codigo;
      if (sit === "sem-plano") r.semPlano++;
      else if (sit === "vencendo") { r.vencendo++; r.ativos++; }
      else if (sit === "ativo") r.ativos++;
      else r.vencidos++;
      if (c.plano && c.plano.valor && sit !== "vencido") r.receitaAno += (c.plano.valor / c.plano.meses) * 12;
    });
    r.receitaAno = Math.round(r.receitaAno * 100) / 100;
    return r;
  },

  // Filtro da tela Contas
  filtrar(contas, filtro, hoje, config) {
    return contas.filter((c) => {
      const sit = this.situacao(c.plano, hoje, config).codigo;
      switch (filtro) {
        case "pendentes": return c.status === "pendente";
        case "bloqueadas": return c.status === "bloqueado";
        case "ativos": return c.status === "ativo" && (sit === "ativo" || sit === "vencendo");
        case "vencendo": return c.status === "ativo" && sit === "vencendo";
        case "vencidos": return c.status === "ativo" && (sit === "tolerancia" || sit === "vencido");
        case "sem-plano": return c.status === "ativo" && sit === "sem-plano";
        default: return true;
      }
    });
  },

  // Mensagem de cobrança da renovação para o WhatsApp do cliente
  mensagem(conta, hoje, config, sistema, formasTexto) {
    const sit = this.situacao(conta.plano, hoje, config);
    const nome = String(conta.nome || "").trim().split(/\s+/)[0];
    const data = (iso) => iso.split("-").reverse().join("/");
    const valor = conta.plano && conta.plano.valor
      ? ` O valor do plano ${this.rotulo(conta.plano.meses).toLowerCase()} é R$ ${conta.plano.valor.toFixed(2).replace(".", ",")}.` : "";
    const linhas = [];
    if (sit.codigo === "tolerancia" || sit.codigo === "vencido") {
      linhas.push(`Olá, ${nome}! O seu plano do ${sistema} venceu em ${data(conta.plano.fim)}.${valor}`);
      if (sit.bloqueioEm) linhas.push(`Para não perder o acesso, renove até ${data(sit.bloqueioEm)}.`);
    } else {
      linhas.push(`Olá, ${nome}! O seu plano do ${sistema} vence em ${data(conta.plano.fim)}.${valor}`);
      linhas.push("Para continuar usando sem interrupção, é só renovar.");
    }
    if (formasTexto) linhas.push(`Para pagar: ${formasTexto}`);
    linhas.push("Qualquer dúvida, é só me chamar.");
    return linhas.join("\n");
  },
};

if (typeof module !== "undefined") module.exports = RegrasAssinatura;
