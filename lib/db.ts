import "server-only";
import { neon } from "@neondatabase/serverless";

// Banco Neon PRÓPRIO deste projeto — para todo dado de input manual (Caixa,
// Funil de Vendas, Aquisição, Time...). Nunca usado para dado do DirectPro;
// isso vive em lib/directpro-db.ts (que é somente leitura).
type Sql = ReturnType<typeof neon>;

let _sql: Sql | null = null;

export function sql(): Sql {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL não configurada");
    }
    _sql = neon(url);
  }
  return _sql;
}

// ---------- Schema ----------

let schemaReady: Promise<void> | null = null;

// Cria as tabelas na primeira requisição, se ainda não existirem. Só cresce:
// cada seção nova (Caixa, Aquisição, Time...) acrescenta seu próprio
// `create table if not exists` aqui.
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const s = sql();
      await s.query(`
        create table if not exists sales_leads (
          id uuid primary key default gen_random_uuid(),
          nome text not null,
          vendedor text,
          valor numeric(12,2),
          status text not null default 'ativo' check (status in ('ativo', 'perdido')),
          agendado_em timestamptz,
          compareceu_em timestamptz,
          venda_em timestamptz,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `);
      await s.query(`
        create table if not exists ad_spend (
          id uuid primary key default gen_random_uuid(),
          valor numeric(12,2) not null,
          data date not null default current_date,
          descricao text,
          created_at timestamptz not null default now()
        )
      `);
      await s.query(`
        create table if not exists metas (
          id uuid primary key default gen_random_uuid(),
          tipo text not null check (tipo in ('ano', 'semestre', 'trimestre', 'mes', 'semana')),
          periodo text not null,
          metrica text not null check (metrica in ('faturamento', 'vendas', 'leads')),
          valor numeric(12,2) not null,
          updated_at timestamptz not null default now(),
          unique (tipo, periodo, metrica)
        )
      `);
      await s.query(`
        create table if not exists rotina_tarefas (
          id uuid primary key default gen_random_uuid(),
          texto text not null,
          ordem int not null default 0,
          created_at timestamptz not null default now()
        )
      `);
      await s.query(`
        create table if not exists rotina_registros (
          tarefa_id uuid not null references rotina_tarefas(id) on delete cascade,
          data date not null,
          concluida boolean not null default false,
          primary key (tarefa_id, data)
        )
      `);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

// ---------- Funil de Vendas ----------

export type SalesLead = {
  id: string;
  nome: string;
  vendedor: string | null;
  valor: string | null; // numeric vem como string do driver
  status: "ativo" | "perdido";
  agendado_em: Date | null;
  compareceu_em: Date | null;
  venda_em: Date | null;
  created_at: Date;
  updated_at: Date;
};

export async function listLeads(): Promise<SalesLead[]> {
  await ensureSchema();
  return (await sql()`
    select * from sales_leads order by created_at desc
  `) as SalesLead[];
}

export async function createLead(nome: string, vendedor: string | null): Promise<void> {
  await ensureSchema();
  await sql()`
    insert into sales_leads (nome, vendedor) values (${nome}, ${vendedor})
  `;
}

export async function marcarAgendado(id: string): Promise<void> {
  await ensureSchema();
  await sql()`
    update sales_leads set agendado_em = now(), updated_at = now()
    where id = ${id} and agendado_em is null
  `;
}

export async function marcarCompareceu(id: string): Promise<void> {
  await ensureSchema();
  await sql()`
    update sales_leads set compareceu_em = now(), updated_at = now()
    where id = ${id} and compareceu_em is null
  `;
}

export async function marcarVenda(id: string, valor: number): Promise<void> {
  await ensureSchema();
  await sql()`
    update sales_leads set venda_em = now(), valor = ${valor}, status = 'ativo', updated_at = now()
    where id = ${id}
  `;
}

