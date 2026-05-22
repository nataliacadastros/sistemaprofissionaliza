"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function verificar() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
      } else {
        router.push("/gerenciamento");
      }
    }

    verificar();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0e1e] text-cyan-300">
      <div className="font-black">CARREGANDO...</div>
    </main>
  );
}
