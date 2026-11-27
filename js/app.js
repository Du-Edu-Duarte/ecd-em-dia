/*
 * app.js
 * Faz o sistema funcionar como um aplicativo de uma página só:
 * 1. aplica nome e cores do config.js;
 * 2. pergunta ao serviço de acesso quem está usando (servicos/acesso.js);
 * 3. se a pessoa ainda não pode usar o sistema, mostra as telas de acesso;
 * 4. se pode, monta os menus e troca a tela conforme o endereço (#/alunos...).
 *
 * Usamos "#/" no endereço porque o GitHub Pages só serve arquivos
 * estáticos: com o #, o navegador não pede outra página ao servidor
 * e o botão Voltar do celular continua funcionando.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  let estado = null;    // situação atual do usuário (vem do Acesso)
  let telasVisiveis = []; // telas que este usuário pode ver

  // 1. Nome e cores do cliente
  function aplicarConfig() {
    const raiz = document.documentElement.style;
    raiz.setProperty("--preto", ECD_CONFIG.cores.preto);
    raiz.setProperty("--dourado", ECD_CONFIG.cores.dourado);
    raiz.setProperty("--areia", ECD_CONFIG.cores.areia);
    raiz.setProperty("--fundo", ECD_CONFIG.cores.fundo);
    document.querySelector('meta[name="theme-color"]').content = ECD_CONFIG.cores.preto;

    $("nome-sistema").textContent = ECD_CONFIG.nomeSistema;
    $("nome-cliente").textContent = ECD_CONFIG.nomeCliente;
    $("data-hoje").textContent = Formato.hojeExtenso();
    $("botao-sair").innerHTML = Icones.svg("sair", 22);
    $("botao-sair").addEventListener("click", () => Acesso.sair());
  }

  // 2. Muda o app conforme a situação do usuário
  function aoMudarAcesso(novoEstado) {
    estado = novoEstado;
    const liberado = estado.situacao === "ativo" || estado.situacao === "admin";
    document.body.classList.toggle("modo-acesso", !liberado);
    $("botao-sair").hidden = !estado.usuario;

    Dados.pararTudo();
    Tema.aplicar(liberado && estado.perfil && estado.perfil.config ? estado.perfil.config.tema : "");
    Marca.aplicar(liberado && estado.perfil ? estado.perfil.marca : null);
    $("faixa-plano").hidden = true;
    if (!liberado) {
      $("nome-cliente").textContent = ECD_CONFIG.nomeCliente;
      document.title = ECD_CONFIG.nomeSistema;
      TelasAcesso.desenhar($("conteudo"), estado);
      return;
    }

    // Liberado: nome do professor no topo e menus conforme o perfil
    if (estado.perfil && estado.perfil.nome) $("nome-cliente").textContent = estado.perfil.nome;
    telasVisiveis = TELAS.filter((t) => !t.apenasAdmin || estado.situacao === "admin");
    Dados.gerarMensalidades().catch((e) => console.error(e)); // cria as mensalidades que faltam
    montarMenus();
    avisoDoPlano();

    // Primeira vez do professor: abre o guia de Primeiro acesso no lugar do Painel
    const semTela = ["", "#", "#/", "#/painel"].includes(location.hash);
    if (estado.situacao === "ativo" && estado.perfil && !estado.perfil.guiaVisto && semTela) {
      history.replaceState(null, "", "#/primeiro-acesso");
    }
    navegar();
  }

  // Faixa "Seu plano vence em X dias" para o professor (o administrador não tem plano)
  function avisoDoPlano() {
    const faixa = $("faixa-plano");
    const p = estado.perfil && estado.perfil.plano;
    const sit = RegrasAssinatura.situacao(p, Formato.hojeISO(), ECD_CONFIG.assinatura);
    const mostrar = estado.situacao === "ativo" && (sit.codigo === "vencendo" || sit.codigo === "tolerancia");
    faixa.hidden = !mostrar;
    if (!mostrar) return;
    const contato = ECD_CONFIG.contatoECD || {};
    const texto = `Olá! Quero renovar o meu plano do ${ECD_CONFIG.nomeSistema}.`;
    faixa.href = contato.whatsapp ? `https://wa.me/55${contato.whatsapp}?text=${encodeURIComponent(texto)}`
      : `mailto:${contato.email || ""}?subject=${encodeURIComponent("Renovar plano " + ECD_CONFIG.nomeSistema)}`;
    faixa.target = "_blank";
    faixa.rel = "noopener";
    faixa.classList.toggle("faixa-urgente", sit.codigo === "tolerancia");
    faixa.textContent = sit.codigo === "tolerancia"
      ? `Seu plano venceu em ${Formato.data(p.fim)}.${sit.bloqueioEm ? ` O acesso trava depois de ${Formato.data(sit.bloqueioEm)}.` : ""} Toque para renovar.`
      : `Seu plano vence em ${Formato.data(p.fim)} (${sit.rotulo.toLowerCase()}). Toque para renovar.`;
  }

  // 3. Menus
  function itemMenu(tela, classe) {
    return `<a class="${classe}" href="#/${tela.id}" data-tela="${tela.id}">
      ${Icones.svg(tela.icone)}<span>${classe === "menu-item" ? tela.titulo : tela.rotulo}</span>
    </a>`;
  }

  function montarMenus() {
    // Computador: todas as telas na lateral
    $("menu-lateral").innerHTML = telasVisiveis.map((t) => itemMenu(t, "menu-item")).join("");

    // Celular: 4 principais + botão "Mais"
    const principais = telasVisiveis.filter((t) => t.menuInferior);
    $("menu-inferior").innerHTML =
      principais.map((t) => itemMenu(t, "aba")).join("") +
      `<button class="aba" id="abrir-mais" type="button">${Icones.svg("mais")}<span>Mais</span></button>`;
    $("abrir-mais").addEventListener("click", abrirMais);

    // Painel "Mais" com as demais telas
    const outras = telasVisiveis.filter((t) => !t.menuInferior);
    $("mais-lista").innerHTML = outras
      .map(
        (t) => `<li><a class="mais-item" href="#/${t.id}" data-tela="${t.id}">
          ${Icones.svg(t.icone)}<span>${t.titulo}</span>${Icones.svg("seta", 20)}
        </a></li>`
      )
      .join("");
  }

  function ligarPainelMais() {
    $("mais-fechar").innerHTML = Icones.svg("fechar");
    $("mais-fechar").addEventListener("click", fecharMais);
    $("mais-fundo").addEventListener("click", fecharMais);
    document.addEventListener("keydown", (e) => e.key === "Escape" && fecharMais());
  }

  function abrirMais() {
    $("mais-fundo").hidden = false;
    $("mais-painel").hidden = false;
  }
  function fecharMais() {
    $("mais-fundo").hidden = true;
    $("mais-painel").hidden = true;
  }

  // 4. Navegação: lê o endereço e desenha a tela certa
  // "#/alunos/abc/editar" -> tela "alunos" e parâmetro "abc/editar"
  function telaAtual() {
    const [id, ...resto] = location.hash.replace("#/", "").split("/");
    const tela = telasVisiveis.find((t) => t.id === id);
    if (!tela) return { tela: telasVisiveis.find((t) => t.id === TELA_INICIAL), parametro: "" };
    return { tela, parametro: resto.join("/") };
  }

  function navegar() {
    // Sem acesso liberado, o endereço não abre nenhuma tela do sistema
    if (!estado || !(estado.situacao === "ativo" || estado.situacao === "admin")) return;

    const { tela, parametro } = telaAtual();
    Dados.pararTudo(); // fecha as listas que a tela anterior estava ouvindo
    // Desfaz uma prévia de tema que não foi salva em Ajustes
    Tema.aplicar(((Acesso.estado.perfil || {}).config || {}).tema);
    Marca.aplicar((Acesso.estado.perfil || {}).marca); // desfaz uma prévia de cores não salva
    if (tela.desenhar) tela.desenhar($("conteudo"), parametro);
    else $("conteudo").innerHTML = desenharTela(tela);
    document.title = `${tela.titulo} | ${ECD_CONFIG.nomeSistema}`;

    // Marca o item ativo nos menus
    document.querySelectorAll("[data-tela]").forEach((el) => {
      const ativo = el.dataset.tela === tela.id;
      el.classList.toggle("ativo", ativo);
      if (ativo) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    // No celular, "Mais" fica marcado quando a tela está dentro dele
    $("abrir-mais").classList.toggle("ativo", !tela.menuInferior);

    fecharMais();
    window.scrollTo(0, 0);
    $("conteudo").focus({ preventScroll: true });
  }

  // PWA: registra o service worker (permite instalar e abrir com internet fraca)
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch((e) => console.error(e)));
  }

  aplicarConfig();
  ligarPainelMais();
  window.addEventListener("hashchange", navegar);
  $("conteudo").innerHTML = `<p class="carregando">Carregando...</p>`;
  Acesso.iniciar(aoMudarAcesso);
})();
