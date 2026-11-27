/*
 * app.js
 * Faz o sistema funcionar como um aplicativo de uma página só:
 * 1. aplica nome e cores do config.js;
 * 2. monta os menus (inferior no celular, lateral no computador);
 * 3. troca a tela conforme o endereço (#/alunos, #/ajustes...).
 *
 * Usamos "#/" no endereço porque o GitHub Pages só serve arquivos
 * estáticos: com o #, o navegador não pede outra página ao servidor
 * e o botão Voltar do celular continua funcionando.
 */
(function () {
  const $ = (id) => document.getElementById(id);

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
  }

  // 2. Menus
  function itemMenu(tela, classe) {
    return `<a class="${classe}" href="#/${tela.id}" data-tela="${tela.id}">
      ${Icones.svg(tela.icone)}<span>${classe === "menu-item" ? tela.titulo : tela.rotulo}</span>
    </a>`;
  }

  function montarMenus() {
    // Computador: todas as telas na lateral
    $("menu-lateral").innerHTML = TELAS.map((t) => itemMenu(t, "menu-item")).join("");

    // Celular: 4 principais + botão "Mais"
    const principais = TELAS.filter((t) => t.menuInferior);
    $("menu-inferior").innerHTML =
      principais.map((t) => itemMenu(t, "aba")).join("") +
      `<button class="aba" id="abrir-mais" type="button">${Icones.svg("mais")}<span>Mais</span></button>`;

    // Painel "Mais" com as demais telas
    const outras = TELAS.filter((t) => !t.menuInferior);
    $("mais-lista").innerHTML = outras
      .map(
        (t) => `<li><a class="mais-item" href="#/${t.id}" data-tela="${t.id}">
          ${Icones.svg(t.icone)}<span>${t.titulo}</span>${Icones.svg("seta", 20)}
        </a></li>`
      )
      .join("");

    $("mais-fechar").innerHTML = Icones.svg("fechar");
    $("abrir-mais").addEventListener("click", abrirMais);
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

  // 3. Navegação: lê o endereço e desenha a tela certa
  function telaAtual() {
    const id = location.hash.replace("#/", "");
    return TELAS.find((t) => t.id === id) || TELAS.find((t) => t.id === TELA_INICIAL);
  }

  function navegar() {
    const tela = telaAtual();
    $("conteudo").innerHTML = desenharTela(tela);
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
  montarMenus();
  window.addEventListener("hashchange", navegar);
  navegar();
})();
