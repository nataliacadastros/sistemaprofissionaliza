"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

const CAMPOS = [
  ["STATUS", "Status"],
  ["ID", "ID"],
  ["Aluno", "Aluno"],
  ["SEC", "SEC"],
  ["TURMA", "Turma"],
  ["Cidade", "Cidade"],
  ["Curso", "Curso"],
  ["Pagamento", "Pagamento"],
  ["Vendedor", "Vendedor"],
  ["Tel. Resp", "Telefone responsável"],
  ["Tel. Aluno", "Telefone aluno"],
  ["CPF", "CPF"],
  ["Data Cadastro", "Data cadastro"],
  ["Data Matrícula", "Data matrícula"], // ✅ corrigido
  ["10 CURSOS?", "10 Cursos?"],
];

export default function AlunoPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [aluno, setAluno] = useState<any>(null);
  const [editando, setEditando] = useState<any>({});

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
        alert("Erro ao carregar aluno.");
        router.push("/gerenciamento");
        return;
      }

      setAluno(data);
      setEditando(data);
      setLoading(false);
    }

    init();
  }, [id, router]);

  function handleChange(campo: string, valor: any) {
    setEditando((prev: any) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  async function salvar() {
    const { error } = await supabase
      .from("backup alunos")
      .update(editando)
      .eq("ID", id);

    if (error) {
      console.error(error);
      alert("Erro ao salvar: " + error.message);
      return;
    }

    alert("Salvo com sucesso.");
    setAluno(editando);
  }

  async function excluir() {
    if (!confirm("Deseja excluir este aluno?")) return;

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

    alert("Aluno excluído.");
    router.push("/gerenciamento");
  }

  async function recuperar() {
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

    alert("Aluno recuperado.");
    router.push("/gerenciamento");
  }

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0e1e] text-cyan-300">
        CARREGANDO...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-slate-200">

      {/* MENU PADRÃO */}
      <div className="fixed left-0 top-0 z-50 flex h-[58px] w-full items-center gap-2 overflow-x-auto bg-[#edbe13] px-2 md:h-[38px] md:justify-center">
        {[
          ["📑 CADASTRO", "/cadastro"],
          ["🖥️ GERENCIAMENTO", "/gerenciamento"],
          ["📊 RELATÓRIOS", "/relatorios"],
          ["📤 SUBIR ALUNOS", "/subir-alunos"],
          ["📤 SUBIR ALUNOS DE INGLÊS", "/subir-alunos-ingles"],
        ].map(([tab, href]) => (
          <a
            key={tab}
            href={href}
            className="shrink-0 rounded-md border border-slate-700/30 bg-white/20 px-5 py-2 text-xs font-bold text-[#1f295a]"
          >
            {tab}
          </a>
        ))}

        <button
          onClick={sair}
          className="rounded-md bg-red-600 px-4 py-2 text-white font-bold"
        >
          SAIR
        </button>
      </div>

      {/* CONTEÚDO */}
      <section className="px-6 pt-24">

        <h1 className="text-xl font-black mb-6">
          👤 PERFIL DO ALUNO
        </h1>

        <div className="bg-[#071b31] p-6 rounded-xl border border-[#12375f]">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {CAMPOS.map(([campo, label]) => (
              <div key={campo}>
                <label className="text-xs text-cyan-300 block mb-1">
                  {label}
                </label>

                <input
                  value={editando[campo] || ""}
                  onChange={(e) =>
                    handleChange(campo, e.target.value)
                  }
                  className="w-full px-3 py-2 rounded bg-white text-black"
                />
              </div>
            ))}

          </div>

          {/* BOTÕES */}
          <div className="mt-6 flex gap-3 flex-wrap">

            <button
              onClick={salvar}
              className="bg-green-700 px-5 py-2 font-bold"
            >
              💾 SALVAR
            </button>

            {!aluno["Excluido"] && (
              <button
                onClick={excluir}
                className="bg-red-700 px-5 py-2 font-bold"
              >
                ❌ EXCLUIR
              </button>
            )}

            {aluno["Excluido"] && (
              <button
                onClick={recuperar}
                className="bg-cyan-600 px-5 py-2 font-bold"
              >
                ♻ RECUPERAR
              </button>
            )}

          </div>

        </div>

      </section>
    </main>
  );
}
