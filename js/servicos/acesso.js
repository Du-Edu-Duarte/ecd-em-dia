/*
 * servicos/acesso.js
 * Tudo que fala com o Firebase Authentication e com o perfil do professor.
 * As telas só chamam estas funções, nunca o Firebase direto. Assim, se um
 * dia trocarmos o Firebase por outro serviço, só este arquivo muda.
 *
 * Situações possíveis do usuário (campo "situacao"):
 *   "sem-config"   o firebase-config.js ainda não foi preenchido
 *   "deslogado"    ninguém entrou
 *   "verificar"    entrou, mas ainda não confirmou o e-mail
 *   "pendente"     e-mail confirmado, esperando o administrador aprovar
 *   "bloqueado"    o administrador bloqueou a conta
 *   "ativo"        professor aprovado: acessa o sistema
 *   "admin"        administrador ECD: acessa tudo
 */
const Acesso = {
  auth: null,
  db: null,
  estado: { situacao: "deslogado", usuario: null, perfil: null },

  configurado() {
    const c = window.FIREBASE_CONFIG || {};
    return !!c.apiKey && c.apiKey !== "COLE_AQUI";
  },

  iniciar(aoMudar) {
    if (!this.configurado()) {
      this.estado = { situacao: "sem-config", usuario: null, perfil: null };
      aoMudar(this.estado);
      return;
    }
    firebase.initializeApp(window.FIREBASE_CONFIG);
    this.auth = firebase.auth();
    this.auth.languageCode = "pt"; // e-mails do Firebase em português
    this.db = firebase.firestore();

    // Chamado ao abrir o app e sempre que alguém entra ou sai
    this.auth.onAuthStateChanged(async (usuario) => {
      try {
        this.estado = await this.calcularEstado(usuario);
      } catch (erro) {
        console.error(erro);
        this.estado = { situacao: "deslogado", usuario: null, perfil: null, erro: this.mensagemErro(erro) };
      }
      aoMudar(this.estado);
    });
  },

  ehAdmin(usuario) {
    return !!usuario && usuario.emailVerified &&
      usuario.email.toLowerCase() === ECD_CONFIG.emailAdmin.toLowerCase();
  },

  async calcularEstado(usuario) {
    if (!usuario) return { situacao: "deslogado", usuario: null, perfil: null };
    if (!usuario.emailVerified) return { situacao: "verificar", usuario, perfil: null };

    const ref = this.db.collection("professores").doc(usuario.uid);
    let doc = await ref.get();

    if (this.ehAdmin(usuario)) {
      // Na primeira entrada do administrador, cria o perfil dele já ativo
      if (!doc.exists) {
        await ref.set({
          nome: "Administrador ECD", setor: "ECD Tecnologia", email: usuario.email,
          status: "ativo", extras: {}, plano: null,
          criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        });
        doc = await ref.get();
      }
      return { situacao: "admin", usuario, perfil: doc.data() };
    }

    if (!doc.exists) return { situacao: "pendente", usuario, perfil: null };
    const perfil = doc.data();
    let situacao = perfil.status === "ativo" ? "ativo" : perfil.status === "bloqueado" ? "bloqueado" : "pendente";
    // Plano do sistema vencido e fora da tolerância: as regras do Firestore já travam os dados;
    // aqui só mostramos a tela certa em vez de erros
    if (situacao === "ativo" &&
        RegrasAssinatura.situacao(perfil.plano, Formato.hojeISO(), ECD_CONFIG.assinatura).codigo === "vencido") {
      situacao = "plano-vencido";
    }
    return { situacao, usuario, perfil };
  },

  // Cadastro: cria o login, manda o e-mail de confirmação e grava o perfil "pendente"
  async cadastrar({ nome, setor, email, senha, extras }) {
    const { user } = await this.auth.createUserWithEmailAndPassword(email, senha);
    await user.updateProfile({ displayName: nome });
    await this.db.collection("professores").doc(user.uid).set({
      nome, setor, email: user.email, extras: extras || {},
      status: "pendente",
      plano: null, // preparo para a assinatura do sistema (plano do professor com a ECD)
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await user.sendEmailVerification();
  },

  entrar(email, senha) {
    return this.auth.signInWithEmailAndPassword(email, senha);
  },

  sair() {
    return this.auth.signOut();
  },

  reenviarConfirmacao() {
    return this.auth.currentUser.sendEmailVerification();
  },

  esqueciSenha(email) {
    return this.auth.sendPasswordResetEmail(email);
  },

  // Depois de clicar no link do e-mail, o usuário toca em "Já confirmei"
  async conferirConfirmacao() {
    await this.auth.currentUser.reload();
    await this.auth.currentUser.getIdToken(true); // atualiza o token para as regras verem o e-mail confirmado
    return this.auth.currentUser.emailVerified;
  },

  /* ---------- Funções do administrador ---------- */
  async listarContas() {
    const snap = await this.db.collection("professores").get();
    return snap.docs
      .map((d) => ({ uid: d.id, ...d.data() }))
      .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
  },

  // Libera ou renova o plano do sistema de um cliente (só o administrador consegue gravar)
  async renovarPlano(uid, planoAtual, meses, valor) {
    const tolerancia = ECD_CONFIG.assinatura.diasTolerancia;
    const plano = RegrasAssinatura.renovar(planoAtual, meses, valor, Formato.hojeISO(), tolerancia);
    // Data em que trava, para as regras do Firestore: meia-noite (São Paulo) do dia depois de liberadoAte
    plano.travaEm = plano.liberadoAte
      ? firebase.firestore.Timestamp.fromDate(new Date(`${RegrasAssinatura.somarDias(plano.liberadoAte, 1)}T00:00:00-03:00`))
      : null;
    await this.db.collection("professores").doc(uid).update({
      plano, planoAlteradoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return plano;
  },

  // Tira o controle de prazo (cortesia ou conta da casa)
  removerPlano(uid) {
    return this.db.collection("professores").doc(uid).update({
      plano: null, planoAlteradoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  mudarStatus(uid, status) {
    return this.db.collection("professores").doc(uid).update({
      status,
      statusAlteradoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  // Traduz os erros do Firebase para mensagens em português
  mensagemErro(erro) {
    const mapa = {
      "auth/email-already-in-use": "Este e-mail já tem cadastro. Use Entrar.",
      "auth/invalid-email": "E-mail inválido.",
      "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
      "auth/invalid-credential": "E-mail ou senha incorretos.",
      "auth/wrong-password": "E-mail ou senha incorretos.",
      "auth/user-not-found": "E-mail ou senha incorretos.",
      "auth/too-many-requests": "Muitas tentativas. Espere alguns minutos e tente de novo.",
      "auth/network-request-failed": "Sem internet. Confira a conexão e tente de novo.",
      "permission-denied": "Você não tem permissão para isso.",
    };
    return mapa[erro && erro.code] || "Algo deu errado. Tente de novo.";
  },
};
