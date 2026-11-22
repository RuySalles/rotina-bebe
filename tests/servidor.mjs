// Servidor local sem dependências, para abrir o app e os testes no navegador:
//   node tests/servidor.mjs        → http://localhost:8080
//   node tests/servidor.mjs _site 8090  → serve o site montado (scripts/montar-site.sh), para testar o modo offline
// (Módulos ES não funcionam abrindo o arquivo direto com file://.)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raiz = process.argv[2] ? path.resolve(projeto, process.argv[2]) : projeto;
const porta = Number(process.argv[3] || process.env.PORT || 8080);
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let arquivo = path.join(raiz, caminho);
  if (!arquivo.startsWith(raiz)) { res.writeHead(403); return res.end(); }
  if (caminho.endsWith('/')) arquivo = path.join(arquivo, 'index.html');
  fs.readFile(arquivo, (erro, dados) => {
    if (erro) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(dados);
  });
}).listen(porta, () => console.log(`Abra http://localhost:${porta}/ ou http://localhost:${porta}/tests/regras.test.html`));
