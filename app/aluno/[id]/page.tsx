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
  ["TURMA INGLÊS", "Turma Inglês"],
  ["Cidade", "Cidade"],
  ["Curso", "Curso"],
  ["Pagamento", "Pagamento"],
  ["Vendedor", "Vendedor"],
  ["Tel. Resp", "Telefone responsável"],
  ["Tel. Aluno", "Telefone aluno"],
  ["CPF", "CPF"],
  ["Data Cadastro", "Data cadastro"],
  ["Data Matrícula", "Data matrícula"],
  ["10 CURSOS?", "10 Cursos?"],
];

export default function AlunoPage() {
  const { id } = useParams();

  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [aluno, setAluno] =
    useState<any>(null);

  const [editando, setEditando] =
    useState<any>({});

  const [modoEdicao, setModoEdicao] =
    useState(false);

  // =========================
  // INIT
  // =========================

  useEffect(() => {
    async function init() {
      const { data: session } =
        await supabase.auth.getSession();

      if (!session.session) {
        router.push("/login");
        return;
      }

      const { data, error } =
        await supabase
          .from("backup alunos")
          .select("*")
          .eq("ID", id)
          .single();

      if (error) {
        alert(
          "Erro ao carregar aluno."
        );

        router.push(
          "/gerenciamento"
        );

        return;
      }

      setAluno(data);

      setEditando(data);

      setLoading(false);
    }

    init();
  }, [id, router]);

  // =========================
  // ALTERAR CAMPO
  // =========================

  function handleChange(
    campo: string,
    valor: any
  ) {
    setEditando((prev: any) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  // =========================
  // SALVAR
  // =========================

  async function salvar() {
    const { error } =
      await supabase
        .from("backup alunos")
        .update(editando)
        .eq("ID", id);

    if (error) {
      console.error(error);

      alert(
        "Erro ao salvar: " +
          error.message
      );

      return;
    }

    alert("Salvo com sucesso.");

    setAluno(editando);

    setModoEdicao(false);
  }

  // =========================
  // EXCLUIR
  // =========================

  async function excluir() {
    if (
      !confirm(
        "Deseja excluir este aluno?"
      )
    )
      return;

    const { error } =
      await supabase
        .from("backup alunos")
        .update({
          Excluido: true,

          Excluido_em:
            new Date().toISOString(),
        })
        .eq("ID", id);

    if (error) {
      alert("Erro ao excluir.");

      return;
    }

    alert("Aluno excluído.");

    router.push("/gerenciamento");
  }

  // =========================
  // RECUPERAR
  // =========================

  async function recuperar() {
    const { error } =
      await supabase
        .from("backup alunos")
        .update({
          Excluido: false,

          Excluido_em: null,
        })
        .eq("ID", id);

    if (error) {
      alert(
        "Erro ao recuperar."
      );

      return;
    }

    alert("Aluno recuperado.");

    router.push("/gerenciamento");
  }

  // =========================
  // SAIR
  // =========================

  async function sair() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0e1e] text-cyan-300">
        CARREGANDO...
      </main>
    );
  }

  // =========================
  // TELA
  // =========================

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-slate-200">

      {/* MENU */}

      <div className="fixed left-0 top-0 z-50 flex h-[58px] w-full items-center gap-2 overflow-x-auto bg-[#edbe13] px-2 md:h-[38px] md:justify-center">

        {[
          ["📑 CADASTRO", "/cadastro"],
          [
            "🖥️ GERENCIAMENTO",
            "/gerenciamento",
          ],
          [
            "📊 RELATÓRIOS",
            "/relatorios",
          ],
          [
            "📤 SUBIR ALUNOS",
            "/subir-alunos",
          ],
          [
            "📤 SUBIR ALUNOS DE INGLÊS",
            "/subir-alunos-ingles",
          ],
          [
            "📇 CRIAR CONTATOS",
            "/criar-contatos",
          ],
          [
            "📥 BAIXAR PERSONALIZADO",
            "/baixar-personalizado",
          ],
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
          className="rounded-md bg-red-600 px-4 py-2 text-xs font-black text-white"
        >
          SAIR
        </button>

      </div>

      {/* CONTEÚDO */}

      <section className="px-4 pb-10 pt-24 md:px-8">

        {/* TOPO */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">

          <div>

            <h1 className="text-2xl font-black text-white">
              👤 PERFIL DO ALUNO
            </h1>

            <p className="text-sm text-cyan-300">
              ID: {aluno["ID"]}
            </p>

          </div>

          <div className="flex flex-wrap gap-2">

            {!modoEdicao && (
              <button
                onClick={() =>
                  setModoEdicao(true)
                }
                className="rounded-md bg-cyan-500 px-5 py-2 text-sm font-black text-black"
              >
                ✏️ EDITAR
              </button>
            )}

            {modoEdicao && (
              <>
                <button
                  onClick={salvar}
                  className="rounded-md bg-green-700 px-5 py-2 text-sm font-black text-white"
                >
                  💾 SALVAR
                </button>

                <button
                  onClick={() => {
                    setEditando(aluno);

                    setModoEdicao(
                      false
                    );
                  }}
                  className="rounded-md bg-slate-700 px-5 py-2 text-sm font-black text-white"
                >
                  CANCELAR
                </button>
              </>
            )}

          </div>

        </div>

        {/* CARD */}

        <div className="rounded-2xl border border-[#12375f] bg-[#071b31] p-6 shadow-2xl">

          {/* STATUS */}

          <div className="mb-6 flex flex-wrap items-center gap-3">

            <div
              className={`rounded-md px-4 py-2 text-xs font-black ${
                aluno["STATUS"] ===
                "CANCELADO"
                  ? "bg-red-600 text-white"
                  : "bg-green-600 text-white"
              }`}
            >
              {aluno["STATUS"] ||
                "ATIVO"}
            </div>

            {aluno["Excluido"] ===
              true && (
              <div className="rounded-md bg-red-950 px-4 py-2 text-xs font-black text-red-300">
                EXCLUÍDO
              </div>
            )}

          </div>

          {/* GRID */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

            {CAMPOS.map(
              ([campo, label]) => (
                <div
                  key={campo}
                  className="rounded-xl border border-[#12375f] bg-[#0b2542] p-4"
                >

                  <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-cyan-300">
                    {label}
                  </div>

                  {modoEdicao ? (
                    campo ===
                    "STATUS" ? (
                      <select
                        value={
                          editando[
                            campo
                          ] || "ATIVO"
                        }
                        onChange={(e) =>
                          handleChange(
                            campo,
                            e.target
                              .value
                          )
                        }
                        className="w-full rounded-md bg-white px-3 py-2 text-sm font-bold text-black outline-none"
                      >
                        <option value="ATIVO">
                          ATIVO
                        </option>

                        <option value="CANCELADO">
                          CANCELADO
                        </option>
                      </select>
                    ) : (
                      <input
                        value={
                          editando[
                            campo
                          ] || ""
                        }
                        onChange={(e) =>
                          handleChange(
                            campo,
                            e.target
                              .value
                          )
                        }
                        className="w-full rounded-md bg-white px-3 py-2 text-sm font-bold text-black outline-none"
                      />
                    )
                  ) : (
                    <div className="break-words text-sm font-bold text-white">
                      {aluno[campo] ||
                        "-"}
                    </div>
                  )}

                </div>
              )
            )}

          </div>

          {/* BOTÕES */}

          <div className="mt-8 flex flex-wrap gap-3">

            {!aluno["Excluido"] && (
              <button
                onClick={excluir}
                className="rounded-md bg-red-700 px-5 py-3 text-sm font-black text-white"
              >
                ❌ EXCLUIR
              </button>
            )}

            {aluno["Excluido"] && (
              <button
                onClick={recuperar}
                className="rounded-md bg-cyan-600 px-5 py-3 text-sm font-black text-black"
              >
                ♻ RECUPERAR
              </button>
            )}

            <button
              onClick={() =>
                router.push(
                  "/gerenciamento"
                )
              }
              className="rounded-md bg-slate-700 px-5 py-3 text-sm font-black text-white"
            >
              ← VOLTAR
            </button>

          </div>

        </div>

      </section>

    </main>
  );
}
