/**
 * Modelo do arquivo de dados iniciais. O Seed.gs real fica só no seu computador
 * (.gitignore) porque contém dados de saúde.
 *
 * Copie para Seed.gs, ajuste e cole no editor do Apps Script. Depois rode rodarSeed().
 * Use ids fixos (uuid): assim rodar de novo não duplica nada.
 */
var SEED = {
  planos: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      tipo: 'amoxicilina',
      horarios: ['2026-01-01T08:00:00-03:00', '2026-01-01T20:00:00-03:00']
    }
  ],
  eventos: [
    { id: '00000000-0000-4000-8000-000000000002', tipo: 'amoxicilina', horario: '2026-01-01T08:00:00-03:00', dados: {} },
    { id: '00000000-0000-4000-8000-000000000003', tipo: 'febre', horario: '2026-01-01T07:50:00-03:00', dados: { temperatura: 38.0 } }
  ],
  config: {
    nome_bebe: '',
    febre_limite_c: '37.8',
    tylenol_max_24h: ''
  }
};
