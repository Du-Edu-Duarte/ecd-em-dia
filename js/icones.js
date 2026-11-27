/*
 * icones.js
 * Ícones de traço (linha), todos da mesma família visual:
 * caixa 24x24, traço 1.8, pontas arredondadas, sem preenchimento.
 * Para usar: Icones.svg("alunos")
 */
const Icones = {
  caminhos: {
    painel:
      '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    alunos:
      '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5c2.2.6 3.5 2.6 3.5 5.5"/>',
    cobrancas:
      '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    mensalidades:
      '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/><path d="M6.5 15h4"/>',
    aulas:
      '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M3 9.5h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/><path d="M12 13v3l2 1.5"/>',
    relatorios:
      '<path d="M3 3v18h18"/><path d="M7 16v-4"/><path d="M12 16V8"/><path d="M17 16v-6"/>',
    ajustes:
      '<path d="M4 6h10"/><path d="M18 6h2"/><circle cx="16" cy="6" r="2"/><path d="M4 12h4"/><path d="M12 12h8"/><circle cx="10" cy="12" r="2"/><path d="M4 18h12"/><circle cx="18" cy="18" r="2"/>',
    contas:
      '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    sair:
      '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5"/><path d="M15 12H4"/>',
    mais:
      '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    fechar: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
    seta: '<path d="M9 6l6 6-6 6"/>',
    vazio:
      '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12h8"/>',
  },

  svg(nome, tamanho = 24) {
    const caminho = this.caminhos[nome] || this.caminhos.vazio;
    return `<svg class="icone" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${caminho}</svg>`;
  },
};
