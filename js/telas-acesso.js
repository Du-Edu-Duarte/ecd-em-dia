/*
 * telas-acesso.js
 * Telas de quem ainda não pode usar o sistema:
 * Entrar, Cadastro, Esqueci a senha, Confirme seu e-mail,
 * Aguardando aprovação, Conta bloqueada e o aviso de Firebase não configurado.
 *
 * O app.js chama TelasAcesso.desenhar(estado) quando a situação
 * do usuário não é "ativo" nem "admin".
 */
const TelasAcesso = {
  modo: "entrar", // entrar | cadastro | esqueci (só quando deslogado)
  container: null,
  estado: null,

  desenhar(container, estado) {
    this.container = container;
    this.estado = estado;
    const telas = {
      "sem-config": () => this.semConfig(),
      deslogado: () => this[this.modo](),
      verificar: () => this.verificar(),
      pendente: () => this.pendente(),
      bloqueado: () => this.bloqueado(),
    };
    container.innerHTML = `<div class="acesso">${(telas[estado.situacao] || telas.deslogado)()}</div>`;
    this.ligarEventos();
    if (estado.erro) this.mostrarAviso(estado.erro, "erro");
  },

  trocarModo(modo) {
    this.modo = modo;
    this.desenhar(this.container, { situacao: "deslogado" });
  },

  /* ---------- Desenhos ---------- */
  cabecalho(titulo, texto) {
    return `
      <div class="acesso-marca">${ECD_CONFIG.nomeSistema}</div>
      <h1>${titulo}</h1>
      ${texto ? `<p class="acesso-texto">${texto}</p>` : ""}
      <div class="aviso" id="aviso" role="alert" hidden></div>`;
  },

  campo(id, rotulo, tipo = "text", extra = "") {
    return `<label class="campo"><span>${rotulo}</span>
      <input id="${id}" name="${id}" type="${tipo}" ${extra} /></label>`;
  },

  entrar() {
    return `<form class="cartao acesso-cartao" id="form-entrar" novalidate>
      ${this.cabecalho("Entrar")}
      ${this.campo("email", "E-mail", "email", 'autocomplete="email" required')}
      ${this.campo("senha", "Senha", "password", 'autocomplete="current-password" required')}
      <button class="botao botao-largo" type="submit">Entrar</button>
      <button class="botao-link" type="button" data-modo="esqueci">Esqueci a senha</button>
      <div class="acesso-rodape">Ainda não tem conta?
        <button class="botao-link" type="button" data-modo="cadastro">Criar conta</button></div>
    </form>`;
  },

  cadastro() {
    const extras = ECD_CONFIG.camposExtrasCadastro
      .map((c) => this.campo(`extra-${c.id}`, c.rotulo, c.tipo,
        `${c.obrigatorio ? "required" : ""} placeholder="${c.dica || ""}"`))
      .join("");
    return `<form class="cartao acesso-cartao" id="form-cadastro" novalidate>
      ${this.cabecalho("Criar conta", "Depois do cadastro, confirme o e-mail. O acesso é liberado quando a ECD aprovar a conta.")}
      ${this.campo("nome", "Nome completo", "text", 'autocomplete="name" required')}
      ${this.campo("setor", "Setor ou empresa", "text", 'required placeholder="Ex.: Studio de treino funcional"')}
      ${this.campo("email", "E-mail", "email", 'autocomplete="email" required')}
      ${extras}
      ${this.campo("senha", "Senha (mínimo 6 caracteres)", "password", 'autocomplete="new-password" minlength="6" required')}
      <label class="campo-check">
        <input type="checkbox" id="lgpd" required />
        <span>Concordo que meus dados e os dos meus alunos sejam guardados para uso deste sistema, conforme a LGPD.</span>
      </label>
      <button class="botao botao-largo" type="submit">Criar conta</button>
      <div class="acesso-rodape">Já tem conta?
        <button class="botao-link" type="button" data-modo="entrar">Entrar</button></div>
    </form>`;
  },

  esqueci() {
    return `<form class="cartao acesso-cartao" id="form-esqueci" novalidate>
      ${this.cabecalho("Esqueci a senha", "Informe o e-mail do cadastro. Vamos enviar um link para criar uma senha nova.")}
      ${this.campo("email", "E-mail", "email", 'autocomplete="email" required')}
      <button class="botao botao-largo" type="submit">Enviar link</button>
      <button class="botao-link" type="button" data-modo="entrar">Voltar para Entrar</button>
    </form>`;
  },

  verificar() {
    const email = Formato.seguro(this.estado.usuario ? this.estado.usuario.email : "");
    return `<div class="cartao acesso-cartao">
      ${this.cabecalho("Confirme seu e-mail", `Enviamos um link para <strong>${email}</strong>. Abra o e-mail, clique no link e depois toque em "Já confirmei". Se não achar, olhe a caixa de spam.`)}
      <button class="botao botao-largo" type="button" id="ja-confirmei">Já confirmei</button>
      <button class="botao botao-secundario botao-largo" type="button" id="reenviar">Reenviar e-mail</button>
      <button class="botao-link" type="button" data-acao="sair">Sair</button>
    </div>`;
  },

  pendente() {
    return `<div class="cartao acesso-cartao">
      ${this.cabecalho("Aguardando aprovação", "Seu e-mail foi confirmado. Agora a ECD Tecnologia precisa aprovar sua conta. Você recebe o acesso assim que isso acontecer.")}
      <button class="botao botao-largo" type="button" data-acao="recarregar">Conferir de novo</button>
      <button class="botao-link" type="button" data-acao="sair">Sair</button>
    </div>`;
  },

  bloqueado() {
    return `<div class="cartao acesso-cartao">
      ${this.cabecalho("Conta bloqueada", "O acesso desta conta está suspenso. Fale com a ECD Tecnologia para resolver.")}
      <button class="botao-link" type="button" data-acao="sair">Sair</button>
    </div>`;
  },

  semConfig() {
    return `<div class="cartao acesso-cartao">
      ${this.cabecalho("Firebase não configurado", "Preencha o arquivo js/firebase-config.js com os dados do projeto Firebase para ativar o login.")}
    </div>`;
  },

  /* ---------- Comportamento ---------- */
  mostrarAviso(texto, tipo = "erro") {
    const el = document.getElementById("aviso");
    if (!el) return;
    el.textContent = texto;
    el.className = `aviso aviso-${tipo}`;
    el.hidden = false;
  },

  async executar(botao, acao) {
    botao.disabled = true;
    try {
      await acao();
    } catch (erro) {
      console.error(erro);
      this.mostrarAviso(Acesso.mensagemErro(erro));
    } finally {
      botao.disabled = false;
    }
  },

  valor(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  },

  ligarEventos() {
    const c = this.container;
    c.querySelectorAll("[data-modo]").forEach((b) =>
      b.addEventListener("click", () => this.trocarModo(b.dataset.modo)));
    c.querySelectorAll('[data-acao="sair"]').forEach((b) =>
      b.addEventListener("click", () => Acesso.sair()));
    c.querySelectorAll('[data-acao="recarregar"]').forEach((b) =>
      b.addEventListener("click", () => location.reload()));

    const formEntrar = c.querySelector("#form-entrar");
    if (formEntrar) formEntrar.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!this.valor("email") || !this.valor("senha")) return this.mostrarAviso("Preencha e-mail e senha.");
      this.executar(e.submitter || formEntrar.querySelector("button"), () =>
        Acesso.entrar(this.valor("email"), document.getElementById("senha").value));
    });

    const formCadastro = c.querySelector("#form-cadastro");
    if (formCadastro) formCadastro.addEventListener("submit", (e) => {
      e.preventDefault();
      const faltando = [...formCadastro.querySelectorAll("input[required]")]
        .some((i) => (i.type === "checkbox" ? !i.checked : !i.value.trim()));
      if (faltando) return this.mostrarAviso("Preencha todos os campos e aceite o termo de uso dos dados.");
      const senha = document.getElementById("senha").value;
      if (senha.length < 6) return this.mostrarAviso("A senha precisa ter pelo menos 6 caracteres.");
      const extras = {};
      ECD_CONFIG.camposExtrasCadastro.forEach((campo) => (extras[campo.id] = this.valor(`extra-${campo.id}`)));
      this.executar(e.submitter || formCadastro.querySelector("button"), () =>
        Acesso.cadastrar({ nome: this.valor("nome"), setor: this.valor("setor"), email: this.valor("email"), senha, extras }));
    });

    const formEsqueci = c.querySelector("#form-esqueci");
    if (formEsqueci) formEsqueci.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!this.valor("email")) return this.mostrarAviso("Informe o e-mail.");
      this.executar(e.submitter || formEsqueci.querySelector("button"), async () => {
        await Acesso.esqueciSenha(this.valor("email"));
        this.mostrarAviso("Se este e-mail tiver cadastro, o link chega em alguns minutos.", "ok");
      });
    });

    const jaConfirmei = c.querySelector("#ja-confirmei");
    if (jaConfirmei) jaConfirmei.addEventListener("click", () =>
      this.executar(jaConfirmei, async () => {
        const ok = await Acesso.conferirConfirmacao();
        if (ok) location.reload();
        else this.mostrarAviso("Ainda não aparece como confirmado. Clique no link do e-mail e tente de novo.");
      }));

    const reenviar = c.querySelector("#reenviar");
    if (reenviar) reenviar.addEventListener("click", () =>
      this.executar(reenviar, async () => {
        await Acesso.reenviarConfirmacao();
        this.mostrarAviso("E-mail reenviado.", "ok");
      }));
  },
};
