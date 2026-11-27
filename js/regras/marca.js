/*
 * regras/marca.js
 * Marca de cada professor (logo e cores), usada no topo do sistema e no PDF dos relatórios.
 * Só cálculo, sem tela. Fica no perfil:  marca: { logo (imagem em texto, data URL), corTopo, corDestaque }
 *
 * Regras de legibilidade:
 *   corTopo precisa ser escura (o texto do topo e dos botões é claro em cima dela)
 *   corDestaque precisa ser clara (o texto dos botões de destaque é escuro em cima dela)
 */
const RegrasMarca = {
  LOGO_MAX_PX: 256,          // o logo é reduzido para no máximo 256 x 256 no próprio aparelho
  LOGO_MAX_TEXTO: 300000,    // ~220 KB de imagem; o documento do Firestore aceita até 1 MB

  hexValido(hex) {
    return /^#[0-9a-fA-F]{6}$/.test(hex || "");
  },

  rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },

  hex([r, g, b]) {
    return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
  },

  // Luminância relativa (0 = preto, 1 = branco), a mesma usada no cálculo de contraste da WCAG
  luminancia(hex) {
    const [r, g, b] = this.rgb(hex).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },

  contraste(a, b) {
    const [l1, l2] = [this.luminancia(a), this.luminancia(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  },

  validar(marca) {
    const m = marca || {};
    if (m.corTopo && !this.hexValido(m.corTopo)) return "Cor do topo inválida.";
    if (m.corDestaque && !this.hexValido(m.corDestaque)) return "Cor de destaque inválida.";
    if (m.corTopo && this.contraste(m.corTopo, "#FFFFFF") < 4.5) return "A cor do topo está clara demais: o texto branco não fica legível. Escolha uma cor mais escura.";
    if (m.corDestaque && this.contraste(m.corDestaque, "#15110A") < 4.5) return "A cor de destaque está escura demais para os botões. Escolha uma cor mais clara.";
    if (m.logo && (!/^data:image\/(png|jpeg|webp);base64,/.test(m.logo) || m.logo.length > this.LOGO_MAX_TEXTO))
      return "O logo ficou grande demais. Use uma imagem menor.";
    return "";
  },

  /*
   * Sugere as cores a partir dos pixels do logo ([[r,g,b], ...]):
   *   topo     = a cor escura mais comum (fundo do logo)
   *   destaque = a cor viva (saturada e clara) mais comum
   * Agrupa as cores parecidas em "caixas" para achar as mais comuns.
   */
  sugerirCores(pixels) {
    const caixas = new Map();
    pixels.forEach(([r, g, b]) => {
      const chave = `${r >> 4},${g >> 4},${b >> 4}`;
      const c = caixas.get(chave) || { n: 0, r: 0, g: 0, b: 0 };
      c.n++; c.r += r; c.g += g; c.b += b;
      caixas.set(chave, c);
    });
    const cores = [...caixas.values()].map((c) => {
      const cor = [c.r / c.n, c.g / c.n, c.b / c.n];
      const max = Math.max(...cor), min = Math.min(...cor);
      return { n: c.n, hex: this.hex(cor), saturacao: max ? (max - min) / max : 0, brilho: max / 255 };
    }).sort((a, b) => b.n - a.n);
    const topo = cores.find((c) => this.contraste(c.hex, "#FFFFFF") >= 4.5);
    const destaque = cores.find((c) => c.saturacao > 0.35 && c.brilho > 0.5 && this.contraste(c.hex, "#15110A") >= 4.5);
    return { corTopo: topo ? topo.hex : "", corDestaque: destaque ? destaque.hex : "" };
  },
};

if (typeof module !== "undefined") module.exports = RegrasMarca;
