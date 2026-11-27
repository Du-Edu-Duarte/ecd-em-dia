// Confere se o aplicativo instalável está completo. Para rodar: node --test testes/*.test.js
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const raiz = path.join(__dirname, "..");
const ler = (f) => fs.readFileSync(path.join(raiz, f), "utf8");

test("todo arquivo carregado no index.html está na lista do service worker", () => {
  const scripts = [...ler("index.html").matchAll(/src="(js\/[^"]+)"/g)].map((m) => m[1]);
  const sw = ler("sw.js");
  const faltando = scripts.filter((s) => !sw.includes(`"${s}"`));
  assert.deepEqual(faltando, []);
});

test("todo arquivo da lista do service worker existe", () => {
  const lista = [...ler("sw.js").split("const ARQUIVOS = [")[1].split("];")[0].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const faltando = lista.filter((f) => f !== "./" && !fs.existsSync(path.join(raiz, f)));
  assert.deepEqual(faltando, []);
});

test("manifesto com ícones 192, 512 e maskable que existem", () => {
  const m = JSON.parse(ler("manifest.webmanifest"));
  assert.equal(m.display, "standalone");
  const tamanhos = m.icons.map((i) => `${i.sizes} ${i.purpose}`);
  assert.ok(tamanhos.includes("192x192 any") && tamanhos.includes("512x512 any") && tamanhos.includes("512x512 maskable"));
  m.icons.forEach((i) => assert.ok(fs.existsSync(path.join(raiz, i.src)), i.src));
});
