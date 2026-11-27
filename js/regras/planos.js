/*
 * regras/planos.js
 * Planos que o professor oferece (ex.: 3x por semana, trimestral, R$ 420). Só cálculo.
 *
 * Ficam no perfil:  planos: [{ id, vezes, periodo, valor }]
 *   vezes:   treinos por semana (1 a 7) ou null (livre)
 *   periodo: mensal | trimestral | semestral | anual  (de quantos em quantos meses cobra)
 *   valor:   quanto o aluno paga a cada cobrança do período
 * No aluno: planoId (opcional), periodo e valor (copiados do plano, podem ter desconto).
 */
const RegrasPlanos = {
  MAXIMO: 30,

  PERIODOS: [
    { id: "mensal", rotulo: "Mensal", meses: 1 },
    { id: "trimestral", rotulo: "Trimestral", meses: 3 },
    { id: "semestral", rotulo: "Semestral", meses: 6 },
    { id: "anual", rotulo: "Anual", meses: 12 },
  ],

  VEZES: [1, 2, 3, 4, 5, 6, 7],

  periodo(id) {
    return this.PERIODOS.find((p) => p.id === id) || this.PERIODOS[0];
  },

  // De quantos em quantos meses o aluno paga (alunos antigos, sem período: todo mês)
  meses(aluno) {
    return this.periodo(aluno && aluno.periodo).meses;
  },

  // "3x por semana · Trimestral"
  nome(plano) {
    const vezes = plano.vezes ? `${plano.vezes}x por semana` : "Livre";
    return `${vezes} · ${this.periodo(plano.periodo).rotulo}`;
  },

  // Equivalente por mês, para comparar planos ("R$ 140,00 por mês")
  porMes(plano) {
    return Math.round((plano.valor / this.periodo(plano.periodo).meses) * 100) / 100;
  },

  validar(plano) {
    if (!(plano.valor > 0)) return `Informe o valor do plano ${this.nome(plano)}.`;
    if (plano.vezes !== null && !this.VEZES.includes(plano.vezes)) return "Escolha quantas vezes por semana.";
    if (!this.PERIODOS.some((p) => p.id === plano.periodo)) return "Escolha o período do plano.";
    return "";
  },

  // Dois planos iguais (mesmas vezes e período) confundem na hora de escolher
  repetido(planos) {
    const vistos = new Set();
    for (const p of planos) {
      const chave = `${p.vezes}-${p.periodo}`;
      if (vistos.has(chave)) return this.nome(p);
      vistos.add(chave);
    }
    return "";
  },

  // Em ordem: período, depois vezes por semana
  ordenar(planos) {
    const ordem = (id) => this.PERIODOS.findIndex((p) => p.id === id);
    return [...planos].sort((a, b) => ordem(a.periodo) - ordem(b.periodo) || (a.vezes || 99) - (b.vezes || 99));
  },

  // Aviso quando o aluno treina mais dias do que o plano dele permite
  avisoFrequencia(plano, diasPorSemana) {
    if (!plano || !plano.vezes || !diasPorSemana || diasPorSemana <= plano.vezes) return "";
    return `As turmas somam ${diasPorSemana} dias por semana, mas o plano é de ${plano.vezes}x.`;
  },

  novoId() {
    return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },
};

if (typeof module !== "undefined") module.exports = RegrasPlanos;
