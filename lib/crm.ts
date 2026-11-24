import "server-only";
import { sql } from "@/lib/db";
import { CONFIG_PADRAO, ETAPAS, type CrmConfig, type CrmLead, type Etapa } from "@/lib/crm-calc";

// Tabelas do CRM (crm_leads, crm_config). Mora no banco NOVO do projeto
// (DATABASE_URL), junto com Funil/Aquisição — nunca no banco do DirectPro.

let schemaReady: Promise<void> | null = null;

export function ensureCrmSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const s = sql();
      await s.query(`
        create table if not exists crm_leads (
          id uuid primary key default gen_random_uuid(),
          nome text not null,
          etapa text not null default 'Novo Lead' check (etapa in
            ('Novo Lead','Em qualificação','Agendado','No-show','Call realizada','Follow-up','Venda','Perdido')),
          responsavel text,
          proximo_followup date,
          origem text,
          contato text,
          faturamento_lead numeric(12,2),
          nicho text,
          campanha text,
          criativo text,
          data_entrada date,
          ultimo_contato date,
          data_call date,
          call_confirmada boolean not null default false,
          data_venda date,
          contrato numeric(12,2),
          coletado numeric(12,2),
          motivo_perda text,
          obs text,
          import_key text unique,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `);
      await s.query(`create index if not exists crm_leads_etapa_idx on crm_leads (etapa)`);
      await s.query(`create index if not exists crm_leads_data_call_idx on crm_leads (data_call)`);
      await s.query(`
        create table if not exists crm_config (
          chave text primary key,
          valor text not null,
          updated_at timestamptz not null default now()
        )
      `);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

// Datas saem como texto YYYY-MM-DD (sem fuso) e numeric como number.
const COLS = `
  id, nome, etapa, responsavel, origem, contato, nicho, campanha, criativo,
  to_char(proximo_followup,'YYYY-MM-DD') as proximo_followup,
  to_char(data_entrada,'YYYY-MM-DD') as data_entrada,
  to_char(ultimo_contato,'YYYY-MM-DD') as ultimo_contato,
  to_char(data_call,'YYYY-MM-DD') as data_call,
  to_char(data_venda,'YYYY-MM-DD') as data_venda,
  faturamento_lead::float8 as faturamento_lead,
  contrato::float8 as contrato,
  coletado::float8 as coletado,
  call_confirmada, motivo_perda, obs
`;

export async function listCrmLeads(): Promise<CrmLead[]> {
  await ensureCrmSchema();
  return (await sql().query(
    `select ${COLS} from crm_leads order by data_call desc nulls last, created_at desc`
  )) as CrmLead[];
}

export async function countCrmLeads(): Promise<number> {
  await ensureCrmSchema();
  const rows = (await sql().query(`select count(*)::int as n from crm_leads`)) as { n: number }[];
  return rows[0]?.n ?? 0;
}

