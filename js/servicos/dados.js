/*
 * servicos/dados.js
 * Leitura e gravação dos dados do professor no Firestore.
 * Tudo fica dentro de professores/{uid}/... (turmas, alunos, mensalidades, envios),
 * e as regras do Firestore garantem que cada professor só acessa a própria pasta.
 *
 * As telas usam só estas funções. "ouvir" mantém a lista sempre atualizada:
 * se o professor cadastrar uma turma no computador, ela aparece sozinha no celular.
 */
const Dados = {
  escutas: [], // listas abertas na tela atual (fechadas ao trocar de tela)

  colecao(nome) {
    const uid = Acesso.estado.usuario.uid;
    return Acesso.db.collection("professores").doc(uid).collection(nome);
  },

  // Chama "aoMudar(lista)" agora e a cada mudança. Cada item vem com o id.
  // "filtro" é opcional, por exemplo: (ref) => ref.where("alunoId", "==", id)
  ouvir(nome, aoMudar, aoErrar, filtro) {
    const ref = filtro ? filtro(this.colecao(nome)) : this.colecao(nome);
    const parar = ref.onSnapshot(
      (snap) => aoMudar(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (erro) => {
        console.error(erro);
        if (aoErrar) aoErrar(erro);
      }
    );
    this.escutas.push(parar);
    return parar;
  },

  // Fecha todas as escutas (o app.js chama ao trocar de tela)
  pararTudo() {
    this.escutas.forEach((parar) => parar());
    this.escutas = [];
  },

  async listar(nome) {
    const snap = await this.colecao(nome).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  // Cria (sem id) ou atualiza (com id). Guarda quando foi criado e alterado.
  async salvar(nome, dados, id) {
    const agora = firebase.firestore.FieldValue.serverTimestamp();
    if (id) {
      await this.colecao(nome).doc(id).update({ ...dados, alteradoEm: agora });
      return id;
    }
    const ref = await this.colecao(nome).add({ ...dados, criadoEm: agora, alteradoEm: agora });
    return ref.id;
  },

  excluir(nome, id) {
    return this.colecao(nome).doc(id).delete();
  },

  // Exclui o aluno e as mensalidades dele (LGPD: não sobra dado do aluno)
  async excluirAluno(alunoId) {
    const snap = await this.colecao("mensalidades").where("alunoId", "==", alunoId).get();
    const lote = Acesso.db.batch();
    snap.docs.forEach((d) => lote.delete(d.ref));
    lote.delete(this.colecao("alunos").doc(alunoId));
    await lote.commit();
  },

  /*
   * Cria as mensalidades que faltam para os alunos ativos (até o mês atual,
   * e o mês seguinte se vencer em até 5 dias). Roda ao entrar no sistema,
   * ao abrir Mensalidades e ao salvar um aluno. Na fase 2, esta mesma lógica
   * passa para a tarefa agendada no servidor.
   *
   * Se o professor mudou o valor ou o dia de vencimento do aluno, as mensalidades
   * ainda sem nenhum pagamento, do mês atual em diante, são atualizadas também.
   */
  async gerarMensalidades() {
    const hoje = Formato.hojeISO();
    const [alunos, existentes] = await Promise.all([this.listar("alunos"), this.listar("mensalidades")]);
    const porId = new Map(existentes.map((m) => [m.id, m]));
    const mesAtual = hoje.slice(0, 7);
    const lote = Acesso.db.batch();
    const agora = firebase.firestore.FieldValue.serverTimestamp();
    let mudancas = 0;

    alunos.forEach((aluno) => {
      const cadastradoEm = aluno.criadoEm && aluno.criadoEm.toDate ? Formato.isoDe(aluno.criadoEm.toDate()) : null;
      RegrasMensalidades.paraGerar(aluno, hoje, cadastradoEm).forEach(({ competencia, vencimento }) => {
        const id = RegrasMensalidades.idMensalidade(aluno.id, competencia);
        const atual = porId.get(id);
        const ref = this.colecao("mensalidades").doc(id);
        if (!atual) {
          lote.set(ref, {
            alunoId: aluno.id, competencia, vencimento, valor: aluno.valor,
            status: "aberta", valorPago: 0, pagamentos: [], pagoEm: null, forma: null,
            linkPagamento: null, gatewayId: null, // preenchidos na fase 2 (meio de pagamento)
            criadoEm: agora, alteradoEm: agora,
          });
          mudancas++;
        } else if (competencia >= mesAtual && !(atual.valorPago > 0) &&
                   (atual.valor !== aluno.valor || atual.vencimento !== vencimento)) {
          lote.update(ref, { valor: aluno.valor, vencimento, alteradoEm: agora });
          mudancas++;
        }
      });
    });
    if (mudancas) await lote.commit();
    return mudancas;
  },

  // Exclui uma turma e, na mesma operação, tira a turma dos alunos que treinavam nela
  // (recalculando os dias por semana). Ou tudo dá certo, ou nada muda.
  async excluirTurma(turmaId) {
    const turmas = (await this.listar("turmas")).filter((t) => t.id !== turmaId);
    const alunos = (await this.listar("alunos")).filter((a) => (a.turmas || []).includes(turmaId));
    const lote = Acesso.db.batch();
    const agora = firebase.firestore.FieldValue.serverTimestamp();
    alunos.forEach((a) => {
      const restantes = (a.turmas || []).filter((id) => id !== turmaId);
      lote.update(this.colecao("alunos").doc(a.id), {
        turmas: restantes,
        diasPorSemana: RegrasTurmas.diasPorSemana(turmas.filter((t) => restantes.includes(t.id))),
        alteradoEm: agora,
      });
    });
    lote.delete(this.colecao("turmas").doc(turmaId));
    await lote.commit();
  },
};
