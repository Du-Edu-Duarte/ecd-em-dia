// Testes das regras de turmas. Para rodar: node --test testes/*.test.js
// (precisa do Node.js 18 ou mais novo; não precisa instalar nada)
const { test } = require("node:test");
const assert = require("node:assert");
const R = require("../js/regras/turmas.js");

const segQuaSex = { nome: "Funcional manhã", diasSemana: [1, 3, 5], inicio: "06:00", fim: "07:00" };
const terQui = { nome: "Treino noite", diasSemana: [2, 4], inicio: "19:00", fim: "20:00" };
const seg19 = { nome: "Segunda noite", diasSemana: [1], inicio: "19:00", fim: "20:00" };

test("mostra os dias por extenso curto", () => {
  assert.equal(R.diasTexto([5, 1, 3]), "Seg, Qua e Sex");
  assert.equal(R.diasTexto([1, 2]), "Seg e Ter");
  assert.equal(R.diasTexto([7]), "Dom");
});

test("dias por semana a partir das turmas", () => {
  assert.equal(R.diasPorSemana([segQuaSex]), 3);
  assert.equal(R.diasPorSemana([segQuaSex, terQui]), 5);
  assert.equal(R.diasPorSemana([segQuaSex, seg19]), 3); // duas turmas na segunda = 1 dia
});

test("treinos no mês contam as aulas do calendário", () => {
  assert.equal(R.treinosNoMes([segQuaSex], 2026, 12), 13); // dez/2026: 4 seg + 5 qua + 4 sex
  assert.equal(R.treinosNoMes([terQui], 2027, 2), 8);      // fev/2027: 4 ter + 4 qui
});

test("valida os campos da turma", () => {
  assert.match(R.validar({ ...segQuaSex, nome: "" }), /nome/);
  assert.match(R.validar({ ...segQuaSex, diasSemana: [] }), /dia/);
  assert.match(R.validar({ ...segQuaSex, fim: "05:00" }), /depois/);
  assert.match(R.validar({ ...segQuaSex, vagas: 0 }), /Vagas/);
  assert.equal(R.validar({ ...segQuaSex, vagas: null }), "");
});

test("ordena por dia e horário", () => {
  assert.deepEqual(R.ordenar([terQui, seg19, segQuaSex]).map((t) => t.nome),
    ["Funcional manhã", "Segunda noite", "Treino noite"]);
});
