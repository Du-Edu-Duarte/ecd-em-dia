// Testes das formas de pagamento. Para rodar: node --test testes/*.test.js
const { test } = require("node:test");
const assert = require("node:assert");
const R = require("../js/regras/formas.js");

const formas = [
  { id: "a", tipo: "pix", nome: "", valor: "rafa@pix.com" },
  { id: "b", tipo: "link", nome: "Mercado Pago", valor: "https://mpago.la/x" },
  { id: "c", tipo: "outro", nome: "Transferência", valor: "Nubank, ag 0001, conta 123" },
];

test("perfil antigo vira lista, perfil novo é usado como está", () => {
  assert.deepEqual(R.doPerfil({ formasPagamento: { pix: "123", linkBoleto: "https://b" } }).map((f) => f.tipo), ["pix", "boleto"]);
  assert.equal(R.doPerfil({ formas, formasPagamento: { pix: "velho" } }).length, 3);
  assert.deepEqual(R.doPerfil({ formas: [{ id: "x", tipo: "pix", valor: "  " }] }), []);
  assert.deepEqual(R.doPerfil({}), []);
});

test("forma preferida do aluno, valores antigos e 'todas'", () => {
  assert.equal(R.paraMensagem(formas, "b").texto, "Cartão (Mercado Pago): https://mpago.la/x");
  assert.equal(R.paraMensagem(formas, "pix").texto, "Pix, chave rafa@pix.com");             // valor antigo
  assert.equal(R.paraMensagem(formas, "boleto").texto.split("\n").length, 3);                // sem boleto: manda todas
  assert.equal(R.paraMensagem(formas, "todas").texto,
    "Pix, chave rafa@pix.com\nCartão (Mercado Pago): https://mpago.la/x\nTransferência: Nubank, ag 0001, conta 123");
  assert.equal(R.paraMensagem(formas, "removida").texto.split("\n").length, 3);
  assert.deepEqual(R.paraMensagem([], "todas"), { texto: "", ok: false });
});

test("recebimento sugerido e validação", () => {
  assert.equal(R.recebimentoSugerido(formas, "b"), "cartao");
  assert.equal(R.recebimentoSugerido(formas, "c"), "outro");
  assert.equal(R.recebimentoSugerido(formas, "todas"), "pix");
  assert.match(R.validar({ tipo: "boleto", valor: "boleto.com" }), /https/);
  assert.match(R.validar({ tipo: "pix", valor: "" }), /Preencha/);
  assert.equal(R.validar({ tipo: "outro", valor: "Dinheiro na aula" }), "");
  assert.equal(R.rotulo({ tipo: "outro", nome: "", valor: "x" }), "Outra forma");
});
