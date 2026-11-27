/*
 * telas/relatorios.js
 * Tela "Relatórios" de um mês:
 *   #/relatorios            mês atual
 *   #/relatorios/2026-10    outro mês
 * Recebido x a receber, recebido por forma, inadimplência, alunos por turma e
 * a lista das mensalidades. Exporta em planilha (CSV, abre no Excel) e em PDF
 * (pela janela de impressão do navegador: "Salvar como PDF").
 */
const TelaRelatorios = {
  container: null,
  competencia: null,
  dados: { mensalidades: null, alunos: null, turmas: null },

  async desenhar(container, parametro) {
    this.container = container;
    const vez = (this.vez = {});
    const endereco = location.hash;
    this.competencia = /^\d{4}-\d{2}$/.test(parametro || "") ? parametro : Formato.hojeISO().slice(0, 7);
    this.dados = { mensalidades: null, alunos: null, turmas: null };
    container.innerHTML = `<div class="tela-cabecalho"><h1>Relatórios</h1></div><p class="carregando">Carregando...</p>`;
    try { await Dados.gerarMensalidades(); } catch (e) { console.error(e); }
    if (this.vez !== vez || location.hash !== endereco) return;

    const aoMudar = () => {
      if (Object.values(this.dados).some((v) => v === null)) return;
      this.tela();
    };
    const aoErrar = (erro) => {
      container.innerHTML = `<div class="tela-cabecalho"><h1>Relatórios</h1></div><p class="aviso aviso-erro">${Acesso.mensagemErro(erro)}</p>`;
    };
    Dados.ouvir("alunos", (x) => { this.dados.alunos = x; aoMudar(); }, aoErrar);
    Dados.ouvir("mensalidades", (x) => { this.dados.mensalidades = x; aoMudar(); }, aoErrar);
    Dados.ouvir("turmas", (x) => { this.dados.turmas = RegrasTurmas.ordenar(x); aoMudar(); }, aoErrar);
  },

  tela() {
    const s = Formato.seguro;
    const din = Formato.dinheiro;
    const hoje = Formato.hojeISO();
    const comp = this.competencia;
    const { mensalidades, alunos, turmas } = this.dados;
    const perfil = Acesso.estado.perfil || {};
    const [ano, mes] = comp.split("-").map(Number);
    const anterior = RegrasMensalidades.competencia(...RegrasMensalidades.somarMeses(ano, mes, -1));
    const proximo = RegrasMensalidades.competencia(...RegrasMensalidades.somarMeses(ano, mes, 1));
    const nomeMes = RegrasMensalidades.competenciaTexto(comp);

    const r = RegrasRelatorios.resumoDoMes(mensalidades, comp, hoje);
    const formas = RegrasRelatorios.porForma(mensalidades, comp);
    const devedores = RegrasRelatorios.inadimplentes(mensalidades, alunos, hoje);
    const porTurma = RegrasRelatorios.porTurma(turmas, alunos);
    const linhas = RegrasRelatorios.linhasDoMes(mensalidades, alunos, comp, hoje);
    const pct = (v) => (r.total ? Math.min(100, Math.round((v / r.total) * 100)) : 0);
    const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

    this.container.innerHTML = `
      <div class="tela-cabecalho">
        <h1>Relatórios</h1>
        <p class="so-impressao relatorio-assinatura">${(perfil.marca || {}).logo ? `<img class="relatorio-logo" src="${(perfil.marca || {}).logo}" alt="" />` : ""}
          ${s(perfil.nome || "")} · gerado em ${Formato.data(hoje)} pelo ${s(ECD_CONFIG.nomeSistema)}</p>
      </div>
      <div class="seletor-mes">
        <a class="botao-icone" href="#/relatorios/${anterior}" aria-label="Mês anterior">${Icones.svg("voltar", 22)}</a>
        <strong class="mes-nome">${nomeMes}</strong>
        <a class="botao-icone" href="#/relatorios/${proximo}" aria-label="Próximo mês">${Icones.svg("seta", 22)}</a>
      </div>

      ${r.quantidade ? `
      <div class="exportar nao-imprimir">
        <button class="botao botao-secundario" type="button" id="baixar-csv">Baixar planilha (Excel)</button>
        <button class="botao botao-secundario" type="button" id="baixar-pdf">Salvar em PDF</button>
      </div>` : ""}

      <section class="cartao relatorio-bloco">
        <h2>Recebido x a receber</h2>
        ${r.quantidade ? `
        <div class="barra-recebido" role="img" aria-label="${r.percentualRecebido}% recebido">
          <span class="barra-pago" style="width:${pct(r.recebido)}%"></span>
          <span class="barra-atraso" style="width:${pct(r.atrasoValor)}%"></span>
        </div>
        <ul class="legenda">
          <li><i class="ponto ponto-pago"></i>Recebido <strong>${din(r.recebido)}</strong></li>
          <li><i class="ponto ponto-aberto"></i>A receber <strong>${din(r.aReceber - r.atrasoValor)}</strong></li>
          <li><i class="ponto ponto-atraso"></i>Em atraso <strong>${din(r.atrasoValor)}</strong></li>
        </ul>
        <dl>
          <div class="ficha-linha"><dt>Previsto no mês</dt><dd>${din(r.total)}</dd></div>
          <div class="ficha-linha"><dt>Recebido</dt><dd><strong>${din(r.recebido)}</strong> (${r.percentualRecebido}%)</dd></div>
          <div class="ficha-linha"><dt>Mensalidades pagas</dt><dd>${r.pagas} de ${r.quantidade}</dd></div>
          <div class="ficha-linha"><dt>Inadimplência do mês</dt><dd>${String(r.inadimplencia).replace(".", ",")}% (${din(r.atrasoValor)})</dd></div>
        </dl>
        ${formas.length ? `<h3>Recebido por forma</h3><dl>${formas.map((f) =>
          `<div class="ficha-linha"><dt>${f.rotulo}</dt><dd>${din(f.valor)}</dd></div>`).join("")}</dl>` : ""}
        ` : `<p class="ficha-vazio">Nenhuma mensalidade em ${nomeMes}.</p>`}
      </section>

      <section class="cartao relatorio-bloco">
        <h2>Inadimplência hoje <span>${devedores.length ? plural(devedores.length, "aluno", "alunos") : ""}</span></h2>
        <p class="campo-dica">Todos os meses em atraso até ${Formato.data(hoje)}, do maior atraso para o menor.</p>
        ${devedores.length ? `<ul class="lista-relatorio">${devedores.map((d) => `
          <li><a href="#/alunos/${s(d.alunoId)}">
            <span><strong>${s(d.aluno)}</strong>
              <small>${plural(d.quantidade, "mensalidade", "mensalidades")} · desde ${Formato.data(d.maisAntigo)} · ${plural(d.dias, "dia", "dias")}</small></span>
            <strong class="valor-atraso">${din(d.devendo)}</strong></a></li>`).join("")}
          <li class="linha-total"><span>Total em atraso</span><strong>${din(devedores.reduce((n, d) => n + d.devendo, 0))}</strong></li>
        </ul>` : `<p class="ficha-vazio">Ninguém em atraso.</p>`}
      </section>

      <section class="cartao relatorio-bloco">
        <h2>Alunos por turma</h2>
        ${porTurma.turmas.length ? `<ul class="lista-relatorio">${porTurma.turmas.map((t) => `
          <li><div>
            <span><strong>${s(t.turma.nome)}</strong>
              <small>${RegrasTurmas.diasTexto(t.turma.diasSemana)} · ${s(t.turma.inicio)} às ${s(t.turma.fim)}</small>
              ${t.alunos.length ? `<small class="nomes">${t.alunos.map(s).join(", ")}</small>` : ""}</span>
            <strong class="${t.lotada ? "turma-lotada" : ""}">${t.quantidade}${t.turma.vagas ? ` / ${t.turma.vagas}` : ""}</strong></div></li>`).join("")}
        </ul>` : `<p class="ficha-vazio">Nenhuma turma cadastrada. <a href="#/aulas">Cadastrar em Aulas</a></p>`}
        ${porTurma.semTurma.length ? `<p class="campo-dica">Sem turma: ${porTurma.semTurma.map(s).join(", ")}</p>` : ""}
      </section>

      ${linhas.length ? `
      <section class="cartao relatorio-bloco">
        <h2>Mensalidades de ${nomeMes}</h2>
        <ul class="lista-relatorio">${linhas.map((l) => `
          <li><a href="#/mensalidades/m/${s(l.id)}">
            <span><strong>${s(l.aluno)}</strong>
              <small>Vence ${Formato.data(l.vencimento)} · ${s(l.situacao)}${l.pagoEm ? ` em ${Formato.data(l.pagoEm)}` : ""}</small></span>
            <strong>${din(l.codigo === "paga" ? l.valor : l.saldo)}</strong></a></li>`).join("")}
        </ul>
      </section>` : ""}`;

    const csv = this.container.querySelector("#baixar-csv");
    if (csv) csv.addEventListener("click", () => this.baixarCsv(RegrasRelatorios.csv(linhas), `mensalidades-${comp}.csv`));
    const pdf = this.container.querySelector("#baixar-pdf");
    if (pdf) pdf.addEventListener("click", () => {
      const titulo = document.title;
      document.title = `Relatório ${nomeMes} - ${ECD_CONFIG.nomeSistema}`; // vira o nome do arquivo PDF
      window.print();
      document.title = titulo;
    });
  },

  // O "﻿" no começo faz o Excel reconhecer os acentos
  baixarCsv(texto, nome) {
    const url = URL.createObjectURL(new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: nome });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
