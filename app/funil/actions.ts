"use server";
import { revalidatePath } from "next/cache";
import {
  createLead,
  marcarAgendado,
  marcarCompareceu,
  marcarVenda,
  marcarPerdido,
  reabrirLead,
  excluirLead,
} from "@/lib/db";

export async function addLead(formData: FormData): Promise<void> {
  const nome = String(formData.get("nome") ?? "").trim();
  const vendedor = String(formData.get("vendedor") ?? "").trim();
  if (!nome) return;
  await createLead(nome, vendedor || null);
  revalidatePath("/funil");
}

export async function agendar(formData: FormData): Promise<void> {
  await marcarAgendado(String(formData.get("id")));
  revalidatePath("/funil");
}

export async function compareceu(formData: FormData): Promise<void> {
  await marcarCompareceu(String(formData.get("id")));
  revalidatePath("/funil");
}

export async function fecharVenda(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  const valor = Number(formData.get("valor"));
  if (!id || !Number.isFinite(valor) || valor <= 0) return;
  await marcarVenda(id, valor);
  revalidatePath("/funil");
}

export async function perder(formData: FormData): Promise<void> {
  await marcarPerdido(String(formData.get("id")));
  revalidatePath("/funil");
}

export async function reabrir(formData: FormData): Promise<void> {
  await reabrirLead(String(formData.get("id")));
  revalidatePath("/funil");
}

export async function excluir(formData: FormData): Promise<void> {
  await excluirLead(String(formData.get("id")));
  revalidatePath("/funil");
}
