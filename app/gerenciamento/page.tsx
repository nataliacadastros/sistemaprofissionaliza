// =========================
// IMPORTS
// =========================

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx-js-style";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// =========================
// FUNÇÕES
// =========================

function converterDataBR(data?: string) {
  if (!data) return 0;

  const partes = String(data).split("/");

  if (partes.length !== 3) return 0;

  const [dia, mes, ano] = partes;

  return new Date(`${ano}-${mes}-${dia}`).getTime();
}

function ordenarAlunos(a: any, b: any) {
  const ordemA = Number(a["Ordem"] || 0);
  const ordemB = Number(b["Ordem"] || 0);

  if (ordemA !== ordemB) return ordemB - ordemA;

  const dataA = converterDataBR(a["Data Cadastro"]);
  const dataB = converterDataBR(b["Data Cadastro"]);

  if (dataA !== dataB) return dataB - dataA;

  return Number(b["ID"] || 0) - Number(a["ID"] || 0);
}

function formatarTelefone(valor: any) {
  if (valor === null || valor === undefined) return "-";

  let texto = String(valor).trim();

  if (!texto || texto.toLowerCase() === "null") {
    return "-";
  }

  if (/e\+/i.test(texto)) {
    const numero = Number(texto.replace(",", "."));

    if (!Number.isNaN(numero)) {
      texto = numero.toFixed(0);
    }
  }

  return texto;
}

// =========================
// COMPONENTE
// =========================