export async function marcarPerdido(id: string): Promise<void> {
  await ensureSchema();
  await sql()`
    update sales_leads set status = 'perdido', updated_at = now()
    where id = ${id}
  `;
}

export async function reabrirLead(id: string): Promise<void> {
  await ensureSchema();
  await sql()`
    update sales_leads set status = 'ativo', updated_at = now()
    where id = ${id}
  `;
}

export async function excluirLead(id: string): Promise<void> {
  await ensureSchema();
  await sql()`delete from sales_leads where id = ${id}`;
}

// ---------- Aquisição (investimento em tráfego) ----------

export type AdSpend = {
  id: string;
  valor: string; // numeric vem como string do driver
  data: string; // date (YYYY-MM-DD)
  descricao: string | null;
  created_at: Date;
};

export async function listAdSpend(): Promise<AdSpend[]> {
  await ensureSchema();
  return (await sql()`
    select * from ad_spend order by data desc, created_at desc
  `) as AdSpend[];
}

export async function createAdSpend(
  valor: number,
  data: string,
  descricao: string | null
): Promise<void> {
  await ensureSchema();
  await sql()`
    insert into ad_spend (valor, data, descricao) values (${valor}, ${data}, ${descricao})
  `;
}

export async function excluirAdSpend(id: string): Promise<void> {
  await ensureSchema();
  await sql()`delete from ad_spend where id = ${id}`;
}

// ---------- Resumo (investido x faturamento) ----------
//
// Compartilhado entre o Painel (resumo fixo de 30 dias) e a página de
// Aquisição (período escolhido pelo usuário) — a mesma conta não pode virar
// dois números diferentes em duas telas.

export type SerieDia = { label: string; investido: number; faturamento: number };

export type ResumoOperacao = {
  investido: number;
  faturamento: number;
  lucro: number;
  totalLeads: number;
  totalVendas: number;
  custoPorLead: number | null;
  cac: number | null;
  roas: number | null;
  serie: SerieDia[];
};

function chaveAgrupamento(d: Date, porMes: boolean): string {
  const iso = d.toISOString();
  return porMes ? iso.slice(0, 7) : iso.slice(0, 10);
}

export async function resumoOperacao(dias: number | null): Promise<ResumoOperacao> {
  const [spend, leads] = await Promise.all([listAdSpend(), listLeads()]);

  const desde = dias === null ? null : new Date(Date.now() - dias * 86_400_000);
  const spendPeriodo = spend.filter((s) => !desde || new Date(s.data) >= desde);
  const leadsPeriodo = leads.filter((l) => !desde || new Date(l.created_at) >= desde);
  const vendasPeriodo = leads.filter((l) => l.venda_em && (!desde || new Date(l.venda_em) >= desde));

  const investido = spendPeriodo.reduce((s, r) => s + Number(r.valor), 0);
  const faturamento = vendasPeriodo.reduce((s, r) => s + Number(r.valor ?? 0), 0);
  const totalLeads = leadsPeriodo.length;
  const totalVendas = vendasPeriodo.length;

  const porMes = dias === null || dias > 31;
  const serieMap = new Map<string, { investido: number; faturamento: number }>();
  for (const s of spendPeriodo) {
    const chave = chaveAgrupamento(new Date(s.data), porMes);
    const atual = serieMap.get(chave) ?? { investido: 0, faturamento: 0 };
    atual.investido += Number(s.valor);
    serieMap.set(chave, atual);
  }
  for (const v of vendasPeriodo) {
    const chave = chaveAgrupamento(new Date(v.venda_em!), porMes);
    const atual = serieMap.get(chave) ?? { investido: 0, faturamento: 0 };
    atual.faturamento += Number(v.valor ?? 0);
    serieMap.set(chave, atual);
  }
  const serie = Array.from(serieMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, v]) => ({ label: porMes ? chave.slice(2) : chave.slice(5), ...v }));

  return {
    investido,
    faturamento,
    lucro: faturamento - investido,
    totalLeads,
    totalVendas,
    custoPorLead: totalLeads ? investido / totalLeads : null,
    cac: totalVendas ? investido / totalVendas : null,
    roas: investido ? faturamento / investido : null,
    serie,
  };
}

