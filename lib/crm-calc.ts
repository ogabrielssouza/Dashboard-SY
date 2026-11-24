// Lógica pura do CRM (sem banco, sem Next). Espelha a planilha "CRM e Painel
// Diário — System Acquisition": situação do lead, fila de hoje, painel do mês
// e gate de verba. Datas são strings "YYYY-MM-DD" no calendário de Brasília —
// nunca Date local, pra não virar o dia errado no servidor (UTC).

export const ETAPAS = [
  "Novo Lead",
  "Em qualificação",
  "Agendado",
  "No-show",
  "Call realizada",
  "Follow-up",
  "Venda",
  "Perdido",
] as const;
export type Etapa = (typeof ETAPAS)[number];

export const RESPONSAVEIS = ["Gabriel", "Maria Clara", "Closer", "Social Seller"] as const;

export const ORIGENS = [
  "Topo (ads)",
  "Social Selling",
  "Perfil",
  "Funil novo (F2/F3)",
  "Indicação",
  "Outro",
] as const;

// O texto de NO_SHOW_PERDIDO é usado nas contas do painel — não mudar.
export const NO_SHOW_PERDIDO = "No-show (não compareceu)";
export const MOTIVOS = [
  "Sem fit de ICP",
  "Sem dinheiro agora",
  "Preciso pensar (sumiu)",
  "Não confia no método",
  "Já tem alguém",
  NO_SHOW_PERDIDO,
  "Sem resposta (cadência encerrada)",
  "Outro",
] as const;

export type CrmLead = {
  id: string;
  nome: string;
  etapa: Etapa;
  responsavel: string | null;
  proximo_followup: string | null;
  origem: string | null;
  contato: string | null;
  faturamento_lead: number | null;
  nicho: string | null;
  campanha: string | null;
  criativo: string | null;
  data_entrada: string | null;
  ultimo_contato: string | null;
  data_call: string | null;
  call_confirmada: boolean;
  data_venda: string | null;
  contrato: number | null;
  coletado: number | null;
  motivo_perda: string | null;
  obs: string | null;
};

export type Situacao =
  | "SEM 1º CONTATO"
  | "REAGENDAR AGORA"
  | "CALL PASSOU — ATUALIZAR"
  | "SEM PRÓX. PASSO"
  | "ATRASADO"
  | "HOJE"
  | "Em dia"
  | "Encerrado"
  | "FALTA DATA DA VENDA";

// Ordem de urgência da lista de ação (menor = mais urgente).
export const URGENCIA: Partial<Record<Situacao, number>> = {
  "SEM 1º CONTATO": 0,
  "REAGENDAR AGORA": 1,
  "CALL PASSOU — ATUALIZAR": 2,
  ATRASADO: 3,
  HOJE: 4,
  "SEM PRÓX. PASSO": 5,
  "FALTA DATA DA VENDA": 6,
};

// ---------- datas (calendário de Brasília) ----------

const FMT_BR = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function hojeBR(agora: Date = new Date()): string {
  return FMT_BR.format(agora);
}

