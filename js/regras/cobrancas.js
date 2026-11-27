/*
 * regras/cobrancas.js
 * Quem precisa ser cobrado hoje e qual texto usar. Só cálculo, sem tela.
 *
 * Régua: d5 (faltam 5 dias), d1 (falta 1 dia), hoje (vence hoje), atraso (venceu e não pagou).
 * Não entra: mensalidade paga, aluno trancado ou inativo, aluno com lembretes desligados.
 * Atrasados aparecem todo dia, com a data da última cobrança, até o pagamento.
 * (Se o atraso deve ser lembrado só a cada 3 ou 7 dias ainda está em aberto com o cliente.)
 */
const RegrasCobrancas = {
  // Tipo de lembrete que cabe HOJE para a mensalidade, ou "" se não for dia de lembrete
  tipoDeHoje(m, hoje) {
    const sit = RegrasMensalidades.situacao(m, hoje);
    if (sit.codigo === "paga") return "";
    if (sit.codigo === "atrasada") return "atraso";
    if (sit.codigo === "hoje") return "hoje";
    if (sit.dias === 1) return "d1";
    if (sit.dias === RegrasMensalidades.DIAS_AVISO) return "d5";
    return "";
  },

  // Texto mais adequado para uma cobrança feita fora da régua (botão Cobrar)
  tipoDoTexto(m, hoje) {
    const sit = RegrasMensalidades.situacao(m, hoje);
    if (sit.codigo === "atrasada") return "atraso";
    if (sit.codigo === "hoje") return "hoje";
    if (sit.dias === 1) return "d1";
    return "d5";
  },

  // Lista de cobranças de hoje, separada por tipo
  deHoje(mensalidades, alunos, envios, hoje) {
    const grupos = { d5: [], d1: [], hoje: [], atraso: [] };
    mensalidades.forEach((m) => {
      const aluno = alunos.find((a) => a.id === m.alunoId);
      if (!aluno || aluno.status !== "ativo" || aluno.lembretesAtivos === false) return;
      const tipo = this.tipoDeHoje(m, hoje);
      if (!tipo) return;
      const enviosDela = envios.filter((e) => e.mensalidadeId === m.id).sort((a, b) => (b.dia || "").localeCompare(a.dia || ""));
      const enviadoHoje = enviosDela.some((e) => e.dia === hoje);
      grupos[tipo].push({ m, aluno, tipo, enviadoHoje, ultimoEnvio: enviosDela[0] || null });
    });
    // Quem ainda não recebeu hoje vem primeiro; atrasados mais antigos antes
    Object.values(grupos).forEach((lista) => lista.sort((a, b) =>
      a.enviadoHoje - b.enviadoHoje || a.m.vencimento.localeCompare(b.m.vencimento) || a.aluno.nome.localeCompare(b.aluno.nome, "pt-BR")));
    return grupos;
  },

  primeiroNome(nome) {
    return String(nome || "").trim().split(/\s+/)[0];
  },

  // Valores das variáveis da mensagem para uma mensalidade
  valores(m, aluno, perfil, hoje, link) {
    const enc = RegrasMensalidades.encargos(m, hoje, (perfil || {}).config);
    return {
      nome: this.primeiroNome(aluno.nome),
      valor: Formato.dinheiro(enc.total),
      vencimento: Formato.data(m.vencimento),
      link,
      professor: (perfil || {}).nome || "",
    };
  },
};

if (typeof module !== "undefined") module.exports = RegrasCobrancas;
