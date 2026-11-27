// Testes dos textos dos lembretes. Para rodar: node --test testes/*.test.js
const { test } = require("node:test");
const assert = require("node:assert");
const R = require("../js/regras/mensagens.js");

test("troca as variáveis do texto", () => {
  const t = R.montar("Oi {nome}, {valor} vence {vencimento}. {link} {professor}", {
    nome: "Ana", valor: "R$ 150,00", vencimento: "10/12/2026", link: "Pix, chave a@b.com", professor: "Prof. Rafa",
  });
  assert.equal(t, "Oi Ana, R$ 150,00 vence 10/12/2026. Pix, chave a@b.com Prof. Rafa");
});

test("usa o texto padrão quando o professor não escreveu nada", () => {
  assert.equal(R.modelo("hoje", {}), R.PADRAO.hoje);
  assert.equal(R.modelo("hoje", { hoje: "  " }), R.PADRAO.hoje);
  assert.equal(R.modelo("hoje", { hoje: "Meu texto" }), "Meu texto");
  assert.match(R.PADRAO.hoje, /Hoje/);
});

test("acha variáveis escritas errado", () => {
  assert.deepEqual(R.variaveisDesconhecidas("Oi {nme}, {valor} {link"), ["{nme}", "{link"]);
  assert.deepEqual(R.variaveisDesconhecidas(R.PADRAO.atraso), []);
});
