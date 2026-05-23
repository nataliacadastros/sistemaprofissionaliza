"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

export default function AlunoPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [aluno, setAluno] = useState<any>(null);

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("backup alunos")
        .select("*")
        .eq("ID", id)
        .single();

      if (error) {
        console.error(error);
        alert("Erro ao carregar aluno.");
        router.push("/gerenciamento");
        return;
      }

      setAluno(data);
      setLoading(false);
    }

    init();
  }, [id, router]);

  async function excluirAluno() {
    const confirmar = confirm("Deseja realmente excluir este aluno?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("backup alunos")
      .update({
        Excluido: true,
        Excluido_em: new Date().toISOString(),
      })
      .eq("ID", id);

    if (error) {
      alert("Erro ao excluir.");
      return;
    }

    alert("Aluno excluído com sucesso.");
    router.push("/gerenciamento");
  }

  async function recuperarAluno() {
    const { error } = await supabase
      .from("backup alunos")
      .update({
        Excluido: false,
        Excluido_em: null,
      })
      .eq("ID", id);

    if (error) {
      alert("Erro ao recuperar.");
      return;
    }

    alert("Aluno recuperado com sucesso.");
    router.push("/gerenciamento");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0e1e] text-cyan-300">
        CARREGANDO ALUNO...
      </main>
    );
  }

  if (!aluno) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white">
        Aluno não encontrado.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-slate-200">

      {/* MENU */}
      <div className="fixed left-0 top-0 z-50 flex h-[58px] w-full items-center gap-2 overflow-x-auto bg-[#edbe13] px-2">
        <a href="/gerenciamento">← VOLTAR</a>
      </div>

      <section className="px-6 pt-24">

        <h1 className="text-xl font-black mb-4">
          👤 PERFIL DO ALUNO
        </h1>

        <div className="bg-[#071b31] p-5 rounded-xl border border-[#12375f]">

          <p><b>ID:</b> {aluno["ID"]}</p>
          <p><b>Nome:</b> {aluno["Aluno"]}</p>
          <p><b>Cidade:</b> {aluno["Cidade"]}</p>
          <p><b>Curso:</b> {aluno["Curso"]}</p>
          <p><b>Tel. Resp:</b> {aluno["Tel. Resp"]}</p>
          <p><b>Tel. Aluno:</b> {aluno["Tel. Aluno"]}</p>
          <p><b>Status:</b> {aluno["Excluido"] ? "EXCLUÍDO" : "ATIVO"}</p>

        </div>

        <div className="mt-6 flex gap-3">

          {!aluno["Excluido"] && (
            <button
              onClick={excluirAluno}
              className="bg-red-700 px-4 py-2 font-bold"
            >
              ❌ EXCLUIR ALUNO
            </button>
          )}

          {aluno["Excluido"] && (
            <button
              onClick={recuperarAluno}
              className="bg-green-700 px-4 py-2 font-bold"
            >
              ♻ RECUPERAR ALUNO
            </button>
          )}

        </div>

      </section>
    </main>
  );
}
