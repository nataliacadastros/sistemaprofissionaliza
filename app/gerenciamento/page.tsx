"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx-js-style";

function converterDataBR(data?: string) {
  if (!data) return 0;
  const partes = String(data).split("/");
  if (partes.length !== 3) return 0;
  const [dia, mes, ano] = partes;
  return new Date(`${ano}-${mes}-${dia}`).getTime();
}

function isoParaBR(dataISO: string) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
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

export default function GerenciamentoPage() {
  const router = useRouter();
  const [carregandoLogin, setCarregandoLogin] = useState(true);

  const [alunos, setAlunos] = useState<any[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [mostrarDownload, setMostrarDownload] = useState(false);
  const [dataDownload, setDataDownload] = useState("");

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
        if (!termo) return true;

        return Object.values(a).some((valor) =>
          String(valor || "").toLowerCase().includes(termo)
        );
      })
      .sort(ordenarAlunos);
  }, [alunos, pesquisa]);

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function baixarAlunosPorData() {
    if (!dataDownload) {
      alert("Selecione uma data.");
      return;
    }

    const dataBR = isoParaBR(dataDownload);

    const alunosDaData = alunos
      .filter((a) => String(a["Data Cadastro"] || "") === dataBR)
      .sort(ordenarAlunos)
      .reverse();

    if (alunosDaData.length === 0) {
      alert("Nenhum aluno encontrado nessa data.");
      return;
    }

    const colunasPreferidas = [
      "Ordem",
      "STATUS",
      "SEC",
      "TURMA",
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
    );

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

    ws["!cols"] = colunas.map((coluna) => {
      if (coluna === "Aluno") return { wch: 38 };
      if (coluna === "Curso") return { wch: 50 };
      if (coluna === "Pagamento") return { wch: 45 };
      if (coluna === "Vendedor") return { wch: 25 };
      if (coluna.includes("Data")) return { wch: 18 };
      if (coluna.includes("Tel")) return { wch: 18 };
      return { wch: 16 };
    });

    colunas.forEach((_, colIndex) => {
      const celula = `${XLSX.utils.encode_col(colIndex)}1`;

      if (ws[celula]) {
        ws[celula].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "0C2743" } },
          alignment: { horizontal: "center" },
        };
      }
    });

    alunosDaData.forEach((aluno, index) => {
      const curso = String(aluno["Curso"] || "").toUpperCase();

      if (curso.includes("TECNOLOGIA")) {
        const linhaExcel = index + 2;
        const colunaCurso = colunas.indexOf("Curso");
        const celulaCurso = `${XLSX.utils.encode_col(colunaCurso)}${linhaExcel}`;

        if (ws[celulaCurso]) {
          ws[celulaCurso].s = {
            font: {
              color: { rgb: "FF0000" },
              bold: true,
            },
          };
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alunos");

    XLSX.writeFile(wb, `ALUNOS_${dataBR.replaceAll("/", "-")}.xlsx`);
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
              ▣ LISTAGEM DE ALUNOS
            </h1>

            <p className="text-xs text-cyan-300">
              {filtrados.length} registros encontrados
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-[760px] lg:flex-row lg:items-center">
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
          </div>
        </div>

        {mostrarDownload && (
          <div className="mb-5 rounded-xl border border-[#12375f] bg-[#071b31] p-4 shadow-2xl">
            <div className="mb-2 text-xs font-black uppercase text-cyan-300">
              Selecione a Data Cadastro para baixar
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="date"
                value={dataDownload}
                onChange={(e) => setDataDownload(e.target.value)}
                className="rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black outline-none focus:border-cyan-400"
              />

              <button
                onClick={baixarAlunosPorData}
                className="rounded-md bg-green-700 px-5 py-2 text-xs font-black text-white hover:bg-green-600"
              >
                📥 BAIXAR EXCEL
              </button>
            </div>
          </div>
        )}

        <div className="w-full overflow-x-auto rounded-xl border border-[#12375f] bg-[#071b31] shadow-2xl">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-[110px_120px_110px_2fr_1.5fr_1.4fr_1.4fr_2fr_80px] bg-[#0c2743] text-[11px] font-black uppercase text-slate-200">
              <div className="border-r border-[#12375f] p-3">Status</div>
              <div className="border-r border-[#12375f] p-3">Data cadastro</div>
              <div className="border-r border-[#12375f] p-3">ID do aluno</div>
              <div className="border-r border-[#12375f] p-3">Nome completo</div>
              <div className="border-r border-[#12375f] p-3">Cidade</div>
              <div className="border-r border-[#12375f] p-3">Tel. responsável</div>
              <div className="border-r border-[#12375f] p-3">Tel. aluno</div>
              <div className="border-r border-[#12375f] p-3">Curso contratado</div>
              <div className="p-3 text-center">Ações</div>
            </div>

            {filtrados.map((aluno) => (
              <a
                key={aluno["ID"]}
                href={`/aluno/${aluno["ID"]}`}
                className="grid min-h-[52px] grid-cols-[110px_120px_110px_2fr_1.5fr_1.4fr_1.4fr_2fr_80px] border-t border-[#12375f] bg-[#071b31] text-[14px] font-bold text-slate-100 no-underline hover:bg-[#0b2542]"
              >
                <div className="flex items-center border-r border-[#12375f] p-3">
                  <span
                    className={`rounded-md px-3 py-1 text-[10px] font-black ${
                      aluno["STATUS"] === "CANCELADO"
                        ? "bg-red-950 text-red-300"
                        : "bg-green-950 text-green-300"
                    }`}
                  >
                    {aluno["STATUS"] || "ATIVO"}
                  </span>
                </div>

                <div className="flex items-center border-r border-[#12375f] p-3 text-cyan-300">
                  {aluno["Data Cadastro"] || "-"}
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
                  {aluno["Tel. Resp"] || "-"}
                </div>

                <div className="flex items-center border-r border-[#12375f] p-3">
                  {aluno["Tel. Aluno"] || "-"}
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
