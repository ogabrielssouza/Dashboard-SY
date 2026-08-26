import Link from "next/link";
import { listAdSpend, resumoOperacao, type AdSpend } from "@/lib/db";
import { addSpend, removeSpend } from "./actions";
import AutoRefresh from "../auto-refresh";
import { InvestidoFaturamentoChart } from "../charts";
import {
  card,
  pageTitle,
  pageSubtitle,
  eyebrow,
  muted,
  label,
  input,
  btnPrimary,
  tableWrap,
  thead,
  rowDivide,
  rowHover,
  emptyWrap,
  alertError,
  badge,
} from "../ui";

export const dynamic = "force-dynamic";

const PERIODOS = [
  { dias: 7, label: "7 dias" },
  { dias: 30, label: "30 dias" },
  { dias: 90, label: "90 dias" },
  { dias: null, label: "Tudo" },
] as const;

const fmtMoeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtData = (d: string | Date) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export default async function AquisicaoPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const sp = await searchParams;
  const diasParam = sp.dias === "all" ? null : sp.dias ? Number(sp.dias) : 30;
  const dias = diasParam !== null && Number.isFinite(diasParam) ? diasParam : null;

  let erro: string | null = null;
  let resumo: Awaited<ReturnType<typeof resumoOperacao>> = {
    investido: 0,
    faturamento: 0,
    lucro: 0,
    totalLeads: 0,
    totalVendas: 0,
    custoPorLead: null,
    cac: null,
    roas: null,
    serie: [],
  };
  let lancamentos: AdSpend[] = [];

  try {
    [resumo, lancamentos] = await Promise.all([resumoOperacao(dias), listAdSpend()]);
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  const desde = dias === null ? null : new Date(Date.now() - dias * 86_400_000);
  const lancamentosPeriodo = lancamentos.filter((s) => !desde || new Date(s.data) >= desde);

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={30} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageTitle}>Aquisição</h1>
          <p className={pageSubtitle}>Investido vs. faturamento, CAC e custo por lead.</p>
        </div>
        <nav className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
          {PERIODOS.map((p) => {
            const valor = p.dias === null ? "all" : String(p.dias);
            const ativo = (dias === null && p.dias === null) || dias === p.dias;
            return (
              <Link
                key={valor}
                href={`/aquisicao?dias=${valor}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  ativo ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {erro && <div className={alertError}>Não foi possível carregar os dados: {erro}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>Investido</p>
          <p className="mt-1.5 text-2xl font-bold text-red-400">{fmtMoeda(resumo.investido)}</p>
        </div>
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>Faturamento</p>
          <p className="mt-1.5 text-2xl font-bold text-emerald-400">{fmtMoeda(resumo.faturamento)}</p>
        </div>
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>Lucro</p>
          <p className={`mt-1.5 text-2xl font-bold ${resumo.lucro >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {fmtMoeda(resumo.lucro)}
          </p>
        </div>
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>ROAS</p>
          <p className="mt-1.5 text-2xl font-bold">{resumo.roas !== null ? `${resumo.roas.toFixed(1)}x` : "—"}</p>
        </div>
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>Custo por lead</p>
          <p className="mt-1.5 text-2xl font-bold">
            {resumo.custoPorLead !== null ? fmtMoeda(resumo.custoPorLead) : "—"}
          </p>
          <p className={`mt-0.5 text-xs ${muted}`}>{resumo.totalLeads} leads no período</p>
        </div>
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>CAC</p>
          <p className="mt-1.5 text-2xl font-bold">{resumo.cac !== null ? fmtMoeda(resumo.cac) : "—"}</p>
          <p className={`mt-0.5 text-xs ${muted}`}>{resumo.totalVendas} vendas no período</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className={`p-5 ${card}`}>
        <h2 className="mb-3 text-sm font-semibold">Investido vs. faturamento</h2>
        {resumo.serie.length ? (
          <InvestidoFaturamentoChart data={resumo.serie} />
        ) : (
          <p className={`py-10 text-center text-sm ${muted}`}>Sem dados no período selecionado.</p>
        )}
      </div>

      {/* Novo investimento */}
      <div className={`p-5 ${card}`}>
        <h2 className="mb-3 text-sm font-semibold">Novo investimento</h2>
        <form action={addSpend} className="flex flex-wrap items-end gap-3">
          <div className="w-36">
            <label className={label} htmlFor="valor">
              Valor
            </label>
            <input id="valor" name="valor" type="number" min="0" step="1" required className={input} />
          </div>
          <div className="w-40">
            <label className={label} htmlFor="data">
              Data
            </label>
            <input
              id="data"
              name="data"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={input}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <label className={label} htmlFor="descricao">
              Descrição
            </label>
            <input id="descricao" name="descricao" className={input} placeholder="Campanha, canal..." />
          </div>
          <button type="submit" className={btnPrimary}>
            Adicionar
          </button>
        </form>
      </div>

      {/* Lançamentos */}
      <div className={tableWrap}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
          <h2 className="text-sm font-semibold">Investimentos lançados</h2>
        </div>
        {lancamentosPeriodo.length ? (
          <table className="w-full text-sm">
            <thead className={thead}>
              <tr>
                <th className="px-5 py-2 text-left font-semibold">Data</th>
                <th className="px-5 py-2 text-left font-semibold">Descrição</th>
                <th className="px-5 py-2 text-right font-semibold">Valor</th>
                <th className="px-5 py-2 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className={rowDivide}>
              {lancamentosPeriodo.map((s) => (
                <tr key={s.id} className={rowHover}>
                  <td className={`px-5 py-2.5 ${muted}`}>{fmtData(s.data)}</td>
                  <td className="px-5 py-2.5 font-medium">{s.descricao ?? "—"}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{fmtMoeda(Number(s.valor))}</td>
                  <td className="px-5 py-2.5 text-right">
                    <form action={removeSpend} className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition-colors hover:text-red-400"
                        aria-label="Excluir"
                        title="Excluir"
                      >
                        ✕
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={emptyWrap}>
            <span className={badge}>vazio</span>
            <p className={muted}>Nenhum investimento lançado neste período.</p>
          </div>
        )}
      </div>
    </div>
  );
}
