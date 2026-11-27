/*
 * telas/ajustes.js
 * Tela "Ajustes": dados do professor, formas de pagamento, textos dos lembretes,
 * multa e juros e tema P&B. Tudo fica no perfil professores/{uid}:
 *   nome, extras.telefone, formas[{id, tipo, nome, valor}] (só as que o professor tem),
 *   planos[{id, vezes, periodo, valor}] (planos oferecidos aos alunos),
 *   marca{logo, corTopo, corDestaque} (logo e cores do professor),
 *   templates{d5, d1, hoje, atraso}, config{multaAtiva, multaPercentual, jurosAtivo, jurosMensal, tema}
 */
const TelaAjustes = {
  container: null,

  desenhar(container) {
    this.container = container;
    const s = Formato.seguro;
    const p = Acesso.estado.perfil || {};
    this.formas = RegrasFormas.doPerfil(p).map((x) => ({ ...x }));
    this.planos = RegrasPlanos.ordenar(p.planos || []).map((x) => ({ ...x }));
    this.marca = { logo: "", corTopo: "", corDestaque: "", ...(p.marca || {}) };
    const c = p.config || {};
    const t = p.templates || {};

    const textos = RegrasMensagens.TIPOS.map((tipo) => `
      <div class="lembrete">
        <label class="campo"><span>${tipo.rotulo}</span>
          <textarea id="tpl-${tipo.id}" rows="4" maxlength="700" data-tipo="${tipo.id}">${s(RegrasMensagens.modelo(tipo.id, t))}</textarea></label>
        <div class="lembrete-rodape">
          <button class="botao-link" type="button" data-padrao="${tipo.id}">Voltar ao texto padrão</button>
        </div>
        <p class="previa" id="previa-${tipo.id}" aria-live="polite"></p>
      </div>`).join("");

    container.innerHTML = `
      <div class="tela-cabecalho"><h1>Ajustes</h1></div>
      <form class="ajustes" id="form-ajustes" novalidate>

        <section class="cartao formulario">
          <h2 class="formulario-titulo">Seus dados</h2>
          <label class="campo"><span>Seu nome (aparece nas mensagens como {professor})</span>
            <input id="nome" type="text" maxlength="80" value="${s(p.nome)}" required /></label>
          <label class="campo"><span>Seu WhatsApp</span>
            <input id="telefone" type="tel" value="${s((p.extras || {}).telefone)}" placeholder="(11) 91234-5678" /></label>
          <p class="campo-dica">E-mail da conta: ${s(p.email || (Acesso.estado.usuario || {}).email)}</p>
        </section>

        <section class="cartao formulario">
          <h2 class="formulario-titulo">Formas de pagamento</h2>
          <p class="campo-dica campo-dica-topo">Cadastre só as que você usa. Elas vão no lugar de {link} na mensagem: a forma escolhida na ficha do aluno ou, se ele não tiver uma, todas.</p>
          <div class="lista-formas" id="lista-formas"></div>
          <button class="botao botao-secundario" type="button" id="adicionar-forma">${Icones.svg("mais-item", 20)}Adicionar forma de pagamento</button>
        </section>

        <section class="cartao formulario">
          <h2 class="formulario-titulo">Planos dos alunos</h2>
          <p class="campo-dica campo-dica-topo">Monte os planos que você oferece (ex.: 3x por semana, trimestral). Na ficha do aluno, escolher o plano já preenche o valor e de quantos em quantos meses ele paga.</p>
          <div class="lista-formas" id="lista-planos"></div>
          <button class="botao botao-secundario" type="button" id="adicionar-plano">${Icones.svg("mais-item", 20)}Adicionar plano</button>
        </section>

        <section class="cartao formulario">
          <h2 class="formulario-titulo">Textos dos lembretes</h2>
          <p class="campo-dica campo-dica-topo">Use as palavras entre chaves, e o sistema troca pelos dados de cada aluno:
            ${RegrasMensagens.VARIAVEIS.map((v) => `<code>${v}</code>`).join(" ")}. A prévia embaixo de cada texto usa um aluno de exemplo.</p>
          ${textos}
        </section>

        <section class="cartao formulario">
          <h2 class="formulario-titulo">Multa e juros por atraso</h2>
          <p class="campo-dica campo-dica-topo">Desligados até você ligar. Pelo Código de Defesa do Consumidor, a multa é de no máximo 2%, e os juros costumam ser de 1% ao mês.</p>
          <label class="campo-check"><input type="checkbox" id="multaAtiva" ${c.multaAtiva ? "checked" : ""} /><span>Cobrar multa</span></label>
          <label class="campo"><span>Multa (%)</span>
            <input id="multaPercentual" type="text" inputmode="decimal" value="${s(String(c.multaPercentual ?? 2).replace(".", ","))}" /></label>
          <label class="campo-check"><input type="checkbox" id="jurosAtivo" ${c.jurosAtivo ? "checked" : ""} /><span>Cobrar juros</span></label>
          <label class="campo"><span>Juros ao mês (%), proporcional aos dias de atraso</span>
            <input id="jurosMensal" type="text" inputmode="decimal" value="${s(String(c.jurosMensal ?? 1).replace(".", ","))}" /></label>
        </section>

        <section class="cartao formulario">
          <h2 class="formulario-titulo">Sua marca e aparência</h2>
          <p class="campo-dica campo-dica-topo">O logo aparece no topo do sistema e no PDF dos relatórios. As cores do logo são sugeridas sozinhas, e você pode trocar.</p>
          <div class="marca-logo">
            <img class="marca-previa" id="marca-previa" alt="Seu logo" ${this.marca.logo ? `src="${this.marca.logo}"` : "hidden"} />
            <div class="marca-botoes">
              <label class="botao botao-secundario botao-arquivo"><span id="marca-rotulo">${this.marca.logo ? "Trocar logo" : "Enviar logo"}</span>
                <input type="file" id="marca-arquivo" accept="image/png,image/jpeg,image/webp" /></label>
              <button class="botao-link botao-perigo" type="button" id="marca-remover" ${this.marca.logo ? "" : "hidden"}>Remover logo</button>
            </div>
          </div>
          <div class="campo-linha">
            <label class="campo campo-cor"><span>Cor do topo (escura)</span>
              <input type="color" id="corTopo" value="${s(this.marca.corTopo || ECD_CONFIG.cores.preto)}" /></label>
            <label class="campo campo-cor"><span>Cor de destaque (clara)</span>
              <input type="color" id="corDestaque" value="${s(this.marca.corDestaque || ECD_CONFIG.cores.dourado)}" /></label>
          </div>
          <button class="botao-link" type="button" id="marca-padrao">Voltar às cores do ${s(ECD_CONFIG.nomeSistema)}</button>
          <label class="campo-check"><input type="checkbox" id="temaPB" ${c.tema === "pb" ? "checked" : ""} />
            <span>Tema preto e branco (sem o dourado)</span></label>
        </section>

        <div class="barra-salvar">
          <div class="aviso" id="aviso" role="alert" hidden></div>
          <button class="botao botao-largo" type="submit">Salvar ajustes</button>
        </div>
      </form>`;

    this.desenharFormas();
    this.desenharPlanos();
    container.querySelector("#adicionar-plano").addEventListener("click", () => {
      this.lerPlanos();
      const ultimo = this.planos[this.planos.length - 1];
      const vezes = ultimo && ultimo.vezes && ultimo.vezes < 7 ? ultimo.vezes + 1 : 2;
      this.planos.push({ id: RegrasPlanos.novoId(), vezes, periodo: ultimo ? ultimo.periodo : "mensal", valor: null });
      this.desenharPlanos();
      const campos = container.querySelectorAll(".plano-valor");
      campos[campos.length - 1].focus();
    });
    container.querySelector("#adicionar-forma").addEventListener("click", () => {
      this.lerFormas();
      this.formas.push({ id: RegrasFormas.novoId(), tipo: this.formas.some((x) => x.tipo === "pix") ? "link" : "pix", nome: "", valor: "" });
      this.desenharFormas();
      const campos = container.querySelectorAll(".forma-valor");
      campos[campos.length - 1].focus();
    });

    const form = container.querySelector("#form-ajustes");
    form.addEventListener("input", () => this.atualizarPrevias());
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.salvar(e.submitter || form.querySelector('button[type="submit"]'));
    });
    container.querySelectorAll("[data-padrao]").forEach((b) => b.addEventListener("click", () => {
      container.querySelector(`#tpl-${b.dataset.padrao}`).value = RegrasMensagens.PADRAO[b.dataset.padrao];
      this.atualizarPrevias();
    }));
    this.ligarMarca();
    // O tema muda na hora, para o professor ver como fica
    container.querySelector("#temaPB").addEventListener("change", (e) => Tema.aplicar(e.target.checked ? "pb" : ""));
    this.atualizarPrevias();
  },

  // Lista editável de formas de pagamento
  desenharFormas() {
    const s = Formato.seguro;
    const el = this.container.querySelector("#lista-formas");
    el.innerHTML = this.formas.length ? this.formas.map((f, i) => {
      const t = RegrasFormas.tipo(f.tipo);
      return `
      <div class="forma" data-i="${i}">
        <div class="forma-topo">
          <label class="campo"><span>Tipo</span>
            <select class="forma-tipo">${RegrasFormas.TIPOS.map((x) =>
              `<option value="${x.id}" ${x.id === f.tipo ? "selected" : ""}>${x.rotulo}</option>`).join("")}</select></label>
          <button class="botao-icone forma-remover" type="button" aria-label="Remover esta forma" title="Remover">${Icones.svg("fechar", 20)}</button>
        </div>
        <label class="campo"><span>${f.tipo === "outro" ? "Como pagar" : t.link ? "Link" : f.tipo === "pixcopia" ? "Código ou link" : "Chave"}</span>
          <input class="forma-valor" type="${t.link ? "url" : "text"}" maxlength="400" value="${s(f.valor)}" placeholder="${s(t.dica)}" /></label>
        <label class="campo"><span>${f.tipo === "outro" ? "Nome (ex.: Transferência)" : "Banco ou app (opcional)"}</span>
          <input class="forma-nome" type="text" maxlength="40" value="${s(f.nome)}" placeholder="${f.tipo === "outro" ? "Transferência" : "Ex.: Nubank"}" /></label>
      </div>`;
    }).join("") : `<p class="ficha-vazio">Nenhuma forma cadastrada. Sem ela, a mensagem vai sem o jeito de pagar.</p>`;
    this.container.querySelector("#adicionar-forma").hidden = this.formas.length >= RegrasFormas.MAXIMO;

    el.querySelectorAll(".forma-tipo").forEach((sel) => sel.addEventListener("change", () => {
      this.lerFormas();
      this.desenharFormas();
      this.atualizarPrevias();
    }));
    el.querySelectorAll(".forma-remover").forEach((b) => b.addEventListener("click", () => {
      this.lerFormas();
      this.formas.splice(Number(b.closest(".forma").dataset.i), 1);
      this.desenharFormas();
      this.atualizarPrevias();
    }));
  },

  // Logo e cores: a prévia é na hora; só fica gravado ao salvar
  ligarMarca() {
    const c = this.container;
    const previa = () => {
      this.marca.corTopo = c.querySelector("#corTopo").value.toUpperCase();
      this.marca.corDestaque = c.querySelector("#corDestaque").value.toUpperCase();
      Marca.aplicar(this.marca);
    };
    c.querySelector("#corTopo").addEventListener("input", previa);
    c.querySelector("#corDestaque").addEventListener("input", previa);
    c.querySelector("#marca-padrao").addEventListener("click", () => {
      c.querySelector("#corTopo").value = ECD_CONFIG.cores.preto;
      c.querySelector("#corDestaque").value = ECD_CONFIG.cores.dourado;
      previa();
      this.marca.corTopo = "";
      this.marca.corDestaque = "";
    });
    c.querySelector("#marca-remover").addEventListener("click", () => {
      this.marca.logo = "";
      const img = c.querySelector("#marca-previa");
      img.hidden = true;
      img.removeAttribute("src");
      c.querySelector("#marca-remover").hidden = true;
      c.querySelector("#marca-rotulo").textContent = "Enviar logo";
      Marca.aplicar(this.marca);
    });
    c.querySelector("#marca-arquivo").addEventListener("change", async (e) => {
      const arquivo = e.target.files[0];
      if (!arquivo) return;
      try {
        const { logo, cores } = await this.lerLogo(arquivo);
        this.marca.logo = logo;
        const img = c.querySelector("#marca-previa");
        img.src = logo;
        img.hidden = false;
        c.querySelector("#marca-remover").hidden = false;
        c.querySelector("#marca-rotulo").textContent = "Trocar logo";
        if (cores.corTopo) c.querySelector("#corTopo").value = cores.corTopo;
        if (cores.corDestaque) c.querySelector("#corDestaque").value = cores.corDestaque;
        previa();
        this.aviso("Logo carregado e cores sugeridas. Toque em Salvar ajustes para guardar.", "ok");
      } catch (erro) {
        console.error(erro);
        this.aviso("Não deu para ler essa imagem. Tente um PNG ou JPG.");
      }
      e.target.value = "";
    });
  },

  // Reduz o logo para 256 px no próprio aparelho e sugere as cores dele
  lerLogo(arquivo) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(arquivo);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const max = RegrasMarca.LOGO_MAX_PX;
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let logo = canvas.toDataURL("image/png");
        if (logo.length > RegrasMarca.LOGO_MAX_TEXTO) logo = canvas.toDataURL("image/jpeg", 0.85);
        const dados = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const pixels = [];
        for (let i = 0; i < dados.length; i += 16) if (dados[i + 3] > 200) pixels.push([dados[i], dados[i + 1], dados[i + 2]]);
        resolve({ logo, cores: RegrasMarca.sugerirCores(pixels) });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagem inválida")); };
      img.src = url;
    });
  },

  // Lista editável de planos dos alunos
  desenharPlanos() {
    const el = this.container.querySelector("#lista-planos");
    el.innerHTML = this.planos.length ? this.planos.map((p, i) => `
      <div class="forma plano" data-i="${i}">
        <div class="forma-topo">
          <label class="campo"><span>Vezes por semana</span>
            <select class="plano-vezes">
              ${RegrasPlanos.VEZES.map((v) => `<option value="${v}" ${v === p.vezes ? "selected" : ""}>${v}x por semana</option>`).join("")}
              <option value="" ${p.vezes ? "" : "selected"}>Livre</option>
            </select></label>
          <button class="botao-icone forma-remover plano-remover" type="button" aria-label="Remover este plano" title="Remover">${Icones.svg("fechar", 20)}</button>
        </div>
        <div class="campo-linha">
          <label class="campo"><span>Período</span>
            <select class="plano-periodo">${RegrasPlanos.PERIODOS.map((x) =>
              `<option value="${x.id}" ${x.id === p.periodo ? "selected" : ""}>${x.rotulo}</option>`).join("")}</select></label>
          <label class="campo"><span>Valor (R$)</span>
            <input class="plano-valor" type="text" inputmode="decimal" value="${RegrasAlunos.valorParaCampo(p.valor)}" placeholder="150,00" /></label>
        </div>
        <p class="campo-dica plano-mes"></p>
      </div>`).join("") : `<p class="ficha-vazio">Nenhum plano. Sem planos, você digita o valor de cada aluno.</p>`;
    this.container.querySelector("#adicionar-plano").hidden = this.planos.length >= RegrasPlanos.MAXIMO;
    const atualizar = () => {
      this.lerPlanos();
      el.querySelectorAll(".plano").forEach((box) => {
        const p = this.planos[Number(box.dataset.i)];
        const meses = RegrasPlanos.periodo(p.periodo).meses;
        box.querySelector(".plano-mes").textContent = p.valor > 0 && meses > 1
          ? `Equivale a ${Formato.dinheiro(RegrasPlanos.porMes(p))} por mês, cobrado a cada ${meses} meses.` : "";
      });
    };
    el.querySelectorAll("select, input").forEach((c) => c.addEventListener("input", atualizar));
    el.querySelectorAll(".plano-remover").forEach((b) => b.addEventListener("click", () => {
      this.lerPlanos();
      this.planos.splice(Number(b.closest(".plano").dataset.i), 1);
      this.desenharPlanos();
    }));
    atualizar();
  },

  lerPlanos() {
    this.container.querySelectorAll("#lista-planos .plano").forEach((el) => {
      const p = this.planos[Number(el.dataset.i)];
      const vezes = el.querySelector(".plano-vezes").value;
      p.vezes = vezes ? Number(vezes) : null;
      p.periodo = el.querySelector(".plano-periodo").value;
      p.valor = RegrasAlunos.lerValor(el.querySelector(".plano-valor").value);
    });
    return this.planos;
  },

  // Copia o que está digitado na tela para this.formas
  lerFormas() {
    this.container.querySelectorAll("#lista-formas .forma").forEach((el) => {
      const f = this.formas[Number(el.dataset.i)];
      f.tipo = el.querySelector(".forma-tipo").value;
      f.valor = el.querySelector(".forma-valor").value.trim();
      f.nome = el.querySelector(".forma-nome").value.trim();
    });
    return this.formas;
  },

  valor(id) {
    return this.container.querySelector("#" + id).value.trim();
  },

  // Prévia de cada texto com um aluno de exemplo
  atualizarPrevias() {
    const hoje = Formato.hojeISO();
    const formas = this.lerFormas().filter((f) => f.valor);
    const link = RegrasFormas.paraMensagem(formas, "todas");
    RegrasMensagens.TIPOS.forEach((tipo) => {
      const texto = this.container.querySelector(`#tpl-${tipo.id}`).value;
      const erradas = RegrasMensagens.variaveisDesconhecidas(texto);
      const el = this.container.querySelector(`#previa-${tipo.id}`);
      el.classList.toggle("previa-erro", erradas.length > 0);
      el.textContent = erradas.length
        ? `Confira: ${erradas.join(", ")} não é uma palavra conhecida.`
        : RegrasMensagens.montar(texto, {
          nome: "Ana", valor: Formato.dinheiro(150), vencimento: Formato.data(hoje),
          link: link.ok ? link.texto : "[cadastre uma forma de pagamento acima]",
          professor: this.valor("nome"),
        });
    });
  },

  numero(id) {
    return Number(this.valor(id).replace(",", "."));
  },

  aviso(texto, tipo = "erro") {
    const el = this.container.querySelector("#aviso");
    el.textContent = texto;
    el.className = `aviso aviso-${tipo}`;
    el.hidden = false;
  },

  async salvar(botao) {
    const nome = this.valor("nome");
    if (!nome) return this.aviso("Informe o seu nome.");
    const formas = this.lerFormas();
    const erroForma = formas.map((f) => RegrasFormas.validar(f)).find(Boolean);
    if (erroForma) return this.aviso(erroForma);
    const planos = this.lerPlanos();
    const erroPlano = planos.map((p) => RegrasPlanos.validar(p)).find(Boolean);
    if (erroPlano) return this.aviso(erroPlano);
    const repetido = RegrasPlanos.repetido(planos);
    if (repetido) return this.aviso(`O plano ${repetido} aparece duas vezes. Deixe só um.`);
    const telefoneTexto = this.valor("telefone");
    const telefone = telefoneTexto ? RegrasAlunos.normalizarWhatsapp(telefoneTexto) : "";
    if (telefoneTexto && !telefone) return this.aviso("Seu WhatsApp precisa ter DDD, por exemplo (11) 91234-5678.");
    const multa = this.numero("multaPercentual"), juros = this.numero("jurosMensal");
    if (!(multa >= 0 && multa <= 2)) return this.aviso("A multa precisa ser de 0 a 2%.");
    if (!(juros >= 0 && juros <= 10)) return this.aviso("Os juros precisam ser de 0 a 10% ao mês.");
    const templates = {};
    for (const tipo of RegrasMensagens.TIPOS) {
      const texto = this.container.querySelector(`#tpl-${tipo.id}`).value.trim();
      if (RegrasMensagens.variaveisDesconhecidas(texto).length) return this.aviso(`Confira o texto "${tipo.rotulo}": tem uma palavra entre chaves que não existe.`);
      templates[tipo.id] = texto === RegrasMensagens.PADRAO[tipo.id] ? "" : texto; // vazio = usa o padrão
    }
    const tema = this.container.querySelector("#temaPB").checked ? "pb" : "";
    const marca = { ...this.marca };
    // Cor igual à do sistema = sem cor própria (se o padrão mudar, acompanha)
    if (marca.corTopo === ECD_CONFIG.cores.preto.toUpperCase()) marca.corTopo = "";
    if (marca.corDestaque === ECD_CONFIG.cores.dourado.toUpperCase()) marca.corDestaque = "";
    const erroMarca = RegrasMarca.validar(marca);
    if (erroMarca) return this.aviso(erroMarca);

    botao.disabled = true;
    try {
      await Dados.salvarPerfil({
        nome,
        extras: { ...((Acesso.estado.perfil || {}).extras || {}), telefone: telefone ? RegrasAlunos.formatarWhatsapp(telefone) : "" },
        formas: formas.map((f) => ({ id: f.id, tipo: f.tipo, nome: f.nome, valor: f.valor })),
        marca,
        planos: RegrasPlanos.ordenar(planos).map((p) => ({ id: p.id, vezes: p.vezes, periodo: p.periodo, valor: p.valor })),
        templates,
        config: {
          multaAtiva: this.container.querySelector("#multaAtiva").checked, multaPercentual: multa,
          jurosAtivo: this.container.querySelector("#jurosAtivo").checked, jurosMensal: juros, tema,
        },
      });
      document.getElementById("nome-cliente").textContent = nome;
      this.aviso("Ajustes salvos.", "ok");
    } catch (e) {
      console.error(e);
      this.aviso(Acesso.mensagemErro(e));
    } finally {
      botao.disabled = false;
    }
  },
};

// Tema P&B: aplicado ao entrar (pelo perfil) e na hora em que o professor marca em Ajustes
const Tema = {
  aplicar(tema) {
    if (tema === "pb") document.documentElement.dataset.tema = "pb";
    else delete document.documentElement.dataset.tema;
  },
};

// Marca do professor: logo no topo e cores no lugar das do ECD (sem marca, volta ao config.js)
const Marca = {
  aplicar(marca) {
    const m = marca || {};
    const raiz = document.documentElement.style;
    raiz.setProperty("--preto", m.corTopo || ECD_CONFIG.cores.preto);
    raiz.setProperty("--dourado", m.corDestaque || ECD_CONFIG.cores.dourado);
    const cor = document.querySelector('meta[name="theme-color"]');
    if (cor) cor.content = m.corTopo || ECD_CONFIG.cores.preto;
    const logo = document.getElementById("logo-cliente");
    if (logo) {
      logo.hidden = !m.logo;
      if (m.logo) logo.src = m.logo; else logo.removeAttribute("src");
    }
  },
};
