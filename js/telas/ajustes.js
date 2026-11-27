/*
 * telas/ajustes.js
 * Tela "Ajustes": dados do professor, formas de pagamento, textos dos lembretes,
 * multa e juros e tema P&B. Tudo fica no perfil professores/{uid}:
 *   nome, extras.telefone, formasPagamento{pix, linkCartao, linkBoleto},
 *   templates{d5, d1, hoje, atraso}, config{multaAtiva, multaPercentual, jurosAtivo, jurosMensal, tema}
 */
const TelaAjustes = {
  container: null,

  desenhar(container) {
    this.container = container;
    const s = Formato.seguro;
    const p = Acesso.estado.perfil || {};
    const f = p.formasPagamento || {};
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
          <p class="campo-dica campo-dica-topo">Vão no lugar de {link} na mensagem, conforme a forma preferida de cada aluno.</p>
          <label class="campo"><span>Chave Pix</span>
            <input id="pix" type="text" maxlength="140" value="${s(f.pix)}" placeholder="CPF, e-mail, celular ou chave aleatória" /></label>
          <label class="campo"><span>Link de pagamento com cartão</span>
            <input id="linkCartao" type="url" maxlength="300" value="${s(f.linkCartao)}" placeholder="https://..." /></label>
          <label class="campo"><span>Link do boleto</span>
            <input id="linkBoleto" type="url" maxlength="300" value="${s(f.linkBoleto)}" placeholder="https://..." /></label>
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
          <h2 class="formulario-titulo">Aparência</h2>
          <label class="campo-check"><input type="checkbox" id="temaPB" ${c.tema === "pb" ? "checked" : ""} />
            <span>Tema preto e branco (sem o dourado)</span></label>
        </section>

        <div class="barra-salvar">
          <div class="aviso" id="aviso" role="alert" hidden></div>
          <button class="botao botao-largo" type="submit">Salvar ajustes</button>
        </div>
      </form>`;

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
    // O tema muda na hora, para o professor ver como fica
    container.querySelector("#temaPB").addEventListener("change", (e) => Tema.aplicar(e.target.checked ? "pb" : ""));
    this.atualizarPrevias();
  },

  valor(id) {
    return this.container.querySelector("#" + id).value.trim();
  },

  // Prévia de cada texto com um aluno de exemplo
  atualizarPrevias() {
    const hoje = Formato.hojeISO();
    const exemplo = { formaPreferida: "pix" };
    const link = Pagamento.link(null, exemplo, { pix: this.valor("pix"), linkCartao: this.valor("linkCartao"), linkBoleto: this.valor("linkBoleto") });
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
    const links = ["linkCartao", "linkBoleto"].filter((id) => this.valor(id) && !/^https?:\/\/\S+$/.test(this.valor(id)));
    if (links.length) return this.aviso("Os links precisam começar com https://");
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

    botao.disabled = true;
    try {
      await Dados.salvarPerfil({
        nome,
        extras: { ...((Acesso.estado.perfil || {}).extras || {}), telefone: telefone ? RegrasAlunos.formatarWhatsapp(telefone) : "" },
        formasPagamento: { pix: this.valor("pix"), linkCartao: this.valor("linkCartao"), linkBoleto: this.valor("linkBoleto") },
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
