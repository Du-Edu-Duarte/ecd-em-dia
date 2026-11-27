/*
 * servicos/envio.js
 * Envio das cobranças.
 *
 * FASE 1 (agora): semiautomático. Monta o link do WhatsApp (wa.me) com a mensagem
 *   pronta; o professor toca, o WhatsApp abre e ele só confirma o envio.
 *   Cada toque fica registrado em professores/{uid}/envios.
 * FASE 2 (depois): uma tarefa agendada no servidor envia sozinha (régua do meio de
 *   pagamento ou WhatsApp Business API) e grava o mesmo registro em "envios".
 *   As telas continuam chamando Envio.prepararWhatsapp() e Envio.registrar().
 */
const Envio = {
  // Monta a mensagem e o link wa.me de uma mensalidade
  prepararWhatsapp(m, aluno, tipoTexto) {
    const perfil = Acesso.estado.perfil || {};
    const hoje = Formato.hojeISO();
    const link = Pagamento.link(m, aluno, perfil);
    const modelo = RegrasMensagens.modelo(tipoTexto, perfil.templates);
    const texto = RegrasMensagens.montar(modelo, RegrasCobrancas.valores(m, aluno, perfil, hoje, link.texto));
    return { texto, url: RegrasAlunos.linkWhatsapp(aluno.whatsapp, texto), temLink: link.ok };
  },

  // Guarda no histórico que a cobrança foi enviada (data e hora)
  registrar(m, tipo, canal = "whatsapp") {
    return Dados.salvar("envios", {
      mensalidadeId: m.id,
      alunoId: m.alunoId,
      tipo,                   // d5 | d1 | hoje | atraso | manual
      canal,                  // whatsapp | email | sms
      dia: Formato.hojeISO(), // dia em São Paulo, para saber o que já foi enviado hoje
      enviadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  // Hora do envio para mostrar na tela ("27/11/2026 às 10:32")
  quando(envio) {
    if (!envio) return "";
    const d = envio.enviadoEm && envio.enviadoEm.toDate ? envio.enviadoEm.toDate() : null;
    if (!d) return Formato.data(envio.dia);
    const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: ECD_CONFIG.fuso, hour: "2-digit", minute: "2-digit" }).format(d);
    return `${Formato.data(Formato.isoDe(d))} às ${hora}`;
  },
};
