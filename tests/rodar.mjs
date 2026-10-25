// Roda os testes de regras no terminal, sem navegador e sem dependências:
//   node tests/rodar.mjs
// (Os mesmos casos aparecem em tests/regras.test.html quando aberto no navegador.)
import { casos } from './regras.casos.js';

let total = 0;
let falhas = 0;
casos({
  grupo: (nome) => console.log(`\n${nome}`),
  teste: (nome, fn) => {
    total++;
    try {
      fn();
      console.log(`  ✓ ${nome}`);
    } catch (e) {
      falhas++;
      console.log(`  ✗ ${nome}\n    ${String(e.message).replace(/\n/g, '\n    ')}`);
    }
  }
});
console.log(falhas ? `\n${falhas} de ${total} testes falharam` : `\nTodos os ${total} testes passaram`);
process.exitCode = falhas ? 1 : 0;
