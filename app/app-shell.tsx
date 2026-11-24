"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "./entrar/actions";

const PUBLIC_PATHS = ["/entrar"];

const NAV = [
  { href: "/", label: "Painel" },
  { href: "/crm", label: "CRM" },
  { href: "/funil", label: "Funil de Vendas" },
  { href: "/aquisicao", label: "Aquisição" },
  { href: "/metas", label: "Metas" },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-3 text-[17px] font-semibold tracking-[-0.02em] text-zinc-50">
      <span className="flex h-7 w-9 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold tracking-tight text-black">
        DSYA
      </span>
      Dashboard SY Acquisition
    </Link>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
              active ? "bg-zinc-900 text-zinc-50" : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100"
            }`}
          >
            <span
              aria-hidden
              className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-emerald-400 transition-opacity ${
                active ? "opacity-100" : "opacity-0"
              }`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 py-5">
      <Brand />
      <div className="flex-1 px-2">
        <NavLinks pathname={pathname} onNavigate={onNavigate} />
      </div>
      <div className="px-2">
        <div className="mb-2 border-t border-zinc-800 pt-2" />
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-900/60 hover:text-zinc-200"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isPublic) {
    return <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>;
  }

  return (
    <div>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-zinc-800 bg-zinc-950/40 lg:block">
        <SidebarBody pathname={pathname} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-black/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-900"
        >
          ☰
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-64 bg-black shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 rounded-lg p-2 text-zinc-400 hover:bg-zinc-900"
            >
              ✕
            </button>
            <SidebarBody pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-[240px]">
        <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
