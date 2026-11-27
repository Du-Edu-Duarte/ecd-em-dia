/*
 * regras/formas.js
 * Formas de pagamento do professor. Só cálculo, sem tela.
 *
 * O professor cadastra só as que tem, quantas quiser, em Ajustes. Fica no perfil:
 *   formas: [{ id, tipo, nome, valor }]
 *   tipo: pix (chave Pix), pixcopia (Pix copia e cola ou link do Pix),
 *         link (link de pagamento / cartão), boleto (link do boleto), outro (texto livre)
 * Cada aluno escolhe uma forma preferida (o id) ou "todas".
 * Perfis antigos (formasPagamento {pix, linkCartao, linkBoleto}) são convertidos na leitura.
 */
const RegrasFormas = {
  MAXIMO: 10,

  TIPOS: [
    { id: "pix", rotulo: "Chave Pix", dica: "CPF, e-mail, celular ou chave aleatória", recebe: "pix" },
    { id: "pixcopia", rotulo: "Pix copia e cola ou link do Pix", dica: "Cole o código ou o link do Pix", recebe: "pix" },
    { id: "link", rotulo: "Link de pagamento (cartão)", dica: "https://...", recebe: "cartao", link: true },
    { id: "boleto", rotulo: "Link do boleto", dica: "https://...", recebe: "boleto", link: true },
    { id: "outro", rotulo: "Outra forma", dica: "Ex.: transferência, banco, agência e conta", recebe: "outro" },
  ],

  tipo(id) {
    return this.TIPOS.find((t) => t.id === id) || this.TIPOS[this.TIPOS.length - 1];
  },

  // Lista de formas do perfil (convertendo o formato antigo, se for o caso)
  doPerfil(perfil) {
    const p = perfil || {};
    if (Array.isArray(p.formas)) return p.formas.filter((f) => f && String(f.valor || "").trim());
    const antigo = p.formasPagamento || {};
    return [
      antigo.pix && { id: "pix", tipo: "pix", nome: "", valor: antigo.pix },
      antigo.linkCartao && { id: "cartao", tipo: "link", nome: "", valor: antigo.linkCartao },
      antigo.linkBoleto && { id: "boleto", tipo: "boleto", nome: "", valor: antigo.linkBoleto },
    ].filter(Boolean);
  },

  // Nome curto da forma, para listas ("Pix", "Cartão (Mercado Pago)")
  rotulo(f) {
    const base = { pix: "Pix", pixcopia: "Pix copia e cola", link: "Cartão", boleto: "Boleto", outro: "Outra forma" }[f.tipo] || "Outra forma";
    const nome = String(f.nome || "").trim();
    if (f.tipo === "outro") return nome || base;
    return nome ? `${base} (${nome})` : base;
  },

  // Texto que entra na mensagem no lugar de {link}
  texto(f) {
    const v = String(f.valor || "").trim();
    const nome = String(f.nome || "").trim();
    switch (f.tipo) {
      case "pix": return `Pix, chave ${v}${nome ? ` (${nome})` : ""}`;
      case "pixcopia": return `Pix copia e cola: ${v}`;
      case "link": return `Cartão${nome ? ` (${nome})` : ""}: ${v}`;
      case "boleto": return `Boleto${nome ? ` (${nome})` : ""}: ${v}`;
      default: return nome ? `${nome}: ${v}` : v;
    }
  },

  /*
   * Qual forma usar para um aluno. preferida = id da forma, "todas", ou um valor antigo
   * (pix | cartao | boleto) que é procurado pelo tipo. Sem preferida ou se ela foi removida: todas.
   */
  doAluno(formas, preferida) {
    if (!formas.length) return [];
    if (preferida && preferida !== "todas") {
      const porId = formas.find((f) => f.id === preferida);
      if (porId) return [porId];
      const tipos = { pix: ["pix", "pixcopia"], cartao: ["link"], boleto: ["boleto"] }[preferida];
      const porTipo = tipos && formas.find((f) => tipos.includes(f.tipo));
      if (porTipo) return [porTipo];
    }
    return formas;
  },

  // { texto, ok } para a mensagem
  paraMensagem(formas, preferida) {
    const usar = this.doAluno(formas, preferida);
    if (!usar.length) return { texto: "", ok: false };
    if (usar.length === 1) return { texto: this.texto(usar[0]), ok: true };
    return { texto: usar.map((f) => this.texto(f)).join("\n"), ok: true };
  },

  // Forma de recebimento sugerida ao registrar pagamento (pix, cartao, boleto, outro)
  recebimentoSugerido(formas, preferida) {
    const usar = this.doAluno(formas, preferida);
    return usar.length === 1 ? this.tipo(usar[0].tipo).recebe : "pix";
  },

  // Erro de uma forma ou ""
  validar(f) {
    const v = String(f.valor || "").trim();
    const t = this.tipo(f.tipo);
    if (!v) return `Preencha "${t.rotulo}" ou remova essa forma.`;
    if (t.link && !/^https?:\/\/\S+$/.test(v)) return `O ${t.rotulo.toLowerCase()} precisa começar com https://`;
    return "";
  },

  novoId() {
    return "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },
};

if (typeof module !== "undefined") module.exports = RegrasFormas;
