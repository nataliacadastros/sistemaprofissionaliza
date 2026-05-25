"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx-js-style";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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

  const [mostrarEdicaoLote, setMostrarEdicaoLote] = useState(false);

  const [intervaloLote, setIntervaloLote] = useState<
    [Date | null, Date | null]
  >([null, null]);

  const [inicioLote, fimLote] = intervaloLote;

  const [turmaLote, setTurmaLote] = useState("");
  const [turmaInglesLote, setTurmaInglesLote] = useState("");

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

  const cidadesDisponiveisDownload = useMemo(() => {
    if (!inicioDownload) return [];

    const inicio = new Date(inicioDownload);

    inicio.setHours(0, 0, 0, 0);

    const fim = fimDownload
      ? new Date(fimDownload)
      : new Date(inicioDownload);

    fim.setHours(23, 59, 59, 999);

    const cidades = alunos
      .filter((a) => {
        const dataAluno = converterDataBR(a["Data Cadastro"]);

        return (
          dataAluno >= inicio.getTime() &&
          dataAluno <= fim.getTime() &&
          a["Excluido"] !== true
        );
      })
      .map((a) => String(a["Cidade"] || "").trim())
      .filter(Boolean);

    return Array.from(new Set(cidades)).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }, [alunos, inicioDownload, fimDownload]);

  async function sair() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  async function salvarEdicaoLote() {
    if (!inicioLote) {
      alert("Selecione uma data.");
      return;
    }

    if (!turmaLote.trim() && !turmaInglesLote.trim()) {
      alert("Preencha TURMA ou TURMA INGLÊS.");
      return;
    }

    const inicio = new Date(inicioLote);

    inicio.setHours(0, 0, 0, 0);

    const fim = fimLote
      ? new Date(fimLote)
      : new Date(inicioLote);

    fim.setHours(23, 59, 59, 999);

    const alunosParaEditar = alunos.filter((a) => {
      const dataAluno = converterDataBR(a["Data Cadastro"]);

      return (
        dataAluno >= inicio.getTime() &&
        dataAluno <= fim.getTime() &&
        a["Excluido"] !== true
      );
    });

    if (alunosParaEditar.length === 0) {
      alert("Nenhum aluno encontrado.");
      return;
    }

    for (const aluno of alunosParaEditar) {
      const updateData: any = {};

      if (turmaLote.trim()) {
        updateData["TURMA"] = turmaLote.trim();
      }

      if (turmaInglesLote.trim()) {
        updateData["TURMA INGLÊS"] = turmaInglesLote.trim();
      }

      const { error } = await supabase
        .from("backup alunos")
        .update(updateData)
        .eq("ID", aluno["ID"]);

      if (error) {
        console.error(error);
      }
    }

    setAlunos((prev) =>
      prev.map((a) => {
        const dataAluno = converterDataBR(a["Data Cadastro"]);

        const dentroPeriodo =
          dataAluno >= inicio.getTime() &&
          dataAluno <= fim.getTime() &&
          a["Excluido"] !== true;

        if (!dentroPeriodo) return a;

        return {
          ...a,
          ...(turmaLote.trim()
            ? { TURMA: turmaLote.trim() }
            : {}),
          ...(turmaInglesLote.trim()
            ? { "TURMA INGLÊS": turmaInglesLote.trim() }
            : {}),
        };
      })
    );

    alert("Edição em lote concluída.");
  }

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

    const dataInicioBR = inicio.toLocaleDateString("pt-BR");

    const dataFimBR = fim.toLocaleDateString("pt-BR");

    let alunosDaData = alunos
      .filter((a) => {
        const dataAluno = converterDataBR(a["Data Cadastro"]);

        return (
          dataAluno >= inicio.getTime() &&
          dataAluno <= fim.getTime() &&
          a["Excluido"] !== true
        );
      })
      .sort(ordenarAlunos)
      .reverse();

    if (cidadeDownload !== "TODAS") {
      alunosDaData = alunosDaData.filter(
        (a) => String(a["Cidade"] || "").trim() === cidadeDownload
      );
    }

    if (alunosDaData.length === 0) {
      alert("Nenhum aluno encontrado nesse intervalo/cidade.");
      return;
    }

    const colunasPreferidas = [
      "STATUS",
      "TURMA",
      "TURMA INGLÊS",
      "SEC",
      "10 CURSOS?",
      "INGLÊS?",
      "Data Cadastro",
      "ID",
      "Aluno",
      "Tel. Resp",
      "Tel. Aluno",
      "CPF",
      "Cidade",
      "Curso",
      "Pagamento",
      "Vendedor",
      "Data Matricula",
      "Data Matrícula",
      "Excluido",
      "Excluido_em",
    ];

    const todasColunasEncontradas = Array.from(
      new Set(alunosDaData.flatMap((aluno) => Object.keys(aluno)))
    ).filter((coluna) => coluna !== "Ordem");

    const colunas = [
      ...colunasPreferidas.filter((coluna) =>
        todasColunasEncontradas.includes(coluna)
      ),
      ...todasColunasEncontradas.filter(
        (coluna) => !colunasPreferidas.includes(coluna)
      ),
    ];

    const linhas = alunosDaData.map((a) =>
      colunas.map((coluna) => String(a[coluna] ?? ""))
    );

    const ws = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Alunos");

    XLSX.writeFile(
      wb,
      `ALUNOS_${dataInicioBR.replaceAll(
        "/",
        "-"
      )}_A_${dataFimBR.replaceAll("/", "-")}.xlsx`
    );
  }

  if (carregandoLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0e1e] text-cyan-300">
        <div className="font-black">VERIFICANDO LOGIN...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-slate-200">
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
                ? "border-cyan-300 bg-cyan-300 text-black shadow-[0_0_10px_rgba(0,242,255,.6)]"
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
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-black text-white">
              {mostrarExcluidos
                ? "♻ ALUNOS EXCLUÍDOS"
                : "▣ LISTAGEM DE ALUNOS"}
            </h1>

            <p className="text-xs text-cyan-300">
              {filtrados.length} registros encontrados
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-[980px] lg:flex-row lg:items-center">
            <input
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar por nome, ID, cidade, telefone, curso, status..."
              className="w-full rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black outline-none focus:border-cyan-400"
            />

            <button
              onClick={() => setPesquisa("")}
              className="rounded-md border border-cyan-800 px-4 py-2 text-xs font-bold text-cyan-100"
            >
              LIMPAR
            </button>

            <button
              onClick={() => setMostrarDownload((prev) => !prev)}
              className="rounded-md bg-green-700 px-4 py-2 text-xs font-black text-white hover:bg-green-600"
            >
              BAIXAR ALUNOS
            </button>

            <button
              onClick={() => setMostrarEdicaoLote((prev) => !prev)}
              className="rounded-md bg-purple-700 px-4 py-2 text-xs font-black text-white hover:bg-purple-600"
            >
              EDITAR EM LOTE
            </button>

            <button
              onClick={() => {
                setMostrarExcluidos((prev) => !prev);
                setPesquisa("");
              }}
              className={`rounded-md px-4 py-2 text-xs font-black ${
                mostrarExcluidos
                  ? "bg-cyan-400 text-black hover:bg-cyan-300"
                  : "bg-red-700 text-white hover:bg-red-600"
              }`}
            >
              {mostrarExcluidos
                ? "VER ALUNOS ATIVOS"
                : "VER EXCLUÍDOS"}
            </button>
          </div>
        </div>

        {mostrarEdicaoLote && (
          <div className="mb-5 rounded-xl border border-purple-700 bg-[#071b31] p-4 shadow-2xl">
            <div className="mb-4 text-xs font-black uppercase text-purple-300">
              Edição em lote por Data Cadastro
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <DatePicker
                selectsRange
                startDate={inicioLote}
                endDate={fimLote}
                onChange={(update: any) => setIntervaloLote(update)}
                isClearable
                dateFormat="dd/MM/yyyy"
                placeholderText="Selecione o período"
                className="rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black outline-none"
              />

              <input
                value={turmaLote}
                onChange={(e) => setTurmaLote(e.target.value)}
                placeholder="Nova TURMA"
                className="rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black outline-none"
              />

              <input
                value={turmaInglesLote}
                onChange={(e) => setTurmaInglesLote(e.target.value)}
                placeholder="Nova TURMA INGLÊS"
                className="rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black outline-none"
              />

              <button
                onClick={salvarEdicaoLote}
                className="rounded-md bg-purple-700 px-5 py-2 text-xs font-black text-white hover:bg-purple-600"
              >
                SALVAR ALTERAÇÕES
              </button>
            </div>
          </div>
        )}

        <div className="w-full overflow-x-auto rounded-xl border border-[#12375f] bg-[#071b31] shadow-2xl">
          <div className="min-w-[1400px]">
            <div className="grid grid-cols-[110px_120px_140px_110px_2fr_1.5fr_1.4fr_1.4fr_2fr_80px] bg-[#0c2743] text-[11px] font-black uppercase text-slate-200">
              <div className="border-r border-[#12375f] p-3">Status</div>
              <div className="border-r border-[#12375f] p-3">
                Data cadastro
              </div>
              <div className="border-r border-[#12375f] p-3">
                Turma
              </div>
              <div className="border-r border-[#12375f] p-3">
                ID do aluno
              </div>
              <div className="border-r border-[#12375f] p-3">
                Nome completo
              </div>
              <div className="border-r border-[#12375f] p-3">Cidade</div>
              <div className="border-r border-[#12375f] p-3">
                Tel. responsável
              </div>
              <div className="border-r border-[#12375f] p-3">
                Tel. aluno
              </div>
              <div className="border-r border-[#12375f] p-3">
                Curso contratado
              </div>
              <div className="p-3 text-center">Ações</div>
            </div>

            {filtrados.map((aluno) => (
              <a
                key={aluno["ID"]}
                href={`/aluno/${aluno["ID"]}`}
                className="grid min-h-[52px] grid-cols-[110px_120px_140px_110px_2fr_1.5fr_1.4fr_1.4fr_2fr_80px] border-t border-[#12375f] bg-[#071b31] text-[14px] font-bold text-slate-100 no-underline hover:bg-[#0b2542]"
              >
                <div
                  className="flex items-center border-r border-[#12375f] p-3"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      const statusAtual =
                        aluno["STATUS"] || "ATIVO";

                      const novoStatus =
                        statusAtual === "ATIVO"
                          ? "CANCELADO"
                          : "ATIVO";

                      const { error } = await supabase
                        .from("backup alunos")
                        .update({
                          STATUS: novoStatus,
                        })
                        .eq("ID", aluno["ID"]);

                      if (error) {
                        alert("Erro ao atualizar status.");
                        console.error(error);
                        return;
                      }

                      setAlunos((prev) =>
                        prev.map((a) =>
                          a["ID"] === aluno["ID"]
                            ? {
                                ...a,
                                STATUS: novoStatus,
                              }
                            : a
                        )
                      );
                    }}
                    className={`min-w-[86px] rounded-md px-3 py-1 text-[10px] font-black transition-all ${
                      aluno["STATUS"] === "CANCELADO"
                        ? "bg-red-600 text-white"
                        : "bg-green-600 text-white"
                    }`}
                  >
                    {aluno["STATUS"] || "ATIVO"}
                  </button>
                </div>

                <div className="flex items-center border-r border-[#12375f] p-3 text-cyan-300">
                  {aluno["Data Cadastro"] || "-"}
                </div>

                <div className="flex items-center border-r border-[#12375f] p-3 text-yellow-300">
                  {aluno["TURMA"] || "-"}
                </div>

                <div className="flex items-center border-r border-[#12375f] p-3">
                  {aluno["ID"]}
                </div>

                <div className="flex items-center border-r border-[#12375f] p-3">
                  {aluno["Aluno"]}
                </div>

                <div className="flex items-center border-r border-[#12375f] p-3 text-cyan-300">
                  {aluno["Cidade"] || "-"}
                </div>

                <div className="flex items-center border-r border-[#12375f] p-3">
                  {formatarTelefone(aluno["Tel. Resp"])}
                </div>

                <div className="flex items-center border-r border-[#12375f] p-3">
                  {formatarTelefone(aluno["Tel. Aluno"])}
                </div>

                <div className="flex items-center border-r border-[#12375f] p-3">
                  {aluno["Curso"] || "-"}
                </div>

                <div className="flex items-center justify-center p-3">
                  <span className="rounded-md bg-cyan-400 px-3 py-2 text-black">
                    ✎
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
