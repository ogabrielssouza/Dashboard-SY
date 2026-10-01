import {
  listMetas,
  metricasNoPeriodo,
  listTarefasHoje,
  type MetricaChave,
} from "@/lib/db";
import { periodosAtuais, mesesDoTrimestre, semanasNoMes, type Periodo } from "@/lib/periodos";
import { salvarMeta, addRotina, removerRotina, concluirRotina, reabrirRotina } from "./actions";
import {
  card,
  pageTitle,
  pageSubtitle,
  sectionTitle,
  eyebrow,
  muted,
  label,
  input,
  btnPrimary,
  btnGhost,
  emptyWrap,
  badge,
} from "../ui";

export const dynamic = "force-dynamic";

const METRICA_LABEL: Record<MetricaChave, string> = {
  faturamento: "Faturamento",
  vendas: "Vendas",
  leads: "Leads",
};

const METRICAS: MetricaChave[] = ["faturamento", "vendas", "leads"];

const fmt = (metrica: MetricaChave, v: number) =>
  metrica === "faturamento"
    ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
    : Math.round(v).toLocaleString("pt-BR");

function MetaLinha({
  periodo,
  metrica,
  meta,
  atual,
  sugestao,
}: {
  periodo: Periodo;
  metrica: MetricaChave;
  meta: number | undefined;
  atual: number;
  sugestao?: number;
}) {
  const pct = meta ? Math.min(100, Math.round((atual / meta) * 100)) : null;
  const falta = meta ? Math.max(0, meta - atual) : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-zinc-200">{METRICA_LABEL[metrica]}</span>
        <form action={salvarMeta} className="flex items-center gap-1.5">
          <input type="hidden" name="tipo" value={periodo.tipo} />
          <input type="hidden" name="periodo" value={periodo.periodo} />
          <input type="hidden" name="metrica" value={metrica} />
          <input
            type="number"
            name="valor"
            min="0"
            step="1"
            defaultValue={meta ?? sugestao ?? ""}
            placeholder="Meta"
            className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
          />
          <button type="submit" className={btnGhost}>
            Salvar
          </button>
        </form>
      </div>
      {meta ? (
        <>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
          <div className={`flex justify-between text-xs ${muted}`}>
            <span>
              {fmt(metrica, atual)} de {fmt(metrica, meta)} ({pct}%)
            </span>
            <span>falta {fmt(metrica, falta ?? 0)}</span>
          </div>
        </>
      ) : (
        <p className={`text-xs ${muted}`}>
          {fmt(metrica, atual)} até agora — defina uma meta{sugestao ? ` (sugestão: ${fmt(metrica, sugestao)})` : ""}.
        </p>
      )}
    </div>
  );
}

