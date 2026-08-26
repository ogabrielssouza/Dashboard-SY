// Design system: dashboard escuro, acento verde (inspirado em ferramentas de
// tracking como a UTMIFY). Sem alternância clara/escura — este painel é
// sempre escuro, de propósito.

export const card =
  "rounded-2xl border border-zinc-800 bg-zinc-950/60 shadow-[0_1px_2px_rgba(0,0,0,0.3)]";

export const cardHover =
  "transition-[box-shadow,border-color] duration-200 hover:border-zinc-700 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]";

export const divider = "border-t border-zinc-800";

export const pageTitle = "text-[22px] font-bold tracking-[-0.01em] text-zinc-50 sm:text-2xl";

export const pageSubtitle = "mt-1 text-sm text-zinc-400";

export const sectionTitle = "text-sm font-semibold tracking-[-0.005em] text-zinc-100";

export const muted = "text-zinc-400";

export const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500";

/* ---------- formulários ---------- */

export const label = "mb-1.5 block text-sm font-medium text-zinc-300";

export const hint = "mt-1.5 text-xs leading-relaxed text-zinc-500";

export const input =
  "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-[border-color,box-shadow] placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15";

/* ---------- botões ---------- */

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[background-color,transform,box-shadow] hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/25 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50";

export const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/15";

export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-900 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/15";

/* ---------- selos ---------- */

export const badge = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold";

export const badgeNeutral = `${badge} bg-zinc-800 text-zinc-400`;
export const badgeOk = `${badge} bg-emerald-500/15 text-emerald-400`;
export const badgeWarn = `${badge} bg-amber-500/15 text-amber-400`;
export const badgeErr = `${badge} bg-red-500/15 text-red-400`;
export const badgeAccent = `${badge} bg-emerald-500/15 text-emerald-400`;

/* ---------- tabelas ---------- */

export const tableWrap =
  "overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 shadow-[0_1px_2px_rgba(0,0,0,0.3)]";

export const thead = "bg-zinc-900/60 text-[11px] font-semibold uppercase tracking-[0.04em] text-zinc-500";

export const rowDivide = "divide-y divide-zinc-800/70";

export const rowHover = "transition-colors hover:bg-zinc-900/50";

/* ---------- avisos ---------- */

const alertBase = "rounded-xl border px-4 py-3 text-sm";

export const alertError = `${alertBase} border-red-900 bg-red-950/40 text-red-300`;
export const alertOk = `${alertBase} border-emerald-900 bg-emerald-950/40 text-emerald-300`;

export const emptyWrap =
  "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-700 px-6 py-12 text-center";

/* ---------- cores de gráfico ---------- */

export const CHART = {
  green: "#34d399", // emerald-400 — resultado, faturamento, positivo
  greenLine: "#10b981", // emerald-500
  red: "#f87171", // red-400 — investido / custo
  grid: "#27272a", // zinc-800
  axis: "#71717a", // zinc-500
  text: "#a1a1aa", // zinc-400
};
