import { listLeads, type SalesLead } from "@/lib/db";
import { addLead, agendar, compareceu, fecharVenda, perder, reabrir, excluir } from "./actions";
import AutoRefresh from "../auto-refresh";
import { SimpleBarChart } from "../charts";
import {
  card,
  pageTitle,
  pageSubtitle,
  eyebrow,
  muted,
  label,
  input,
  btnPrimary,
  btnGhost,
  btnDanger,
  badge,
  badgeNeutral,
  badgeAccent,
  badgeWarn,
  badgeOk,
  badgeErr,
  tableWrap,
  thead,
  rowDivide,
  rowHover,
  emptyWrap,
  alertError,
} from "../ui";

export const dynamic = "force-dynamic";

const fmtMoeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtData = (d: Date) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const fmtPct = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : "—");

type Etapa = "lead" | "agendado" | "compareceu" | "venda" | "perdido";

function etapaAtual(l: SalesLead): Etapa {
  if (l.status === "perdido") return "perdido";
  if (l.venda_em) return "venda";
  if (l.compareceu_em) return "compareceu";
  if (l.agendado_em) return "agendado";
  return "lead";
}

const ETAPA_BADGE: Record<Etapa, string> = {
  lead: badgeNeutral,
  agendado: badgeAccent,
  compareceu: badgeWarn,
  venda: badgeOk,
  perdido: badgeErr,
};

const ETAPA_LABEL: Record<Etapa, string> = {
  lead: "Lead",
  agendado: "Agendado",
  compareceu: "Compareceu",
  venda: "Venda",
  perdido: "Perdido",
};

export default async function FunilPage() {
  let erro: string | null = null;
  let leads: SalesLead[] = [];
  try {
    leads = await listLeads();
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  const total = leads.length;
  const agendados = leads.filter((l) => l.agendado_em).length;
  const compareceram = leads.filter((l) => l.compareceu_em).length;
  const vendas = leads.filter((l) => l.venda_em).length;
  const valorTotal = leads.reduce((s, l) => s + (l.venda_em ? Number(l.valor ?? 0) : 0), 0);

  const funilChart = [
    { label: "Leads", value: total },
    { label: "Agendados", value: agendados },
    { label: "Compareceram", value: compareceram },
    { label: "Vendas", value: vendas },
  ];

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={30} />
      <header>
        <h1 className={pageTitle}>Funil de Vendas</h1>
        <p className={pageSubtitle}>Leads, chamadas e fechamentos — um registro por pessoa.</p>
      </header>

      {erro && <div className={alertError}>Não foi possível carregar o funil: {erro}</div>}

      {/* Resumo do funil */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>Leads</p>
          <p className="mt-1.5 text-2xl font-bold">{total}</p>
        </div>
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>Agendados</p>
          <p className="mt-1.5 text-2xl font-bold">{agendados}</p>
          <p className={`mt-0.5 text-xs ${muted}`}>{fmtPct(agendados, total)} dos leads</p>
        </div>
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>Compareceram</p>
          <p className="mt-1.5 text-2xl font-bold">{compareceram}</p>
          <p className={`mt-0.5 text-xs ${muted}`}>{fmtPct(compareceram, agendados)} dos agendados</p>
        </div>
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>Vendas</p>
          <p className="mt-1.5 text-2xl font-bold">{vendas}</p>
          <p className={`mt-0.5 text-xs ${muted}`}>{fmtPct(vendas, compareceram)} de quem compareceu</p>
        </div>
        <div className={`p-5 ${card} col-span-2 lg:col-span-1`}>
          <p className={eyebrow}>Faturado no funil</p>
          <p className="mt-1.5 text-2xl font-bold">{fmtMoeda(valorTotal)}</p>
        </div>
      </div>

      {/* Funil visual */}
      <div className={`p-5 ${card}`}>
        <h2 className="mb-3 text-sm font-semibold">Funil</h2>
        <SimpleBarChart data={funilChart} />
      </div>

      {/* Novo lead */}
      <div className={`p-5 ${card}`}>
        <h2 className="mb-3 text-sm font-semibold">Novo lead</h2>
        <form action={addLead} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className={label} htmlFor="nome">
              Nome
            </label>
            <input id="nome" name="nome" required className={input} placeholder="Nome do lead" />
          </div>
          <div className="min-w-[160px] flex-1">
            <label className={label} htmlFor="vendedor">
              Vendedor
            </label>
            <input id="vendedor" name="vendedor" className={input} placeholder="Quem está atendendo" />
          </div>
          <button type="submit" className={btnPrimary}>
            Adicionar
          </button>
        </form>
      </div>

      {/* Lista de leads */}
      <div className={tableWrap}>
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">Leads</h2>
        </div>
        {leads.length ? (
          <table className="w-full text-sm">
            <thead className={thead}>
              <tr>
                <th className="px-5 py-2 text-left font-semibold">Nome</th>
                <th className="px-5 py-2 text-left font-semibold">Vendedor</th>
                <th className="px-5 py-2 text-left font-semibold">Etapa</th>
                <th className="px-5 py-2 text-right font-semibold">Valor</th>
                <th className="px-5 py-2 text-left font-semibold">Entrou</th>
                <th className="px-5 py-2 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className={rowDivide}>
              {leads.map((l) => {
                const etapa = etapaAtual(l);
                return (
                  <tr key={l.id} className={rowHover}>
                    <td className="px-5 py-2.5 font-medium">{l.nome}</td>
                    <td className={`px-5 py-2.5 ${muted}`}>{l.vendedor ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      <span className={ETAPA_BADGE[etapa]}>{ETAPA_LABEL[etapa]}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {l.venda_em ? fmtMoeda(Number(l.valor ?? 0)) : "—"}
                    </td>
                    <td className={`px-5 py-2.5 ${muted}`}>{fmtData(l.created_at)}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {etapa === "lead" && (
                          <form action={agendar}>
                            <input type="hidden" name="id" value={l.id} />
                            <button type="submit" className={btnGhost}>
                              Agendou
                            </button>
                          </form>
                        )}
                        {etapa === "agendado" && (
                          <form action={compareceu}>
                            <input type="hidden" name="id" value={l.id} />
                            <button type="submit" className={btnGhost}>
                              Compareceu
                            </button>
                          </form>
                        )}
                        {etapa === "compareceu" && (
                          <form action={fecharVenda} className="flex items-center gap-1.5">
                            <input type="hidden" name="id" value={l.id} />
                            <input
                              type="number"
                              name="valor"
                              min="0"
                              step="1"
                              required
                              placeholder="Valor"
                              className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-emerald-500"
                            />
                            <button type="submit" className={btnGhost}>
                              Fechar venda
                            </button>
                          </form>
                        )}
                        {(etapa === "lead" || etapa === "agendado" || etapa === "compareceu") && (
                          <form action={perder}>
                            <input type="hidden" name="id" value={l.id} />
                            <button type="submit" className={btnDanger}>
                              Perdido
                            </button>
                          </form>
                        )}
                        {etapa === "perdido" && (
                          <form action={reabrir}>
                            <input type="hidden" name="id" value={l.id} />
                            <button type="submit" className={btnGhost}>
                              Reabrir
                            </button>
                          </form>
                        )}
                        <form action={excluir}>
                          <input type="hidden" name="id" value={l.id} />
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={emptyWrap}>
            <span className={badge}>vazio</span>
            <p className={muted}>Nenhum lead ainda. Adicione o primeiro acima.</p>
          </div>
        )}
      </div>
    </div>
  );
}
