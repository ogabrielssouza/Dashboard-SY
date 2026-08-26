"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Recarrega os dados da página (sem perder o scroll nem piscar a tela) em
// intervalos regulares — é o que dá o efeito de "número ao vivo" num
// componente de servidor, sem precisar de websocket.
export default function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
