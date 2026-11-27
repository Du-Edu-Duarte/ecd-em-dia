/*
 * regras/mensagens.js
 * Textos dos lembretes de pagamento e a troca das variáveis.
 * Variáveis: {nome} {valor} {vencimento} {link} {professor}
 *
 * Régua de lembretes (decisão do Eduardo, 27/11/2026):
 *   d5      5 dias antes do vencimento
 *   d1      1 dia antes
 *   hoje    no dia do vencimento ("hoje é o dia do pagamento")
 *   atraso  a partir do dia seguinte ao vencimento
 */
const RegrasMensagens = {
  TIPOS: [
    { id: "d5", rotulo: "5 dias antes" },
    { id: "d1", rotulo: "1 dia antes" },
    { id: "hoje", rotulo: "No dia do vencimento" },
    { id: "atraso", rotulo: "Em atraso" },
  ],

  VARIAVEIS: ["{nome}", "{valor}", "{vencimento}", "{link}", "{professor}"],

  PADRAO: {
    d5: "Olá, {nome}! Passando para lembrar que a sua mensalidade de {valor} vence em {vencimento}.\nPara pagar: {link}\nObrigado! {professor}",
    d1: "Olá, {nome}! A sua mensalidade de {valor} vence amanhã, {vencimento}.\nPara pagar: {link}\n{professor}",
    hoje: "Olá, {nome}! Hoje, {vencimento}, é o dia do pagamento da sua mensalidade de {valor}.\nPara pagar: {link}\n{professor}",
    atraso: "Olá, {nome}! Consta em aberto a sua mensalidade de {valor}, que venceu em {vencimento}.\nPara regularizar: {link}\nQualquer dúvida, é só me chamar. {professor}",
  },

  // Texto salvo pelo professor ou o padrão
  modelo(tipo, templates) {
    const salvo = templates && templates[tipo];
    return salvo && salvo.trim() ? salvo : this.PADRAO[tipo];
  },

  // Troca as variáveis pelos valores. Variável sem valor vira texto vazio.
  montar(texto, valores) {
    return texto.replace(/\{(nome|valor|vencimento|link|professor)\}/g, (_, chave) => valores[chave] || "")
      .replace(/[ \t]+\n/g, "\n").trim();
  },

  // Variáveis escritas errado, por exemplo {nme} ou {valor
  variaveisDesconhecidas(texto) {
    const achadas = texto.match(/\{[^}\s]*\}?/g) || [];
    return achadas.filter((v) => !this.VARIAVEIS.includes(v));
  },
};

if (typeof module !== "undefined") module.exports = RegrasMensagens;
