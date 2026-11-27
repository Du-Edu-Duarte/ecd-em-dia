/*
 * telas/aulas.js
 * Tela "Aulas e horários": lista as turmas do professor e permite
 * criar, editar e excluir. Os dados ficam em professores/{uid}/turmas.
 *
 * A tela tem dois modos:
 *   lista       todas as turmas, em ordem de dia e horário
 *   formulario  nova turma ou edição de uma turma
 */
const TelaAulas = {
  container: null,
  turmas: [],
  editando: null, // turma em edição (null = nova)
  modo: "lista",

  desenhar(container) {
    this.container = container;
    this.modo = "lista";
    container.innerHTML = `<div class="tela-cabecalho"><h1>Aulas e horários</h1></div>
      <p class="carregando">Carregando turmas...</p>`;
    // Lista sempre atualizada (sincroniza celular e computador)
    Dados.ouvir("turmas", (turmas) => {
      this.turmas = RegrasTurmas.ordenar(turmas);
      if (this.modo === "lista") this.lista();
    }, (erro) => this.erroGeral(erro));
  },

  erroGeral(erro) {
    this.container.innerHTML = `<div class="tela-cabecalho"><h1>Aulas e horários</h1></div>
      <p class="aviso aviso-erro">${Acesso.mensagemErro(erro)}</p>`;
  },

  /* ---------- Modo lista ---------- */
  lista() {
    const s = Formato.seguro;
    const aulasSemana = this.turmas.reduce((soma, t) => soma + t.diasSemana.length, 0);
    const resumo = this.turmas.length
      ? `${this.turmas.length} ${this.turmas.length === 1 ? "turma" : "turmas"}, ${aulasSemana} ${aulasSemana === 1 ? "aula" : "aulas"} por semana`
      : "";

    const cartoes = this.turmas.map((t) => `
      <button class="cartao turma" type="button" data-id="${s(t.id)}" aria-label="Editar ${s(t.nome)}">
        <span class="turma-horario">${s(t.inicio)}<small>até ${s(t.fim)}</small></span>
        <span class="turma-info">
          <strong>${s(t.nome)}</strong>
          <span>${RegrasTurmas.diasTexto(t.diasSemana)}</span>
          ${t.vagas ? `<span>${t.vagas} ${t.vagas === 1 ? "vaga" : "vagas"}</span>` : ""}
        </span>
        ${Icones.svg("seta", 20)}
      </button>`).join("");

    this.container.innerHTML = `
      <div class="tela-cabecalho tela-cabecalho-acoes">
        <div>
          <h1>Aulas e horários</h1>
          ${resumo ? `<p class="tela-resumo">${resumo}</p>` : ""}
        </div>
        <button class="botao botao-destaque" type="button" id="nova-turma">${Icones.svg("mais-item", 20)}Nova turma</button>
      </div>
      ${this.turmas.length ? `<div class="lista-turmas">${cartoes}</div>` : `
        <div class="cartao vazio">
          <span class="vazio-icone">${Icones.svg("aulas", 32)}</span>
          <p class="vazio-titulo">Nenhuma turma cadastrada</p>
          <p class="vazio-texto">Cadastre os dias e horários das suas aulas. Depois, no cadastro do aluno, é só marcar as turmas em que ele treina.</p>
        </div>`}`;

    this.container.querySelector("#nova-turma").addEventListener("click", () => this.formulario(null));
    this.container.querySelectorAll("[data-id]").forEach((b) =>
      b.addEventListener("click", () => this.formulario(this.turmas.find((t) => t.id === b.dataset.id))));
  },

  /* ---------- Modo formulário ---------- */
  formulario(turma) {
    this.modo = "formulario";
    this.editando = turma;
    const s = Formato.seguro;
    const t = turma || { nome: "", diasSemana: [], inicio: "", fim: "", vagas: null };

    const dias = RegrasTurmas.DIAS.map((d) => `
      <label class="dia">
        <input type="checkbox" name="dia" value="${d.n}" ${t.diasSemana.includes(d.n) ? "checked" : ""} />
        <span title="${d.longo}">${d.curto}</span>
      </label>`).join("");

    this.container.innerHTML = `
      <div class="tela-cabecalho">
        <button class="botao-voltar" type="button" id="voltar">${Icones.svg("voltar", 20)}Aulas e horários</button>
        <h1>${turma ? "Editar turma" : "Nova turma"}</h1>
      </div>
      <form class="cartao formulario" id="form-turma" novalidate>
        <div class="aviso" id="aviso" role="alert" hidden></div>
        <label class="campo"><span>Nome da turma</span>
          <input id="nome" type="text" maxlength="60" value="${s(t.nome)}" placeholder="Ex.: Funcional manhã" required /></label>
        <fieldset class="campo campo-dias">
          <legend>Dias da semana</legend>
          <div class="dias">${dias}</div>
        </fieldset>
        <div class="campo-linha">
          <label class="campo"><span>Início</span><input id="inicio" type="time" value="${s(t.inicio)}" required /></label>
          <label class="campo"><span>Fim</span><input id="fim" type="time" value="${s(t.fim)}" required /></label>
        </div>
        <label class="campo"><span>Vagas (opcional)</span>
          <input id="vagas" type="number" inputmode="numeric" min="1" step="1" value="${t.vagas || ""}" placeholder="Sem limite" /></label>
        <div class="formulario-acoes">
          <button class="botao" type="submit">Salvar</button>
          <button class="botao botao-secundario" type="button" id="cancelar">Cancelar</button>
        </div>
        ${turma ? `
        <div class="zona-excluir" id="zona-excluir">
          <button class="botao-link botao-perigo" type="button" id="excluir">Excluir turma</button>
        </div>` : ""}
      </form>`;

    const voltar = () => { this.modo = "lista"; this.lista(); };
    this.container.querySelector("#voltar").addEventListener("click", voltar);
    this.container.querySelector("#cancelar").addEventListener("click", voltar);
    this.container.querySelector("#form-turma").addEventListener("submit", (e) => {
      e.preventDefault();
      this.salvar(e.submitter || this.container.querySelector('button[type="submit"]'));
    });
    const excluir = this.container.querySelector("#excluir");
    if (excluir) excluir.addEventListener("click", () => this.confirmarExclusao());
    this.container.querySelector("#nome").focus();
  },

  lerFormulario() {
    const vagasTexto = this.container.querySelector("#vagas").value.trim();
    return {
      nome: this.container.querySelector("#nome").value.trim(),
      diasSemana: [...this.container.querySelectorAll('input[name="dia"]:checked')].map((i) => Number(i.value)),
      inicio: this.container.querySelector("#inicio").value,
      fim: this.container.querySelector("#fim").value,
      vagas: vagasTexto === "" ? null : Number(vagasTexto),
    };
  },

  aviso(texto, tipo = "erro") {
    const el = this.container.querySelector("#aviso");
    el.textContent = texto;
    el.className = `aviso aviso-${tipo}`;
    el.hidden = false;
    el.scrollIntoView({ block: "nearest" });
  },

  async salvar(botao) {
    const turma = this.lerFormulario();
    const erro = RegrasTurmas.validar(turma);
    if (erro) return this.aviso(erro);
    turma.diasSemana.sort((a, b) => a - b);

    botao.disabled = true;
    try {
      await Dados.salvar("turmas", turma, this.editando && this.editando.id);
      this.modo = "lista";
      this.lista();
    } catch (e) {
      console.error(e);
      this.aviso(Acesso.mensagemErro(e));
      botao.disabled = false;
    }
  },

  // Confirmação dentro da própria tela (sem janela do navegador)
  async confirmarExclusao() {
    const zona = this.container.querySelector("#zona-excluir");
    let alunosNaTurma = 0;
    try {
      alunosNaTurma = (await Dados.listar("alunos")).filter((a) => (a.turmas || []).includes(this.editando.id)).length;
    } catch (e) { console.error(e); }
    const aviso = alunosNaTurma
      ? ` ${alunosNaTurma === 1 ? "1 aluno treina" : `${alunosNaTurma} alunos treinam`} nela e ${alunosNaTurma === 1 ? "vai deixar" : "vão deixar"} de ter essa turma no cadastro.`
      : "";
    zona.innerHTML = `
      <p class="excluir-pergunta">Excluir a turma <strong>${Formato.seguro(this.editando.nome)}</strong>?${aviso} Isso não pode ser desfeito.</p>
      <div class="formulario-acoes">
        <button class="botao botao-perigo-cheio" type="button" id="sim-excluir">Sim, excluir</button>
        <button class="botao botao-secundario" type="button" id="nao-excluir">Não</button>
      </div>`;
    zona.querySelector("#nao-excluir").addEventListener("click", () => this.formulario(this.editando));
    zona.querySelector("#sim-excluir").addEventListener("click", async (e) => {
      e.target.disabled = true;
      try {
        await Dados.excluirTurma(this.editando.id);
        this.modo = "lista";
        this.lista();
      } catch (erro) {
        console.error(erro);
        this.aviso(Acesso.mensagemErro(erro));
        e.target.disabled = false;
      }
    });
  },
};
