// Testes dos Relatórios. Para rodar: node --test testes/*.test.js
const { test } = require("node:test");
const assert = require("node:assert");
global.RegrasMensalidades = require("../js/regras/mensalidades.js");
const R = require("../js/regras/relatorios.js");

const hoje = "2026-11-27";
const m = (alunoId, vencimento, pagamentos = [], valor = 150) => {
  const valorPago = pagamentos.reduce((s, p) => s + p.valor, 0);
  return { id: `${alunoId}_${vencimento.slice(0, 7)}`, alunoId, valor, valorPago, vencimento, competencia: vencimento.slice(0, 7),
    pagamentos, pagoEm: valorPago >= valor ? pagamentos[pagamentos.length - 1].data : null, forma: pagamentos.length ? pagamentos[pagamentos.length - 1].forma : null };
};
const alunos = [
  { id: "a", nome: "Ana", status: "ativo", turmas: ["t1"] },
  { id: "b", nome: "Beto; o \"Grande\"", status: "ativo", turmas: ["t1", "t2"] },
  { id: "c", nome: "Carla", status: "ativo", turmas: [] },
  { id: "d", nome: "Davi", status: "trancado", turmas: ["t1"] },
];
const mens = [
  m("a", "2026-11-10", [{ data: "2026-11-10", valor: 150, forma: "pix" }]),
  m("b", "2026-11-20", [{ data: "2026-11-21", valor: 50, forma: "cartao" }]),
  m("b", "2026-10-20"),
  m("c", "2026-11-30"),
];

test("recebido x a receber e inadimplência do mês", () => {
  const r = R.resumoDoMes(mens, "2026-11", hoje);
  assert.equal(r.total, 450);
  assert.equal(r.recebido, 200);
  assert.equal(r.aReceber, 250);
  assert.equal(r.percentualRecebido, 44);
  assert.equal(r.atrasoValor, 100);
  assert.equal(r.inadimplencia, 22.2);
  assert.equal(r.pagas, 1);
});

test("recebido por forma de pagamento", () => {
  assert.deepEqual(R.porForma(mens, "2026-11").map((x) => [x.rotulo, x.valor]), [["Pix", 150], ["Cartão", 50]]);
});

test("inadimplentes somam todos os meses atrasados do aluno", () => {
  const lista = R.inadimplentes(mens, alunos, hoje);
  assert.equal(lista.length, 1);
  assert.deepEqual([lista[0].alunoId, lista[0].quantidade, lista[0].devendo, lista[0].maisAntigo, lista[0].dias],
    ["b", 2, 250, "2026-10-20", 38]);
});

test("alunos por turma contam só ativos e mostram quem está sem turma", () => {
  const t = R.porTurma([{ id: "t1", nome: "Manhã", vagas: 2 }, { id: "t2", nome: "Noite" }], alunos);
  assert.deepEqual(t.turmas.map((x) => [x.turma.nome, x.quantidade, x.lotada]), [["Manhã", 2, true], ["Noite", 1, false]]);
  assert.deepEqual(t.semTurma, ["Carla"]);
});

test("CSV no padrão do Excel em português, com aspas quando precisa", () => {
  const csv = R.csv(R.linhasDoMes(mens, alunos, "2026-11", hoje)).split("\r\n");
  assert.equal(csv[0], "Aluno;Vencimento;Valor (R$);Pago (R$);Saldo (R$);Situação;Pago em;Forma");
  assert.equal(csv[1], "Ana;10/11/2026;150,00;150,00;0,00;Paga;10/11/2026;Pix");
  assert.equal(csv[2], "\"Beto; o \"\"Grande\"\"\";20/11/2026;150,00;50,00;100,00;Atrasada 7 dias (parcial);;Cartão");
  assert.equal(csv.length, 4);
});
