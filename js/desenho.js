// Desenho em canvas comum às imagens do app (relatório e família): cores do tema claro, fontes e texto em linhas.
// As imagens saem sempre claras (como o PDF), não importa o tema do celular.

export const COR = {
  fundo: '#f6f2ec', superficie: '#ffffff', texto: '#1f1b18', texto2: '#5d554e', texto3: '#8a8178',
  linha: 'rgba(0, 0, 0, 0.12)', alerta: '#b3361f', primaria: '#2f6f6a'
};
export const FONTE = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
export const FONTE_TITULO = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif';
export const fonte = (peso, px, familia = FONTE) => `${peso} ${px}px ${familia}`;

/** Quebra o texto em linhas que cabem em `largura` (com a fonte já escolhida no contexto). */
export function quebrar(c, texto, largura, maxLinhas = 99) {
  const linhas = [];
  for (const paragrafo of String(texto ?? '').split('\n')) {
    let linha = '';
    for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = linha ? `${linha} ${palavra}` : palavra;
      if (linha && c.measureText(tentativa).width > largura) { linhas.push(linha); linha = palavra; } else linha = tentativa;
    }
    linhas.push(linha);
  }
  if (linhas.length > maxLinhas) {
    linhas.length = maxLinhas;
    linhas[maxLinhas - 1] += '…';
  }
  return linhas;
}

export function retanguloArredondado(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export const bolinha = (c, x, y, cor, r = 8) => { c.fillStyle = cor || COR.primaria; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
export const linhaH = (c, x, y, w) => { c.fillStyle = COR.linha; c.fillRect(x, y, w, 1.5); };

/** Texto em várias linhas a partir de y (topo). */
export function escrever(c, linhas, x, y, alturaLinha, cor, fonteCss) {
  c.font = fonteCss;
  c.fillStyle = cor;
  c.textBaseline = 'top';
  linhas.forEach((l, i) => c.fillText(l, x, y + i * alturaLinha));
}

// Um contexto só para medir texto antes de desenhar.
let medidor = null;
export const medir = () => (medidor ||= document.createElement('canvas').getContext('2d'));

/** canvas → Blob png */
export const paraBlob = (canvas) => new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error('toBlob'))), 'image/png'));
