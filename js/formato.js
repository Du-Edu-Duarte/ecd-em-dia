/*
 * formato.js
 * Funções para mostrar datas e valores no padrão brasileiro.
 * "Hoje" é sempre calculado no fuso America/Sao_Paulo, nunca em UTC,
 * para o status das mensalidades não virar o dia errado à noite.
 */
const Formato = {
  // Data de hoje em São Paulo no formato "aaaa-mm-dd" (bom para guardar e comparar).
  hojeISO() {
    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: ECD_CONFIG.fuso,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return partes; // en-CA já devolve "2026-11-27"
  },

  // "2026-11-27" -> "27/11/2026"
  data(iso) {
    if (!iso) return "";
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
  },

  // 150 -> "R$ 150,00"
  dinheiro(valor) {
    return new Intl.NumberFormat(ECD_CONFIG.idioma, {
      style: "currency",
      currency: ECD_CONFIG.moeda,
    }).format(Number(valor) || 0);
  },

  // Protege textos digitados pelo usuário antes de colocar no HTML
  // (evita que um nome como "<script>" vire código na tela).
  seguro(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },

  // Texto longo da data de hoje: "sexta-feira, 27/11/2026"
  hojeExtenso() {
    const diaSemana = new Intl.DateTimeFormat(ECD_CONFIG.idioma, {
      timeZone: ECD_CONFIG.fuso,
      weekday: "long",
    }).format(new Date());
    return `${diaSemana}, ${this.data(this.hojeISO())}`;
  },
};
