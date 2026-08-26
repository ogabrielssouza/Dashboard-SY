"use server";
import { revalidatePath } from "next/cache";
import {
  upsertMeta,
  addTarefa,
  excluirTarefa,
  marcarTarefa,
  type TipoMeta,
  type MetricaChave,
} from "@/lib/db";

export async function salvarMeta(formData: FormData): Promise<void> {
  const tipo = String(formData.get("tipo")) as TipoMeta;
  const periodo = String(formData.get("periodo"));
  const metrica = String(formData.get("metrica")) as MetricaChave;
  const valor = Number(formData.get("valor"));
  if (!tipo || !periodo || !metrica || !Number.isFinite(valor) || valor < 0) return;
  await upsertMeta(tipo, periodo, metrica, valor);
  revalidatePath("/metas");
  revalidatePath("/");
}

export async function addRotina(formData: FormData): Promise<void> {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;
  await addTarefa(texto);
  revalidatePath("/metas");
}

export async function removerRotina(formData: FormData): Promise<void> {
  await excluirTarefa(String(formData.get("id")));
  revalidatePath("/metas");
}

export async function concluirRotina(formData: FormData): Promise<void> {
  await marcarTarefa(String(formData.get("id")), true);
  revalidatePath("/metas");
}

export async function reabrirRotina(formData: FormData): Promise<void> {
  await marcarTarefa(String(formData.get("id")), false);
  revalidatePath("/metas");
}
