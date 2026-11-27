// Testes das regras de alunos. Para rodar: node --test testes/*.test.js
const { test } = require("node:test");
const assert = require("node:assert");
const R = require("../js/regras/alunos.js");

test("WhatsApp: aceita formatos comuns e guarda só DDD + número", () => {
  assert.equal(R.normalizarWhatsapp("(11) 91234-5678"), "11912345678");
  assert.equal(R.normalizarWhatsapp("+55 11 91234-5678"), "11912345678");
  assert.equal(R.normalizarWhatsapp("1132345678"), "1132345678");
  assert.equal(R.normalizarWhatsapp("91234-5678"), ""); // sem DDD
  assert.equal(R.normalizarWhatsapp("(01) 91234-5678"), ""); // DDD inválido
});

test("WhatsApp: formata e monta o link wa.me", () => {
  assert.equal(R.formatarWhatsapp("11912345678"), "(11) 91234-5678");
  assert.equal(R.linkWhatsapp("11912345678"), "https://wa.me/5511912345678");
  assert.equal(R.linkWhatsapp("11912345678", "Olá, Ana"), "https://wa.me/5511912345678?text=Ol%C3%A1%2C%20Ana");
});

test("CPF: confere os dígitos verificadores", () => {
  assert.equal(R.cpfValido("529.982.247-25"), true);
  assert.equal(R.cpfValido("529.982.247-24"), false);
  assert.equal(R.cpfValido("111.111.111-11"), false);
  assert.equal(R.formatarCpf("52998224725"), "529.982.247-25");
});

test("valor da mensalidade em reais", () => {
  assert.equal(R.lerValor("150"), 150);
  assert.equal(R.lerValor("150,5"), 150.5);
  assert.equal(R.lerValor("1.250,00"), 1250);
  assert.equal(R.lerValor("R$ 99,90"), 99.9);
  assert.ok(Number.isNaN(R.lerValor("abc")));
  assert.equal(R.valorParaCampo(150), "150,00");
});

test("valida o aluno", () => {
  const ok = { nome: "Ana", whatsapp: "11912345678", valor: 150, diaVencimento: 10, status: "ativo" };
  assert.equal(R.validar(ok), "");
  assert.match(R.validar({ ...ok, whatsapp: "" }), /WhatsApp/);
  assert.match(R.validar({ ...ok, valor: 0 }), /valor/);
  assert.match(R.validar({ ...ok, diaVencimento: 32 }), /1 a 31/);
  assert.match(R.validar({ ...ok, cpf: "123" }), /CPF/);
  assert.match(R.validar({ ...ok, email: "ana@" }), /E-mail/);
});

test("busca ignora acentos e maiúsculas, e filtra por situação", () => {
  const alunos = [
    { nome: "João Silva", whatsapp: "11911112222", status: "ativo" },
    { nome: "Ana Souza", whatsapp: "11933334444", status: "trancado" },
    { nome: "Bruna Lima", whatsapp: "11955556666", status: "ativo" },
  ];
  assert.deepEqual(R.filtrar(alunos, { busca: "joao" }).map((a) => a.nome), ["João Silva"]);
  assert.deepEqual(R.filtrar(alunos, {}).map((a) => a.nome), ["Bruna Lima", "João Silva"]);
  assert.deepEqual(R.filtrar(alunos, { status: "todos", busca: "3333" }).map((a) => a.nome), ["Ana Souza"]);
});

test("ocupação conta só alunos ativos por turma", () => {
  const alunos = [
    { status: "ativo", turmas: ["t1", "t2"] },
    { status: "ativo", turmas: ["t1"] },
    { status: "trancado", turmas: ["t1"] },
  ];
  assert.deepEqual(R.ocupacao(alunos), { t1: 2, t2: 1 });
});
