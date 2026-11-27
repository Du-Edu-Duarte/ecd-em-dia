/*
 * regras/alunos.js
 * Regras do cadastro de alunos, sem tela e sem Firebase (só cálculo e validação).
 */
const RegrasAlunos = {
  STATUS: [
    { id: "ativo", rotulo: "Ativo" },
    { id: "trancado", rotulo: "Trancado" },
    { id: "inativo", rotulo: "Inativo" },
  ],

  FORMAS: [
    { id: "pix", rotulo: "Pix" },
    { id: "cartao", rotulo: "Cartão de crédito" },
    { id: "boleto", rotulo: "Boleto" },
  ],

  somenteNumeros(texto) {
    return String(texto || "").replace(/\D/g, "");
  },

  // Aceita "(11) 91234-5678", "11912345678" ou "+55 11 91234-5678".
  // Devolve só DDD + número (10 ou 11 dígitos), ou "" se não for válido.
  normalizarWhatsapp(texto) {
    let n = this.somenteNumeros(texto);
    if (n.length >= 12 && n.startsWith("55")) n = n.slice(2);
    if (n.length !== 10 && n.length !== 11) return "";
    if (Number(n.slice(0, 2)) < 11) return ""; // DDDs do Brasil vão de 11 a 99
    return n;
  },

  // "11912345678" -> "(11) 91234-5678"
  formatarWhatsapp(n) {
    if (!n) return "";
    return n.length === 11
      ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
      : `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  },

  // Link para abrir a conversa no WhatsApp (com texto opcional)
  linkWhatsapp(n, texto) {
    const base = `https://wa.me/55${n}`;
    return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
  },

  // Confere os dígitos verificadores do CPF
  cpfValido(texto) {
    const c = this.somenteNumeros(texto);
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    const digito = (base) => {
      let soma = 0;
      for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };
    return digito(c.slice(0, 9)) === Number(c[9]) && digito(c.slice(0, 10)) === Number(c[10]);
  },

  formatarCpf(texto) {
    const c = this.somenteNumeros(texto);
    return c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : c;
  },

  // "150", "150,5", "1.250,00", "R$ 99,90" -> número em reais (ou NaN)
  lerValor(texto) {
    const limpo = String(texto || "").replace(/[R$\s]/g, "");
    if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo)) return NaN;
    return Math.round(Number(limpo.replace(/\./g, "").replace(",", ".")) * 100) / 100;
  },

  // 150 -> "150,00" (para mostrar no campo de edição)
  valorParaCampo(valor) {
    return valor || valor === 0 ? Number(valor).toFixed(2).replace(".", ",") : "";
  },

  // Confere o aluno. Devolve a mensagem de erro, ou "".
  validar(a) {
    if (!a.nome || !a.nome.trim()) return "Informe o nome do aluno.";
    if (!a.whatsapp) return "Informe um WhatsApp válido com DDD, por exemplo (11) 91234-5678.";
    if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) return "E-mail inválido.";
    if (a.cpf && !this.cpfValido(a.cpf)) return "CPF inválido. Confira os números ou deixe em branco.";
    if (!(a.valor > 0)) return "Informe o valor da mensalidade, por exemplo 150,00.";
    if (!Number.isInteger(a.diaVencimento) || a.diaVencimento < 1 || a.diaVencimento > 31)
      return "O dia do vencimento precisa ser de 1 a 31.";
    if (!this.STATUS.some((s) => s.id === a.status)) return "Escolha a situação do aluno.";
    return "";
  },

  // Turmas do aluno (objetos) a partir da lista de ids
  turmasDoAluno(aluno, turmas) {
    const ids = aluno.turmas || [];
    return turmas.filter((t) => ids.includes(t.id));
  },

  // Quantos alunos ativos estão em cada turma: { idTurma: quantidade }
  ocupacao(alunos) {
    const mapa = {};
    alunos.filter((a) => a.status === "ativo")
      .forEach((a) => (a.turmas || []).forEach((id) => (mapa[id] = (mapa[id] || 0) + 1)));
    return mapa;
  },

  // Busca sem diferenciar maiúsculas nem acentos
  normalizarBusca(texto) {
    return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  },

  filtrar(alunos, { busca = "", status = "ativo" } = {}) {
    const termo = this.normalizarBusca(busca);
    const digitos = this.somenteNumeros(busca);
    return alunos
      .filter((a) => status === "todos" || a.status === status)
      .filter((a) => !termo ||
        this.normalizarBusca(a.nome).includes(termo) ||
        (digitos.length >= 4 && (a.whatsapp || "").includes(digitos)))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  },
};

if (typeof module !== "undefined") module.exports = RegrasAlunos;
