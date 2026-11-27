/*
 * telas/primeiro-acesso.js
 * Guia "Primeiro acesso": uma etapa por tela (#/primeiro-acesso/1 até /8).
 * Abre sozinho na primeira vez que o professor entra (perfil.guiaVisto ainda não existe)
 * e fica no menu (Mais > Primeiro acesso) para rever quando quiser.
 * A etapa 2 já grava nome, WhatsApp e chave Pix; a etapa 7 ensina a instalar no celular.
 */

// Instalação do app: o Chrome/Android avisa que dá para instalar com o evento
// "beforeinstallprompt". Guardamos o evento para o botão "Instalar" usar depois.
const Instalacao = {
  evento: null,
  instalado() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  },
  // "iphone", "android" ou "computador"
  aparelho() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "iphone";
    if (/Android/i.test(ua)) return "android";
    return "computador";
  },
};
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // não mostra o aviso do navegador sozinho: o botão do guia mostra na hora certa
  Instalacao.evento = e;
  const botao = document.getElementById("instalar-agora");
  if (botao) botao.hidden = false;
});
window.addEventListener("appinstalled", () => (Instalacao.evento = null));

const TelaPrimeiroAcesso = {
  container: null,

  ETAPAS: [
    { icone: "painel", titulo: "Boas-vindas" },
    { icone: "ajustes", titulo: "Seus dados" },
    { icone: "aulas", titulo: "Aulas e horários" },
    { icone: "alunos", titulo: "Alunos" },
    { icone: "cobrancas", titulo: "Cobranças de hoje" },
    { icone: "mensalidades", titulo: "Registrar pagamento" },
    { icone: "instalar", titulo: "Instalar no celular" },
    { icone: "pronto", titulo: "Tudo pronto" },
  ],

  desenhar(container, parametro) {
    this.container = container;
    const total = this.ETAPAS.length;
    const n = Math.min(Math.max(parseInt(parametro, 10) || 1, 1), total);
    const etapa = this.ETAPAS[n - 1];
    const s = Formato.seguro;
    const p = Acesso.estado.perfil || {};

    const corpo = {
      1: () => `
        <p>O ${s(ECD_CONFIG.nomeSistema)} organiza seus alunos e mensalidades e deixa as cobranças prontas para enviar no WhatsApp.</p>
        <p>São ${total} passos curtos. Você pode pular e voltar aqui quando quiser, em <strong>Mais &gt; Primeiro acesso</strong>.</p>`,
      2: () => `
        <p>Seu nome vai no fim das mensagens e a chave Pix vai junto na cobrança.</p>
        <form class="formulario guia-form" id="form-guia" novalidate>
          <div class="aviso" id="aviso" role="alert" hidden></div>
          <label class="campo"><span>Seu nome</span>
            <input id="nome" type="text" maxlength="80" value="${s(p.nome)}" required /></label>
          <label class="campo"><span>Seu WhatsApp</span>
            <input id="telefone" type="tel" value="${s((p.extras || {}).telefone)}" placeholder="(11) 91234-5678" /></label>
          <label class="campo"><span>Chave Pix</span>
            <input id="pix" type="text" maxlength="140" value="${s((p.formasPagamento || {}).pix)}" placeholder="CPF, e-mail, celular ou chave aleatória" /></label>
          <p class="campo-dica">Links de cartão e boleto, textos das mensagens e multa ficam em Ajustes.</p>
        </form>`,
      3: () => `
        <p>Cadastre suas turmas com os dias da semana, o horário e as vagas.</p>
        <p>Assim o sistema sabe quantos dias por semana cada aluno treina e mostra quando uma turma está lotada.</p>
        <a class="botao botao-secundario botao-largo" href="#/aulas">Cadastrar turmas agora</a>`,
      4: () => `
        <p>Em cada aluno você informa o <strong>valor</strong> e o <strong>dia do vencimento</strong>.</p>
        <p>A partir daí as mensalidades nascem sozinhas todo mês. Se o mês não tem o dia (31 em fevereiro), vence no último dia.</p>
        <p>Aluno trancado ou inativo não gera mensalidade nem recebe lembrete.</p>`,
      5: () => `
        <p>Todo dia a tela <strong>Cobranças de hoje</strong> mostra quem precisa de lembrete:</p>
        <ul class="guia-lista">
          <li>5 dias antes do vencimento</li>
          <li>1 dia antes</li>
          <li>no dia do pagamento</li>
          <li>em atraso, a partir do dia seguinte</li>
        </ul>
        <p>Toque em <strong>Enviar no WhatsApp</strong>: a conversa abre com a mensagem e o Pix prontos, e você só confirma o envio.</p>`,
      6: () => `
        <p>Recebeu? Abra a mensalidade do aluno e toque em <strong>Registrar pagamento</strong>.</p>
        <p>Pode registrar só uma parte (o saldo continua em aberto) e anotar o comprovante. Se errar, use <strong>Desfazer</strong>.</p>
        <p>Quem pagou sai das cobranças e para de receber lembretes.</p>`,
      7: () => this.instalar(),
      8: () => `
        <p>Comece cadastrando o primeiro aluno. As mensalidades e as cobranças aparecem no Painel.</p>
        <div class="guia-final">
          <button class="botao botao-largo" type="button" data-concluir="#/alunos/novo">${Icones.svg("mais-item", 20)}Cadastrar primeiro aluno</button>
          <button class="botao botao-secundario botao-largo" type="button" data-concluir="#/painel">Ir para o Painel</button>
        </div>`,
    }[n]();

    container.innerHTML = `
      <div class="guia">
        <div class="guia-topo">
          <span class="guia-passo">Passo ${n} de ${total}</span>
          ${n < total ? `<button class="botao-link" type="button" data-concluir="#/painel">Pular guia</button>` : ""}
        </div>
        <div class="guia-progresso" aria-hidden="true">${this.ETAPAS.map((_, i) =>
          `<span class="${i < n ? "feito" : ""}"></span>`).join("")}</div>
        <section class="cartao guia-cartao">
          <span class="vazio-icone guia-icone">${Icones.svg(etapa.icone, 32)}</span>
          <h1>${etapa.titulo}</h1>
          <div class="guia-texto">${corpo}</div>
        </section>
        ${n < total ? `
        <div class="guia-navegar">
          ${n > 1 ? `<a class="botao botao-secundario" href="#/primeiro-acesso/${n - 1}">${Icones.svg("voltar", 20)}Voltar</a>` : "<span></span>"}
          <button class="botao" type="button" id="proximo">${n === 1 ? "Começar" : "Próximo"}${Icones.svg("seta", 20)}</button>
        </div>` : ""}
      </div>`;

    const proximo = container.querySelector("#proximo");
    if (proximo) proximo.addEventListener("click", () => this.avancar(n, proximo));
    const form = container.querySelector("#form-guia");
    if (form) form.addEventListener("submit", (e) => { e.preventDefault(); this.avancar(n, proximo); });
    container.querySelectorAll("[data-concluir]").forEach((b) =>
      b.addEventListener("click", () => this.concluir(b.dataset.concluir, b)));
    const instalar = container.querySelector("#instalar-agora");
    if (instalar) instalar.addEventListener("click", async () => {
      if (!Instalacao.evento) return;
      Instalacao.evento.prompt();
      const { outcome } = await Instalacao.evento.userChoice;
      Instalacao.evento = null;
      if (outcome === "accepted") this.desenhar(container, "7");
    });
  },

  // Etapa 7: instrução certa para cada aparelho
  instalar() {
    if (Instalacao.instalado()) {
      return `<p class="aviso aviso-ok">Você já está usando o app instalado. Ele fica na tela inicial com o ícone do ${Formato.seguro(ECD_CONFIG.nomeSistema)}.</p>`;
    }
    const aparelho = Instalacao.aparelho();
    const botao = `<button class="botao botao-destaque botao-largo" type="button" id="instalar-agora" ${Instalacao.evento ? "" : "hidden"}>
      ${Icones.svg("instalar", 20)}Instalar agora</button>`;
    const passos = {
      iphone: `
        <p>No iPhone, a instalação é pelo <strong>Safari</strong>:</p>
        <ol class="guia-lista guia-numerada">
          <li>Toque no botão <strong>Compartilhar</strong> <span class="guia-icone-texto">${Icones.svg("compartilhar", 18)}</span> na barra do Safari.</li>
          <li>Role e toque em <strong>Adicionar à Tela de Início</strong>.</li>
          <li>Toque em <strong>Adicionar</strong>.</li>
        </ol>`,
      android: `
        <p>No Android, pelo <strong>Chrome</strong>:</p>
        ${botao}
        <ol class="guia-lista guia-numerada">
          <li>Toque nos <strong>três pontinhos</strong> no canto de cima.</li>
          <li>Toque em <strong>Instalar app</strong> (ou <strong>Adicionar à tela inicial</strong>).</li>
          <li>Confirme em <strong>Instalar</strong>.</li>
        </ol>`,
      computador: `
        <p>No computador, pelo Chrome ou Edge:</p>
        ${botao}
        <ol class="guia-lista guia-numerada">
          <li>Clique no ícone de <strong>instalar</strong> no fim da barra de endereço.</li>
          <li>Confirme em <strong>Instalar</strong>.</li>
        </ol>
        <p>No celular, abra o mesmo endereço e siga este passo de novo.</p>`,
    }[aparelho];
    return `<p>Com o app na tela inicial, ele abre direto, em tela cheia, como um aplicativo.</p>${passos}
      <p class="campo-dica">Os dados ficam na sua conta: celular e computador mostram as mesmas informações.</p>`;
  },

  async avancar(n, botao) {
    if (n === 2 && !(await this.salvarDados(botao))) return;
    location.hash = `#/primeiro-acesso/${n + 1}`;
  },

  async salvarDados(botao) {
    const valor = (id) => this.container.querySelector("#" + id).value.trim();
    const aviso = (texto) => {
      const el = this.container.querySelector("#aviso");
      el.textContent = texto;
      el.className = "aviso aviso-erro";
      el.hidden = false;
    };
    const nome = valor("nome");
    if (!nome) { aviso("Informe o seu nome."); return false; }
    const telefoneTexto = valor("telefone");
    const telefone = telefoneTexto ? RegrasAlunos.normalizarWhatsapp(telefoneTexto) : "";
    if (telefoneTexto && !telefone) { aviso("Seu WhatsApp precisa ter DDD, por exemplo (11) 91234-5678."); return false; }
    const p = Acesso.estado.perfil || {};
    botao.disabled = true;
    try {
      await Dados.salvarPerfil({
        nome,
        extras: { ...(p.extras || {}), telefone: telefone ? RegrasAlunos.formatarWhatsapp(telefone) : "" },
        formasPagamento: { ...(p.formasPagamento || {}), pix: valor("pix") },
      });
      document.getElementById("nome-cliente").textContent = nome;
      return true;
    } catch (e) {
      console.error(e);
      aviso(Acesso.mensagemErro(e));
      return false;
    } finally {
      botao.disabled = false;
    }
  },

  // Marca que o guia foi visto (não abre mais sozinho) e segue para a tela escolhida
  async concluir(destino, botao) {
    botao.disabled = true;
    try {
      if (!(Acesso.estado.perfil || {}).guiaVisto) await Dados.salvarPerfil({ guiaVisto: true });
    } catch (e) {
      console.error(e); // se falhar, o guia só aparece de novo no próximo acesso
    }
    location.hash = destino;
  },
};