export default function GerenciamentoPage() {
  const router = useRouter();

  const [carregandoLogin, setCarregandoLogin] = useState(true);

  const [alunos, setAlunos] = useState<any[]>([]);
  const [pesquisa, setPesquisa] = useState("");

  const [mostrarDownload, setMostrarDownload] = useState(false);

  const [intervaloDownload, setIntervaloDownload] = useState<
    [Date | null, Date | null]
  >([null, null]);

  const [inicioDownload, fimDownload] = intervaloDownload;

  const [cidadeDownload, setCidadeDownload] = useState("TODAS");

  const [mostrarExcluidos, setMostrarExcluidos] = useState(false);

  // =========================
  // EDIÇÃO EM LOTE
  // =========================

  const [mostrarLote, setMostrarLote] = useState(false);

  const [inicioLote, setInicioLote] = useState<Date | null>(null);
  const [fimLote, setFimLote] = useState<Date | null>(null);

  const [cursoFiltroLote, setCursoFiltroLote] = useState("");

  const [novaTurma, setNovaTurma] = useState("");
  const [novaTurmaIngles, setNovaTurmaIngles] = useState("");

  // =========================
  // LOGIN
  // =========================

  useEffect(() => {
    async function verificarLogin() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      setCarregandoLogin(false);
    }

    verificarLogin();
  }, [router]);

  // =========================
  // BUSCAR ALUNOS
  // =========================

  useEffect(() => {
    if (carregandoLogin) return;

    async function buscarTodosAlunos() {
      let todos: any[] = [];

      let inicio = 0;

      const tamanho = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("backup alunos")
          .select("*")
          .range(inicio, inicio + tamanho - 1);

        if (error) {
          console.error("Erro Supabase:", error);
          break;
        }

        if (!data || data.length === 0) break;

        todos = [...todos, ...data];

        if (data.length < tamanho) break;

        inicio += tamanho;
      }

      setAlunos(
        todos
          .filter((a) => a["ID"] && a["Aluno"])
          .sort(ordenarAlunos)
      );
    }

    buscarTodosAlunos();
  }, [carregandoLogin]);

  // =========================
  // FILTRO
  // =========================

  const filtrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();

    return alunos
      .filter((a) => {
        const excluido = a["Excluido"] === true;

        if (mostrarExcluidos) {
          if (!excluido) return false;
        } else {
          if (excluido) return false;
        }

        if (!termo) return true;

        return Object.values(a).some((valor) =>
          String(valor || "").toLowerCase().includes(termo)
        );
      })
      .sort(ordenarAlunos);
  }, [alunos, pesquisa, mostrarExcluidos]);

  // =========================
  // CURSOS LOTE
  // =========================

  const cursosDisponiveisLote = useMemo(() => {
    if (!inicioLote || !fimLote) return [];

    const inicio = new Date(inicioLote);
    inicio.setHours(0, 0, 0, 0);

    const fim = new Date(fimLote);
    fim.setHours(23, 59, 59, 999);

    const cursos = alunos
      .filter((a) => {
        const dataAluno = converterDataBR(a["Data Cadastro"]);

        return (
          dataAluno >= inicio.getTime() &&
          dataAluno <= fim.getTime() &&
          a["Excluido"] !== true
        );
      })
      .map((a) => String(a["Curso"] || "").trim())
      .filter(Boolean);

    return Array.from(new Set(cursos)).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }, [alunos, inicioLote, fimLote]);

  // =========================
  // ALUNOS LOTE
  // =========================

  const alunosLote = useMemo(() => {
    if (!inicioLote || !fimLote || !cursoFiltroLote) return [];

    const inicio = new Date(inicioLote);
    inicio.setHours(0, 0, 0, 0);

    const fim = new Date(fimLote);
    fim.setHours(23, 59, 59, 999);

    return alunos.filter((a) => {
      const dataAluno = converterDataBR(a["Data Cadastro"]);

      return (
        dataAluno >= inicio.getTime() &&
        dataAluno <= fim.getTime() &&
        String(a["Curso"] || "").trim() === cursoFiltroLote &&
        a["Excluido"] !== true
      );
    });
  }, [alunos, inicioLote, fimLote, cursoFiltroLote]);

  // =========================
  // EDIÇÃO EM LOTE
  // =========================

  async function aplicarEdicaoLote() {
    if (alunosLote.length === 0) {
      alert("Nenhum aluno encontrado.");
      return;
    }

    const updates = alunosLote.map((aluno) =>
      supabase
        .from("backup alunos")
        .update({
          TURMA: novaTurma || aluno["TURMA"],
          "TURMA INGLÊS":
            novaTurmaIngles || aluno["TURMA INGLÊS"],
        })
        .eq("ID", aluno["ID"])
    );

    await Promise.all(updates);

    setAlunos((prev) =>
      prev.map((a) => {
        const existe = alunosLote.find(
          (x) => x["ID"] === a["ID"]
        );

        if (!existe) return a;

        return {
          ...a,
          TURMA: novaTurma || a["TURMA"],
          "TURMA INGLÊS":
            novaTurmaIngles || a["TURMA INGLÊS"],
        };
      })
    );

    alert("Edição em lote concluída.");
  }

  // =========================
  // SAIR
  // =========================

  async function sair() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  // =========================
  // DOWNLOAD
  // =========================

  function baixarAlunosPorData() {
    if (!inicioDownload) {
      alert("Selecione uma data.");
      return;
    }

    const inicio = new Date(inicioDownload);
    inicio.setHours(0, 0, 0, 0);

    const fim = fimDownload
      ? new Date(fimDownload)
      : new Date(inicioDownload);

    fim.setHours(23, 59, 59, 999);

    let alunosDaData = alunos.filter((a) => {
      const dataAluno = converterDataBR(a["Data Cadastro"]);

      return (
        dataAluno >= inicio.getTime() &&
        dataAluno <= fim.getTime() &&
        a["Excluido"] !== true
      );
    });

    if (cidadeDownload !== "TODAS") {
      alunosDaData = alunosDaData.filter(
        (a) =>
          String(a["Cidade"] || "").trim() ===
          cidadeDownload
      );
    }

    const ws = XLSX.utils.json_to_sheet(alunosDaData);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Alunos");

    XLSX.writeFile(wb, "ALUNOS.xlsx");
  }

  // =========================
  // LOADING
  // =========================

  if (carregandoLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0e1e] text-cyan-300">
        <div className="font-black">
          VERIFICANDO LOGIN...
        </div>
      </main>
    );
  }

  // =========================
  // TELA
  // =========================

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-slate-200">

      {/* TOPO */}

      <div className="fixed left-0 top-0 z-50 flex h-[58px] w-full items-center gap-2 overflow-x-auto bg-[#edbe13] px-2 md:h-[38px] md:justify-center">

        {[
          ["📑 CADASTRO", "/cadastro"],
          ["🖥️ GERENCIAMENTO", "/gerenciamento"],
          ["📊 RELATÓRIOS", "/relatorios"],
          ["📤 SUBIR ALUNOS", "/subir-alunos"],
          ["📤 SUBIR ALUNOS DE INGLÊS", "/subir-alunos-ingles"],
          ["📇 CRIAR CONTATOS", "/criar-contatos"],
        ].map(([tab, href]) => (
          <a
            key={tab}
            href={href}
            className={`shrink-0 rounded-md border px-5 py-2 text-xs font-bold md:py-1 ${
              tab.includes("GERENCIAMENTO")
                ? "border-cyan-300 bg-cyan-300 text-black"
                : "border-slate-700/30 bg-white/20 text-[#1f295a]"
            }`}
          >
            {tab}
          </a>
        ))}

        <button
          onClick={sair}
          className="shrink-0 rounded-md border border-red-700 bg-red-600 px-5 py-2 text-xs font-black text-white md:py-1"
        >
          SAIR
        </button>

      </div>

      <section className="px-4 pt-20 md:px-8 md:pt-14">

        {/* TOPO */}

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <h1 className="text-lg font-black text-white">
              ▣ LISTAGEM DE ALUNOS
            </h1>

            <p className="text-xs text-cyan-300">
              {filtrados.length} registros encontrados
            </p>

          </div>

          <div className="flex w-full flex-col gap-3 lg:w-[900px] lg:flex-row lg:items-center">

            <input
              value={pesquisa}
              onChange={(e) =>
                setPesquisa(e.target.value)
              }
              placeholder="Pesquisar..."
              className="w-full rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black"
            />

            <button
              onClick={() => setPesquisa("")}
              className="rounded-md border border-cyan-800 px-4 py-2 text-xs font-bold text-cyan-100"
            >
              LIMPAR
            </button>

            <button
              onClick={() =>
                setMostrarDownload((prev) => !prev)
              }
              className="rounded-md bg-green-700 px-4 py-2 text-xs font-black text-white"
            >
              BAIXAR ALUNOS
            </button>

            <button
              onClick={() =>
                setMostrarLote((prev) => !prev)
              }
              className="rounded-md bg-purple-700 px-4 py-2 text-xs font-black text-white"
            >
              EDIÇÃO EM LOTE
            </button>

          </div>

        </div>

        {/* DOWNLOAD */}

        {mostrarDownload && (
          <div className="mb-5 rounded-xl border border-[#12375f] bg-[#071b31] p-4 shadow-2xl">

            <div className="mb-3 text-xs font-black uppercase text-cyan-300">
              Baixar alunos
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">

              <DatePicker
                selectsRange
                startDate={inicioDownload}
                endDate={fimDownload}
                onChange={(update: any) => {
                  if (!update) {
                    setIntervaloDownload([
                      null,
                      null,
                    ]);
                    return;
                  }

                  const [inicio, fim] = update;

                  setIntervaloDownload([
                    inicio,
                    fim || inicio,
                  ]);
                }}
                isClearable
                dateFormat="dd/MM/yyyy"
                placeholderText="Selecione um dia ou intervalo"
                className="rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black"
              />

              <select
                value={cidadeDownload}
                onChange={(e) =>
                  setCidadeDownload(e.target.value)
                }
                className="rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black"
              >
                <option value="TODAS">
                  Todas as cidades
                </option>
              </select>

              <button
                onClick={baixarAlunosPorData}
                className="rounded-md bg-green-700 px-4 py-2 text-xs font-black text-white"
              >
                📥 BAIXAR EXCEL
              </button>

            </div>

          </div>
        )}

        {/* EDIÇÃO LOTE */}

        {mostrarLote && (
          <div className="mb-5 rounded-xl border border-[#12375f] bg-[#071b31] p-4 shadow-2xl">

            <div className="mb-3 text-xs font-black uppercase text-cyan-300">
              Edição em lote
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">

              <DatePicker
                selected={inicioLote}
                onChange={(date: any) => {
                  if (!date) {
                    setInicioLote(null);
                    setFimLote(null);
                    setCursoFiltroLote("");
                    return;
                  }

                  setInicioLote(date);
                  setFimLote(date);

                  setCursoFiltroLote("");
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="Selecione uma data"
                className="rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black"
              />

              <select
                value={cursoFiltroLote}
                onChange={(e) =>
                  setCursoFiltroLote(e.target.value)
                }
                className="rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black"
              >
                <option value="">
                  Selecione o curso
                </option>

                {cursosDisponiveisLote.map((curso) => (
                  <option key={curso} value={curso}>
                    {curso}
                  </option>
                ))}
              </select>

              <input
                value={novaTurma}
                onChange={(e) =>
                  setNovaTurma(e.target.value)
                }
                placeholder="Nova TURMA"
                className="rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black"
              />

              <input
                value={novaTurmaIngles}
                onChange={(e) =>
                  setNovaTurmaIngles(e.target.value)
                }
                placeholder="Nova TURMA INGLÊS"
                className="rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black"
              />

              <button
                onClick={aplicarEdicaoLote}
                className="rounded-md bg-green-700 px-4 py-2 text-xs font-black text-white"
              >
                APLICAR EM {alunosLote.length}
              </button>

            </div>

          </div>
        )}

      </section>

    </main>
  );
}
