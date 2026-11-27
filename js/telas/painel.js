/*
 * telas/painel.js
 * Tela "Painel" (tela inicial): cartões do mês, atalho para as Cobranças de hoje,
 * alunos com filtros (Pendentes, Em dia, Vence hoje, Vence em 5 dias, Atrasados)
 * e próximos vencimentos. Em cada aluno: Cobrar, Registrar pagamento e WhatsApp direto.
 */
const TelaPainel = {
  container: null,
  filtro: "pendentes",
  dados: { mensalidades: null, alunos: null, envios: null },

  async desenhar(container) {
    this.container = container;
    const vez = (this.vez = {});
    const endereco = location.hash;
    this.dados = { mensalidades: null, alunos: null, envios: null };
    container.innerHTML = `<div class="tela-cabecalho"><h1>Painel</h1></div><p class="carregando">Carregando...</p>`;
    try { await Dados.gerarMensalidades(); } catch (e) { console.error(e); }
    if (this.vez !== vez || location.hash !== endereco) return; // já foi para outra tela

    const aoMudar = () => {
      if (Object.values(this.dados).some((v) => v === null)) return;
      this.tela();
    };
    const aoErrar = (erro) => {
      container.innerHTML = `<div class="tela-cabecalho"><h1>Painel</h1></div><p class="aviso aviso-erro">${Acesso.mensagemErro(erro)}</p>`;
    };
    const hoje = Formato.hojeISO();
    Dados.ouvir("alunos", (x) => { this.dados.alunos = x; aoMudar(); }, aoErrar);
    Dados.ouvir("mensalidades", (x) => { this.dados.mensalidades = x; aoMudar(); }, aoErrar);
    // Para o atalho "Cobranças de hoje" basta saber o que já foi enviado hoje
    Dados.ouvir("envios", (x) => { this.dados.envios = x; aoMudar(); }, aoErrar, (ref) => ref.where("dia", "==", hoje));
  },

  tela() {
    const s = Formato.seguro;
    const hoje = Formato.hojeISO();
    const { mensalidades, alunos, envios } = this.dados;
    const perfil = Acesso.estado.perfil || {};
    const c = RegrasPainel.cartoes(mensalidades, alunos, hoje);
    const grupos = RegrasCobrancas.deHoje(mensalidades, alunos, envios, hoje);
    const paraEnviar = Object.values(grupos).reduce((n, g) => n + g.filter((x) => !x.enviadoHoje).length, 0);
    const nome = RegrasCobrancas.primeiroNome(perfil.nome);
    const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

    if (!alunos.some((a) => a.status === "ativo")) {
      this.container.innerHTML = `
        <div class="tela-cabecalho"><h1>${nome ? `Olá, ${s(nome)}` : "Painel"}</h1></div>
        <div class="cartao vazio">
          <span class="vazio-icone">${Icones.svg("painel", 32)}</span>
          <p class="vazio-titulo">Seu painel começa com o primeiro aluno</p>
          <p class="vazio-texto">Cadastre os alunos com o valor e o dia de vencimento. As mensalidades e as cobranças aparecem aqui sozinhas.</p>
          <div class="vazio-acoes">
            <a class="botao" href="#/alunos/novo">${Icones.svg("mais", 20)}Cadastrar aluno</a>
            <a class="botao botao-secundario" href="#/ajustes">Preencher Ajustes</a>
          </div>
        </div>`;
      return;
    }

    const proximos = RegrasPainel.proximos(mensalidades, alunos, hoje);
    const diaCurto = (iso) => {
      const dias = RegrasMensalidades.diasEntre(hoje, iso);
      return dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : Formato.data(iso).slice(0, 5);
    };

    this.container.innerHTML = `
      <div class="tela-cabecalho">
        <h1>${nome ? `Olá, ${s(nome)}` : "Painel"}</h1>
        <p class="tela-resumo">Resumo de ${RegrasMensalidades.competenciaTexto(hoje.slice(0, 7))}</p>
      </div>

      <div class="resumo-cartoes painel-cartoes">
        <a class="cartao resumo" href="#/mensalidades"><span>A receber no mês</span><strong>${Formato.dinheiro(c.aReceber)}</strong></a>
        <a class="cartao resumo" href="#/mensalidades"><span>Recebido no mês</span><strong>${Formato.dinheiro(c.recebido)}</strong></a>
        <button type="button" class="cartao resumo resumo-alerta" data-ir-filtro="atrasados"><span>Em atraso</span>
          <strong>${Formato.dinheiro(c.atrasoValor)}</strong><small>${plural(c.atrasoQtd, "mensalidade", "mensalidades")}</small></button>
        <a class="cartao resumo" href="#/alunos"><span>Alunos ativos</span><strong>${c.ativos}</strong></a>
      </div>

      <a class="cartao atalho-cobrancas ${paraEnviar ? "" : "atalho-ok"}" href="#/cobrancas">
        <span class="atalho-icone">${Icones.svg("cobrancas", 24)}</span>
        <span class="atalho-texto"><strong>Cobranças de hoje</strong>
          <span>${paraEnviar ? `${plural(paraEnviar, "lembrete", "lembretes")} para enviar` : "Nada para enviar agora"}</span></span>
        ${Icones.svg("seta", 20)}
      </a>

      <section class="painel-secao" id="secao-alunos">
        <h2 class="painel-titulo">Alunos</h2>
        <div class="filtros filtros-5" role="group" aria-label="Filtrar alunos" id="filtros-painel"></div>
        <div class="lista-painel" id="lista-painel"></div>
      </section>

      <section class="painel-secao">
        <h2 class="painel-titulo">Próximos vencimentos</h2>
        ${proximos.length ? `<ol class="cartao proximos">${proximos.map((d) => `
          <li class="proximo-dia">
            <span class="proximo-data">${diaCurto(d.dia)}</span>
            <ul>${d.itens.map((x) => `
              <li><a href="#/mensalidades/m/${s(x.m.id)}"><span>${s(x.aluno.nome)}</span>
                <strong>${Formato.dinheiro(x.sit.saldo)}</strong></a></li>`).join("")}</ul>
          </li>`).join("")}</ol>` : `<p class="lista-vazia">Nenhum vencimento em aberto nos próximos dias.</p>`}
      </section>`;

    this.container.querySelector("[data-ir-filtro]").addEventListener("click", () => {
      this.filtro = "atrasados";
      this.lista();
      this.container.querySelector("#secao-alunos").scrollIntoView({ behavior: "smooth" });
    });
    this.lista();
  },

  // Filtros e lista de alunos (redesenha só esta parte ao trocar de filtro)
  lista() {
    const s = Formato.seguro;
    const hoje = Formato.hojeISO();
    const { mensalidades, alunos } = this.dados;
    const config = (Acesso.estado.perfil || {}).config;
    const itens = RegrasPainel.porAluno(mensalidades, alunos, hoje);
    const contagem = RegrasPainel.contagem(itens);

    this.container.querySelector("#filtros-painel").innerHTML = RegrasPainel.FILTROS.map((f) => `
      <button type="button" class="filtro ${this.filtro === f.id ? "ativo" : ""}" data-filtro="${f.id}"
        aria-pressed="${this.filtro === f.id}">${f.rotulo} <span>${contagem[f.id]}</span></button>`).join("");

    const cartao = (item) => {
      const { aluno, mostrar } = item;
      const m = mostrar.m, sit = mostrar.sit;
      const zap = aluno.whatsapp ? RegrasAlunos.linkWhatsapp(aluno.whatsapp) : "";
      const outras = item.abertas.length - 1;
      let info, acoes;
      if (!m) {
        info = `<span>Tudo pago</span><span class="etiqueta etiqueta-sit-paga">Em dia</span>`;
        acoes = "";
      } else {
        const env = aluno.whatsapp ? Envio.prepararWhatsapp(m, aluno, RegrasCobrancas.tipoDoTexto(m, hoje)) : null;
        info = `<span>${Formato.dinheiro(RegrasMensalidades.encargos(m, hoje, config).total)} · vence ${Formato.data(m.vencimento)}</span>
          <span class="etiqueta etiqueta-sit-${sit.codigo}">${sit.rotulo}${sit.parcial ? " · parcial" : ""}</span>
          ${outras > 0 ? `<small>Mais ${plural(outras)} em aberto · deve ${Formato.dinheiro(item.devendo)} no total</small>` : ""}`;
        acoes = `
          ${env ? `<a class="botao botao-cobrar" href="${s(env.url)}" target="_blank" rel="noopener" data-mensalidade="${s(m.id)}">
            ${Icones.svg("cobrancas", 18)}Cobrar</a>` : ""}
          <a class="botao botao-secundario" href="#/mensalidades/m/${s(m.id)}">Registrar pagamento</a>`;
      }
      return `
        <article class="cartao painel-aluno ${m ? "" : "painel-aluno-linha"}">
          <a class="painel-aluno-info" href="#/alunos/${s(aluno.id)}"><strong>${s(aluno.nome)}</strong>${info}</a>
          <div class="painel-acoes ${m ? "" : "painel-acoes-so-zap"}">
            ${acoes}
            ${zap ? `<a class="botao-icone botao-zap" href="${s(zap)}" target="_blank" rel="noopener" aria-label="Abrir o WhatsApp de ${s(aluno.nome)}"
              title="WhatsApp">${Icones.svg("whatsapp", 22)}</a>` : ""}
          </div>
        </article>`;
    };
    const plural = (n) => `${n} ${n === 1 ? "mensalidade" : "mensalidades"}`;

    const lista = RegrasPainel.filtrar(itens, this.filtro);
    const vazio = { pendentes: "Ninguém com mensalidade em aberto.", emdia: "Ninguém em dia por enquanto.",
      hoje: "Ninguém vence hoje.", breve: "Ninguém vence nos próximos 5 dias.", atrasados: "Ninguém em atraso." }[this.filtro];
    const el = this.container.querySelector("#lista-painel");
    el.innerHTML = lista.length ? lista.map(cartao).join("") : `<p class="lista-vazia">${vazio}</p>`;

    el.querySelectorAll(".botao-cobrar").forEach((b) => b.addEventListener("click", () => {
      const m = mensalidades.find((x) => x.id === b.dataset.mensalidade);
      Envio.registrar(m, RegrasCobrancas.tipoDeHoje(m, hoje) || "manual").catch((e) => console.error(e));
    }));
    this.container.querySelectorAll("#filtros-painel [data-filtro]").forEach((b) => b.addEventListener("click", () => {
      this.filtro = b.dataset.filtro;
      this.lista();
    }));
  },
};