export function addDias(dia: string, n: number): string {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function inicioMes(dia: string): string {
  return `${dia.slice(0, 8)}01`;
}

export function fimMes(dia: string): string {
  const [a, m] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}

// Dias úteis (seg–sex) de `de` até `ate`, ambos inclusos.
export function diasUteisEntre(de: string, ate: string): number {
  let n = 0;
  for (let d = de; d <= ate; d = addDias(d, 1)) {
    const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}

const entre = (d: string | null, a: string, b: string) => !!d && d >= a && d <= b;

// ---------- situação e perfil ----------

export function situacao(l: CrmLead, hoje: string): Situacao {
  if (l.etapa === "Venda") return l.data_venda ? "Encerrado" : "FALTA DATA DA VENDA";
  if (l.etapa === "Perdido") return "Encerrado";
  if (l.etapa === "Novo Lead" && !l.ultimo_contato) return "SEM 1º CONTATO";
  if (l.etapa === "No-show") return "REAGENDAR AGORA";
  if (l.etapa === "Agendado" && l.data_call && l.data_call < hoje) return "CALL PASSOU — ATUALIZAR";
  if (!l.proximo_followup) {
    return l.etapa === "Agendado" && l.data_call && l.data_call >= hoje ? "Em dia" : "SEM PRÓX. PASSO";
  }
  if (l.proximo_followup < hoje) return "ATRASADO";
  if (l.proximo_followup === hoje) return "HOJE";
  return "Em dia";
}

export type Perfil = "Dos sonhos" | "Ideal" | "Mínimo viável" | "Abaixo do piso" | null;

export function perfilIcp(l: CrmLead, cfg: CrmConfig): Perfil {
  if (l.faturamento_lead === null) return null;
  if (l.faturamento_lead >= cfg.icpSonho) return "Dos sonhos";
  if (l.faturamento_lead >= cfg.icpIdeal) return "Ideal";
  if (l.faturamento_lead >= cfg.icpMinimo) return "Mínimo viável";
  return "Abaixo do piso";
}

const qualificado = (p: Perfil) => p === "Mínimo viável" || p === "Ideal" || p === "Dos sonhos";

// ---------- configuração ----------

export type CrmConfig = {
  metaFaturamento: number;
  metaVendas: number;
  metaCaixa: number;
  metaCallsRealizadas: number;
  metaCallsAgendadas: number;
  diasUteisMes: number;
  metaAgendaSemana: number;
  leadsMinSemana: number;
  comercialAlinhado: boolean;
  custoMaxCall: number;
  qualifMin: number;
  aumentoVerba: number;
  icpMinimo: number;
  icpIdeal: number;
  icpSonho: number;
};

export const CONFIG_PADRAO: CrmConfig = {
  metaFaturamento: 100000,
  metaVendas: 15,
  metaCaixa: 30000,
  metaCallsRealizadas: 60,
  metaCallsAgendadas: 75,
  diasUteisMes: 22,
  metaAgendaSemana: 18,
  leadsMinSemana: 25,
  comercialAlinhado: false,
  custoMaxCall: 150,
  qualifMin: 0.6,
  aumentoVerba: 0.2,
  icpMinimo: 8000,
  icpIdeal: 15000,
  icpSonho: 30000,
};

// ---------- painel ----------

export type Gate = {
  nome: string;
  atual: string;
  exigido: string;
  status: "OK" | "TRAVADO" | "SEM DADO";
};

export type Painel = {
  hoje: string;
  mesInicio: string;
  mesFim: string;
  diasUteisRestantes: number;
  caixa: {
    contratado: number;
    coletado: number;
    vendas: number;
    callsRealizadas: number;
    callsAgendadas: number;
    aReceber: number;
    ticketMedio: number;
    pctColetado: number;
  };
  fila: {
    semContato: number;
    qualificadosSemCall: number;
    aConfirmar: number;
    noShow: number;
    atrasados: number;
    hoje: number;
    semProximoPasso: number;
    callPassou: number;
    vendaSemData: number;
  };
  porResponsavel: {
    responsavel: string;
    hoje: number;
    atrasados: number;
    semContato: number;
    noShow: number;
    callsHoje: number;
  }[];
  agenda: { callsHoje: number; callsAmanha: number; calls7d: number; leadsNovos7d: number };
  funil: { leads: number; qualificados: number; agendados: number; realizadas: number; vendas: number };
  marketing: {
    investimento: number;
    cpl: number | null;
    custoMql: number | null;
    custoAgendamento: number | null;
    custoCall: number | null;
    cacMidia: number | null;
    showRate: number | null;
  };
  gates: Gate[];
  verbaLiberada: boolean;
  gatesOk: number;
  diagnostico: string;
  acao: { lead: CrmLead; situacao: Situacao; perfil: Perfil }[];
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function calcularPainel(
  leads: CrmLead[],
  cfg: CrmConfig,
  investimentoMes: number,
  hoje: string = hojeBR()
): Painel {
  const mesIni = inicioMes(hoje);
  const mesFim = fimMes(hoje);
  const ate = hoje < mesFim ? hoje : mesFim;
  const sit = new Map<string, Situacao>();
  const perf = new Map<string, Perfil>();
  for (const l of leads) {
    sit.set(l.id, situacao(l, hoje));
    perf.set(l.id, perfilIcp(l, cfg));
  }
  const S = (l: CrmLead) => sit.get(l.id)!;
  const P = (l: CrmLead) => perf.get(l.id)!;
  const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  // 1 · caixa e meta do mês
  const vendasMes = leads.filter((l) => l.etapa === "Venda" && entre(l.data_venda, mesIni, mesFim));
  const contratado = soma(vendasMes.map((l) => l.contrato ?? 0));
  const coletado = soma(vendasMes.map((l) => l.coletado ?? 0));
  const noShowPerdido = (l: CrmLead) => l.etapa === "Perdido" && l.motivo_perda === NO_SHOW_PERDIDO;
  const realizada = (l: CrmLead) => l.etapa !== "Agendado" && l.etapa !== "No-show" && !noShowPerdido(l);
  const callsRealizadas = leads.filter((l) => entre(l.data_call, mesIni, ate) && realizada(l)).length;
  const callsAgendadas = leads.filter((l) => entre(l.data_call, mesIni, mesFim)).length;

  // 2 · fila de hoje
  const count = (s: Situacao) => leads.filter((l) => S(l) === s).length;
  const fila = {
    semContato: count("SEM 1º CONTATO"),
    qualificadosSemCall: leads.filter((l) => l.etapa === "Em qualificação" && qualificado(P(l))).length,
    aConfirmar: leads.filter(
      (l) => l.etapa === "Agendado" && entre(l.data_call, hoje, addDias(hoje, 2)) && !l.call_confirmada
    ).length,
    noShow: leads.filter((l) => l.etapa === "No-show").length,
    atrasados: count("ATRASADO"),
    hoje: count("HOJE"),
    semProximoPasso: count("SEM PRÓX. PASSO"),
    callPassou: count("CALL PASSOU — ATUALIZAR"),
    vendaSemData: count("FALTA DATA DA VENDA"),
  };

  // 3 · por responsável
  const resp = [...RESPONSAVEIS, null] as (string | null)[];
  const porResponsavel = resp.map((r) => {
    const meus = leads.filter((l) => (l.responsavel || null) === r);
    return {
      responsavel: r ?? "Sem responsável",
      hoje: meus.filter((l) => S(l) === "HOJE").length,
      atrasados: meus.filter((l) => S(l) === "ATRASADO").length,
      semContato: meus.filter((l) => S(l) === "SEM 1º CONTATO").length,
      noShow: meus.filter((l) => l.etapa === "No-show").length,
      callsHoje: meus.filter((l) => l.data_call === hoje).length,
    };
  });

  // 4 · agenda e entrada
  const agenda = {
    callsHoje: leads.filter(
      (l) =>
        l.data_call === hoje &&
        (l.etapa === "Agendado" || l.etapa === "Call realizada" || l.etapa === "Follow-up" || l.etapa === "Venda")
    ).length,
    callsAmanha: leads.filter((l) => l.etapa === "Agendado" && l.data_call === addDias(hoje, 1)).length,
    calls7d: leads.filter((l) => l.etapa === "Agendado" && entre(l.data_call, hoje, addDias(hoje, 6))).length,
    leadsNovos7d: leads.filter((l) => entre(l.data_entrada, addDias(hoje, -6), hoje)).length,
  };

  // 5 · funil do mês (leads que ENTRARAM no mês)
  const doMes = leads.filter((l) => entre(l.data_entrada, mesIni, mesFim));
  const agendadosF = doMes.filter((l) => l.data_call).length;
  const realizadasF = agendadosF - doMes.filter((l) => !realizada(l) && l.data_call).length;
  const funil = {
    leads: doMes.length,
    qualificados: doMes.filter((l) => qualificado(P(l))).length,
    agendados: agendadosF,
    realizadas: realizadasF,
    vendas: doMes.filter((l) => l.etapa === "Venda").length,
  };

  // 6 · marketing
  const div = (a: number, b: number) => (b ? a / b : null);
  const faltamNoShow = doMes.filter((l) => l.etapa === "No-show" || noShowPerdido(l)).length;
  const marketing = {
    investimento: investimentoMes,
    cpl: div(investimentoMes, funil.leads),
    custoMql: div(investimentoMes, funil.qualificados),
    custoAgendamento: div(investimentoMes, funil.agendados),
    custoCall: div(investimentoMes, funil.realizadas),
    cacMidia: div(investimentoMes, funil.vendas),
    showRate: div(funil.realizadas, funil.realizadas + faltamNoShow),
  };

  // 7 · gate de verba
  const taxaQualif = funil.leads ? funil.qualificados / funil.leads : 0;
  const gates: Gate[] = [
    {
      nome: "Comercial alinhado (Config)",
      atual: cfg.comercialAlinhado ? "Sim" : "Não",
      exigido: "Sim",
      status: cfg.comercialAlinhado ? "OK" : "TRAVADO",
    },
    {
      nome: "Leads sem 1º contato",
      atual: String(fila.semContato),
      exigido: "0",
      status: fila.semContato <= 0 ? "OK" : "TRAVADO",
    },
    {
      nome: "Follow-ups atrasados",
      atual: String(fila.atrasados),
      exigido: "0",
      status: fila.atrasados <= 0 ? "OK" : "TRAVADO",
    },
    {
      nome: "No-show sem reagendar",
      atual: String(fila.noShow),
      exigido: "0",
      status: fila.noShow <= 0 ? "OK" : "TRAVADO",
    },
    {
      nome: "Qualificados sem call marcada",
      atual: String(fila.qualificadosSemCall),
      exigido: "0",
      status: fila.qualificadosSemCall <= 0 ? "OK" : "TRAVADO",
    },
    {
      nome: "Agenda dos próx. 7 dias abaixo da meta semanal",
      atual: String(agenda.calls7d),
      exigido: `< ${cfg.metaAgendaSemana}`,
      status: agenda.calls7d < cfg.metaAgendaSemana ? "OK" : "TRAVADO",
    },
    {
      nome: "Custo por call agendada até o teto",
      atual: marketing.custoAgendamento === null ? "—" : brl(marketing.custoAgendamento),
      exigido: `≤ ${brl(cfg.custoMaxCall)}`,
      status:
        marketing.custoAgendamento === null
          ? "SEM DADO"
          : marketing.custoAgendamento <= cfg.custoMaxCall
            ? "OK"
            : "TRAVADO",
    },
    {
      nome: "Qualificação (qualificados ÷ leads) no mínimo",
      atual: funil.leads ? `${Math.round(taxaQualif * 100)}%` : "—",
      exigido: `≥ ${Math.round(cfg.qualifMin * 100)}%`,
      status: funil.leads === 0 ? "SEM DADO" : taxaQualif >= cfg.qualifMin ? "OK" : "TRAVADO",
    },
  ];
  const gatesOk = gates.filter((g) => g.status === "OK").length;

  const diagnostico =
    agenda.calls7d >= cfg.metaAgendaSemana
      ? `AGENDA CHEIA (${agenda.calls7d} calls nos próx. 7 dias) — foco em show rate e fechamento.`
      : fila.semContato > 0
        ? `1º CONTATO: ${fila.semContato} lead(s) sem contato — ligar em até 10 min.`
        : fila.atrasados > 0
          ? `FOLLOW-UP: ${fila.atrasados} atrasado(s) — zera a fila antes de tudo.`
          : fila.noShow > 0
            ? `NO-SHOW: ${fila.noShow} a reagendar hoje.`
            : fila.qualificadosSemCall > 0
              ? `AGENDAMENTO: ${fila.qualificadosSemCall} qualificado(s) sem call marcada — convida agora.`
              : agenda.leadsNovos7d < cfg.leadsMinSemana
                ? `LEAD: só ${agenda.leadsNovos7d} novo(s) nos últimos 7 dias (mínimo ${cfg.leadsMinSemana}) — falta entrada.`
                : "DISPONIBILIDADE: lead, qualificação e follow-up ok e a agenda não encheu — abre horário e reforça o convite.";

  const acao = leads
    .map((lead) => ({ lead, situacao: S(lead), perfil: P(lead) }))
    .filter((x) => URGENCIA[x.situacao] !== undefined)
    .sort(
      (a, b) =>
        URGENCIA[a.situacao]! - URGENCIA[b.situacao]! ||
        (a.lead.proximo_followup ?? a.lead.data_call ?? "9999").localeCompare(
          b.lead.proximo_followup ?? b.lead.data_call ?? "9999"
        )
    );

  return {
    hoje,
    mesInicio: mesIni,
    mesFim,
    diasUteisRestantes: diasUteisEntre(hoje, mesFim),
    caixa: {
      contratado,
      coletado,
      vendas: vendasMes.length,
      callsRealizadas,
      callsAgendadas,
      aReceber: soma(vendasMes.map((l) => (l.contrato ?? 0) - (l.coletado ?? 0))),
      ticketMedio: vendasMes.length ? contratado / vendasMes.length : 0,
      pctColetado: contratado ? coletado / contratado : 0,
    },
    fila,
    porResponsavel,
    agenda,
    funil,
    marketing,
    gates,
    verbaLiberada: gatesOk === gates.length,
    gatesOk,
    diagnostico,
    acao,
  };
}
