/*
 * telas/mensalidades.js
 * Tela "Mensalidades":
 *   #/mensalidades            mês atual
 *   #/mensalidades/2026-12    outro mês
 *   #/mensalidades/m/ID       detalhe da mensalidade e registrar pagamento
 * Os dados ficam em professores/{uid}/mensalidades (uma por aluno por mês).
 */
const TelaMensalidades = {
  container: null,
  mensalidades: null,
  alunos: null,
  competencia: null,
  detalheId: null,
  filtro: "pendentes",

  async desenhar(container, parametro) {
    this.container = container;
    const vez = (this.vez = {}); // marca desta abertura da tela
    this.mensalidades = null;
    this.alunos = null;
    const partes = (parametro || "").split("/");
    this.detalheId = partes[0] === "m" ? partes[1] : null;
    this.competencia = /^\d{4}-\d{2}$/.test(partes[0]) ? partes[0] : Formato.hojeISO().slice(0, 7);
    container.innerHTML = `<div class="tela-cabecalho"><h1>Mensalidades</h1></div><p class="carregando">Carregando mensalidades...</p>`;

    try {
      await Dados.gerarMensalidades(); // cria as que faltam antes de mostrar
    } catch (e) {
      console.error(e);
    }
    if (this.vez !== vez) return; // o professor já foi para outra tela enquanto carregava
    if (!location.hash.startsWith("#/mensalidades")) return;

    this.envios = this.detalheId ? null : [];
    const aoMudar = () => {
      if (this.mensalidades === null || this.alunos === null || this.envios === null) return;
      if (this.detalheId && this.container.querySelector("#form-pagamento") &&
          document.activeElement && this.container.contains(document.activeElement)) return; // não atrapalha quem digita
      this.detalheId ? this.detalhe() : this.lista();
    };
    const aoErrar = (erro) => {
      container.innerHTML = `<div class="tela-cabecalho"><h1>Mensalidades</h1></div><p class="aviso aviso-erro">${Acesso.mensagemErro(erro)}</p>`;
    };
    Dados.ouvir("alunos", (a) => { this.alunos = a; aoMudar(); }, aoErrar);
    Dados.ouvir("mensalidades", (m) => { this.mensalidades = m; aoMudar(); }, aoErrar);
    if (this.detalheId) {
      Dados.ouvir("envios", (e) => { this.envios = e; aoMudar(); }, aoErrar,
        (ref) => ref.where("mensalidadeId", "==", this.detalheId));
    }
  },

  nomeAluno(id) {
    const a = this.alunos.find((x) => x.id === id);
    return a ? a.nome : "Aluno excluído";
  },

  /* ---------- Lista do mês ---------- */
  lista() {
    const s = Formato.seguro;
    const hoje = Formato.hojeISO();
    const doMes = this.mensalidades.filter((m) => m.competencia === this.competencia);
    const r = RegrasMensalidades.resumo(doMes, hoje);
    const [ano, mes] = this.competencia.split("-").map(Number);
    const anterior = RegrasMensalidades.competencia(...RegrasMensalidades.somarMeses(ano, mes, -1));
    const proximo = RegrasMensalidades.competencia(...RegrasMensalidades.somarMeses(ano, mes, 1));
    const atrasadasAntes = this.mensalidades.filter((m) => m.competencia < this.competencia &&
      RegrasMensalidades.situacao(m, hoje).codigo === "atrasada");

    const contagem = {};
    ["pendentes", "atrasadas", "breve", "pagas", "todas"].forEach((f) =>
      (contagem[f] = RegrasMensalidades.filtrar(doMes, f, hoje).length));
    const filtros = [["pendentes", "Pendentes"], ["atrasadas", "Atrasadas"], ["breve", "Até 5 dias"], ["pagas", "Pagas"], ["todas", "Todas"]]
      .map(([id, rotulo]) => `<button type="button" class="filtro ${this.filtro === id ? "ativo" : ""}" data-filtro="${id}"
        aria-pressed="${this.filtro === id}">${rotulo} <span>${contagem[id]}</span></button>`).join("");

    this.container.innerHTML = `
      <div class="tela-cabecalho"><h1>Mensalidades</h1></div>
      <div class="seletor-mes">
        <a class="botao-icone" href="#/mensalidades/${anterior}" aria-label="Mês anterior">${Icones.svg("voltar", 22)}</a>
        <strong>${RegrasMensalidades.competenciaTexto(this.competencia)}</strong>
        <a class="botao-icone" href="#/mensalidades/${proximo}" aria-label="Próximo mês">${Icones.svg("seta", 22)}</a>
      </div>
      <div class="resumo-cartoes">
        <div class="cartao resumo"><span>A receber</span><strong>${Formato.dinheiro(r.aReceber)}</strong></div>
        <div class="cartao resumo"><span>Recebido</span><strong>${Formato.dinheiro(r.recebido)}</strong></div>
        <div class="cartao resumo resumo-alerta"><span>Em atraso</span><strong>${Formato.dinheiro(r.atrasoValor)}</strong>
          <small>${r.atrasoQtd} ${r.atrasoQtd === 1 ? "mensalidade" : "mensalidades"}</small></div>
      </div>
      ${atrasadasAntes.length ? `<a class="aviso aviso-alerta aviso-link" href="#/mensalidades/${atrasadasAntes.map((m) => m.competencia).sort()[0]}">
        ${atrasadasAntes.length} ${atrasadasAntes.length === 1 ? "mensalidade atrasada" : "mensalidades atrasadas"} de meses anteriores. Toque para ver.</a>` : ""}
      ${doMes.length ? `<div class="filtros filtros-5" role="group" aria-label="Filtrar">${filtros}</div>
        <div class="lista-mensalidades" id="lista-mensalidades"></div>` : `
        <div class="cartao vazio">
          <span class="vazio-icone">${Icones.svg("mensalidades", 32)}</span>
          <p class="vazio-titulo">Nenhuma mensalidade neste mês</p>
          <p class="vazio-texto">As mensalidades são criadas sozinhas para cada aluno ativo, com o valor e o dia de vencimento do cadastro.</p>
        </div>`}`;

    if (!doMes.length) return;
    const desenharLista = () => {
      const itens = RegrasMensalidades.filtrar(doMes, this.filtro, hoje);
      this.container.querySelector("#lista-mensalidades").innerHTML = itens.length ? itens.map(({ m, sit }) => `
        <a class="cartao mensalidade" href="#/mensalidades/m/${s(m.id)}">
          <span class="mensalidade-info">
            <strong>${s(this.nomeAluno(m.alunoId))}</strong>
            <span>Vence ${Formato.data(m.vencimento)}${sit.parcial ? ` · pagou ${Formato.dinheiro(m.valorPago)}` : ""}</span>
            <span class="etiqueta etiqueta-sit-${sit.codigo}">${sit.rotulo}${sit.parcial ? " · parcial" : ""}</span>
          </span>
          <span class="mensalidade-valor">${Formato.dinheiro(sit.codigo === "paga" ? m.valor : sit.saldo)}
            ${sit.codigo !== "paga" ? `<small>Registrar pagamento</small>` : `<small>Pago em ${Formato.data(m.pagoEm)}</small>`}</span>
        </a>`).join("") : `<p class="lista-vazia">Nada neste filtro.</p>`;
    };
    desenharLista();
    this.container.querySelectorAll("[data-filtro]").forEach((b) => b.addEventListener("click", () => {
      this.filtro = b.dataset.filtro;
      this.container.querySelectorAll("[data-filtro]").forEach((x) => {
        x.classList.toggle("ativo", x === b);
        x.setAttribute("aria-pressed", x === b);
      });
      desenharLista();
    }));
  },

  /* ---------- Detalhe e registrar pagamento ---------- */
  detalhe() {
    const s = Formato.seguro;
    const m = this.mensalidades.find((x) => x.id === this.detalheId);
    if (!m) {
      this.container.innerHTML = `<div class="tela-cabecalho"><a class="botao-voltar" href="#/mensalidades">${Icones.svg("voltar", 20)}Mensalidades</a>
        <h1>Mensalidade não encontrada</h1></div>`;
      return;
    }
    const hoje = Formato.hojeISO();
    const sit = RegrasMensalidades.situacao(m, hoje);
    const enc = RegrasMensalidades.encargos(m, hoje, (Acesso.estado.perfil || {}).config);
    const aluno = this.alunos.find((a) => a.id === m.alunoId);
    const sugerida = RegrasFormas.recebimentoSugerido(RegrasFormas.doPerfil(Acesso.estado.perfil), aluno && aluno.formaPreferida);
    const formas = RegrasAlunos.FORMAS.map((f) =>
      `<option value="${f.id}" ${f.id === sugerida ? "selected" : ""}>${f.rotulo}</option>`).join("");
    const nomeForma = (id) => (RegrasAlunos.FORMAS.find((f) => f.id === id) || { rotulo: id || "" }).rotulo;
    const pagamentos = m.pagamentos || [];
    const tipoTexto = RegrasCobrancas.tipoDoTexto(m, hoje);
    const envio = aluno ? Envio.prepararWhatsapp(m, aluno, tipoTexto) : null;
    const enviosDela = [...this.envios].sort((x, y) =>
      ((y.enviadoEm && y.enviadoEm.seconds) || 0) - ((x.enviadoEm && x.enviadoEm.seconds) || 0));
    const nomeTipo = (t) => ({ d5: "5 dias antes", d1: "1 dia antes", hoje: "no dia", atraso: "atraso", manual: "manual" }[t] || t);

    this.container.innerHTML = `
      <div class="tela-cabecalho">
        <a class="botao-voltar" href="#/mensalidades/${s(m.competencia)}">${Icones.svg("voltar", 20)}Mensalidades</a>
        <div class="ficha-titulo"><h1>${s(this.nomeAluno(m.alunoId))}</h1>
          <span class="etiqueta etiqueta-sit-${sit.codigo}">${sit.rotulo}${sit.parcial ? " · parcial" : ""}</span></div>
        <p class="tela-resumo">Mensalidade de ${RegrasMensalidades.competenciaTexto(m.competencia)}</p>
      </div>

      <section class="cartao ficha-bloco">
        <dl>
          <div class="ficha-linha"><dt>Vencimento</dt><dd>${Formato.data(m.vencimento)}</dd></div>
          <div class="ficha-linha"><dt>Valor</dt><dd>${Formato.dinheiro(m.valor)}</dd></div>
          <div class="ficha-linha"><dt>Pago</dt><dd>${Formato.dinheiro(m.valorPago || 0)}</dd></div>
          <div class="ficha-linha"><dt>Saldo devedor</dt><dd><strong>${Formato.dinheiro(sit.saldo)}</strong></dd></div>
          ${enc.total > sit.saldo ? `
          <div class="ficha-linha"><dt>Multa</dt><dd>${Formato.dinheiro(enc.multa)}</dd></div>
          <div class="ficha-linha"><dt>Juros (${sit.dias} ${sit.dias === 1 ? "dia" : "dias"})</dt><dd>${Formato.dinheiro(enc.juros)}</dd></div>
          <div class="ficha-linha"><dt>Total com encargos</dt><dd><strong>${Formato.dinheiro(enc.total)}</strong></dd></div>` : ""}
        </dl>
      </section>

      ${sit.saldo > 0 && aluno ? `
      <section class="cartao ficha-bloco cobrar">
        <h2>Cobrar</h2>
        <a class="botao botao-largo" id="cobrar" href="${s(envio.url)}" target="_blank" rel="noopener">${Icones.svg("whatsapp", 20)}Cobrar no WhatsApp</a>
        <details class="ver-mensagem"><summary>Ver a mensagem</summary><p class="previa">${s(envio.texto)}</p></details>
        ${enviosDela.length ? `<ul class="lista-envios">${enviosDela.map((e) =>
          `<li>Cobrança enviada em ${Envio.quando(e)} <span>(${nomeTipo(e.tipo)})</span></li>`).join("")}</ul>` : ""}
      </section>` : ""}

      ${sit.saldo > 0 ? `
      <form class="cartao formulario" id="form-pagamento" novalidate>
        <h2 class="formulario-titulo">Registrar pagamento</h2>
        <div class="aviso" id="aviso" role="alert" hidden></div>
        <div class="campo-linha">
          <label class="campo"><span>Data</span><input id="data" type="date" value="${hoje}" max="${hoje}" required /></label>
          <label class="campo"><span>Valor (R$)</span>
            <input id="valor" type="text" inputmode="decimal" value="${RegrasAlunos.valorParaCampo(sit.saldo)}" required /></label>
        </div>
        <label class="campo"><span>Forma</span><select id="forma">${formas}</select></label>
        <label class="campo"><span>Comprovante (opcional)</span>
          <input id="obs" type="text" maxlength="300" placeholder="Ex.: Pix às 9h, ID E123... ou link do comprovante" /></label>
        <button class="botao" type="submit">Confirmar pagamento</button>
      </form>` : ""}

      <section class="cartao ficha-bloco">
        <h2>Pagamentos</h2>
        ${pagamentos.length ? `<ul class="lista-pagamentos">${pagamentos.map((p, i) => `
          <li>
            <span><strong>${Formato.dinheiro(p.valor)}</strong> em ${Formato.data(p.data)} · ${nomeForma(p.forma)}
              ${p.obs ? `<small>${s(p.obs)}</small>` : ""}</span>
            <button class="botao-link botao-perigo" type="button" data-desfazer="${i}">Desfazer</button>
          </li>`).join("")}</ul>` : `<p class="ficha-vazio">Nenhum pagamento registrado.</p>`}
        <div id="confirmar-desfazer"></div>
      </section>`;

    const cobrar = this.container.querySelector("#cobrar");
    if (cobrar) cobrar.addEventListener("click", () =>
      Envio.registrar(m, RegrasCobrancas.tipoDeHoje(m, hoje) || "manual").catch((e) => console.error(e)));

    const form = this.container.querySelector("#form-pagamento");
    if (form) form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.pagar(m, e.submitter || form.querySelector('button[type="submit"]'));
    });
    this.container.querySelectorAll("[data-desfazer]").forEach((b) =>
      b.addEventListener("click", () => this.confirmarDesfazer(m, Number(b.dataset.desfazer))));
  },

  aviso(texto) {
    const el = this.container.querySelector("#aviso");
    el.textContent = texto;
    el.className = "aviso aviso-erro";
    el.hidden = false;
  },

  async pagar(m, botao) {
    const pagamento = {
      data: this.container.querySelector("#data").value,
      valor: RegrasAlunos.lerValor(this.container.querySelector("#valor").value),
      forma: this.container.querySelector("#forma").value,
      obs: this.container.querySelector("#obs").value.trim(),
    };
    const erro = RegrasMensalidades.validarPagamento(pagamento, m);
    if (erro) return this.aviso(erro);
    botao.disabled = true;
    try {
      await Dados.salvar("mensalidades", RegrasMensalidades.registrarPagamento(m, pagamento), m.id);
      document.activeElement.blur(); // libera a tela para mostrar o resultado
      this.detalhe();
    } catch (e) {
      console.error(e);
      this.aviso(Acesso.mensagemErro(e));
      botao.disabled = false;
    }
  },

  confirmarDesfazer(m, indice) {
    const p = m.pagamentos[indice];
    const zona = this.container.querySelector("#confirmar-desfazer");
    zona.innerHTML = `<div class="zona-excluir">
      <p class="excluir-pergunta">Desfazer o pagamento de <strong>${Formato.dinheiro(p.valor)}</strong> em ${Formato.data(p.data)}? A mensalidade volta a ficar pendente.</p>
      <div class="formulario-acoes">
        <button class="botao botao-perigo-cheio" type="button" id="sim-desfazer">Sim, desfazer</button>
        <button class="botao botao-secundario" type="button" id="nao-desfazer">Não</button>
      </div></div>`;
    zona.querySelector("#nao-desfazer").addEventListener("click", () => (zona.innerHTML = ""));
    zona.querySelector("#sim-desfazer").addEventListener("click", async (e) => {
      e.target.disabled = true;
      try {
        await Dados.salvar("mensalidades", RegrasMensalidades.removerPagamento(m, indice), m.id);
        this.detalhe();
      } catch (erro) {
        console.error(erro);
        e.target.disabled = false;
      }
    });
  },
};
