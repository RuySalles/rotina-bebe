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
//   - Fase 23: cada versão tem v/<versao>/arquivos.json com a impressão digital de cada arquivo. Um arquivo de outra
//     versão que for igual a um já guardado vem dessa cópia, sem baixar de novo (ao carregar a versão nova e ao
//     instalá-la). Só os arquivos que mudaram vêm da internet.

const VERSAO = '__VERSAO__';
const CACHE = `rb-${VERSAO}`;
const ARQUIVOS = ['./', 'manifest.webmanifest', 'img/icone-180.png', 'img/icone-512.png' /* __ARQUIVOS__ */];
const ESPERA_PAGINA_MS = 4000;
const RE_VERSAO = /\/v\/([^/]+)\/(.+)$/; // …/v/<versao>/<caminho>

self.addEventListener('install', (e) => {
  e.waitUntil(instalar().then(() => self.skipWaiting()));
});

/** Guarda os arquivos desta versão; os de v/<versao>/ iguais a uma cópia já guardada vêm dela. */
async function instalar() {
  const cache = await caches.open(CACHE);
  await Promise.all(ARQUIVOS.map(async (caminho) => {
    const url = new URL(caminho, self.location);
    const req = new Request(url.href);
    if (url.pathname.includes(`/v/${VERSAO}/`)) {
      const igual = (await caches.match(req)) || (await deOutraVersao(url));
      if (igual) return cache.put(req, await semEndereco(igual));
    }
    await cache.add(req);
  }));
}

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
  const igual = await deOutraVersao(url).catch(() => null);
  if (igual) {
    (await caches.open(CACHE)).put(req, igual.clone());
    return igual;
  }
  const resp = await fetch(req);
  if (resp.ok && url.pathname.includes('/v/')) {
    const c = await caches.open(CACHE);
    c.put(req, resp.clone());
  }
  return resp;
}

/**
 * O mesmo arquivo, já guardado de outra versão (mesma impressão digital), ou null.
 * url: …/v/<versao>/<caminho> pedido agora.
 */
async function deOutraVersao(url) {
  const m = url.pathname.match(RE_VERSAO);
  if (!m || m[2] === 'arquivos.json') return null;
  const [, versao, caminho] = m;
  const digital = (await manifesto(versao, false))[caminho];
  if (!digital) return null;
  for (const nome of await caches.keys()) {
    const outra = nome.startsWith('rb-') ? nome.slice(3) : '';
    if (!outra || outra === versao) continue;
    if ((await manifesto(outra, true))[caminho] !== digital) continue;
    const r = await caches.match(new URL(`v/${outra}/${caminho}`, self.location).href, { cacheName: nome });
    if (r) return semEndereco(r);
  }
  return null;
}

/** arquivos.json de uma versão ({} se não houver). soCopia: só das cópias guardadas (versões antigas). */
const manifestos = new Map();
function manifesto(versao, soCopia) {
  const chave = `${versao}|${soCopia}`;
  if (!manifestos.has(chave)) {
    const url = new URL(`v/${versao}/arquivos.json`, self.location).href;
    const p = (async () => {
      const r = (await caches.match(url)) || (soCopia ? null : await fetch(url));
      if (!r || !r.ok) throw new Error('sem_manifesto');
      return await r.clone().json();
    })();
    p.catch(() => manifestos.delete(chave)); // tenta de novo no próximo pedido
    manifestos.set(chave, p);
  }
  return manifestos.get(chave).catch(() => ({}));
}

/**
 * Cópia da resposta sem o endereço de origem: o navegador usa o endereço pedido, e os imports relativos
 * de um módulo continuam apontando para a versão nova.
 */
async function semEndereco(r) {
  return new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: r.headers });
}

function comPrazo(promessa, ms) {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('prazo')), ms);
    promessa.then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); falha(e); });
  });
}
