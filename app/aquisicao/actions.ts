"use server";
import { revalidatePath } from "next/cache";
import { createAdSpend, excluirAdSpend } from "@/lib/db";

export async function addSpend(formData: FormData): Promise<void> {
  const valor = Number(formData.get("valor"));
  const data = String(formData.get("data") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  if (!Number.isFinite(valor) || valor <= 0 || !data) return;
  await createAdSpend(valor, data, descricao || null);
  revalidatePath("/aquisicao");
}

export async function removeSpend(formData: FormData): Promise<void> {
  await excluirAdSpend(String(formData.get("id")));
  revalidatePath("/aquisicao");
}
