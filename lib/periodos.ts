// Cálculo de janelas de tempo (ano/semestre/trimestre/mês/semana) usadas nas
// Metas.
//
// Tudo é ancorado em horário de Brasília (America/Sao_Paulo), não no fuso do
// servidor: na Vercel o runtime roda em UTC, então "hoje"/"este mês" calculado
// com Date.getFullYear()/getMonth()/getDate() (que lê o fuso local do
// processo) viraria o dia seguinte 3h mais cedo do que no relógio real do
// negócio. Como o Brasil não tem mais horário de verão desde 2019,
// America/Sao_Paulo é UTC-3 o ano inteiro — dá pra tratar como offset fixo.

const TZ = "America/Sao_Paulo";
const BR_OFFSET_HOURS = 3;

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

// Ano/mês(1-12)/dia desse instante, no calendário de Brasília.
function brasiliaYMD(instante: Date): { ano: number; mes: number; dia: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [ano, mes, dia] = fmt.format(instante).split("-").map(Number);
  return { ano, mes, dia };
}

// Instante UTC correspondente à meia-noite de Brasília naquele dia (mes 1-12).
// Date.UTC normaliza overflow sozinho (mes=13 vira janeiro do ano seguinte).
function brasiliaMeiaNoiteUTC(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia, BR_OFFSET_HOURS, 0, 0));
}

// Semana ISO-8601 (começa na segunda) a partir de um ano/mês/dia já em
// calendário de Brasília. A aritmética em si é só contagem de dias, então
// pode rodar sobre um Date "neutro" em UTC sem reintroduzir fuso do servidor.
function semanaIsoDeYMD(
  ano: number,
  mes: number,
  dia: number
): { anoIso: number; semana: number; segunda: { ano: number; mes: number; dia: number } } {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const diaSemana = data.getUTCDay() || 7; // domingo vira 7

  const quinta = new Date(data);
  quinta.setUTCDate(quinta.getUTCDate() + 4 - diaSemana);
  const anoIso = quinta.getUTCFullYear();
  const inicioAnoIso = new Date(Date.UTC(anoIso, 0, 1));
  const semana = Math.ceil(((quinta.getTime() - inicioAnoIso.getTime()) / 86_400_000 + 1) / 7);

  const segunda = new Date(data);
  segunda.setUTCDate(segunda.getUTCDate() - (diaSemana - 1));

  return {
    anoIso,
    semana,
    segunda: { ano: segunda.getUTCFullYear(), mes: segunda.getUTCMonth() + 1, dia: segunda.getUTCDate() },
  };
}

export function periodosAtuais(agora = new Date()): {
  ano: Periodo;
  semestre: Periodo;
  trimestre: Periodo;
  mes: Periodo;
  semana: Periodo;
} {
  const { ano, mes: mesNum, dia } = brasiliaYMD(agora); // mesNum: 1-12

  const anoP: Periodo = {
    tipo: "ano",
    periodo: `${ano}`,
    label: `${ano}`,
    inicio: brasiliaMeiaNoiteUTC(ano, 1, 1),
    fim: brasiliaMeiaNoiteUTC(ano + 1, 1, 1),
  };

  const semNum = mesNum <= 6 ? 1 : 2;
  const semestreP: Periodo = {
    tipo: "semestre",
    periodo: `${ano}-S${semNum}`,
    label: `${semNum}º semestre`,
    inicio: brasiliaMeiaNoiteUTC(ano, semNum === 1 ? 1 : 7, 1),
    fim: brasiliaMeiaNoiteUTC(ano, semNum === 1 ? 7 : 13, 1),
  };

  const triNum = Math.floor((mesNum - 1) / 3) + 1;
  const trimestreP: Periodo = {
    tipo: "trimestre",
    periodo: `${ano}-Q${triNum}`,
    label: `${triNum}º trimestre`,
    inicio: brasiliaMeiaNoiteUTC(ano, (triNum - 1) * 3 + 1, 1),
    fim: brasiliaMeiaNoiteUTC(ano, triNum * 3 + 1, 1),
  };

  const mesP: Periodo = {
    tipo: "mes",
    periodo: `${ano}-${pad(mesNum)}`,
    label: brasiliaMeiaNoiteUTC(ano, mesNum, 1).toLocaleDateString("pt-BR", {
      month: "long",
      timeZone: TZ,
    }),
    inicio: brasiliaMeiaNoiteUTC(ano, mesNum, 1),
    fim: brasiliaMeiaNoiteUTC(ano, mesNum + 1, 1),
  };

  const { anoIso, semana, segunda } = semanaIsoDeYMD(ano, mesNum, dia);
  const inicioSemana = brasiliaMeiaNoiteUTC(segunda.ano, segunda.mes, segunda.dia);
  const fimSemana = new Date(inicioSemana.getTime() + 7 * 86_400_000);
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
  const mes = Number(mesStr); // 1-12
  const semanas = new Set<string>();

  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate(); // dia 0 do mês seguinte = último dia deste mês
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const { anoIso, semana } = semanaIsoDeYMD(ano, mes, dia);
    semanas.add(`${anoIso}-W${pad(semana)}`);
  }
  return semanas.size;
}
