
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar() {
    setErro("");
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }

    router.push("/gerenciamento");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0e1e] px-4 text-slate-200">
      <div className="w-full max-w-md rounded-2xl border border-[#12375f] bg-[#071b31] p-8 shadow-2xl">
        <h1 className="mb-2 text-center text-2xl font-black text-white">
          SISTEMA EAD
        </h1>

        <p className="mb-6 text-center text-sm font-bold text-cyan-300">
          Acesso restrito
        </p>

        <label className="mb-1 block text-xs font-black text-cyan-300">
          E-MAIL
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seuemail@empresa.com"
          className="mb-4 w-full rounded-md border border-[#1f5b91] bg-white px-4 py-3 text-sm font-bold text-black outline-none"
        />

        <label className="mb-1 block text-xs font-black text-cyan-300">
          SENHA
        </label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Digite sua senha"
          onKeyDown={(e) => {
            if (e.key === "Enter") entrar();
          }}
          className="mb-4 w-full rounded-md border border-[#1f5b91] bg-white px-4 py-3 text-sm font-bold text-black outline-none"
        />

        {erro && (
          <div className="mb-4 rounded-md border border-red-800 bg-red-950 p-3 text-sm font-bold text-red-300">
            {erro}
          </div>
        )}

        <button
          onClick={entrar}
          disabled={carregando}
          className="w-full rounded-md bg-cyan-400 px-6 py-3 font-black text-black hover:bg-cyan-300 disabled:opacity-60"
        >
          {carregando ? "ENTRANDO..." : "ENTRAR"}
        </button>
      </div>
    </main>
  );
}
