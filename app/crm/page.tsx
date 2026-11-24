import Link from "next/link";
import { countCrmLeads, getCrmConfig, investimentoNoMes, listCrmLeads } from "@/lib/crm";
import {
  CONFIG_PADRAO,
  ETAPAS,
  MOTIVOS,
  ORIGENS,
  RESPONSAVEIS,
  calcularPainel,
  fimMes,
  hojeBR,
  inicioMes,
  situacao,
  type CrmConfig,
  type CrmLead,
  type Etapa,
  type Situacao,
} from "@/lib/crm-calc";
import { addCrmLead, importarLeads, removeCrmLead, saveCrmConfig, saveCrmLead } from "./actions";
import AutoRefresh from "../auto-refresh";
import {
  card,
  pageTitle,
  pageSubtitle,
  eyebrow,
  muted,
  label,
  input,
  hint,
  btnPrimary,
  btnGhost,
  btnDanger,
  badgeNeutral,
  badgeOk,
  badgeWarn,
  badgeErr,
  badgeAccent,
  tableWrap,
  thead,
  rowDivide,
  rowHover,
  emptyWrap,
  alertError,
} from "../ui";

export const dynamic = "force-dynamic";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl2 = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const dia = (s: string | null) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : "—");

const SIT_BADGE: Record<Situacao, string> = {
  "SEM 1º CONTATO": badgeErr,
  "REAGENDAR AGORA": badgeErr,
  "CALL PASSOU — ATUALIZAR": badgeErr,
  ATRASADO: badgeErr,
  HOJE: badgeWarn,
  "SEM PRÓX. PASSO": badgeWarn,
  "FALTA DATA DA VENDA": badgeWarn,
  "Em dia": badgeOk,
  Encerrado: badgeNeutral,
};

const ETAPA_BADGE: Record<Etapa, string> = {
  "Novo Lead": badgeNeutral,
  "Em qualificação": badgeAccent,
  Agendado: badgeAccent,
  "No-show": badgeWarn,
  "Call realizada": badgeWarn,
  "Follow-up": badgeWarn,
  Venda: badgeOk,
  Perdido: badgeErr,
};

const CONFIG_CAMPOS: { chave: keyof CrmConfig; rotulo: string; dica?: string }[] = [
  { chave: "metaFaturamento", rotulo: "Meta de faturamento do mês (R$)" },
  { chave: "metaVendas", rotulo: "Meta de vendas do mês" },
  { chave: "metaCaixa", rotulo: "Meta de caixa coletado (R$)" },
  { chave: "metaCallsRealizadas", rotulo: "Meta de calls realizadas no mês" },
  { chave: "metaCallsAgendadas", rotulo: "Meta de calls agendadas no mês" },
  { chave: "metaAgendaSemana", rotulo: "Meta de agenda por semana (calls)" },
  { chave: "leadsMinSemana", rotulo: "Leads novos mínimos por semana" },
  { chave: "custoMaxCall", rotulo: "Custo máx. por call agendada (R$)" },
  { chave: "qualifMin", rotulo: "Qualificação mínima", dica: "Entre 0 e 1 (0,6 = 60%)" },
  { chave: "aumentoVerba", rotulo: "Aumento de verba quando liberado", dica: "Entre 0 e 1 (0,2 = 20%)" },
  { chave: "icpMinimo", rotulo: "ICP · faturamento mínimo viável (R$)" },
  { chave: "icpIdeal", rotulo: "ICP · faturamento ideal (R$)" },
  { chave: "icpSonho", rotulo: "ICP · faturamento dos sonhos (R$)" },
];

function Kpi({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <div className={`p-4 ${card}`}>
      <p className={eyebrow}>{titulo}</p>
      <p className="mt-1.5 text-xl font-bold sm:text-2xl">{valor}</p>
      {sub && <p className={`mt-0.5 text-xs ${muted}`}>{sub}</p>}
    </div>
  );
}

function Campo({
  nome,
  rotulo,
  tipo = "text",
  valor,
  step,
}: {
  nome: string;
  rotulo: string;
  tipo?: string;
  valor?: string | number | null;
  step?: string;
}) {
  return (
    <div>
      <label className={label} htmlFor={nome}>
        {rotulo}
      </label>
      <input
        id={nome}
        name={nome}
        type={tipo}
        step={step}
        defaultValue={valor ?? ""}
        className={input}
      />
    </div>
  );
}

