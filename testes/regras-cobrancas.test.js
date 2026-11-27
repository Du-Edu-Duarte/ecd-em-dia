// Testes de quem entra em "Cobranças de hoje". Para rodar: node --test testes/*.test.js
const { test } = require("node:test");
const assert = require("node:assert");
global.RegrasMensalidades = require("../js/regras/mensalidades.js");
const R = require("../js/regras/cobrancas.js");

const hoje = "2026-11-27";
const m = (id, vencimento, valorPago = 0) => ({ id, alunoId: id, valor: 150, valorPago, vencimento });
const aluno = (id, extra = {}) => ({ id, nome: `Aluno ${id}`, status: "ativo", ...extra });

test("tipo de lembrete do dia: D-5, D-1, no dia e atraso", () => {
  assert.equal(R.tipoDeHoje(m("a", "2026-12-02"), hoje), "d5");
  assert.equal(R.tipoDeHoje(m("a", "2026-11-28"), hoje), "d1");
  assert.equal(R.tipoDeHoje(m("a", "2026-11-27"), hoje), "hoje");
  assert.equal(R.tipoDeHoje(m("a", "2026-11-26"), hoje), "atraso");
  assert.equal(R.tipoDeHoje(m("a", "2026-11-30"), hoje), "");          // D-3: não é dia de lembrete
  assert.equal(R.tipoDeHoje(m("a", "2026-11-20", 150), hoje), "");     // paga
});

test("Cobranças de hoje mostra exatamente D-5, D-1, hoje e atrasados", () => {
  const mens = [m("d5", "2026-12-02"), m("d1", "2026-11-28"), m("hj", "2026-11-27"), m("at", "2026-11-10"),
    m("d3", "2026-11-30"), m("pg", "2026-11-05", 150), m("tr", "2026-11-10"), m("off", "2026-11-10")];
  const alunos = ["d5", "d1", "hj", "at", "d3", "pg"].map((id) => aluno(id))
    .concat(aluno("tr", { status: "trancado" }), aluno("off", { lembretesAtivos: false }));
  const g = R.deHoje(mens, alunos, [], hoje);
  assert.deepEqual(Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.map((x) => x.m.id)])),
    { d5: ["d5"], d1: ["d1"], hoje: ["hj"], atraso: ["at"] });
});

test("marca quem já recebeu hoje e manda para o fim", () => {
  const mens = [m("a", "2026-11-10"), m("b", "2026-11-12")];
  const envios = [{ mensalidadeId: "a", dia: hoje }];
  const g = R.deHoje(mens, [aluno("a"), aluno("b")], envios, hoje);
  assert.deepEqual(g.atraso.map((x) => [x.m.id, x.enviadoHoje]), [["b", false], ["a", true]]);
});

test("usa o primeiro nome na mensagem", () => {
  assert.equal(R.primeiroNome("  Ana Clara Souza "), "Ana");
});

test("atraso volta a aparecer 2 dias depois da última cobrança", () => {
  const mens = [m("at", "2026-11-20")];
  const alunos = [aluno("at")];
  const envio = (dia, tipo = "atraso") => ({ mensalidadeId: "at", dia, tipo });
  const ids = (envios, dia) => R.deHoje(mens, alunos, envios, dia).atraso.map((x) => x.m.id);
  assert.deepEqual(ids([], "2026-11-21"), ["at"]);                               // 1º dia de atraso
  assert.deepEqual(ids([envio("2026-11-21")], "2026-11-21"), ["at"]);            // enviado hoje: continua, como "Enviar de novo"
  assert.deepEqual(ids([envio("2026-11-21")], "2026-11-22"), []);                // dia seguinte: descansa
  assert.deepEqual(ids([envio("2026-11-21")], "2026-11-23"), ["at"]);            // 2 dias depois: de novo
  assert.deepEqual(ids([envio("2026-11-21")], "2026-11-25"), ["at"]);            // professor pulou: aparece
  assert.deepEqual(ids([envio("2026-11-19", "d1")], "2026-11-21"), ["at"]);      // lembrete de antes do vencimento não conta
});
