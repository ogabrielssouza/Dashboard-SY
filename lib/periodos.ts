// Cálculo de janelas de tempo (ano/semestre/trimestre/mês/semana) usadas nas
// Metas. Tudo em hora local do servidor — para uma operação de time único,
// isso é suficiente e evita a complexidade de fuso por usuário.

export type Periodo = {
  tipo: "ano" | "semestre" | "trimestre" | "mes" | "semana";
  periodo: string; // chave estável (ex: "2026", "2026-S1", "2026-Q1", "2026-03", "2026-W12")
  label: string; // rótulo pra exibir
  inicio: Date;
  fim: Date; // exclusivo
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Semana ISO-8601: começa na segunda-feira.
function isoWeekInfo(d: Date): { ano: number; semana: number; inicio: Date } {
  const data = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const diaSemana = data.getUTCDay() || 7; // domingo vira 7
  data.setUTCDate(data.getUTCDate() + 4 - diaSemana); // quinta-feira da mesma semana
  const anoIso = data.getUTCFullYear();
  const inicioAno = new Date(Date.UTC(anoIso, 0, 1));
  const semana = Math.ceil(((data.getTime() - inicioAno.getTime()) / 86_400_000 + 1) / 7);

  const segunda = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  segunda.setUTCDate(segunda.getUTCDate() - (diaSemana - 1));
  return { ano: anoIso, semana, inicio: segunda };
}

export function periodosAtuais(agora = new Date()): {
  ano: Periodo;
  semestre: Periodo;
  trimestre: Periodo;
  mes: Periodo;
  semana: Periodo;
} {
  const ano = agora.getFullYear();
  const mes = agora.getMonth(); // 0-11

  const anoP: Periodo = {
    tipo: "ano",
    periodo: `${ano}`,
    label: `${ano}`,
    inicio: new Date(ano, 0, 1),
    fim: new Date(ano + 1, 0, 1),
  };

  const semNum = mes < 6 ? 1 : 2;
  const semestreP: Periodo = {
    tipo: "semestre",
    periodo: `${ano}-S${semNum}`,
    label: `${semNum}º semestre`,
    inicio: new Date(ano, semNum === 1 ? 0 : 6, 1),
    fim: new Date(ano, semNum === 1 ? 6 : 12, 1),
  };

  const triNum = Math.floor(mes / 3) + 1;
  const trimestreP: Periodo = {
    tipo: "trimestre",
    periodo: `${ano}-Q${triNum}`,
    label: `${triNum}º trimestre`,
    inicio: new Date(ano, (triNum - 1) * 3, 1),
    fim: new Date(ano, triNum * 3, 1),
  };

  const mesP: Periodo = {
    tipo: "mes",
    periodo: `${ano}-${pad(mes + 1)}`,
    label: new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long" }),
    inicio: new Date(ano, mes, 1),
    fim: new Date(ano, mes + 1, 1),
  };

  const { ano: anoIso, semana, inicio: inicioSemana } = isoWeekInfo(agora);
  const fimSemana = new Date(inicioSemana);
  fimSemana.setUTCDate(fimSemana.getUTCDate() + 7);
  const semanaP: Periodo = {
    tipo: "semana",
    periodo: `${anoIso}-W${pad(semana)}`,
    label: `Semana ${semana}`,
    inicio: inicioSemana,
    fim: fimSemana,
  };

  return { ano: anoP, semestre: semestreP, trimestre: trimestreP, mes: mesP, semana: semanaP };
}

// Chaves dos meses dentro de um trimestre (pra somar e comparar com a meta
// do trimestre) — ex: trimestre "2026-Q1" -> ["2026-01","2026-02","2026-03"].
export function mesesDoTrimestre(periodoTrimestre: string): string[] {
  const [anoStr, qStr] = periodoTrimestre.split("-Q");
  const ano = Number(anoStr);
  const q = Number(qStr);
  const primeiroMes = (q - 1) * 3;
  return [0, 1, 2].map((i) => `${ano}-${pad(primeiroMes + i + 1)}`);
}

// Quantidade de semanas ISO que tocam o mês — usado só como divisor pra
// sugerir um número "padrão" de meta semanal a partir da meta do mês.
export function semanasNoMes(periodoMes: string): number {
  const [anoStr, mesStr] = periodoMes.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr) - 1;
  const semanas = new Set<string>();
  const d = new Date(ano, mes, 1);
  while (d.getMonth() === mes) {
    const { ano: ai, semana } = isoWeekInfo(d);
    semanas.add(`${ai}-W${pad(semana)}`);
    d.setDate(d.getDate() + 1);
  }
  return semanas.size;
}
