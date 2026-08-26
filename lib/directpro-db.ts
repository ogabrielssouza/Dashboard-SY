import "server-only";
import { neon } from "@neondatabase/serverless";

// Conexão ao banco Neon do DirectPro (produção real de outro sistema).
//
// REGRA DURA: esta conexão é SOMENTE LEITURA. Nenhuma função aqui — nem em
// nenhum lugar que use `sql` deste módulo — deve rodar insert/update/delete/
// ddl. Se um dia precisar escrever algo relacionado ao DirectPro, isso vive
// no banco NOVO deste projeto (lib/db.ts), nunca aqui.
type Sql = ReturnType<typeof neon>;

let _sql: Sql | null = null;

function sql(): Sql {
  if (!_sql) {
    const url = process.env.DIRECTPRO_DATABASE_URL;
    if (!url) {
      throw new Error("DIRECTPRO_DATABASE_URL não configurada");
    }
    _sql = neon(url);
  }
  return _sql;
}

export type ActivacoesPorFluxo = {
  flow_id: string;
  nome: string;
  total: number;
};

// Conta ativações por fluxo a partir do log permanente de ativações
// (flow_activations), somando todas as contas conectadas.
export async function activacoesPorFluxo(): Promise<ActivacoesPorFluxo[]> {
  const rows = (await sql()`
    select f.id as flow_id, f.name as nome, count(fa.id)::int as total
    from flows f
    left join flow_activations fa on fa.flow_id = f.id
    group by f.id, f.name
    order by total desc, nome asc
  `) as ActivacoesPorFluxo[];
  return rows;
}

const CANAIS = ["canal:comentario", "canal:dm", "canal:story"] as const;
export type Canal = (typeof CANAIS)[number];

export type ContatosPorCanal = Record<Canal, number>;

// Conta contatos por tag de canal. Uma pessoa pode ter mais de uma tag de
// canal (ex.: chegou por comentário e depois voltou por DM) — cada tag conta
// para o canal correspondente, então a soma pode passar do total de contatos.
export async function contatosPorCanal(): Promise<ContatosPorCanal> {
  const rows = (await sql()`
    select tag, count(*)::int as total
    from contacts, unnest(tags) as tag
    where tag = any(${CANAIS as unknown as string[]})
    group by tag
  `) as { tag: Canal; total: number }[];

  const porTag = new Map(rows.map((r) => [r.tag, r.total]));
  return {
    "canal:comentario": porTag.get("canal:comentario") ?? 0,
    "canal:dm": porTag.get("canal:dm") ?? 0,
    "canal:story": porTag.get("canal:story") ?? 0,
  };
}

export type ResumoContatos = {
  total: number;
  novos7dias: number;
};

export async function resumoContatos(): Promise<ResumoContatos> {
  const rows = (await sql()`
    select
      count(*)::int as total,
      count(*) filter (where first_contact_at > now() - interval '7 days')::int as novos7dias
    from contacts
  `) as ResumoContatos[];
  return rows[0] ?? { total: 0, novos7dias: 0 };
}