export type LeadInput = {
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

export async function createCrmLead(l: LeadInput): Promise<void> {
  await ensureCrmSchema();
  await sql()`
    insert into crm_leads (
      nome, etapa, responsavel, proximo_followup, origem, contato, faturamento_lead, nicho,
      campanha, criativo, data_entrada, ultimo_contato, data_call, call_confirmada,
      data_venda, contrato, coletado, motivo_perda, obs
    ) values (
      ${l.nome}, ${l.etapa}, ${l.responsavel}, ${l.proximo_followup}, ${l.origem}, ${l.contato},
      ${l.faturamento_lead}, ${l.nicho}, ${l.campanha}, ${l.criativo}, ${l.data_entrada},
      ${l.ultimo_contato}, ${l.data_call}, ${l.call_confirmada}, ${l.data_venda}, ${l.contrato},
      ${l.coletado}, ${l.motivo_perda}, ${l.obs}
    )
  `;
}

export async function updateCrmLead(id: string, l: LeadInput): Promise<void> {
  await ensureCrmSchema();
  await sql()`
    update crm_leads set
      nome = ${l.nome}, etapa = ${l.etapa}, responsavel = ${l.responsavel},
      proximo_followup = ${l.proximo_followup}, origem = ${l.origem}, contato = ${l.contato},
      faturamento_lead = ${l.faturamento_lead}, nicho = ${l.nicho}, campanha = ${l.campanha},
      criativo = ${l.criativo}, data_entrada = ${l.data_entrada}, ultimo_contato = ${l.ultimo_contato},
      data_call = ${l.data_call}, call_confirmada = ${l.call_confirmada}, data_venda = ${l.data_venda},
      contrato = ${l.contrato}, coletado = ${l.coletado}, motivo_perda = ${l.motivo_perda},
      obs = ${l.obs}, updated_at = now()
    where id = ${id}
  `;
}

export async function deleteCrmLead(id: string): Promise<void> {
  await ensureCrmSchema();
  await sql()`delete from crm_leads where id = ${id}`;
}

// Importação por arquivo JSON (lista de leads). Os dados NUNCA ficam no
// código/repositório: o arquivo é enviado pela própria tela do CRM. Uma única
// query (jsonb) e idempotente: import_key é único, então reenviar o mesmo
// arquivo não duplica nada. Retorna quantos entraram e quantos foram ignorados.
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const dt = (v: unknown): string | null => (typeof v === "string" && DATA_ISO.test(v) ? v : null);
const nm = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function importarLeadsJson(
  bruto: unknown,
  lote: string
): Promise<{ entraram: number; invalidos: number }> {
  if (!Array.isArray(bruto)) throw new Error("O arquivo precisa ser uma lista JSON de leads.");
  let invalidos = 0;
  const linhas: Record<string, unknown>[] = [];
  bruto.forEach((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const nome = str(o.nome);
    const etapa = str(o.etapa) as Etapa | null;
    if (!nome || !etapa || !ETAPAS.includes(etapa)) {
      invalidos++;
      return;
    }
    linhas.push({
      nome,
      etapa,
      responsavel: str(o.responsavel),
      origem: str(o.origem),
      contato: str(o.contato),
      data_call: dt(o.data_call),
      data_venda: dt(o.data_venda),
      contrato: nm(o.contrato),
      coletado: nm(o.coletado),
      motivo_perda: str(o.motivo_perda),
      obs: str(o.obs),
      import_key: `${lote}:${String(i).padStart(4, "0")}`,
    });
  });
  if (linhas.length === 0) return { entraram: 0, invalidos };
  await ensureCrmSchema();
  const rows = (await sql()`
    insert into crm_leads (nome, etapa, responsavel, origem, contato, data_call, data_venda,
                           contrato, coletado, motivo_perda, obs, import_key)
    select x.nome, x.etapa, x.responsavel, x.origem, x.contato, x.data_call, x.data_venda,
           x.contrato, x.coletado, x.motivo_perda, x.obs, x.import_key
    from jsonb_to_recordset(${JSON.stringify(linhas)}::jsonb) as x(
      nome text, etapa text, responsavel text, origem text, contato text,
      data_call date, data_venda date, contrato numeric, coletado numeric,
      motivo_perda text, obs text, import_key text
    )
    on conflict (import_key) do nothing
    returning id
  `) as { id: string }[];
  return { entraram: rows.length, invalidos };
}

// ---------- configuração (metas e limites do painel) ----------

export async function getCrmConfig(): Promise<CrmConfig> {
  await ensureCrmSchema();
  const rows = (await sql().query(`select chave, valor from crm_config`)) as { chave: string; valor: string }[];
  const cfg: Record<string, number | boolean> = { ...CONFIG_PADRAO };
  for (const r of rows) {
    if (!(r.chave in CONFIG_PADRAO)) continue;
    if (typeof CONFIG_PADRAO[r.chave as keyof CrmConfig] === "boolean") cfg[r.chave] = r.valor === "true";
    else if (Number.isFinite(Number(r.valor))) cfg[r.chave] = Number(r.valor);
  }
  return cfg as unknown as CrmConfig;
}

export async function setCrmConfig(chave: keyof CrmConfig, valor: string): Promise<void> {
  await ensureCrmSchema();
  await sql()`
    insert into crm_config (chave, valor) values (${chave}, ${valor})
    on conflict (chave) do update set valor = excluded.valor, updated_at = now()
  `;
}

// Investimento em ads do mês (tabela ad_spend da página Aquisição).
export async function investimentoNoMes(inicio: string, fim: string): Promise<number> {
  const rows = (await sql()`
    select coalesce(sum(valor), 0)::float8 as total from ad_spend where data between ${inicio} and ${fim}
  `) as { total: number }[];
  return rows[0]?.total ?? 0;
}
