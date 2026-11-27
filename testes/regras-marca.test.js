// Testes da marca do professor (logo e cores). Para rodar: node --test testes/*.test.js
const { test } = require("node:test");
const assert = require("node:assert");
const R = require("../js/regras/marca.js");

test("cores do ECD passam e cores ilegíveis são recusadas", () => {
  assert.equal(R.validar({ corTopo: "#15110A", corDestaque: "#E2B454" }), "");
  assert.match(R.validar({ corTopo: "#F5C518" }), /clara demais/);
  assert.match(R.validar({ corDestaque: "#202020" }), /escura demais/);
  assert.match(R.validar({ corTopo: "amarelo" }), /inválida/);
  assert.match(R.validar({ logo: "data:image/gif;base64,AAA" }), /grande demais|menor/);
  assert.equal(R.validar({}), "");
});

test("sugere cinza escuro no topo e amarelo no destaque a partir de um logo como o do cliente", () => {
  const pixels = [];
  for (let i = 0; i < 700; i++) pixels.push([38, 38, 38]);     // fundo cinza escuro
  for (let i = 0; i < 250; i++) pixels.push([242, 194, 27]);   // amarelo do desenho
  for (let i = 0; i < 50; i++) pixels.push([20, 20, 20]);      // contorno
  assert.deepEqual(R.sugerirCores(pixels), { corTopo: "#262626", corDestaque: "#F2C21B" });
});

test("logo sem cor viva não sugere destaque", () => {
  assert.deepEqual(R.sugerirCores([[0, 0, 0], [255, 255, 255]]), { corTopo: "#000000", corDestaque: "" });
});