function Select({
  nome,
  rotulo,
  opcoes,
  valor,
  vazio,
}: {
  nome: string;
  rotulo: string;
  opcoes: readonly string[];
  valor?: string | null;
  vazio?: string;
}) {
  return (
    <div>
      <label className={label} htmlFor={nome}>
        {rotulo}
      </label>
      <select id={nome} name={nome} defaultValue={valor ?? ""} className={input}>
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

// Formulário completo de um lead (novo ou edição). Mesmos campos da planilha.
function LeadForm({ lead, hoje }: { lead?: CrmLead; hoje: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {lead && <input type="hidden" name="id" value={lead.id} />}
      <Campo nome="nome" rotulo="Lead" valor={lead?.nome} />
      <Select nome="etapa" rotulo="Etapa" opcoes={ETAPAS} valor={lead?.etapa ?? "Novo Lead"} />
      <Select nome="responsavel" rotulo="Responsável" opcoes={RESPONSAVEIS} valor={lead?.responsavel ?? "Gabriel"} vazio="—" />
      <Campo nome="proximo_followup" rotulo="Próx. follow-up" tipo="date" valor={lead?.proximo_followup} />
      <Campo nome="ultimo_contato" rotulo="Último contato" tipo="date" valor={lead?.ultimo_contato} />
      <Campo nome="data_entrada" rotulo="Data de entrada" tipo="date" valor={lead?.data_entrada ?? (lead ? null : hoje)} />
      <Campo nome="data_call" rotulo="Data da call" tipo="date" valor={lead?.data_call} />
      <div className="flex items-end pb-2">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" name="call_confirmada" defaultChecked={lead?.call_confirmada} className="h-4 w-4" />
          Call confirmada
        </label>
      </div>
      <Select nome="origem" rotulo="Origem / funil" opcoes={ORIGENS} valor={lead?.origem} vazio="—" />
      <Campo nome="contato" rotulo="WhatsApp / @" valor={lead?.contato} />
      <Campo nome="faturamento_lead" rotulo="Fat. mensal do lead (R$)" tipo="number" step="0.01" valor={lead?.faturamento_lead} />
      <Campo nome="nicho" rotulo="Área / nicho" valor={lead?.nicho} />
      <Campo nome="campanha" rotulo="Campanha" valor={lead?.campanha} />
      <Campo nome="criativo" rotulo="Criativo" valor={lead?.criativo} />
      <Campo nome="data_venda" rotulo="Data da venda" tipo="date" valor={lead?.data_venda} />
      <Campo nome="contrato" rotulo="Contrato (R$)" tipo="number" step="0.01" valor={lead?.contrato} />
      <Campo nome="coletado" rotulo="Coletado (R$)" tipo="number" step="0.01" valor={lead?.coletado} />
      <Select nome="motivo_perda" rotulo="Motivo da perda" opcoes={MOTIVOS} valor={lead?.motivo_perda} vazio="—" />
      <div className="sm:col-span-2 lg:col-span-2">
        <label className={label} htmlFor={`obs-${lead?.id ?? "novo"}`}>
          Observações
        </label>
        <textarea
          id={`obs-${lead?.id ?? "novo"}`}
          name="obs"
          rows={3}
          defaultValue={lead?.obs ?? ""}
          className={input}
        />
      </div>
    </div>
  );
}

function LinhaLead({ lead, sit, hoje }: { lead: CrmLead; sit: Situacao; hoje: string }) {
  return (
    <details className={`border-t border-zinc-800/70 ${rowHover}`}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
        <span className="min-w-[140px] flex-1 text-sm font-medium text-zinc-100">{lead.nome}</span>
        <span className={ETAPA_BADGE[lead.etapa]}>{lead.etapa}</span>
        <span className={SIT_BADGE[sit]}>{sit}</span>
        <span className={`text-xs ${muted}`}>
          {lead.responsavel ?? "—"} · call {dia(lead.data_call)} · follow-up {dia(lead.proximo_followup)}
        </span>
      </summary>
      <div className="space-y-4 border-t border-zinc-800/70 bg-zinc-950 px-4 py-4">
        {lead.contato && <p className={`text-xs ${muted}`}>Contato: {lead.contato}</p>}
        <form action={saveCrmLead} className="space-y-4">
          <LeadForm lead={lead} hoje={hoje} />
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={btnPrimary}>
              Salvar
            </button>
          </div>
        </form>
        <form action={removeCrmLead}>
          <input type="hidden" name="id" value={lead.id} />
          <button type="submit" className={btnDanger}>
            Excluir lead
          </button>
        </form>
      </div>
    </details>
  );
}

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ etapa?: string; q?: string }> }) {
  const { etapa: filtroEtapa, q } = await searchParams;
  const hoje = hojeBR();

  let erro: string | null = null;
  let leads: CrmLead[] = [];
  let total = 0;
  let cfg: CrmConfig = CONFIG_PADRAO;
  let investimento = 0;
  try {
    [leads, total, cfg, investimento] = await Promise.all([
      listCrmLeads(),
      countCrmLeads(),
      getCrmConfig(),
      investimentoNoMes(inicioMes(hoje), fimMes(hoje)).catch(() => 0),
    ]);
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  const p = calcularPainel(leads, cfg, investimento, hoje);
  const sitDe = (l: CrmLead) => situacao(l, hoje);

  const termo = (q ?? "").trim().toLowerCase();
  const lista = leads.filter(
    (l) =>
      (!filtroEtapa || l.etapa === filtroEtapa) &&
      (!termo || l.nome.toLowerCase().includes(termo) || (l.contato ?? "").toLowerCase().includes(termo))
  );

  const contagemEtapa = new Map<string, number>();
  for (const l of leads) contagemEtapa.set(l.etapa, (contagemEtapa.get(l.etapa) ?? 0) + 1);

  const f = p.fila;

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={60} />
      <header>
        <h1 className={pageTitle}>CRM</h1>
        <p className={pageSubtitle}>
          Fila do dia, caixa do mês e gate de verba · hoje {dia(hoje)} · {p.diasUteisRestantes} dias úteis até o fim do mês
        </p>
      </header>

      {erro && <div className={alertError}>Não foi possível carregar o CRM: {erro}</div>}

      {!erro && total === 0 && (
        <div className={emptyWrap}>
          <p className="text-sm font-semibold text-zinc-100">CRM vazio</p>
          <p className={`max-w-md text-sm ${muted}`}>
            Envia o arquivo de leads (JSON) que o Claude gerou da tua planilha. Pode enviar de novo sem medo: o mesmo arquivo
            não duplica.
          </p>
          <form action={importarLeads} className="flex w-full max-w-md flex-col gap-3">
            <input type="file" name="arquivo" accept=".json,application/json" required className={input} />
            <button type="submit" className={btnPrimary}>
              Importar leads
            </button>
          </form>
        </div>
      )}

      {/* Diagnóstico e verba */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>Diagnóstico do dia</p>
          <p className="mt-2 text-sm font-medium text-zinc-100">{p.diagnostico}</p>
        </div>
        <div className={`p-5 ${card} ${p.verbaLiberada ? "border-emerald-700" : "border-red-900/70"}`}>
          <p className={eyebrow}>Verba de ads</p>
          <p className="mt-2 text-sm font-medium text-zinc-100">
            {p.verbaLiberada
              ? `LIBERADO — sobe ${Math.round(cfg.aumentoVerba * 100)}% e espera 2–3 dias antes de subir de novo.`
              : `TRAVADO — segura a verba. Gates ok: ${p.gatesOk} de ${p.gates.length}.`}
          </p>
        </div>
      </div>

      {/* 1 · Caixa e meta */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">1 · Caixa e meta do mês</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi
            titulo="Contratado"
            valor={brl(p.caixa.contratado)}
            sub={`${pct(p.caixa.contratado / cfg.metaFaturamento)} de ${brl(cfg.metaFaturamento)} · gap ${brl(Math.max(cfg.metaFaturamento - p.caixa.contratado, 0))}`}
          />
          <Kpi
            titulo="Caixa coletado"
            valor={brl(p.caixa.coletado)}
            sub={`${pct(p.caixa.coletado / cfg.metaCaixa)} de ${brl(cfg.metaCaixa)} · ${pct(p.caixa.pctColetado)} do contratado`}
          />
          <Kpi
            titulo="Vendas"
            valor={`${p.caixa.vendas} / ${cfg.metaVendas}`}
            sub={`${(Math.max(cfg.metaVendas - p.caixa.vendas, 0) / Math.max(p.diasUteisRestantes, 1)).toFixed(1)} por dia útil restante`}
          />
          <Kpi titulo="A receber (parcelas)" valor={brl(p.caixa.aReceber)} sub={`ticket médio ${brl(p.caixa.ticketMedio)}`} />
          <Kpi
            titulo="Calls realizadas"
            valor={`${p.caixa.callsRealizadas} / ${cfg.metaCallsRealizadas}`}
            sub={`${(Math.max(cfg.metaCallsRealizadas - p.caixa.callsRealizadas, 0) / Math.max(p.diasUteisRestantes, 1)).toFixed(1)} por dia útil restante`}
          />
          <Kpi titulo="Calls agendadas no mês" valor={`${p.caixa.callsAgendadas} / ${cfg.metaCallsAgendadas}`} />
          <Kpi titulo="Calls hoje" valor={String(p.agenda.callsHoje)} sub={`amanhã ${p.agenda.callsAmanha}`} />
          <Kpi
            titulo="Agenda próx. 7 dias"
            valor={`${p.agenda.calls7d} / ${cfg.metaAgendaSemana}`}
            sub={`leads novos 7d: ${p.agenda.leadsNovos7d} (mín. ${cfg.leadsMinSemana})`}
          />
        </div>
      </section>

      {/* 2 · Fila de hoje */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">2 · Fila de hoje</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            ["Sem 1º contato", f.semContato, "ligar em até 10 min"],
            ["No-show a reagendar", f.noShow, "ligar em 5 min e remarcar"],
            ["Follow-ups atrasados", f.atrasados, "zera antes de tudo"],
            ["Follow-ups de hoje", f.hoje, "cadência do dia"],
            ["Sem próximo passo", f.semProximoPasso, "defina a data"],
            ["Call passou, sem atualizar", f.callPassou, "marca realizada, no-show ou venda"],
            ["Agendados a confirmar", f.aConfirmar, "próx. 2 dias"],
            ["Qualificados sem call", f.qualificadosSemCall, "convida pra call"],
            ["Vendas sem data", f.vendaSemData, "não entram no caixa"],
          ].map(([t, n, s]) => (
            <div key={String(t)} className={`p-4 ${card} ${Number(n) > 0 && t !== "Follow-ups de hoje" ? "border-amber-700/60" : ""}`}>
              <p className={eyebrow}>{t}</p>
              <p className="mt-1.5 text-2xl font-bold">{n}</p>
              <p className={`mt-0.5 text-xs ${muted}`}>{s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lista de ação */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Lista de ação ({p.acao.length})</h2>
        {p.acao.length === 0 ? (
          <div className={emptyWrap}>
            <p className={`text-sm ${muted}`}>Nada pendente — fila zerada.</p>
          </div>
        ) : (
          <div className={tableWrap}>
            {p.acao.map((a) => (
              <LinhaLead key={a.lead.id} lead={a.lead} sit={a.situacao} hoje={hoje} />
            ))}
          </div>
        )}
      </section>

      {/* 3 · Por responsável */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">3 · Por responsável</h2>
        <div className={tableWrap}>
          <table className="w-full text-sm">
            <thead className={thead}>
              <tr>
                {["Responsável", "Hoje", "Atrasados", "Sem 1º contato", "No-show", "Calls hoje"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={rowDivide}>
              {p.porResponsavel.map((r) => (
                <tr key={r.responsavel} className={rowHover}>
                  <td className="px-4 py-2.5 font-medium">{r.responsavel}</td>
                  <td className="px-4 py-2.5">{r.hoje}</td>
                  <td className="px-4 py-2.5">{r.atrasados}</td>
                  <td className="px-4 py-2.5">{r.semContato}</td>
                  <td className="px-4 py-2.5">{r.noShow}</td>
                  <td className="px-4 py-2.5">{r.callsHoje}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4 · Funil e marketing */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">4 · Funil do mês (leads que entraram no mês)</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Kpi titulo="Leads" valor={String(p.funil.leads)} />
          <Kpi titulo="Qualificados" valor={String(p.funil.qualificados)} sub={pct(p.funil.leads ? p.funil.qualificados / p.funil.leads : null)} />
          <Kpi titulo="Agendados" valor={String(p.funil.agendados)} sub={pct(p.funil.qualificados ? p.funil.agendados / p.funil.qualificados : null)} />
          <Kpi titulo="Calls realizadas" valor={String(p.funil.realizadas)} sub={`show rate ${pct(p.marketing.showRate)}`} />
          <Kpi titulo="Vendas" valor={String(p.funil.vendas)} sub={pct(p.funil.realizadas ? p.funil.vendas / p.funil.realizadas : null)} />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <Kpi titulo="Ads no mês" valor={brl(p.marketing.investimento)} sub="da página Aquisição" />
          <Kpi titulo="CPL" valor={brl2(p.marketing.cpl)} />
          <Kpi titulo="Custo por MQL" valor={brl2(p.marketing.custoMql)} />
          <Kpi titulo="Custo por agendamento" valor={brl2(p.marketing.custoAgendamento)} sub={`teto ${brl(cfg.custoMaxCall)}`} />
          <Kpi titulo="Custo por call" valor={brl2(p.marketing.custoCall)} />
          <Kpi titulo="CAC de mídia" valor={brl2(p.marketing.cacMidia)} />
        </div>
        <p className={hint}>
          O funil só conta leads com “Data de entrada” preenchida. Os leads importados não têm essa data; o que entrar a partir de agora conta.
        </p>
      </section>

      {/* 5 · Gate de verba */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">5 · Gate de verba — só sobe ads com tudo em OK</h2>
        <div className={tableWrap}>
          <table className="w-full text-sm">
            <thead className={thead}>
              <tr>
                <th className="px-4 py-2.5 text-left">Gate</th>
                <th className="px-4 py-2.5 text-left">Atual</th>
                <th className="px-4 py-2.5 text-left">Exigido</th>
                <th className="px-4 py-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className={rowDivide}>
              {p.gates.map((g) => (
                <tr key={g.nome} className={rowHover}>
                  <td className="px-4 py-2.5">{g.nome}</td>
                  <td className="px-4 py-2.5">{g.atual}</td>
                  <td className="px-4 py-2.5">{g.exigido}</td>
                  <td className="px-4 py-2.5">
                    <span className={g.status === "OK" ? badgeOk : g.status === "TRAVADO" ? badgeErr : badgeNeutral}>
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Todos os leads */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Todos os leads ({lista.length})</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/crm" className={filtroEtapa ? btnGhost : badgeAccent}>
            Todos ({leads.length})
          </Link>
          {ETAPAS.map((e) => (
            <Link key={e} href={`/crm?etapa=${encodeURIComponent(e)}`} className={filtroEtapa === e ? badgeAccent : btnGhost}>
              {e} ({contagemEtapa.get(e) ?? 0})
            </Link>
          ))}
        </div>
        <form className="flex gap-2" action="/crm">
          {filtroEtapa && <input type="hidden" name="etapa" value={filtroEtapa} />}
          <input name="q" defaultValue={q ?? ""} placeholder="Buscar por nome ou contato" className={input} />
          <button type="submit" className={btnGhost}>
            Buscar
          </button>
        </form>
        <div className={tableWrap}>
          {lista.length === 0 ? (
            <p className={`px-4 py-6 text-sm ${muted}`}>Nenhum lead nesse filtro.</p>
          ) : (
            lista.slice(0, 250).map((l) => <LinhaLead key={l.id} lead={l} sit={sitDe(l)} hoje={hoje} />)
          )}
        </div>
      </section>

      {/* Novo lead */}
      <section className={`p-5 ${card}`}>
        <h2 className="mb-3 text-sm font-semibold">Novo lead</h2>
        <form action={addCrmLead} className="space-y-4">
          <LeadForm hoje={hoje} />
          <button type="submit" className={btnPrimary}>
            Adicionar lead
          </button>
        </form>
      </section>

      {/* Config */}
      <details className={`p-5 ${card}`}>
        <summary className="cursor-pointer text-sm font-semibold">Metas e limites do painel</summary>
        <form action={saveCrmConfig} className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="comercialAlinhado" defaultChecked={cfg.comercialAlinhado} className="h-4 w-4" />
            Comercial alinhado (libera o gate 1 da verba)
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONFIG_CAMPOS.map((c) => (
              <div key={c.chave}>
                <Campo nome={c.chave} rotulo={c.rotulo} tipo="number" step="any" valor={cfg[c.chave] as number} />
                {c.dica && <p className={hint}>{c.dica}</p>}
              </div>
            ))}
          </div>
          <button type="submit" className={btnPrimary}>
            Salvar metas
          </button>
        </form>
      </details>
    </div>
  );
}

