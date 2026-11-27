// Testes do plano do sistema (o que o cliente compra da ECD). Para rodar: node --test testes/*.test.js
const { test } = require("node:test");
const assert = require("node:assert");
const R = require("../js/regras/assinatura.js");
const cfg = { diasAviso: 15 };

test("primeiro plano anual começa hoje e vai até a véspera de um ano depois", () => {
  const p = R.renovar(null, 12, 600, "2026-11-27", 7);
  assert.deepEqual([p.inicio, p.fim, p.liberadoAte], ["2026-11-27", "2027-11-26", "2027-12-03"]);
  assert.equal(p.historico.length, 1);
});

test("renovar antes de vencer soma depois do fim; depois de vencido começa hoje", () => {
  const p = R.renovar(null, 3, 180, "2026-01-31", 7);              // 31/01 a 30/04
  assert.equal(p.fim, "2026-04-30");
  const antes = R.renovar(p, 1, 70, "2026-04-20", 7);             // ainda valendo
  assert.deepEqual([antes.inicio, antes.fim], ["2026-01-31", "2026-05-31"]);
  const depois = R.renovar(p, 1, 70, "2026-05-10", 7);            // já tinha vencido
  assert.deepEqual([depois.historico[1].de, depois.fim], ["2026-05-10", "2026-06-09"]);
  assert.equal(R.renovar(null, 1, 70, "2026-05-10", null).liberadoAte, null); // não trava sozinho
});

test("situação: ativo, vencendo, tolerância e vencido", () => {
  const p = R.renovar(null, 12, 600, "2026-01-01", 7);           // fim 2026-12-31, trava depois de 2027-01-07
  assert.equal(R.situacao(p, "2026-06-01", cfg).codigo, "ativo");
  assert.deepEqual(R.situacao(p, "2026-12-20", cfg), { codigo: "vencendo", rotulo: "Faltam 11 dias", dias: 11 });
  assert.equal(R.situacao(p, "2026-12-31", cfg).rotulo, "Vence hoje");
  assert.deepEqual(R.situacao(p, "2027-01-03", cfg), { codigo: "tolerancia", rotulo: "Venceu há 3 dias", dias: 3, bloqueioEm: "2027-01-07" });
  assert.equal(R.situacao(p, "2027-01-08", cfg).codigo, "vencido");
  assert.equal(R.situacao(null, "2027-01-08", cfg).codigo, "sem-plano");
  assert.equal(R.usado(p, "2026-07-02"), 50);
});

test("resumo e filtros da tela Contas", () => {
  const hoje = "2026-11-27";
  const contas = [
    { status: "pendente" },
    { status: "bloqueado" },
    { status: "ativo", plano: null },
    { status: "ativo", plano: R.renovar(null, 12, 600, "2026-06-01", 7) },   // ativo
    { status: "ativo", plano: R.renovar(null, 1, 70, "2026-11-05", 7) },     // vence 04/12: vencendo
    { status: "ativo", plano: R.renovar(null, 1, 70, "2026-10-01", 7) },     // venceu 31/10: travado
  ];
  const r = R.resumo(contas, hoje, cfg);
  assert.deepEqual([r.pendentes, r.bloqueadas, r.semPlano, r.ativos, r.vencendo, r.vencidos], [1, 1, 1, 2, 1, 1]);
  assert.equal(r.receitaAno, 600 + 840);
  assert.equal(R.filtrar(contas, "vencidos", hoje, cfg).length, 1);
  assert.equal(R.filtrar(contas, "vencendo", hoje, cfg).length, 1);
});

test("mensagem de renovação com a forma de pagamento", () => {
  const conta = { nome: "Thalison Silva", plano: R.renovar(null, 12, 600, "2025-12-01", 7) };
  const msg = R.mensagem(conta, "2026-11-20", cfg, "ECD Em Dia", "Pix, chave ecd@pix.com").split("\n");
  assert.equal(msg[0], "Olá, Thalison! O seu plano do ECD Em Dia vence em 30/11/2026. O valor do plano anual é R$ 600,00.");
  assert.equal(msg[2], "Para pagar: Pix, chave ecd@pix.com");
  const venceu = R.mensagem(conta, "2026-12-02", cfg, "ECD Em Dia", "").split("\n");
  assert.equal(venceu[1], "Para não perder o acesso, renove até 07/12/2026.");
});
