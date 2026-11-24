"use server";
import { revalidatePath } from "next/cache";
import {
  createCrmLead,
  updateCrmLead,
  deleteCrmLead,
  importarLeadsJson,
  setCrmConfig,
  type LeadInput,
} from "@/lib/crm";
import { ETAPAS, CONFIG_PADRAO, type CrmConfig, type Etapa } from "@/lib/crm-calc";

const txt = (f: FormData, k: string): string | null => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

const data = (f: FormData, k: string): string | null => {
  const v = txt(f, k);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

const num = (f: FormData, k: string): number | null => {
  const v = txt(f, k);
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function parseLead(f: FormData): LeadInput | null {
  const nome = txt(f, "nome");
  const etapa = txt(f, "etapa") as Etapa | null;
  if (!nome || !etapa || !ETAPAS.includes(etapa)) return null;
  return {
    nome,
    etapa,
    responsavel: txt(f, "responsavel"),
    proximo_followup: data(f, "proximo_followup"),
    origem: txt(f, "origem"),
    contato: txt(f, "contato"),
    faturamento_lead: num(f, "faturamento_lead"),
    nicho: txt(f, "nicho"),
    campanha: txt(f, "campanha"),
    criativo: txt(f, "criativo"),
    data_entrada: data(f, "data_entrada"),
    ultimo_contato: data(f, "ultimo_contato"),
    data_call: data(f, "data_call"),
    call_confirmada: f.get("call_confirmada") === "on",
    data_venda: data(f, "data_venda"),
    contrato: num(f, "contrato"),
    coletado: num(f, "coletado"),
    motivo_perda: txt(f, "motivo_perda"),
    obs: txt(f, "obs"),
  };
}

export async function addCrmLead(formData: FormData): Promise<void> {
  const l = parseLead(formData);
  if (!l) return;
  await createCrmLead(l);
  revalidatePath("/crm");
}

export async function saveCrmLead(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const l = parseLead(formData);
  if (!id || !l) return;
  await updateCrmLead(id, l);
  revalidatePath("/crm");
}

export async function removeCrmLead(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteCrmLead(id);
  revalidatePath("/crm");
}

export async function importarLeads(formData: FormData): Promise<void> {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0 || arquivo.size > 2_000_000) return;
  let dados: unknown;
  try {
    dados = JSON.parse(await arquivo.text());
  } catch {
    return;
  }
  // O lote vem do nome do arquivo: reenviar o mesmo arquivo não duplica.
  const lote = `arq-${arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60)}`;
  await importarLeadsJson(dados, lote);
  revalidatePath("/crm");
}

export async function saveCrmConfig(formData: FormData): Promise<void> {
  for (const chave of Object.keys(CONFIG_PADRAO) as (keyof CrmConfig)[]) {
    if (!formData.has(chave) && typeof CONFIG_PADRAO[chave] !== "boolean") continue;
    if (typeof CONFIG_PADRAO[chave] === "boolean") {
      await setCrmConfig(chave, formData.get(chave) === "on" ? "true" : "false");
    } else {
      const n = Number(String(formData.get(chave)).replace(",", "."));
      if (Number.isFinite(n)) await setCrmConfig(chave, String(n));
    }
  }
  revalidatePath("/crm");
}
