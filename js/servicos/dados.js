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
  ouvir(nome, aoMudar, aoErrar) {
    const parar = this.colecao(nome).onSnapshot(
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
