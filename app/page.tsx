import Link from "next/link";
import { activacoesPorFluxo, contatosPorCanal, resumoContatos } from "@/lib/directpro-db";
import { resumoOperacao } from "@/lib/db";
import AutoRefresh from "./auto-refresh";
import { InvestidoFaturamentoChart, SimpleBarChart } from "./charts";
import {
  card,
  pageTitle,
  pageSubtitle,
  sectionTitle,
  muted,
  eyebrow,
  badgeAccent,
  badgeOk,
  alertError,
  emptyWrap,
} from "./ui";

export const dynamic = "force-dynamic";

const CANAL_LABEL: Record<string, string> = {
  "canal:comentario": "Comentário",
  "canal:dm": "DM",
  "canal:story": "Story",
};

const fmtMoeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

async function ResultadoBlock() {
  let erro: string | null = null;
  let resumo: Awaited<ReturnType<typeof resumoOperacao>> | null = null;
  try {
    resumo = await resumoOperacao(30);
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className={sectionTitle}>Resultado da operação</h2>
        <span className={`ml-auto text-xs ${muted}`}>últimos 30 dias</span>
        <Link href="/aquisicao" className="text-xs font-medium text-emerald-400 hover:underline">
          ver Aquisição →
        </Link>
      </div>

      {erro || !resumo ? (
        <div className={alertError}>Não foi possível carregar os dados: {erro}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
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
              <p
                className={`mt-1.5 text-2xl font-bold ${resumo.lucro >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {fmtMoeda(resumo.lucro)}
              </p>
            </div>
            <div className={`p-5 ${card}`}>
              <p className={eyebrow}>CAC</p>
              <p className="mt-1.5 text-2xl font-bold">{resumo.cac !== null ? fmtMoeda(resumo.cac) : "—"}</p>
            </div>
            <div className={`p-5 ${card} col-span-2 lg:col-span-1`}>
              <p className={eyebrow}>Custo por lead</p>
              <p className="mt-1.5 text-2xl font-bold">
                {resumo.custoPorLead !== null ? fmtMoeda(resumo.custoPorLead) : "—"}
              </p>
            </div>
          </div>

          <div className={`p-5 ${card}`}>
            {resumo.serie.length ? (
              <InvestidoFaturamentoChart data={resumo.serie} />
            ) : (
              <p className={`py-10 text-center text-sm ${muted}`}>Sem lançamentos nos últimos 30 dias.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

async function DirectProBlock() {
  let erro: string | null = null;
  let fluxos: Awaited<ReturnType<typeof activacoesPorFluxo>> = [];
  let canais: Awaited<ReturnType<typeof contatosPorCanal>> = {
    "canal:comentario": 0,
    "canal:dm": 0,
    "canal:story": 0,
  };
  let contatos: Awaited<ReturnType<typeof resumoContatos>> = { total: 0, novos7dias: 0 };

  try {
    [fluxos, canais, contatos] = await Promise.all([
      activacoesPorFluxo(),
      contatosPorCanal(),
      resumoContatos(),
    ]);
  } catch (e) {
    erro = e instanceof Error ? e.message : String(e);
  }

  if (erro) {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={badgeAccent}>DirectPro</span>
          <h2 className={sectionTitle}>Automação do Instagram</h2>
        </div>
        <div className={alertError}>Não foi possível ler o banco do DirectPro: {erro}</div>
      </section>
    );
  }

  const canaisChart = (Object.keys(CANAL_LABEL) as (keyof typeof CANAL_LABEL)[]).map((tag) => ({
    label: CANAL_LABEL[tag],
    value: canais[tag as keyof typeof canais],
  }));
  const fluxosChart = fluxos.map((f) => ({ label: f.nome, value: f.total }));

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={badgeAccent}>DirectPro</span>
        <h2 className={sectionTitle}>Automação do Instagram</h2>
        <span className={`ml-auto text-xs ${muted}`}>dado automático, somente leitura</span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>Total de contatos</p>
          <p className="mt-1.5 text-2xl font-bold">{contatos.total.toLocaleString("pt-BR")}</p>
        </div>
        <div className={`p-5 ${card}`}>
          <p className={eyebrow}>Novos em 7 dias</p>
          <p className="mt-1.5 text-2xl font-bold">+{contatos.novos7dias.toLocaleString("pt-BR")}</p>
        </div>
        <div className={`p-5 ${card} col-span-2 lg:col-span-1`}>
          <p className={eyebrow}>Ativações totais</p>
          <p className="mt-1.5 text-2xl font-bold">
            {fluxos.reduce((s, f) => s + f.total, 0).toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`p-5 ${card}`}>
          <h3 className="mb-3 text-sm font-semibold">Ativações por fluxo</h3>
          {fluxosChart.length ? (
            <SimpleBarChart data={fluxosChart} />
          ) : (
            <p className={`py-10 text-center text-sm ${muted}`}>Nenhum fluxo encontrado.</p>
          )}
        </div>

        <div className={`p-5 ${card}`}>
          <h3 className="mb-3 text-sm font-semibold">Contatos por canal</h3>
          <SimpleBarChart data={canaisChart} />
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="space-y-10">
      <AutoRefresh seconds={30} />
      <header>
        <h1 className={pageTitle}>Painel</h1>
        <p className={pageSubtitle}>Visão geral da SY Acquisition.</p>
      </header>

      <ResultadoBlock />
      <DirectProBlock />

      <section className={`${emptyWrap} text-sm`}>
        <span className={badgeOk}>em breve</span>
        <p className={muted}>Caixa e Time entram aqui, uma seção por vez.</p>
      </section>
    </div>
  );
}
