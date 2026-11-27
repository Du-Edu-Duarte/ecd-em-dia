/*
 * telas.js
 * Lista de todas as telas do sistema.
 * Cada tela tem: id (vai na URL, ex.: #/alunos), título, ícone,
 * rótulo curto para o menu do celular e onde ela aparece no menu.
 *
 * Tela com "desenhar" já está pronta (o código fica em js/telas/).
 * Tela sem "desenhar" mostra o aviso "Tela em construção".
 */
const TELAS = [
  {
    id: "painel",
    titulo: "Painel",
    rotulo: "Painel",
    icone: "painel",
    menuInferior: true,
    etapa: 8,
    resumo: "Valores a receber, recebidos e em atraso, alunos ativos e próximos vencimentos.",
  },
  {
    id: "alunos",
    titulo: "Alunos",
    rotulo: "Alunos",
    icone: "alunos",
    menuInferior: true,
    etapa: 4,
    resumo: "Lista de alunos com busca e filtros, ficha com anotações e histórico.",
  },
  {
    id: "cobrancas",
    titulo: "Cobranças de hoje",
    rotulo: "Cobranças",
    icone: "cobrancas",
    menuInferior: true,
    etapa: 7,
    resumo: "Quem vence em 5 dias, vence amanhã, vence hoje ou está atrasado, com o botão Cobrar.",
  },
  {
    id: "mensalidades",
    titulo: "Mensalidades",
    rotulo: "Mensalidades",
    icone: "mensalidades",
    menuInferior: true,
    etapa: 5,
    resumo: "Mensalidades do mês e registro de pagamento.",
  },
  {
    id: "aulas",
    titulo: "Aulas e horários",
    rotulo: "Aulas",
    icone: "aulas",
    menuInferior: false,
    etapa: 3,
    resumo: "Turmas com dias da semana, horário de início e fim e vagas.",
    desenhar: (container) => TelaAulas.desenhar(container),
  },
  {
    id: "relatorios",
    titulo: "Relatórios",
    rotulo: "Relatórios",
    icone: "relatorios",
    menuInferior: false,
    etapa: 9,
    resumo: "Recebido e a receber, inadimplência, alunos por turma e exportação.",
  },
  {
    id: "ajustes",
    titulo: "Ajustes",
    rotulo: "Ajustes",
    icone: "ajustes",
    menuInferior: false,
    etapa: 6,
    resumo: "Dados do professor, formas de pagamento, textos dos lembretes, multa e juros, tema P&B.",
  },
  {
    id: "contas",
    titulo: "Contas",
    rotulo: "Contas",
    icone: "contas",
    menuInferior: false,
    apenasAdmin: true, // só aparece para o administrador ECD
    resumo: "Aprovar e bloquear contas de professores.",
    desenhar: (container) => TelaContas.desenhar(container),
  },
];

// Tela aberta quando o endereço não indica nenhuma.
const TELA_INICIAL = "painel";

// Desenha o conteúdo de uma tela que ainda não foi construída (estado vazio).
function desenharTela(tela) {
  return `
    <div class="tela-cabecalho">
      <h1>${tela.titulo}</h1>
    </div>
    <div class="cartao vazio">
      <span class="vazio-icone">${Icones.svg(tela.icone, 32)}</span>
      <p class="vazio-titulo">Tela em construção</p>
      <p class="vazio-texto">${tela.resumo}</p>
      <p class="vazio-etapa">Chega na etapa ${tela.etapa}.</p>
    </div>
  `;
}

/*
 * Tela "Contas" (só administrador): lista os professores cadastrados,
 * com Aprovar e Bloquear. A regra do Firestore garante que só o
 * administrador consegue ler essa lista e mudar o status.
 */
const TelaContas = {
  rotuloStatus: { pendente: "Pendente", ativo: "Aprovada", bloqueado: "Bloqueada" },

  async desenhar(container) {
    container.innerHTML = `
      <div class="tela-cabecalho"><h1>Contas</h1></div>
      <div class="aviso" id="aviso" role="alert" hidden></div>
      <div id="lista-contas"><p class="carregando">Carregando contas...</p></div>`;
    try {
      const contas = await Acesso.listarContas();
      this.listar(contas);
    } catch (erro) {
      console.error(erro);
      document.getElementById("lista-contas").innerHTML =
        `<p class="aviso aviso-erro">${Acesso.mensagemErro(erro)}</p>`;
    }
  },

  listar(contas) {
    const lista = document.getElementById("lista-contas");
    if (!contas.length) {
      lista.innerHTML = `<div class="cartao vazio"><p class="vazio-titulo">Nenhuma conta cadastrada</p></div>`;
      return;
    }
    // Pendentes primeiro
    const ordem = { pendente: 0, ativo: 1, bloqueado: 2 };
    contas.sort((a, b) => (ordem[a.status] ?? 3) - (ordem[b.status] ?? 3));

    lista.innerHTML = contas.map((c) => {
      const s = Formato.seguro;
      const extras = Object.entries(c.extras || {})
        .map(([k, v]) => `<span>${s(k)}: ${s(v)}</span>`).join("");
      const data = c.criadoEm ? Formato.data(new Date(c.criadoEm.seconds * 1000).toISOString().slice(0, 10)) : "";
      const ehAdmin = (c.email || "").toLowerCase() === ECD_CONFIG.emailAdmin.toLowerCase();
      const botoes = ehAdmin ? "" : `
        <div class="conta-acoes">
          ${c.status !== "ativo" ? `<button class="botao" data-uid="${s(c.uid)}" data-status="ativo">Aprovar</button>` : ""}
          ${c.status !== "bloqueado" ? `<button class="botao botao-secundario" data-uid="${s(c.uid)}" data-status="bloqueado">Bloquear</button>` : ""}
        </div>`;
      return `<article class="cartao conta">
        <div class="conta-topo">
          <strong class="conta-nome">${s(c.nome)}</strong>
          <span class="etiqueta etiqueta-${s(c.status)}">${this.rotuloStatus[c.status] || s(c.status)}</span>
        </div>
        <div class="conta-dados">
          <span>${s(c.setor)}</span><span>${s(c.email)}</span>${extras}
          ${data ? `<span>Cadastro em ${data}</span>` : ""}
        </div>
        ${botoes}
      </article>`;
    }).join("");

    lista.querySelectorAll("[data-status]").forEach((b) =>
      b.addEventListener("click", async () => {
        b.disabled = true;
        try {
          await Acesso.mudarStatus(b.dataset.uid, b.dataset.status);
          this.listar(await Acesso.listarContas());
        } catch (erro) {
          console.error(erro);
          const aviso = document.getElementById("aviso");
          aviso.textContent = Acesso.mensagemErro(erro);
          aviso.className = "aviso aviso-erro";
          aviso.hidden = false;
          b.disabled = false;
        }
      }));
  },
};