// ---------- Métricas por período (usado pelas Metas) ----------

export type MetricaChave = "faturamento" | "vendas" | "leads";

export type MetricasPeriodo = Record<MetricaChave, number>;

// Soma faturamento/vendas/leads dentro de [inicio, fim). Usa a mesma tabela
// do Funil de Vendas — a meta é medida pelo que já está registrado lá, não
// por um número digitado à parte.
export async function metricasNoPeriodo(inicio: Date, fim: Date): Promise<MetricasPeriodo> {
  const leads = await listLeads();
  let faturamento = 0;
  let vendas = 0;
  let leadsCount = 0;
  for (const l of leads) {
    const criado = new Date(l.created_at);
    if (criado >= inicio && criado < fim) leadsCount++;
    if (l.venda_em) {
      const venda = new Date(l.venda_em);
      if (venda >= inicio && venda < fim) {
        vendas++;
        faturamento += Number(l.valor ?? 0);
      }
    }
  }
  return { faturamento, vendas, leads: leadsCount };
}

// ---------- Metas ----------

export type TipoMeta = "ano" | "semestre" | "trimestre" | "mes" | "semana";

export type Meta = {
  id: string;
  tipo: TipoMeta;
  periodo: string;
  metrica: MetricaChave;
  valor: string; // numeric vem como string do driver
  updated_at: Date;
};

// Mapa (tipo:periodo:metrica) -> valor, pra consulta O(1) na tela.
export async function listMetas(): Promise<Map<string, number>> {
  await ensureSchema();
  const rows = (await sql()`select * from metas`) as Meta[];
  return new Map(rows.map((r) => [`${r.tipo}:${r.periodo}:${r.metrica}`, Number(r.valor)]));
}

export async function upsertMeta(
  tipo: TipoMeta,
  periodo: string,
  metrica: MetricaChave,
  valor: number
): Promise<void> {
  await ensureSchema();
  await sql()`
    insert into metas (tipo, periodo, metrica, valor)
    values (${tipo}, ${periodo}, ${metrica}, ${valor})
    on conflict (tipo, periodo, metrica) do update set valor = excluded.valor, updated_at = now()
  `;
}

// ---------- Rotina diária ----------

export type RotinaTarefa = {
  id: string;
  texto: string;
  ordem: number;
  created_at: Date;
};

export async function listTarefasHoje(): Promise<(RotinaTarefa & { concluida: boolean })[]> {
  await ensureSchema();
  return (await sql()`
    select t.*, coalesce(r.concluida, false) as concluida
    from rotina_tarefas t
    left join rotina_registros r on r.tarefa_id = t.id and r.data = current_date
    order by t.ordem, t.created_at
  `) as (RotinaTarefa & { concluida: boolean })[];
}

export async function addTarefa(texto: string): Promise<void> {
  await ensureSchema();
  const rows = (await sql()`select coalesce(max(ordem), 0) + 1 as prox from rotina_tarefas`) as {
    prox: number;
  }[];
  await sql()`insert into rotina_tarefas (texto, ordem) values (${texto}, ${rows[0].prox})`;
}

export async function excluirTarefa(id: string): Promise<void> {
  await ensureSchema();
  await sql()`delete from rotina_tarefas where id = ${id}`;
}

export async function marcarTarefa(tarefaId: string, concluida: boolean): Promise<void> {
  await ensureSchema();
  await sql()`
    insert into rotina_registros (tarefa_id, data, concluida)
    values (${tarefaId}, current_date, ${concluida})
    on conflict (tarefa_id, data) do update set concluida = excluded.concluida
  `;
}
