/*
 * telas/cobrancas.js
 * Tela "Cobranças de hoje": quem está a 5 dias do vencimento, a 1 dia,
 * vence hoje ou está atrasado. Cada aluno tem o botão "Enviar no WhatsApp",
 * que abre a conversa com a mensagem e o link de pagamento prontos e registra o envio.
 */
const TelaCobrancas = {
  container: null,
  dados: { mensalidades: null, alunos: null, envios: null },

  GRUPOS: [
    { id: "atraso", titulo: "Em atraso" },
    { id: "hoje", titulo: "Vencem hoje" },
    { id: "d1", titulo: "Vencem amanhã" },
    { id: "d5", titulo: "Vencem em 5 dias" },
  ],

  async desenhar(container) {
    this.container = container;
    const vez = (this.vez = {});
    this.dados = { mensalidades: null, alunos: null, envios: null };
    container.innerHTML = `<div class="tela-cabecalho"><h1>Cobranças de hoje</h1></div><p class="carregando">Carregando...</p>`;
    try { await Dados.gerarMensalidades(); } catch (e) { console.error(e); }
    if (this.vez !== vez || !location.hash.startsWith("#/cobrancas")) return;

    const aoMudar = () => {
      if (Object.values(this.dados).some((v) => v === null)) return;
      this.lista();
    };
    const aoErrar = (erro) => {
      container.innerHTML = `<div class="tela-cabecalho"><h1>Cobranças de hoje</h1></div><p class="aviso aviso-erro">${Acesso.mensagemErro(erro)}</p>`;
    };
    // Envios dos últimos 60 dias bastam para saber o que já foi enviado
    const [a, m, d] = Formato.hojeISO().split("-").map(Number);
    const limite = Formato.isoDe(new Date(Date.UTC(a, m - 1, d - 60, 12)));
    Dados.ouvir("alunos", (x) => { this.dados.alunos = x; aoMudar(); }, aoErrar);
    Dados.ouvir("mensalidades", (x) => { this.dados.mensalidades = x; aoMudar(); }, aoErrar);
    Dados.ouvir("envios", (x) => { this.dados.envios = x; aoMudar(); }, aoErrar, (ref) => ref.where("dia", ">=", limite));
  },

  lista() {
    const s = Formato.seguro;
    const hoje = Formato.hojeISO();
    const grupos = RegrasCobrancas.deHoje(this.dados.mensalidades, this.dados.alunos, this.dados.envios, hoje);
    const total = Object.values(grupos).reduce((n, g) => n + g.length, 0);
    const pendentes = Object.values(grupos).reduce((n, g) => n + g.filter((x) => !x.enviadoHoje).length, 0);
    const semForma = !Pagamento.link(null, { formaPreferida: "pix" }, (Acesso.estado.perfil || {}).formasPagamento).ok;

    const cartao = (item) => {
      const sit = RegrasMensalidades.situacao(item.m, hoje);
      const env = Envio.prepararWhatsapp(item.m, item.aluno, item.tipo);
      return `
      <article class="cartao cobranca ${item.enviadoHoje ? "cobranca-feita" : ""}">
        <a class="cobranca-info" href="#/mensalidades/m/${s(item.m.id)}">
          <strong>${s(item.aluno.nome)}</strong>
          <span>${Formato.dinheiro(RegrasMensalidades.encargos(item.m, hoje, (Acesso.estado.perfil || {}).config).total)} · vence ${Formato.data(item.m.vencimento)}</span>
          <span class="etiqueta etiqueta-sit-${sit.codigo}">${sit.rotulo}${sit.parcial ? " · parcial" : ""}</span>
          ${item.ultimoEnvio ? `<small>Última cobrança: ${Envio.quando(item.ultimoEnvio)}</small>` : ""}
        </a>
        <a class="botao ${item.enviadoHoje ? "botao-secundario" : ""} botao-enviar" href="${s(env.url)}" target="_blank" rel="noopener"
           data-mensalidade="${s(item.m.id)}" data-tipo="${item.tipo}">
          ${Icones.svg("whatsapp", 20)}${item.enviadoHoje ? "Enviar de novo" : "Enviar no WhatsApp"}</a>
      </article>`;
    };

    this.container.innerHTML = `
      <div class="tela-cabecalho">
        <h1>Cobranças de hoje</h1>
        <p class="tela-resumo">${total ? `${pendentes} de ${total} ${total === 1 ? "cobrança" : "cobranças"} para enviar` : "Nenhuma cobrança para hoje"}</p>
      </div>
      ${semForma ? `<a class="aviso aviso-alerta aviso-link" href="#/ajustes">Cadastre a chave Pix ou um link de pagamento em Ajustes para ele ir junto na mensagem.</a>` : ""}
      ${total ? this.GRUPOS.filter((g) => grupos[g.id].length).map((g) => `
        <section class="grupo-cobranca">
          <h2>${g.titulo} <span>${grupos[g.id].length}</span></h2>
          <div class="lista-cobrancas">${grupos[g.id].map(cartao).join("")}</div>
        </section>`).join("") : `
        <div class="cartao vazio">
          <span class="vazio-icone">${Icones.svg("cobrancas", 32)}</span>
          <p class="vazio-titulo">Tudo em dia por hoje</p>
          <p class="vazio-texto">Aqui aparecem os alunos com mensalidade vencendo em 5 dias, amanhã, hoje ou em atraso. Quem já pagou ou está com os lembretes desligados não aparece.</p>
        </div>`}`;

    // O link abre o WhatsApp (o navegador cuida disso) e aqui só registramos o envio
    this.container.querySelectorAll(".botao-enviar").forEach((b) => b.addEventListener("click", () => {
      const m = this.dados.mensalidades.find((x) => x.id === b.dataset.mensalidade);
      Envio.registrar(m, b.dataset.tipo).catch((e) => console.error(e));
    }));
  },
};
