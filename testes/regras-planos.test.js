// Testes dos planos (2x a 5x por semana; mensal, trimestral, semestral, anual). Para rodar: node --test testes/*.test.js
const { test } = require("node:test");
const assert = require("node:assert");
const M = require("../js/regras/mensalidades.js");
const P = require("../js/regras/planos.js");

const aluno = (extra) => ({ status: "ativo", diaVencimento: 10, valor: 420, inicio: "2026-03-05", ...extra });
const comps = (a, hoje, cad) => M.paraGerar(a, hoje, cad).map((x) => x.competencia);

test("mensal continua igual: uma cobrança por mês", () => {
  assert.deepEqual(comps(aluno({}), "2026-06-01", "2026-03-01"), ["2026-03", "2026-04", "2026-05", "2026-06"]); // o mês atual sempre entra
});

test("trimestral cobra a cada 3 meses a partir da primeira", () => {
  assert.deepEqual(comps(aluno({ periodo: "trimestral" }), "2026-12-20", "2026-03-01"), ["2026-03", "2026-06", "2026-09", "2026-12"]);
});

test("anual de quem já pagou antes do cadastro só cobra no aniversário do plano", () => {
  assert.deepEqual(comps(aluno({ periodo: "anual" }), "2026-11-27", "2026-11-20"), []);
  assert.deepEqual(comps(aluno({ periodo: "anual" }), "2027-03-06", "2026-11-20"), ["2027-03"]); // D-4: já aparece
});

test("início depois do vencimento do mês: primeira cobrança no mês seguinte", () => {
  assert.deepEqual(comps(aluno({ periodo: "semestral", inicio: "2026-03-15" }), "2026-10-12", "2026-03-15"), ["2026-04", "2026-10"]);
});

test("nome, valor por mês, validação e aviso de frequência", () => {
  const p = { vezes: 3, periodo: "trimestral", valor: 420 };
  assert.equal(P.nome(p), "3x por semana · Trimestral");
  assert.equal(P.porMes(p), 140);
  assert.equal(P.validar({ ...p, valor: 0 }), "Informe o valor do plano 3x por semana · Trimestral.");
  assert.equal(P.repetido([p, { ...p, valor: 400 }]), "3x por semana · Trimestral");
  assert.equal(P.avisoFrequencia(p, 5), "As turmas somam 5 dias por semana, mas o plano é de 3x.");
  assert.equal(P.avisoFrequencia(p, 3), "");
  assert.deepEqual(P.ordenar([{ vezes: 5, periodo: "anual" }, { vezes: 2, periodo: "mensal" }, { vezes: 4, periodo: "mensal" }])
    .map((x) => P.nome(x)), ["2x por semana · Mensal", "4x por semana · Mensal", "5x por semana · Anual"]);
});
