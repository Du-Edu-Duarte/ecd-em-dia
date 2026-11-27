// Testes das regras de mensalidades. Para rodar: node --test testes/*.test.js
const { test } = require("node:test");
const assert = require("node:assert");
const R = require("../js/regras/mensalidades.js");

test("vencimento dia 31 em fevereiro cai no último dia do mês", () => {
  assert.equal(R.vencimentoEm(2027, 2, 31), "2027-02-28");
  assert.equal(R.vencimentoEm(2028, 2, 31), "2028-02-29"); // ano bissexto
  assert.equal(R.vencimentoEm(2026, 4, 31), "2026-04-30");
  assert.equal(R.vencimentoEm(2026, 12, 10), "2026-12-10");
});

test("situação: em dia, vence em breve, vence hoje e atrasada", () => {
  const hoje = "2026-11-27";
  const m = (vencimento, valorPago = 0) => ({ valor: 150, valorPago, vencimento });
  assert.equal(R.situacao(m("2026-11-10", 150), hoje).codigo, "paga");
  assert.equal(R.situacao(m("2026-12-02"), hoje).codigo, "breve");    // D-5
  assert.equal(R.situacao(m("2026-12-02"), hoje).rotulo, "Vence em 5 dias");
  assert.equal(R.situacao(m("2026-11-28"), hoje).rotulo, "Vence amanhã"); // D-1
  assert.equal(R.situacao(m("2026-11-27"), hoje).codigo, "hoje");
  assert.equal(R.situacao(m("2026-12-03"), hoje).codigo, "aberta");   // D-6
  const atrasada = R.situacao(m("2026-11-26"), hoje);                // atraso conta a partir do dia seguinte
  assert.equal(atrasada.codigo, "atrasada");
  assert.equal(atrasada.rotulo, "Atrasada 1 dia");
  const parcial = R.situacao(m("2026-11-20", 100), hoje);
  assert.equal(parcial.parcial, true);
  assert.equal(parcial.saldo, 50);
});

test("gera do início até o mês atual, mais o próximo se vencer em até 5 dias", () => {
  const aluno = { status: "ativo", valor: 150, diaVencimento: 1, inicio: "2026-10-15" };
  // início 15/10 com vencimento dia 1: a primeira é 01/11; 01/12 está a 4 dias de 27/11
  assert.deepEqual(R.paraGerar(aluno, "2026-11-27", "2026-10-15").map((x) => x.vencimento), ["2026-11-01", "2026-12-01"]);
  // vencimento dia 10: 10/10 é antes do início (fica de fora) e 10/12 ainda está longe
  assert.deepEqual(R.paraGerar({ ...aluno, diaVencimento: 10 }, "2026-11-27", "2026-10-15").map((x) => x.competencia), ["2026-11"]);
});

test("não cobra meses antes do cadastro no sistema", () => {
  const aluno = { status: "ativo", valor: 150, diaVencimento: 5, inicio: "2025-01-01" };
  assert.deepEqual(R.paraGerar(aluno, "2026-11-27", "2026-11-20").map((x) => x.competencia), ["2026-11"]);
});

test("aluno trancado ou inativo não gera mensalidade", () => {
  const aluno = { valor: 150, diaVencimento: 5, inicio: "2026-11-01" };
  assert.equal(R.paraGerar({ ...aluno, status: "trancado" }, "2026-11-27").length, 0);
  assert.equal(R.paraGerar({ ...aluno, status: "inativo" }, "2026-11-27").length, 0);
});

test("pagamento parcial e depois completo", () => {
  const m = { valor: 150, valorPago: 0, pagamentos: [] };
  const p1 = R.registrarPagamento(m, { data: "2026-11-10", valor: 100, forma: "pix" });
  assert.equal(p1.status, "parcial");
  assert.equal(p1.pagoEm, null);
  const p2 = R.registrarPagamento({ ...m, ...p1 }, { data: "2026-11-12", valor: 50, forma: "pix" });
  assert.equal(p2.status, "paga");
  assert.equal(p2.pagoEm, "2026-11-12");
  assert.equal(p2.valorPago, 150);
  const desfeito = R.removerPagamento({ ...m, ...p2 }, 1);
  assert.equal(desfeito.status, "parcial");
});

test("valida o pagamento", () => {
  const m = { valor: 150, valorPago: 100 };
  assert.match(R.validarPagamento({ data: "2026-11-10", valor: 60 }, m), /saldo/);
  assert.match(R.validarPagamento({ data: "", valor: 50 }, m), /data/);
  assert.equal(R.validarPagamento({ data: "2026-11-10", valor: 50 }, m), "");
});

test("resumo do mês", () => {
  const hoje = "2026-11-27";
  const r = R.resumo([
    { valor: 150, valorPago: 150, vencimento: "2026-11-05" },
    { valor: 200, valorPago: 50, vencimento: "2026-11-10" },
    { valor: 100, valorPago: 0, vencimento: "2026-11-30" },
  ], hoje);
  assert.deepEqual(r, { total: 450, recebido: 200, aReceber: 250, atrasoValor: 150, atrasoQtd: 1 });
});
