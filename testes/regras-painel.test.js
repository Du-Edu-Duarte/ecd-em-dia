// Testes do Painel. Para rodar: node --test testes/*.test.js
const { test } = require("node:test");
const assert = require("node:assert");
global.RegrasMensalidades = require("../js/regras/mensalidades.js");
const R = require("../js/regras/painel.js");

const hoje = "2026-11-27";
const m = (alunoId, vencimento, valorPago = 0, valor = 150) =>
  ({ id: `${alunoId}_${vencimento.slice(0, 7)}`, alunoId, valor, valorPago, vencimento, competencia: vencimento.slice(0, 7) });
const aluno = (id, status = "ativo") => ({ id, nome: `Aluno ${id}`, status });

const alunos = [aluno("pago"), aluno("atr"), aluno("hoje"), aluno("d3"), aluno("longe"), aluno("tr", "trancado")];
const mens = [
  m("pago", "2026-11-10", 150),
  m("atr", "2026-10-10"), m("atr", "2026-11-10", 50),
  m("hoje", "2026-11-27"),
  m("d3", "2026-11-30"),
  m("longe", "2026-11-05", 150), m("longe", "2026-12-20"),
  m("tr", "2026-11-01"),
];

test("cartões: a receber e recebido do mês, atraso de todos os meses, alunos ativos", () => {
  const c = R.cartoes(mens, alunos, hoje);
  // novembro: pago 150, atr 50 pago (saldo 100), hoje 150, d3 150, longe 150 pago, tr 150
  assert.equal(c.recebido, 350);
  assert.equal(c.aReceber, 100 + 150 + 150 + 150);
  assert.equal(c.atrasoQtd, 3);            // atr out, atr nov, tr nov
  assert.equal(c.atrasoValor, 150 + 100 + 150);
  assert.equal(c.ativos, 5);
});

test("filtros por aluno: pendentes, em dia, hoje, 5 dias, atrasados", () => {
  const itens = R.porAluno(mens, alunos, hoje);
  const ids = (f) => R.filtrar(itens, f).map((x) => x.aluno.id);
  assert.deepEqual(ids("pendentes"), ["atr", "hoje", "d3", "longe"]);
  assert.deepEqual(ids("emdia"), ["hoje", "d3", "longe", "pago"]);
  assert.deepEqual(ids("hoje"), ["hoje"]);
  assert.deepEqual(ids("breve"), ["d3"]);
  assert.deepEqual(ids("atrasados"), ["atr"]);
  assert.deepEqual(R.contagem(itens), { pendentes: 4, emdia: 4, hoje: 1, breve: 1, atrasados: 1 });
});

test("aluno com dois meses atrasados mostra o mais antigo e a soma devida", () => {
  const item = R.porAluno(mens, alunos, hoje).find((x) => x.aluno.id === "atr");
  assert.equal(item.principal.m.vencimento, "2026-10-10");
  assert.equal(item.atrasadas, 2);
  assert.equal(item.devendo, 250);
});

test("próximos vencimentos: só não pagos de hoje em diante, agrupados por dia", () => {
  const dias = R.proximos(mens, alunos, hoje);
  assert.deepEqual(dias.map((d) => [d.dia, d.itens.map((x) => x.aluno.id)]),
    [["2026-11-27", ["hoje"]], ["2026-11-30", ["d3"]], ["2026-12-20", ["longe"]]]);
});
