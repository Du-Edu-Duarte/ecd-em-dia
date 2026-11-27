/*
 * sw.js (service worker)
 * É o que deixa o sistema ser instalado como aplicativo e abrir mesmo com internet fraca.
 *
 * Arquivos do próprio sistema: tenta a internet primeiro (assim cada atualização no
 * GitHub Pages chega na hora) e, se estiver sem sinal, usa a cópia guardada.
 * Firebase e fonte: vêm de endereços com versão fixa, então a cópia guardada serve.
 * Os dados (Firestore) e o login NÃO passam por aqui: quem cuida deles é o Firebase.
 *
 * Criou um arquivo novo em js/? Coloque também na lista ARQUIVOS e mude a VERSAO.
 * (O teste testes/pwa.test.js avisa se algum arquivo do index.html ficou de fora.)
 */
const VERSAO = "ecd-em-dia-v3";

const ARQUIVOS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/estilo.css",
  "img/icone-192.png",
  "img/icone-512.png",
  "img/apple-touch-icon.png",
  "img/favicon-32.png",
  "js/config.js",
  "js/firebase-config.js",
  "js/formato.js",
  "js/icones.js",
  "js/servicos/acesso.js",
  "js/servicos/dados.js",
  "js/regras/turmas.js",
  "js/regras/alunos.js",
  "js/regras/mensalidades.js",
  "js/regras/mensagens.js",
  "js/regras/formas.js",
  "js/regras/planos.js",
  "js/regras/marca.js",
  "js/regras/assinatura.js",
  "js/regras/cobrancas.js",
  "js/regras/painel.js",
  "js/regras/relatorios.js",
  "js/servicos/pagamento.js",
  "js/servicos/envio.js",
  "js/telas-acesso.js",
  "js/telas/aulas.js",
  "js/telas/alunos.js",
  "js/telas/mensalidades.js",
  "js/telas/ajustes.js",
  "js/telas/cobrancas.js",
  "js/telas/painel.js",
  "js/telas/relatorios.js",
  "js/telas/primeiro-acesso.js",
  "js/telas/contas.js",
  "js/telas.js",
  "js/app.js",
];

// Endereços de fora que podem ser guardados (têm versão fixa ou mudam pouco)
const DE_FORA = [/^https:\/\/www\.gstatic\.com\/firebasejs\//, /^https:\/\/fonts\.(googleapis|gstatic)\.com\//];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

// Apaga as cópias de versões antigas
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Arquivos do sistema: internet primeiro, cópia guardada se cair
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) { const copia = resp.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }
          return resp;
        })
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then((r) => r || (req.mode === "navigate" ? caches.match("index.html") : undefined)))
    );
    return;
  }

  // Firebase (scripts) e fonte: cópia guardada primeiro
  if (DE_FORA.some((r) => r.test(req.url))) {
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((resp) => {
        if (resp.ok || resp.type === "opaque") { const copia = resp.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }
        return resp;
      }))
    );
  }
  // Todo o resto (login e dados do Firebase) vai direto, sem passar pela cópia
});
