"use client";
import { useActionState } from "react";
import { login } from "./actions";
import { card, input, muted } from "../ui";

export default function EntrarPage() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <div className="mx-auto mt-20 max-w-sm">
      <div className={`p-6 ${card}`}>
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-base font-bold text-black">
            6D
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight text-zinc-50">Entrar no painel</h1>
            <p className={`text-xs ${muted}`}>Use a senha do administrador.</p>
          </div>
        </div>
        <form action={action} className="space-y-3">
          <input
            type="password"
            name="password"
            required
            autoFocus
            placeholder="Senha"
            className={input}
          />
          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
          <button
            disabled={pending}
            className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
