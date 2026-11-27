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
    if (!liberado) {
      $("nome-cliente").textContent = ECD_CONFIG.nomeCliente;
      document.title = ECD_CONFIG.nomeSistema;
      TelasAcesso.desenhar($("conteudo"), estado);
      return;
    }

    // Liberado: nome do professor no topo e menus conforme o perfil
    if (estado.perfil && estado.perfil.nome) $("nome-cliente").textContent = estado.perfil.nome;
    telasVisiveis = TELAS.filter((t) => !t.apenasAdmin || estado.situacao === "admin");
    montarMenus();
    navegar();
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

  aplicarConfig();
  ligarPainelMais();
  window.addEventListener("hashchange", navegar);
  $("conteudo").innerHTML = `<p class="carregando">Carregando...</p>`;
  Acesso.iniciar(aoMudarAcesso);
})();
