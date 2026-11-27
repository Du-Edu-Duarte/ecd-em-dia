/*
 * regras/turmas.js
 * Regras das turmas, sem tela e sem Firebase (só cálculo).
 * Ficam separadas para poderem ser testadas sozinhas e reaproveitadas
 * no cadastro de alunos (etapa 4).
 *
 * Dias da semana: 1 = segunda ... 7 = domingo (padrão ISO).
 */
const RegrasTurmas = {
  DIAS: [
    { n: 1, curto: "Seg", longo: "Segunda" },
    { n: 2, curto: "Ter", longo: "Terça" },
    { n: 3, curto: "Qua", longo: "Quarta" },
    { n: 4, curto: "Qui", longo: "Quinta" },
    { n: 5, curto: "Sex", longo: "Sexta" },
    { n: 6, curto: "Sáb", longo: "Sábado" },
    { n: 7, curto: "Dom", longo: "Domingo" },
  ],

  // [1, 3, 5] -> "Seg, Qua e Sex"
  diasTexto(dias) {
    const nomes = [...(dias || [])].sort((a, b) => a - b)
      .map((n) => (this.DIAS.find((d) => d.n === n) || {}).curto).filter(Boolean);
    if (nomes.length <= 1) return nomes.join("");
    return nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1];
  },

  // "06:00" -> 360 (minutos desde a meia-noite)
  minutos(hora) {
    const [h, m] = String(hora || "").split(":").map(Number);
    return h * 60 + m;
  },

  // Confere os campos. Devolve a mensagem de erro, ou "" se estiver tudo certo.
  validar(t) {
    if (!t.nome || !t.nome.trim()) return "Informe o nome da turma.";
    if (!t.diasSemana || !t.diasSemana.length) return "Escolha pelo menos um dia da semana.";
    if (!/^\d{2}:\d{2}$/.test(t.inicio || "")) return "Informe o horário de início.";
    if (!/^\d{2}:\d{2}$/.test(t.fim || "")) return "Informe o horário de fim.";
    if (this.minutos(t.fim) <= this.minutos(t.inicio)) return "O fim precisa ser depois do início.";
    if (t.vagas !== null && t.vagas !== undefined && (!Number.isInteger(t.vagas) || t.vagas < 1))
      return "Vagas precisa ser um número inteiro maior que zero, ou ficar em branco.";
    return "";
  },

  // Ordena pela semana: primeiro dia da turma e depois o horário de início
  ordenar(turmas) {
    return [...turmas].sort((a, b) =>
      Math.min(...a.diasSemana) - Math.min(...b.diasSemana) ||
      this.minutos(a.inicio) - this.minutos(b.inicio) ||
      a.nome.localeCompare(b.nome, "pt-BR"));
  },

  // Dias diferentes por semana em que o aluno treina.
  // Duas turmas na segunda contam como 1 dia.
  diasPorSemana(turmas) {
    const dias = new Set();
    turmas.forEach((t) => (t.diasSemana || []).forEach((d) => dias.add(d)));
    return dias.size;
  },

  // Quantos treinos (aulas) o aluno tem num mês: para cada turma, conta
  // quantas vezes os dias dela aparecem no calendário daquele mês.
  // mes: 1 a 12.
  treinosNoMes(turmas, ano, mes) {
    const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    let total = 0;
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const js = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay(); // 0 = domingo
      const iso = js === 0 ? 7 : js;
      turmas.forEach((t) => {
        if ((t.diasSemana || []).includes(iso)) total++;
      });
    }
    return total;
  },
};

// Permite usar o mesmo arquivo nos testes com Node
if (typeof module !== "undefined") module.exports = RegrasTurmas;