function PeriodoCard({
  titulo,
  periodo,
  metas,
  atual,
  sugestoes,
}: {
  titulo: string;
  periodo: Periodo;
  metas: Map<string, number>;
  atual: Record<MetricaChave, number>;
  sugestoes?: Partial<Record<MetricaChave, number>>;
}) {
  return (
    <div className={`p-5 ${card}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">{titulo}</h3>
        <span className={eyebrow}>{periodo.label}</span>
      </div>
      <div className="space-y-4">
        {METRICAS.map((m) => (
          <MetaLinha
            key={m}
            periodo={periodo}
            metrica={m}
            meta={metas.get(`${periodo.tipo}:${periodo.periodo}:${m}`)}
            atual={atual[m]}
            sugestao={sugestoes?.[m]}
          />
        ))}
      </div>
    </div>
  );
}

export default async function MetasPage() {
  const periodos = periodosAtuais();

  const [metas, atualAno, atualSemestre, atualTrimestre, atualMes, atualSemana, tarefas] =
    await Promise.all([
      listMetas(),
      metricasNoPeriodo(periodos.ano.inicio, periodos.ano.fim),
      metricasNoPeriodo(periodos.semestre.inicio, periodos.semestre.fim),
      metricasNoPeriodo(periodos.trimestre.inicio, periodos.trimestre.fim),
      metricasNoPeriodo(periodos.mes.inicio, periodos.mes.fim),
      metricasNoPeriodo(periodos.semana.inicio, periodos.semana.fim),
      listTarefasHoje(),
    ]);

  // Sugestão de meta semanal = meta do mês / nº de semanas do mês (só um
  // ponto de partida "de número padrão"; o valor salvo pode divergir).
  const nSemanas = semanasNoMes(periodos.mes.periodo);
  const sugestoesSemana: Partial<Record<MetricaChave, number>> = {};
  for (const m of METRICAS) {
    const metaMes = metas.get(`mes:${periodos.mes.periodo}:${m}`);
    if (metaMes) sugestoesSemana[m] = Math.round((metaMes / nSemanas) * 100) / 100;
  }

  // Checagem suave: soma dos 3 meses do trimestre vs. meta do trimestre.
  const mesesQ = mesesDoTrimestre(periodos.trimestre.periodo);
  const somaMeses: Partial<Record<MetricaChave, number>> = {};
  for (const m of METRICAS) {
    somaMeses[m] = mesesQ.reduce((s, p) => s + (metas.get(`mes:${p}:${m}`) ?? 0), 0);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className={pageTitle}>Metas</h1>
        <p className={pageSubtitle}>O que falta pra bater a meta, do ano até o dia.</p>
      </header>

      <PeriodoCard titulo="Ano" periodo={periodos.ano} metas={metas} atual={atualAno} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PeriodoCard titulo="Semestre" periodo={periodos.semestre} metas={metas} atual={atualSemestre} />
        <PeriodoCard titulo="Trimestre" periodo={periodos.trimestre} metas={metas} atual={atualTrimestre} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <PeriodoCard titulo="Mês" periodo={periodos.mes} metas={metas} atual={atualMes} />
          <p className={`px-1 text-xs ${muted}`}>
            Soma dos meses do trimestre — Faturamento: {fmt("faturamento", somaMeses.faturamento ?? 0)} · Vendas:{" "}
            {fmt("vendas", somaMeses.vendas ?? 0)} · Leads: {fmt("leads", somaMeses.leads ?? 0)}
            {" "}(meta do trimestre acima)
          </p>
        </div>
        <PeriodoCard
          titulo="Semana"
          periodo={periodos.semana}
          metas={metas}
          atual={atualSemana}
          sugestoes={sugestoesSemana}
        />
      </div>

      {/* Dia — rotina */}
      <div className={`p-5 ${card}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className={sectionTitle}>Dia — rotina</h3>
          <span className={eyebrow}>
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              timeZone: "America/Sao_Paulo",
            })}
          </span>
        </div>

        <form action={addRotina} className="mb-4 flex items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className={label} htmlFor="texto">
              Nova tarefa da rotina
            </label>
            <input id="texto" name="texto" required className={input} placeholder="Ex: fazer 10 ligações" />
          </div>
          <button type="submit" className={btnPrimary}>
            Adicionar
          </button>
        </form>

        {tarefas.length ? (
          <ul className="space-y-1.5">
            {tarefas.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm"
              >
                <span className={t.concluida ? "text-zinc-500 line-through" : "text-zinc-200"}>{t.texto}</span>
                <div className="flex items-center gap-1.5">
                  {t.concluida ? (
                    <form action={reabrirRotina}>
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className={btnGhost}>
                        Reabrir
                      </button>
                    </form>
                  ) : (
                    <form action={concluirRotina}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-emerald-400"
                      >
                        Concluir
                      </button>
                    </form>
                  )}
                  <form action={removerRotina}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition-colors hover:text-red-400"
                      aria-label="Excluir"
                      title="Excluir"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className={emptyWrap}>
            <span className={badge}>vazio</span>
            <p className={muted}>Nenhuma tarefa de rotina cadastrada ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
