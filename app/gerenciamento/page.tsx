"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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

  if (ordemA !== ordemB) {
    return ordemB - ordemA;
  }

  const dataA = converterDataBR(a["Data Cadastro"]);
  const dataB = converterDataBR(b["Data Cadastro"]);

  if (dataA !== dataB) {
    return dataB - dataA;
  }

  return Number(b["ID"] || 0) - Number(a["ID"] || 0);
}

export default function Home() {
  const [alunos, setAlunos] = useState<any[]>([]);

  const [filtros, setFiltros] = useState({
    STATUS: "",
    "Data Cadastro": "",
    ID: "",
    Aluno: "",
    Cidade: "",
    "Tel. Resp": "",
    "Tel. Aluno": "",
    Curso: "",
  });

  useEffect(() => {
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

      const ordenado = todos
        .filter((a) => a["ID"] && a["Aluno"])
        .sort(ordenarAlunos);

      setAlunos(ordenado);
    }

    buscarTodosAlunos();
  }, []);

  const filtrados = useMemo(() => {
    return alunos
      .filter((a) =>
        Object.entries(filtros).every(([campo, valor]) => {
          if (!valor) return true;
          return String(a[campo] || "")
            .toLowerCase()
            .includes(valor.toLowerCase());
        })
      )
      .sort(ordenarAlunos);
  }, [alunos, filtros]);

  function alterarFiltro(campo: string, valor: string) {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }

  function limparFiltros() {
    setFiltros({
      STATUS: "",
      "Data Cadastro": "",
      ID: "",
      Aluno: "",
      Cidade: "",
      "Tel. Resp": "",
      "Tel. Aluno": "",
      Curso: "",
    });
  }

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-slate-200">
      {/* MENU */}
      <div className="fixed top-0 left-0 z-50 flex h-[38px] w-full items-center justify-center gap-2 bg-[#edbe13]">
        {[
          ["📑 CADASTRO", "/cadastro"],
          ["🖥️ GERENCIAMENTO", "/"],
          ["📊 RELATÓRIOS", "/relatorios"],
          ["📤 SUBIR ALUNOS", "/subir-alunos"],
          ["📤 SUBIR ALUNOS DE INGLÊS", "/subir-alunos-ingles"],
        ].map(([tab, href]) => (
          <a
            key={tab}
            href={href}
            className={`rounded-md border px-5 py-1 text-xs font-bold ${
              tab.includes("GERENCIAMENTO")
                ? "border-cyan-300 bg-cyan-300 text-black shadow-[0_0_10px_rgba(0,242,255,.6)]"
                : "border-slate-700/30 bg-white/20 text-[#1f295a]"
            }`}
          >
            {tab}
          </a>
        ))}
      </div>

      {/* CONTEÚDO */}
      <section className="pt-14 px-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-white">
              ▣ LISTAGEM DE ALUNOS
            </h1>
            <p className="text-xs text-cyan-300">
              {filtrados.length} registros encontrados
            </p>
          </div>

          <button
            onClick={limparFiltros}
            className="rounded-md border border-cyan-800 px-4 py-2 text-xs font-bold text-cyan-100"
          >
            LIMPAR FILTROS
          </button>
        </div>

        {/* TABELA */}
        <div className="overflow-hidden rounded-xl border border-[#12375f] bg-[#071b31] shadow-2xl">
          <div className="grid grid-cols-[110px_120px_110px_2fr_1.5fr_1.4fr_1.4fr_2fr_80px] bg-[#0c2743] text-[10px] font-black uppercase text-slate-200">
            <HeaderFiltro label="Status" value={filtros.STATUS} onChange={(v) => alterarFiltro("STATUS", v)} />
            <HeaderFiltro label="Data cadastro" value={filtros["Data Cadastro"]} onChange={(v) => alterarFiltro("Data Cadastro", v)} />
            <HeaderFiltro label="ID do aluno" value={filtros.ID} onChange={(v) => alterarFiltro("ID", v)} />
            <HeaderFiltro label="Nome completo" value={filtros.Aluno} onChange={(v) => alterarFiltro("Aluno", v)} />
            <HeaderFiltro label="Cidade" value={filtros.Cidade} onChange={(v) => alterarFiltro("Cidade", v)} />
            <HeaderFiltro label="Tel. responsável" value={filtros["Tel. Resp"]} onChange={(v) => alterarFiltro("Tel. Resp", v)} />
            <HeaderFiltro label="Tel. aluno" value={filtros["Tel. Aluno"]} onChange={(v) => alterarFiltro("Tel. Aluno", v)} />
            <HeaderFiltro label="Curso contratado" value={filtros.Curso} onChange={(v) => alterarFiltro("Curso", v)} />
            <div className="p-3 text-center">Ações</div>
          </div>

          {filtrados.map((aluno) => (
            <a
              key={aluno["ID"]}
              href={`/aluno/${aluno["ID"]}`}
              className="grid min-h-[52px] grid-cols-[110px_120px_110px_2fr_1.5fr_1.4fr_1.4fr_2fr_80px] border-t border-[#12375f] bg-[#071b31] text-[11px] font-bold text-slate-100 no-underline hover:bg-[#0b2542]"
            >
              <div className="flex items-center border-r border-[#12375f] p-3">
                <span className={`rounded-md px-3 py-1 text-[10px] font-black ${
                  aluno["STATUS"] === "CANCELADO"
                    ? "bg-red-950 text-red-300"
                    : "bg-green-950 text-green-300"
                }`}>
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
      </section>
    </main>
  );
}

function HeaderFiltro({ label, value, onChange }: any) {
  return (
    <div className="border-r border-[#12375f] p-2">
      <div className="mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filtrar"
        className="w-full rounded bg-white px-2 py-1 text-[10px] font-bold text-black outline-none"
      />
    </div>
  );
}