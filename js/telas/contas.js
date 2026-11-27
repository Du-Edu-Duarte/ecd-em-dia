/*
 * telas/contas.js
 * Tela "Contas e planos" (só o administrador ECD):
 * aprova e bloqueia contas e controla o plano do sistema de cada cliente
 * (liberar, renovar, dias restantes, quem está vencendo ou vencido e cobrar a renovação no WhatsApp).
 * As regras de prazo ficam em js/regras/assinatura.js.
 */
const TelaContas = {
  rotuloStatus: { pendente: "Pendente", ativo: "Aprovada", bloqueado: "Bloqueada" },
  filtro: "todas",
  contas: [],

  FILTROS: [
    { id: "todas", rotulo: "Todas" },
    { id: "pendentes", rotulo: "Pendentes" },
    { id: "vencendo", rotulo: "Vencendo" },
    { id: "vencidos", rotulo: "Vencidos" },
    { id: "ativos", rotulo: "Em dia" },
    { id: "sem-plano", rotulo: "Sem plano" },
    { id: "bloqueadas", rotulo: "Bloqueadas" },
  ],

  async desenhar(container) {
    this.container = container;
    container.innerHTML = `
      <div class="tela-cabecalho"><h1>Contas e planos</h1>
        <p class="tela-resumo">Clientes do ${Formato.seguro(ECD_CONFIG.nomeSistema)}</p></div>
      <div class="aviso" id="aviso" role="alert" hidden></div>
      <div id="contas-corpo"><p class="carregando">Carregando contas...</p></div>`;
    await this.recarregar();
  },

  async recarregar() {
    try {
      const todas = await Acesso.listarContas();
      const admin = ECD_CONFIG.emailAdmin.toLowerCase();
      this.contas = todas.filter((c) => (c.email || "").toLowerCase() !== admin);
      this.tela();
    } catch (erro) {
      console.error(erro);
      this.container.querySelector("#contas-corpo").innerHTML = `<p class="aviso aviso-erro">${Acesso.mensagemErro(erro)}</p>`;
    }
  },

  aviso(texto, tipo = "erro") {
    const el = this.container.querySelector("#aviso");
    el.textContent = texto;
    el.className = `aviso aviso-${tipo}`;
    el.hidden = false;
  },

  tela() {
    const hoje = Formato.hojeISO();
    const cfg = ECD_CONFIG.assinatura;
    const r = RegrasAssinatura.resumo(this.contas, hoje, cfg);
    const contagem = {};
    this.FILTROS.forEach((f) => (contagem[f.id] = RegrasAssinatura.filtrar(this.contas, f.id, hoje, cfg).length));

    this.container.querySelector("#contas-corpo").innerHTML = `
      <div class="resumo-cartoes contas-cartoes">
        <button type="button" class="cartao resumo" data-ir="ativos"><span>Em dia</span><strong>${r.ativos}</strong>
          <small>${r.vencendo ? `${r.vencendo} vencendo` : "nenhum vencendo"}</small></button>
        <button type="button" class="cartao resumo resumo-alerta" data-ir="vencidos"><span>Vencidos</span><strong>${r.vencidos}</strong>
          <small>sem renovar</small></button>
        <button type="button" class="cartao resumo" data-ir="pendentes"><span>Pendentes</span><strong>${r.pendentes}</strong>
          <small>esperando aprovação</small></button>
        <div class="cartao resumo"><span>Receita prevista</span><strong>${Formato.dinheiro(r.receitaAno)}</strong>
          <small>por ano, com os planos atuais</small></div>
      </div>
      <div class="filtros filtros-contas" role="group" aria-label="Filtrar contas">${this.FILTROS.map((f) => `
        <button type="button" class="filtro ${this.filtro === f.id ? "ativo" : ""}" data-filtro="${f.id}"
          aria-pressed="${this.filtro === f.id}">${f.rotulo} <span>${contagem[f.id]}</span></button>`).join("")}</div>
      <div class="lista-contas" id="lista-contas"></div>`;

    this.container.querySelectorAll("[data-filtro]").forEach((b) => b.addEventListener("click", () => {
      this.filtro = b.dataset.filtro;
      this.tela();
    }));
    this.container.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => {
      this.filtro = b.dataset.ir;
      this.tela();
    }));
    this.lista();
  },

  lista() {
    const s = Formato.seguro;
    const hoje = Formato.hojeISO();
    const cfg = ECD_CONFIG.assinatura;
    const ordem = { pendente: 0, ativo: 1, bloqueado: 3 };
    const peso = { vencido: 0, tolerancia: 1, vencendo: 2, "sem-plano": 3, ativo: 4 };
    const contas = RegrasAssinatura.filtrar(this.contas, this.filtro, hoje, cfg).map((c) => ({ c, sit: RegrasAssinatura.situacao(c.plano, hoje, cfg) }))
      .sort((a, b) => (ordem[a.c.status] ?? 2) - (ordem[b.c.status] ?? 2) || peso[a.sit.codigo] - peso[b.sit.codigo] ||
        (a.sit.dias ?? 9999) - (b.sit.dias ?? 9999) || String(a.c.nome).localeCompare(String(b.c.nome), "pt-BR"));
    const el = this.container.querySelector("#lista-contas");
    if (!contas.length) {
      el.innerHTML = `<p class="lista-vazia">${this.contas.length ? "Nenhuma conta neste filtro." : "Nenhum cliente cadastrado ainda."}</p>`;
      return;
    }
    // Forma de pagamento do administrador (Ajustes) vai na mensagem de renovação
    const formas = RegrasFormas.paraMensagem(RegrasFormas.doPerfil(Acesso.estado.perfil), "todas").texto;
    const etiquetaPlano = { "sem-plano": "sem-plano", ativo: "paga", vencendo: "breve", tolerancia: "atrasada", vencido: "atrasada" };

    el.innerHTML = contas.map(({ c, sit }) => {
      const p = c.plano;
      const tel = (c.extras || {}).telefone || "";
      const numero = RegrasAlunos.normalizarWhatsapp(tel);
      const cadastro = c.criadoEm ? Formato.data(new Date(c.criadoEm.seconds * 1000).toISOString().slice(0, 10)) : "";
      const cobrar = c.status === "ativo" && numero && p && ["vencendo", "tolerancia", "vencido"].includes(sit.codigo);
      const urlCobrar = cobrar ? RegrasAlunos.linkWhatsapp(numero, RegrasAssinatura.mensagem(c, hoje, cfg, ECD_CONFIG.nomeSistema, formas)) : "";
      const cobradoEm = c.planoCobradoEm && c.planoCobradoEm.toDate ? Formato.data(Formato.isoDe(c.planoCobradoEm.toDate())) : "";
      const historico = (p && p.historico) || [];

      return `<article class="cartao conta" data-uid="${s(c.uid)}">
        <div class="conta-topo">
          <strong class="conta-nome">${s(c.nome)}</strong>
          <span class="etiqueta etiqueta-${s(c.status)}">${this.rotuloStatus[c.status] || s(c.status)}</span>
        </div>
        <div class="conta-dados">
          ${c.setor ? `<span>${s(c.setor)}</span>` : ""}<span>${s(c.email)}</span>${tel ? `<span>${s(tel)}</span>` : ""}
          ${cadastro ? `<span>Cadastro em ${cadastro}</span>` : ""}
        </div>

        ${c.status === "ativo" ? `
        <div class="conta-plano">
          <div class="conta-plano-topo">
            <span>${p ? `Plano ${RegrasAssinatura.rotulo(p.meses).toLowerCase()} · ${Formato.dinheiro(p.valor || 0)}` : "Sem plano (sem prazo)"}</span>
            <span class="etiqueta etiqueta-sit-${etiquetaPlano[sit.codigo]}">${sit.rotulo}</span>
          </div>
          ${p ? `
          <div class="barra-plano" role="img" aria-label="${RegrasAssinatura.usado(p, hoje)}% do período usado">
            <span style="width:${RegrasAssinatura.usado(p, hoje)}%"></span></div>
          <small>Liberado até ${Formato.data(p.fim)}${p.liberadoAte ? ` · trava depois de ${Formato.data(p.liberadoAte)}` : " · não trava sozinho"}${cobradoEm ? ` · cobrado em ${cobradoEm}` : ""}</small>` : ""}
        </div>` : ""}

        <div class="conta-acoes">
          ${c.status !== "ativo" ? `<button class="botao" type="button" data-status="ativo">Aprovar</button>` : ""}
          ${c.status === "ativo" ? `<button class="botao" type="button" data-abrir-plano>${p ? "Renovar plano" : "Liberar plano"}</button>` : ""}
          ${cobrar ? `<a class="botao botao-secundario" href="${s(urlCobrar)}" target="_blank" rel="noopener" data-cobrar>${Icones.svg("whatsapp", 20)}Cobrar renovação</a>` : ""}
          ${c.status !== "bloqueado" ? `<button class="botao botao-secundario" type="button" data-status="bloqueado">Bloquear</button>` : ""}
        </div>

        <form class="conta-form-plano" data-form-plano hidden novalidate>
          <div class="campo-linha">
            <label class="campo"><span>Período</span>
              <select data-meses>${RegrasAssinatura.PERIODOS.map((x) =>
                `<option value="${x.meses}" ${x.meses === ((p && p.meses) || 12) ? "selected" : ""}>${x.rotulo}</option>`).join("")}</select></label>
            <label class="campo"><span>Valor (R$)</span>
              <input data-valor type="text" inputmode="decimal" value="${RegrasAlunos.valorParaCampo(p && p.valor)}" placeholder="600,00" /></label>
          </div>
          <p class="campo-dica" data-previa></p>
          <div class="formulario-acoes">
            <button class="botao" type="submit">Confirmar</button>
            <button class="botao botao-secundario" type="button" data-fechar-plano>Cancelar</button>
          </div>
          ${p ? `<button class="botao-link botao-perigo" type="button" data-sem-prazo>Tirar o controle de prazo (cortesia)</button>` : ""}
        </form>

        ${historico.length ? `<details class="conta-historico"><summary>Histórico do plano (${historico.length})</summary>
          <ul>${[...historico].reverse().map((h) => `<li>${Formato.data(h.em)}: ${RegrasAssinatura.rotulo(h.meses).toLowerCase()},
            ${Formato.dinheiro(h.valor || 0)}, de ${Formato.data(h.de)} até ${Formato.data(h.ate)}</li>`).join("")}</ul></details>` : ""}
      </article>`;
    }).join("");

    el.querySelectorAll(".conta").forEach((card) => this.ligarCartao(card));
  },

  ligarCartao(card) {
    const uid = card.dataset.uid;
    const conta = this.contas.find((c) => c.uid === uid);
    const hoje = Formato.hojeISO();
    const form = card.querySelector("[data-form-plano]");

    card.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        await Acesso.mudarStatus(uid, b.dataset.status);
        await this.recarregar();
      } catch (erro) {
        console.error(erro);
        this.aviso(Acesso.mensagemErro(erro));
        b.disabled = false;
      }
    }));

    const cobrar = card.querySelector("[data-cobrar]");
    if (cobrar) cobrar.addEventListener("click", () => {
      Acesso.db.collection("professores").doc(uid)
        .update({ planoCobradoEm: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => this.recarregar()).catch((e) => console.error(e));
    });

    if (!form) return;
    const previa = () => {
      const meses = Number(form.querySelector("[data-meses]").value);
      const novo = RegrasAssinatura.renovar(conta.plano, meses, 0, hoje, ECD_CONFIG.assinatura.diasTolerancia);
      const ultimo = novo.historico[novo.historico.length - 1];
      form.querySelector("[data-previa]").textContent =
        `Libera de ${Formato.data(ultimo.de)} até ${Formato.data(ultimo.ate)}${conta.plano && conta.plano.fim >= hoje ? " (soma depois do prazo atual)" : ""}.`;
    };
    const abrir = card.querySelector("[data-abrir-plano]");
    if (abrir) abrir.addEventListener("click", () => {
      form.hidden = false;
      previa();
      form.querySelector("[data-valor]").focus();
    });
    form.querySelector("[data-meses]").addEventListener("change", previa);
    form.querySelector("[data-fechar-plano]").addEventListener("click", () => (form.hidden = true));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const botao = form.querySelector('button[type="submit"]');
      const valor = RegrasAlunos.lerValor(form.querySelector("[data-valor]").value);
      if (!(valor >= 0)) return this.aviso("Informe o valor do plano, por exemplo 600,00 (ou 0 para cortesia).");
      botao.disabled = true;
      try {
        const plano = await Acesso.renovarPlano(uid, conta.plano, Number(form.querySelector("[data-meses]").value), valor);
        this.aviso(`Plano de ${conta.nome} liberado até ${Formato.data(plano.fim)}.`, "ok");
        await this.recarregar();
      } catch (erro) {
        console.error(erro);
        this.aviso(Acesso.mensagemErro(erro));
        botao.disabled = false;
      }
    });
    const semPrazo = form.querySelector("[data-sem-prazo]");
    if (semPrazo) semPrazo.addEventListener("click", async () => {
      semPrazo.disabled = true;
      try {
        await Acesso.removerPlano(uid);
        this.aviso(`${conta.nome} ficou sem controle de prazo.`, "ok");
        await this.recarregar();
      } catch (erro) {
        console.error(erro);
        this.aviso(Acesso.mensagemErro(erro));
        semPrazo.disabled = false;
      }
    });
  },
};
