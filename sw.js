// Service worker: guarda o app no celular para ele abrir mesmo sem internet (fase 9).
// Este arquivo é um modelo: scripts/montar-site.sh troca __VERSAO__ e a lista de arquivos na publicação.
// Em desenvolvimento (versão "dev") o app não registra o service worker.
//
// Como funciona:
//   - Na instalação, guarda os arquivos desta versão (v/<versao>/…), a página, o manifesto e os ícones.
//   - A página (index.html) vem primeiro da internet (para chegar versão nova); sem resposta em 4 s, vem da cópia.
//   - Os arquivos de v/<versao>/ nunca mudam: vêm da cópia, e o que faltar é buscado e guardado.
//   - versao.json e a planilha (Google) nunca passam pela cópia: a atualização automática e os dados ficam iguais.
//   - Ao ativar uma versão nova, apaga as cópias das versões antigas.

const VERSAO = '__VERSAO__';
const CACHE = `rb-${VERSAO}`;
const ARQUIVOS = ['./', 'manifest.webmanifest', 'img/icone-180.png', 'img/icone-512.png' /* __ARQUIVOS__ */];
const ESPERA_PAGINA_MS = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('rb-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // planilha e qualquer outro site: direto na internet
  if (url.pathname.endsWith('/versao.json')) return; // sempre da internet (atualização automática)
  if (req.mode === 'navigate') {
    e.respondWith(pagina(req));
    return;
  }
  e.respondWith(arquivo(req, url));
});

/** Página: internet primeiro (com prazo); sem internet, a cópia guardada. */
async function pagina(req) {
  try {
    const resp = await comPrazo(fetch(req), ESPERA_PAGINA_MS);
    if (resp.ok) (await caches.open(CACHE)).put('./', resp.clone());
    return resp;
  } catch {
    const copia = (await caches.match('./')) || (await caches.match(req, { ignoreSearch: true }));
    return copia || Response.error();
  }
}

/** Arquivos: da cópia; o que não estiver guardado vem da internet (e os de v/<versao>/ são guardados). */
async function arquivo(req, url) {
  const copia = await caches.match(req, { ignoreSearch: true });
  if (copia) return copia;
  const resp = await fetch(req);
  if (resp.ok && url.pathname.includes('/v/')) {
    const c = await caches.open(CACHE);
    c.put(req, resp.clone());
  }
  return resp;
}

function comPrazo(promessa, ms) {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('prazo')), ms);
    promessa.then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); falha(e); });
  });
}
