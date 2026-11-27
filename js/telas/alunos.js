/*
 * telas/alunos.js
 * Tela "Alunos". O endereço diz o que mostrar, assim o botão Voltar do celular funciona:
 *   #/alunos              lista com busca e filtros
 *   #/alunos/novo         cadastro de aluno novo
 *   #/alunos/ID           ficha do aluno
 *   #/alunos/ID/editar    edição do aluno
 * Os dados ficam em professores/{uid}/alunos.
 */
const TelaAlunos = {
  container: null,
  alunos: null, // null = ainda carregando
  turmas: null,
  rota: [],     // partes do endereço depois de #/alunos
  filtro: { busca: "", status: "ativo" },

  desenhar(container, parametro) {
    this.container = container;
    this.rota = (parametro || "").split("/").filter(Boolean);
    this.alunos = null;
    this.turmas = null;
    container.innerHTML = `<div class="tela-cabecalho"><h1>Alunos</h1></div><p class="carregando">Carregando alunos...</p>`;

    const aoMudar = () => {
      if (this.alunos === null || this.turmas === null) return;
      // Não redesenha o formulário enquanto o professor digita
      if (this.modo() === "formulario" && this.container.querySelector("#form-aluno")) return;
      this.mostrar();
    };
    const aoErrar = (erro) => {
      container.innerHTML = `<div class="tela-cabecalho"><h1>Alunos</h1></div>
        <p class="aviso aviso-erro">${Acesso.mensagemErro(erro)}</p>`;
    };
    Dados.ouvir("turmas", (t) => { this.turmas = RegrasTurmas.ordenar(t); aoMudar(); }, aoErrar);
    Dados.ouvir("alunos", (a) => { this.alunos = a; aoMudar(); }, aoErrar);
  },

  modo() {
    if (!this.rota.length) return "lista";
    if (this.rota[0] === "novo" || this.rota[1] === "editar") return "formulario";
    return "ficha";
  },

  mostrar() {
    const modo = this.modo();
    if (modo === "lista") return this.lista();
    const aluno = this.rota[0] === "novo" ? null : this.alunos.find((a) => a.id === this.rota[0]);
    if (this.rota[0] !== "novo" && !aluno) {
      this.container.innerHTML = `<div class="tela-cabecalho">${this.voltar("#/alunos", "Alunos")}<h1>Aluno não encontrado</h1></div>
        <p class="aviso aviso-erro">Este aluno foi excluído ou o endereço está errado.</p>`;
      return;
    }
    return modo === "ficha" ? this.ficha(aluno) : this.formulario(aluno);
  },

  voltar(href, texto) {
    return `<a class="botao-voltar" href="${href}">${Icones.svg("voltar", 20)}${texto}</a>`;
  },

  // "3x por semana · Seg, Qua e Sex"
  resumoTreino(aluno) {
    const turmas = RegrasAlunos.turmasDoAluno(aluno, this.turmas);
    if (!turmas.length) return "Sem turma";
    const dias = new Set();
    turmas.forEach((t) => t.diasSemana.forEach((d) => dias.add(d)));
    return `${RegrasTurmas.diasPorSemana(turmas)}x por semana · ${RegrasTurmas.diasTexto([...dias])}`;
  },

  /* ---------- Lista ---------- */
  lista() {
    const contagem = { ativo: 0, trancado: 0, inativo: 0, todos: this.alunos.length };
    this.alunos.forEach((a) => (contagem[a.status] = (contagem[a.status] || 0) + 1));
    const filtros = [["ativo", "Ativos"], ["trancado", "Trancados"], ["inativo", "Inativos"], ["todos", "Todos"]]
      .map(([id, rotulo]) => `<button type="button" class="filtro ${this.filtro.status === id ? "ativo" : ""}" data-status="${id}"
          aria-pressed="${this.filtro.status === id}">${rotulo} <span>${contagem[id] || 0}</span></button>`).join("");

    this.container.innerHTML = `
      <div class="tela-cabecalho tela-cabecalho-acoes">
        <div><h1>Alunos</h1>
          <p class="tela-resumo">${contagem.ativo} ${contagem.ativo === 1 ? "aluno ativo" : "alunos ativos"}</p></div>
        <a class="botao botao-destaque" href="#/alunos/novo">${Icones.svg("mais-item", 20)}Novo aluno</a>
      </div>
      ${this.alunos.length ? `
      <div class="barra-busca">
        <label class="campo campo-busca">
          <span class="sr-only">Buscar aluno</span>
          ${Icones.svg("buscar", 20)}
          <input id="busca" type="search" placeholder="Buscar por nome ou WhatsApp" value="${Formato.seguro(this.filtro.busca)}" autocomplete="off" />
        </label>
        <div class="filtros" role="group" aria-label="Situação">${filtros}</div>
      </div>
      <div id="lista-alunos" class="lista-alunos"></div>` : `
      <div class="cartao vazio">
        <span class="vazio-icone">${Icones.svg("alunos", 32)}</span>
        <p class="vazio-titulo">Nenhum aluno cadastrado</p>
        <p class="vazio-texto">Cadastre seus alunos com o valor da mensalidade, o dia do vencimento e as turmas em que treinam.</p>
      </div>`}`;

    if (!this.alunos.length) return;
    this.listarCartoes();
    const busca = this.container.querySelector("#busca");
    busca.addEventListener("input", () => { this.filtro.busca = busca.value; this.listarCartoes(); });
    this.container.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", () => {
      this.filtro.status = b.dataset.status;
      this.container.querySelectorAll("[data-status]").forEach((x) => {
        x.classList.toggle("ativo", x === b);
        x.setAttribute("aria-pressed", x === b);
      });
      this.listarCartoes();
    }));
  },

  // Só a parte dos cartões, para a busca não perder o foco a cada letra
  listarCartoes() {
    const s = Formato.seguro;
    const lista = RegrasAlunos.filtrar(this.alunos, this.filtro);
    const el = this.container.querySelector("#lista-alunos");
    if (!lista.length) {
      el.innerHTML = `<p class="lista-vazia">Nenhum aluno encontrado.</p>`;
      return;
    }
    el.innerHTML = lista.map((a) => `
      <article class="cartao aluno">
        <a class="aluno-principal" href="#/alunos/${s(a.id)}">
          <span class="aluno-nome">${s(a.nome)}${a.status !== "ativo" ? ` <span class="etiqueta etiqueta-${s(a.status)}">${this.rotuloStatus(a.status)}</span>` : ""}</span>
          <span>${this.resumoTreino(a)}</span>
          <span>${Formato.dinheiro(a.valor)} · vence dia ${a.diaVencimento}</span>
        </a>
        <a class="botao-icone botao-whatsapp" href="${RegrasAlunos.linkWhatsapp(a.whatsapp)}" target="_blank" rel="noopener"
           aria-label="WhatsApp de ${s(a.nome)}">${Icones.svg("whatsapp", 22)}</a>
      </article>`).join("");
  },

  rotuloStatus(id) {
    return (RegrasAlunos.STATUS.find((x) => x.id === id) || { rotulo: id }).rotulo;
  },

  /* ---------- Ficha ---------- */
  ficha(a) {
    const s = Formato.seguro;
    const turmas = RegrasAlunos.turmasDoAluno(a, this.turmas);
    const [ano, mes] = Formato.hojeISO().split("-").map(Number);
    const forma = (RegrasAlunos.FORMAS.find((f) => f.id === a.formaPreferida) || {}).rotulo;
    const linha = (rotulo, valor) => valor ? `<div class="ficha-linha"><dt>${rotulo}</dt><dd>${valor}</dd></div>` : "";

    this.container.innerHTML = `
      <div class="tela-cabecalho">
        ${this.voltar("#/alunos", "Alunos")}
        <div class="ficha-titulo">
          <h1>${s(a.nome)}</h1>
          <span class="etiqueta etiqueta-${s(a.status)}">${this.rotuloStatus(a.status)}</span>
        </div>
      </div>
      <div class="ficha-acoes">
        <a class="botao" href="${RegrasAlunos.linkWhatsapp(a.whatsapp)}" target="_blank" rel="noopener">${Icones.svg("whatsapp", 20)}WhatsApp</a>
        <a class="botao botao-secundario" href="#/alunos/${s(a.id)}/editar">${Icones.svg("editar", 20)}Editar</a>
      </div>

      <section class="cartao ficha-bloco">
        <h2>Mensalidade</h2>
        <dl>
          ${linha("Valor", Formato.dinheiro(a.valor))}
          ${linha("Vencimento", `Todo dia ${a.diaVencimento}`)}
          ${linha("Forma preferida", forma)}
          ${linha("Lembretes", a.lembretesAtivos === false ? "Desligados" : "Ligados")}
        </dl>
      </section>

      <section class="cartao ficha-bloco">
        <h2>Treinos</h2>
        ${turmas.length ? `
        <p class="ficha-destaque">${RegrasTurmas.diasPorSemana(turmas)}x por semana · ${RegrasTurmas.treinosNoMes(turmas, ano, mes)} treinos neste mês</p>
        <ul class="ficha-turmas">${turmas.map((t) => `<li><strong>${s(t.nome)}</strong>
          <span>${RegrasTurmas.diasTexto(t.diasSemana)} · ${s(t.inicio)} às ${s(t.fim)}</span></li>`).join("")}</ul>`
        : `<p class="ficha-vazio">Nenhuma turma marcada.</p>`}
      </section>

      <section class="cartao ficha-bloco">
        <h2>Contato e dados</h2>
        <dl>
          ${linha("WhatsApp", RegrasAlunos.formatarWhatsapp(a.whatsapp))}
          ${linha("E-mail", s(a.email))}
          ${linha("CPF", a.cpf ? RegrasAlunos.formatarCpf(a.cpf) : "")}
          ${linha("Início", Formato.data(a.inicio))}
        </dl>
      </section>

      <section class="cartao ficha-bloco">
        <h2>Anotações</h2>
        ${a.anotacoes ? `<p class="ficha-anotacoes">${s(a.anotacoes)}</p>` : `<p class="ficha-vazio">Sem anotações.</p>`}
      </section>

      <section class="cartao ficha-bloco">
        <h2>Histórico de pagamentos</h2>
        <p class="ficha-vazio">Chega na etapa 5, com as mensalidades.</p>
      </section>`;
  },

  /* ---------- Formulário (novo e editar) ---------- */
  formulario(aluno) {
    const s = Formato.seguro;
    const a = aluno || {
      nome: "", whatsapp: "", email: "", cpf: "", inicio: Formato.hojeISO(), valor: null,
      diaVencimento: null, formaPreferida: "pix", turmas: [], anotacoes: "", status: "ativo", lembretesAtivos: true,
    };
    const ocupacao = RegrasAlunos.ocupacao(this.alunos.filter((x) => !aluno || x.id !== aluno.id));

    const turmas = this.turmas.length ? this.turmas.map((t) => {
      const ocupadas = ocupacao[t.id] || 0;
      const lotada = t.vagas && ocupadas >= t.vagas;
      return `<label class="opcao-turma">
        <input type="checkbox" name="turma" value="${s(t.id)}" ${(a.turmas || []).includes(t.id) ? "checked" : ""} />
        <span><strong>${s(t.nome)}</strong>
          ${RegrasTurmas.diasTexto(t.diasSemana)} · ${s(t.inicio)} às ${s(t.fim)}
          ${t.vagas ? `<em class="${lotada ? "lotada" : ""}">${ocupadas} de ${t.vagas} vagas${lotada ? " · lotada" : ""}</em>` : ""}</span>
      </label>`;
    }).join("") : `<p class="ficha-vazio">Nenhuma turma cadastrada. <a href="#/aulas">Cadastre as turmas em Aulas e horários</a>.</p>`;

    const opcoes = (lista, atual) => lista.map((o) =>
      `<option value="${o.id}" ${o.id === atual ? "selected" : ""}>${o.rotulo}</option>`).join("");
    const voltarPara = aluno ? `#/alunos/${s(aluno.id)}` : "#/alunos";

    this.container.innerHTML = `
      <div class="tela-cabecalho">
        ${this.voltar(voltarPara, aluno ? s(aluno.nome) : "Alunos")}
        <h1>${aluno ? "Editar aluno" : "Novo aluno"}</h1>
      </div>
      <form class="cartao formulario" id="form-aluno" novalidate>
        <div class="aviso" id="aviso" role="alert" hidden></div>

        <label class="campo"><span>Nome completo</span>
          <input id="nome" type="text" maxlength="80" autocomplete="off" value="${s(a.nome)}" required /></label>
        <label class="campo"><span>WhatsApp com DDD</span>
          <input id="whatsapp" type="tel" inputmode="tel" value="${s(RegrasAlunos.formatarWhatsapp(a.whatsapp))}" placeholder="(11) 91234-5678" required /></label>

        <div class="campo-linha">
          <label class="campo"><span>Mensalidade (R$)</span>
            <input id="valor" type="text" inputmode="decimal" value="${RegrasAlunos.valorParaCampo(a.valor)}" placeholder="150,00" required /></label>
          <label class="campo"><span>Dia do vencimento</span>
            <input id="dia" type="number" inputmode="numeric" min="1" max="31" step="1" value="${a.diaVencimento || ""}" placeholder="10" required /></label>
        </div>
        <p class="campo-dica">Se o mês não tiver o dia (por exemplo, 31 em fevereiro), o vencimento cai no último dia do mês.</p>

        <div class="campo-linha">
          <label class="campo"><span>Forma preferida</span>
            <select id="forma">${opcoes(RegrasAlunos.FORMAS, a.formaPreferida)}</select></label>
          <label class="campo"><span>Situação</span>
            <select id="status">${opcoes(RegrasAlunos.STATUS, a.status)}</select></label>
        </div>

        <fieldset class="campo campo-turmas">
          <legend>Turmas em que treina</legend>
          <div class="opcoes-turmas">${turmas}</div>
          <p class="calculo-treino" id="calculo-treino" aria-live="polite"></p>
        </fieldset>

        <label class="campo-check">
          <input type="checkbox" id="lembretes" ${a.lembretesAtivos === false ? "" : "checked"} />
          <span>Enviar lembretes de pagamento para este aluno</span>
        </label>

        <details class="mais-campos" ${a.email || a.cpf || aluno ? "open" : ""}>
          <summary>E-mail, CPF e data de início</summary>
          <div class="mais-campos-corpo">
            <label class="campo"><span>E-mail (opcional)</span>
              <input id="email" type="email" autocomplete="off" value="${s(a.email)}" /></label>
            <label class="campo"><span>CPF (opcional, necessário para boleto)</span>
              <input id="cpf" type="text" inputmode="numeric" value="${s(RegrasAlunos.formatarCpf(a.cpf))}" placeholder="000.000.000-00" /></label>
            <label class="campo"><span>Data de início</span>
              <input id="inicio" type="date" value="${s(a.inicio)}" /></label>
          </div>
        </details>

        <label class="campo"><span>Anotações</span>
          <textarea id="anotacoes" rows="4" maxlength="2000" placeholder="Lesões, objetivo, observações">${s(a.anotacoes)}</textarea></label>

        <div class="formulario-acoes">
          <button class="botao" type="submit">Salvar</button>
          <a class="botao botao-secundario" href="${voltarPara}">Cancelar</a>
        </div>
        ${aluno ? `<div class="zona-excluir" id="zona-excluir">
          <button class="botao-link botao-perigo" type="button" id="excluir">Excluir aluno</button></div>` : ""}
      </form>`;

    const form = this.container.querySelector("#form-aluno");
    form.querySelectorAll('input[name="turma"]').forEach((c) => c.addEventListener("change", () => this.atualizarCalculo()));
    this.atualizarCalculo();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.salvar(aluno, e.submitter || form.querySelector('button[type="submit"]'));
    });
    const excluir = form.querySelector("#excluir");
    if (excluir) excluir.addEventListener("click", () => this.confirmarExclusao(aluno));
    if (!aluno) form.querySelector("#nome").focus();
  },

  turmasMarcadas() {
    const ids = [...this.container.querySelectorAll('input[name="turma"]:checked')].map((c) => c.value);
    return this.turmas.filter((t) => ids.includes(t.id));
  },

  // Mostra na hora quantos dias por semana e treinos no mês o aluno vai ter
  atualizarCalculo() {
    const el = this.container.querySelector("#calculo-treino");
    const turmas = this.turmasMarcadas();
    if (!turmas.length) { el.textContent = ""; return; }
    const [ano, mes] = Formato.hojeISO().split("-").map(Number);
    const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(ano, mes - 1, 1)));
    el.textContent = `Treina ${RegrasTurmas.diasPorSemana(turmas)} dias por semana · ${RegrasTurmas.treinosNoMes(turmas, ano, mes)} treinos em ${nomeMes}`;
  },

  lerFormulario() {
    const v = (id) => this.container.querySelector("#" + id).value.trim();
    const turmas = this.turmasMarcadas();
    const diaTexto = v("dia");
    return {
      nome: v("nome"),
      whatsapp: RegrasAlunos.normalizarWhatsapp(v("whatsapp")),
      email: v("email").toLowerCase(),
      cpf: RegrasAlunos.somenteNumeros(v("cpf")),
      inicio: v("inicio"),
      valor: RegrasAlunos.lerValor(v("valor")),
      diaVencimento: diaTexto === "" ? null : Number(diaTexto),
      formaPreferida: v("forma"),
      turmas: turmas.map((t) => t.id),
      diasPorSemana: RegrasTurmas.diasPorSemana(turmas), // calculado, nunca digitado
      anotacoes: this.container.querySelector("#anotacoes").value.trim(),
      status: v("status"),
      lembretesAtivos: this.container.querySelector("#lembretes").checked,
    };
  },

  aviso(texto) {
    const el = this.container.querySelector("#aviso");
    el.textContent = texto;
    el.className = "aviso aviso-erro";
    el.hidden = false;
    el.scrollIntoView({ block: "nearest" });
  },

  async salvar(aluno, botao) {
    const dados = this.lerFormulario();
    const erro = RegrasAlunos.validar(dados);
    if (erro) return this.aviso(erro);
    botao.disabled = true;
    try {
      const id = await Dados.salvar("alunos", dados, aluno && aluno.id);
      location.hash = `#/alunos/${id}`;
    } catch (e) {
      console.error(e);
      this.aviso(Acesso.mensagemErro(e));
      botao.disabled = false;
    }
  },

  confirmarExclusao(aluno) {
    const zona = this.container.querySelector("#zona-excluir");
    zona.innerHTML = `
      <p class="excluir-pergunta">Excluir <strong>${Formato.seguro(aluno.nome)}</strong> e todos os dados dele? Isso não pode ser desfeito.
        Se ele só parou de treinar, prefira mudar a situação para Inativo ou Trancado.</p>
      <div class="formulario-acoes">
        <button class="botao botao-perigo-cheio" type="button" id="sim-excluir">Sim, excluir</button>
        <button class="botao botao-secundario" type="button" id="nao-excluir">Não</button>
      </div>`;
    zona.querySelector("#nao-excluir").addEventListener("click", () => this.formulario(aluno));
    zona.querySelector("#sim-excluir").addEventListener("click", async (e) => {
      e.target.disabled = true;
      try {
        await Dados.excluir("alunos", aluno.id);
        location.hash = "#/alunos";
      } catch (erro) {
        console.error(erro);
        this.aviso(Acesso.mensagemErro(erro));
        e.target.disabled = false;
      }
    });
  },
};
